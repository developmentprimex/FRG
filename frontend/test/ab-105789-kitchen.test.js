import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { getHotspotSourceBounds } from "../lib/kitchen-plan-geometry.js";
import { buildServiceClaimBlendeHotspots, buildServiceClaimPartHotspots, isLShapedClaimKitchen } from "../lib/service-claim-kitchen-hotspots.js";

const slug = "ab-105789";
const boxes = PLAN_HOTSPOTS_BY_SLUG[slug];
const source = boxes.map((box) => ({ ...box, ...getHotspotSourceBounds(box) }));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00002, `${actual} must match ${expected}`);
const pointInSource = ([x, y], px, py) => { near(x, px / 842 * 100); near(y, py / 595 * 100); };

test("105789 loads its own vector source in both order and ASC views", async () => {
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/670%20105789-smooth.png");
  const expected = readFileSync(new URL("../public/plans/670 105789.svg", import.meta.url), "utf8").trim();
  assert.equal(await loadKitchenSvgMarkup(slug), expected);
  assert.match(expected, /width="842" height="595" viewBox="0 0 842 595"/);
  assert.ok([...expected.matchAll(/<use\b[^>]*data-text="\d"[^>]*>/g)].every(([glyph]) => glyph.includes('fill="#ffffff"')), "supplier numbers stay invisible on the source drawing");
  assert.equal(isLShapedClaimKitchen(slug), true);
});

test("perspective fronts and supplier fillers follow the PDF seams", () => {
  assert.equal(boxes.length, 38);
  assert.ok(boxes.every((box) => box.points?.length >= 3 && box.preserveManualSize));
  const base = boxes.filter((box) => {
    const isCornerReturn = box.componentKey === "worktop" && box.separateLockedSidePanel
      && box.points[0][0] >= 447.48 / 842 * 100 - 0.000001
      && box.points[0][0] < 456.12 / 842 * 100;
    return (["base-end-blende", "oven-module", "base-module-1", "dishwasher-base", "sink-base", "base-module-2"].includes(box.componentKey) || isCornerReturn) && box.claimApplianceSurface !== "cooktop";
  });
  // Adjacent fronts share both top and floor edges, including the inside corner.
  for (let index = 1; index < base.length; index++) {
    assert.deepEqual(base[index - 1].points[1], base[index].points[0]);
    assert.deepEqual(base[index - 1].points[2], base[index].points[3]);
  }
  pointInSource(base[0].points[0], 258.24, 357.4);
  pointInSource(base.at(-1).points[2], 657.84, 545.08);
  const hood = boxes.filter((box) => box.componentKey === "extractor-hood");
  assert.equal(hood.length, 3, "hood underside and both LED rays are selected together");
  pointInSource(hood[0].points[0], 255.48, 235.72);
  pointInSource(hood[0].points[2], 348.48, 236.32);
  const wallFiller = boxes.filter((box) => box.componentKey === "wall-cabinet-3")[2];
  pointInSource(wallFiller.points[1], 506.76, 64.72);
  pointInSource(wallFiller.points[2], 506.76, 210.04);
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug];
  assert.equal(details.length, 2);
  assert.ok(details.every((detail) => detail.persistWhenSelected));
  assert.ok(details.every((detail) => detail.preserveWhiteBackground), "technical linework keeps white pixels transparent instead of painting grey rectangles");
});

test("persistent grey details have finite tight clip bounds and cannot cover the whole plan", () => {
  const details = PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug];
  for (const [index, [x0, y0, x1, y1]] of [[459.48,399.28,531.36,451.24],[488.76,465.88,503.04,488.08]].entries()) {
    const detail = details[index];
    for (const value of [detail.left, detail.top, detail.width, detail.height]) assert.ok(Number.isFinite(value));
    pointInSource([detail.left, detail.top], x0, y0);
    pointInSource([detail.left + detail.width, detail.top + detail.height], x1, y1);
    assert.ok(detail.width < 10 && detail.height < 10);
  }
});

test("supplier callouts 1-11 and the hidden hood have the correct identities", () => {
  const codes = ["OVEN-B-600-HOB", "TOP-AB105789", "SINK-BASE-AB105789-SP60-R", "REF-AB105789-KGCN388140E", "BLENDE-AB105789-OVEN-END", "CAB-BASE-AB105789-US30-UPK20-1", "DISH-AB105789-600-UPEF65", "CAB-BASE-AB105789-US30-UPK20-2", "CAB-HOOD-AB105789-600", "CAB-WALL-AB105789-H3002", "CAB-WALL-AB105789-H6002-HPK2002"];
  codes.forEach((code, index) => assert.ok(getLocalizedItemName({ code, name: "Item" }, (_key, fallback) => fallback, "en", true).startsWith(`${index + 1}. `)));
  assert.deepEqual(getLinkedComponentIds(slug, "component-extractor-hood"), ["component-wall-cabinet-1", "component-extractor-hood"]);
  assert.deepEqual(getLinkedComponentIds(slug, "component-dishwasher-base"), ["component-dishwasher-base"]);
});

test("ASC sink, faucet, cooktop and oven drawer are independent measured surfaces", () => {
  const parts = ["oven", "oven-drawer", "cooktop"].map((partKey) => ({ partKey, sourceComponentKey: "oven-module" }));
  parts.push(...["sink", "faucet"].map((partKey) => ({ partKey, sourceComponentKey: "sink-faucet" })));
  const claims = buildServiceClaimPartHotspots(source, parts, slug);
  const byPart = (key) => claims.filter((entry) => entry.claimPartKey === key);
  assert.equal(byPart("sink").length, 1);
  assert.equal(byPart("faucet").length, 4);
  assert.equal(byPart("cooktop").length, 1);
  assert.deepEqual(byPart("sink")[0].points, boxes.find((box) => box.claimFixturePartKey === "sink").points);
  assert.deepEqual(byPart("cooktop")[0].points, boxes.find((box) => box.claimApplianceSurface === "cooktop").points);
  const oven = byPart("oven")[0];
  const drawer = byPart("oven-drawer")[0];
  // Oven slices are returned as display bounds and a CSS polygon.
  const corners = (entry) => entry.clipPath.slice(8, -1).split(", ").map((point) => {
    const [x, y] = point.split(" ").map(parseFloat);
    return [entry.left + x / 100 * entry.width, entry.top + y / 100 * entry.height];
  });
  const ovenCorners = corners(oven), drawerCorners = corners(drawer);
  pointInSource(ovenCorners[2], 382.32, 461.32);
  pointInSource(ovenCorners[3], 289.32, 470.92);
  ovenCorners[2].forEach((value, index) => near(value, drawerCorners[1][index]));
  ovenCorners[3].forEach((value, index) => near(value, drawerCorners[0][index]));
  pointInSource(drawerCorners[2], 382.32, 521.2);
});

test("ASC selects each thin return with its worktop leg and keeps the end panel separate", () => {
  const parts = ["worktop-left", "worktop-right", "worktop-end-panel"].map((partKey) => ({ partKey, sourceComponentKey: "worktop" }));
  const claims = buildServiceClaimPartHotspots(source, parts, slug);
  for (const [key, count] of [["worktop-left", 3], ["worktop-right", 4], ["worktop-end-panel", 1]]) {
    assert.equal(claims.filter((entry) => entry.claimPartKey === key).length, count, key);
  }
  assert.equal(claims.filter((entry) => entry.componentKey === "worktop").length, 0);
  const panel = claims.find((entry) => entry.claimPartKey === "worktop-end-panel");
  pointInSource(panel.points[0], 659.88, 368.92);
  pointInSource(panel.points[2], 753, 535.84);
  const leftReturn = claims.find((entry) => entry.claimPartKey === "worktop-left" && entry.separateLockedSidePanel);
  pointInSource(leftReturn.points[0], 255.84, 357.64);
  pointInSource(leftReturn.points[2], 258.24, 533.8);
  const rightReturns = claims.filter((entry) => entry.claimPartKey === "worktop-right" && entry.separateLockedSidePanel);
  assert.equal(rightReturns.length, 2);
  pointInSource(rightReturns[0].points[0], 657.84, 368.56);
  pointInSource(rightReturns[0].points[2], 659.88, 545.32);
  pointInSource(rightReturns[1].points[0], 454.08, 339.04);
  pointInSource(rightReturns[1].points[2], 456.12, 515.8);
});

test("ASC assigns whole sloped Blende faces instead of cutting arbitrary strips", () => {
  assert.equal(boxes.filter((box) => box.componentKey === "dishwasher-base").length, 1, "dishwasher selects only its front");
  assert.equal(boxes.filter((box) => box.componentKey === "base-module-1").length, 3, "US30 and both continuous corner filler faces select together");
  const fillerFace = boxes.filter((box) => box.componentKey === "base-module-1")[1];
  pointInSource(fillerFace.points[0], 428.88, 340);
  pointInSource(fillerFace.points[1], 447.48, 338.08);
  const definitions = [["base-module-1", "UPEF65", 300, 2], ["base-module-2", "UPK20", 300, 1], ["wall-cabinet-3", "HPK2002", 600, 2]];
  const blenden = definitions.map(([sourceComponentKey, code, sourceWidthMm]) => ({
    componentId: `blende-${sourceComponentKey}`, componentKey: `claim-blende-${sourceComponentKey}`,
    sourceComponentKey, code, sourceWidthMm, claimPartKey: "blende", blendeQuantity: 1,
  }));
  const components = definitions.map(([componentKey, , widthMm]) => ({ componentKey, widthMm }));
  const claims = buildServiceClaimBlendeHotspots(source, blenden, components, slug);
  for (const [key, , , count] of definitions) {
    const filler = claims.filter((entry) => entry.claimPartKey === "blende" && entry.sourceComponentKey === key);
    assert.equal(filler.length, count, key);
    assert.ok(filler.every((entry) => source.some((original) => original.componentKey === key && JSON.stringify(original.points) === JSON.stringify(entry.points))));
    assert.equal(claims.filter((entry) => entry.componentKey === key && !entry.claimPartKey).length, key === "wall-cabinet-3" ? 2 : 1, `${key}: cabinet remains complete`);
  }
});

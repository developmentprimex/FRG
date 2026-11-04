import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG, PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG } from "../lib/kitchen-plan-preview-data.js";
import { loadKitchenSvgMarkup } from "../lib/load-kitchen-svg.js";
import { getHotspotSourceBounds } from "../lib/kitchen-plan-geometry.js";
import { buildServiceClaimPartHotspots, buildServiceClaimBlendeHotspots, isLShapedClaimKitchen } from "../lib/service-claim-kitchen-hotspots.js";
import { getLinkedComponentIds, getLocalizedItemName } from "../components/kitchen-selection-utils.js";
import { allowsKitchenArticleNumberAlias } from "../lib/order-article-aliases.js";
import { buildPurchasedKitchenOverlaySvg, loadKitchenPlanPreviewData } from "../lib/email/order-notifications.js";
import { buildServiceClaimSelectableComponents } from "../lib/service-claim-kitchen-plan-selection.js";
import { buildServiceClaimComponentChoiceGroups, normalizeServiceClaimComponentChoiceSelection, resolveServiceClaimPlanDisplayComponentIds } from "../lib/service-claim-component-choices.js";
const slug = "ab-105804", boxes = PLAN_HOTSPOTS_BY_SLUG[slug];
const source = boxes.map(h=>({...h,...getHotspotSourceBounds(h)}));
const near = (a,b) => assert.ok(Math.abs(a-b)<0.00002,`${a} != ${b}`);

test("clicking the left end panel selects the left worktop assembly, leaving the right worktop separate", () => {
  const claimParts = ["worktop-left", "worktop-right", "worktop-end-panel"].map(partKey => ({ partKey, sourceComponentKey: "worktop", articleCode: partKey }));
  const worktop = { code: "TOP-AB105804", componentKey: "worktop", itemType: "COMPONENT", isLocked: true };
  const { selectableComponents } = buildServiceClaimSelectableComponents({ kitchen: { slug, items: [worktop] }, kitchenConfig: {}, kitchenSlug: slug, claimParts });
  const groups = buildServiceClaimComponentChoiceGroups(selectableComponents);
  const panelId = "component-claim-worktop-end-panel", leftId = "component-claim-worktop-left", rightId = "component-claim-worktop-right";
  const group = groups.find(group => group.options.some(option => option.componentId === panelId));
  assert.ok(group);
  assert.equal(group.triggerComponentId, leftId);
  assert.deepEqual(normalizeServiceClaimComponentChoiceSelection([panelId], groups), [leftId]);
  assert.deepEqual(resolveServiceClaimPlanDisplayComponentIds([leftId], groups), [leftId, panelId]);
  assert.deepEqual(resolveServiceClaimPlanDisplayComponentIds([rightId], groups), [rightId]);
});
test("105804 uses its antialiased plan and matching vector source in orders and claims", async () => {
  assert.equal(PLAN_IMAGE_BY_SLUG[slug], "/plans/670%20105804-smooth.png");
  assert.equal(await loadKitchenSvgMarkup(slug), readFileSync(new URL("../public/plans/670 105804.svg",import.meta.url),"utf8").trim());
  assert.equal(isLShapedClaimKitchen(slug), false, "two independent runs are not an L-shaped corner");
  assert.equal(allowsKitchenArticleNumberAlias(slug), true);
  assert.ok(boxes.every(h=>h.preserveManualSize && h.points.length>=3 && h.points.every(p=>p.every(Number.isFinite))));
});
test("all supplier rows have correct labels, and hood rays select the hood package", () => {
  ["OVEN-B-600-HOB","TOP-AB105804","SINK-BASE-AB105804-SP60-R","CAB-BASE-AB105804-US50-UPK20","DISH-AB105804-600","BLENDE-AB105804-SINK-END","CAB-BASE-AB105804-US60-UPK20","REF-AB105804-KGCN388140E","CAB-WALL-AB105804-H5002-HPK2002","CAB-HOOD-AB105804-600","CAB-WALL-AB105804-H6002","CAB-WALL-AB105804-H6002-HPK2002"].forEach((code,i)=> assert.ok(getLocalizedItemName({code,name:"Item"},(_k,f)=>f,"en",true).startsWith(`${i+1}. `),code));
  assert.deepEqual(getLinkedComponentIds(slug,"component-extractor-hood"),["component-wall-cabinet-2","component-extractor-hood"]);
  assert.equal(boxes.filter(h=>h.componentKey==="extractor-hood").length,4);
  assert.equal(boxes.filter(h=>h.componentKey==="sink-end-blende").length,1);
  const end=boxes.find(h=>h.componentKey==="sink-end-blende");
  near(end.points[0][0],467.4/842*100); near(end.points[1][0],475.08/842*100);
  assert.deepEqual(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].map(h=>h.key),["dishwasher-basket","dishwasher-gs-mark"]);
  assert.ok(PLAN_PERSISTENT_LIGHT_DETAILS_BY_SLUG[slug].every(detail => detail.preserveWhiteBackground), "basket and GS linework must not paint grey rectangles");
});
test("claims split exact fixtures, oven drawer seam and both separate worktops", () => {
  const definitions = [["oven","oven-module"],["oven-drawer","oven-module"],["cooktop","oven-module"],["sink","sink-faucet"],["faucet","sink-faucet"],["worktop-left","worktop"],["worktop-right","worktop"],["worktop-end-panel","worktop"]];
  const parts=definitions.map(([partKey,sourceComponentKey])=>({partKey,sourceComponentKey}));
  const claims=buildServiceClaimPartHotspots(source,parts,slug), byKey=k=>claims.filter(h=>h.claimPartKey===k);
  for (const [key] of definitions) assert.ok(byKey(key).length>0,key);
  assert.equal(byKey("sink").length,1); assert.equal(byKey("faucet").length,4); assert.equal(byKey("cooktop").length,1);
  assert.equal(byKey("worktop-right").length,2); assert.equal(byKey("worktop-end-panel").length,1);
  near(byKey("worktop-right")[0].left,547.92/842*100);
  assert.deepEqual(byKey("sink")[0].points,boxes.find(h=>h.claimFixturePartKey==="sink").points);
  assert.deepEqual(byKey("cooktop")[0].points,boxes.find(h=>h.claimApplianceSurface==="cooktop").points);
  const corners=h=>h.clipPath.slice(8,-1).split(", ").map(p=>{const [x,y]=p.split(" ").map(parseFloat);return [h.left+x/100*h.width,h.top+y/100*h.height];});
  const oven=corners(byKey("oven")[0]), drawer=corners(byKey("oven-drawer")[0]);
  near(oven[2][1],486.4/595*100); near(oven[3][1],495.88/595*100);
  oven[2].forEach((v,i)=>near(v,drawer[1][i])); oven[3].forEach((v,i)=>near(v,drawer[0][i]));
});
test("attached fillers get whole measured claim faces without trimming their cabinet fronts", () => {
  const defs=[["base-module-1","UPK20",500,1],["base-module-2","UPK20",600,1],["wall-cabinet-1","HPK2002",500,2],["wall-cabinet-4","HPK2002",600,2]];
  const blenden=defs.map(([sourceComponentKey,code,sourceWidthMm])=>({sourceComponentKey,code,sourceWidthMm,componentId:`blende-${sourceComponentKey}`,claimPartKey:"blende",blendeQuantity:1}));
  const claims=buildServiceClaimBlendeHotspots(source,blenden,defs.map(([componentKey,,widthMm])=>({componentKey,widthMm})),slug);
  for(const [key,,,count] of defs) {
    const fillers=claims.filter(h=>h.claimPartKey==="blende"&&h.sourceComponentKey===key);
    assert.equal(fillers.length,count,key);
    assert.ok(fillers.every(h=>source.some(s=>s.componentKey===key&&JSON.stringify(s.points)===JSON.stringify(h.points))));
  }
});
test("purchased-kitchen sketch resolves the new plan and paints worktop pieces without artificial seams", async () => {
  const preview = await loadKitchenPlanPreviewData();
  assert.equal(preview.imageViews[slug], PLAN_IMAGE_BY_SLUG[slug]);
  assert.deepEqual(preview.hotspotsBySlug[slug], boxes);
  const order = { kitchen: { slug }, components: [{ componentKey: "worktop", isLocked: true }] };
  const overlay = buildPurchasedKitchenOverlaySvg({ order, hotspots: boxes, crop: { left: 0, top: 0, width: 100, height: 100 }, width: 1684, height: 1190 }).toString();
  assert.match(overlay,/stroke="none"/);
  assert.doesNotMatch(overlay,/stroke="rgba/);
});

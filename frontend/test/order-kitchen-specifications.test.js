import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildOrderKitchenSpecifications, getKitchenSpecification } from "../lib/order-kitchen-specifications.js";
import references from "../data/kitchen-specifications/index.json" with { type: "json" };

test("imported kitchen ABs retain the source identity, exact PDF and manufacturer columns", () => {
  for (const [slug, reference] of Object.entries(references)) {
    assert.equal(reference.kitchenSlug, slug);
    assert.equal(reference.abNumber.replace(/\s/g, ""), `670${slug.slice(3)}`);
    const bytes = readFileSync(new URL(`../data/kitchen-specifications/pdfs/${reference.sourceFile}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), reference.sourceSha256);
    assert.ok(reference.specifications.some((field) => field.label === "Programm" && field.value));
    assert.ok(reference.articles.every((item) => item.articleNumber && item.name));
    assert.equal(new Set(reference.articles.map((item) => item.position)).size, reference.articles.length);
  }
  const sample = getKitchenSpecification({ slug: "ab-104968" });
  assert.ok(sample.specifications.some((field) => field.label === "Arbeitsplatten-Farbe" && field.code === "684"));
  assert.ok(sample.articles.some((item) => item.articleNumber === "EH92364E-A" && item.manufacturer === "Archi-AM"));
  assert.equal(sample.apartment, "1.0.001");
  assert.equal(sample.articles.find((item) => item.position === "0.5.1").quantity, -1);
  assert.equal(sample.articles.find((item) => item.position === "2").articleNumber, "SP60");
  assert.equal(sample.articles.find((item) => item.position === "2").handing, "L");
});

test("newly supplied ABs attach to the previously missing order kitchens", () => {
  for (const [slug, apartment, program] of [
    ["ab-105777", "4.0.049", "IP 2200"],
    ["ab-105803", "5.4.073", "IP 2200"],
    ["ab-105805", "79", "IP 2200"],
    ["ab-109873", "", "IP 2200"],
    ["ab-105672", "", "Jette"],
  ]) {
    const details = buildOrderKitchenSpecifications({ kitchen: { slug } });
    assert.equal(details.reference.kitchenSlug, slug);
    assert.equal(details.reference.apartment, apartment);
    assert.equal(details.reference.specifications.find((field) => field.label === "Programm").value, program);
  }
});

test("legacy numeric kitchen identities use the exact same AB without guessing module variants", () => {
  assert.equal(getKitchenSpecification({ slug: "105806" }), getKitchenSpecification({ slug: "ab-105806" }));
  assert.equal(getKitchenSpecification({ slug: "105845-modul-2", kitchenCode: "105 845" }), null);
  assert.equal(getKitchenSpecification({ slug: "10581", kitchenCode: "10581" }), null);
});

test("only an exact kitchen slug attaches its AB, with no contract or layout alias guessing", () => {
  for (const slug of ["105-777", "ab-105-777"]) {
    assert.equal(getKitchenSpecification({ slug }), getKitchenSpecification({ slug: "ab-105777" }));
  }
  for (const slug of ["ab-104968-other", "burger-104968", "kitchen-model-b", "__proto__", "../../ab-104968"]) {
    assert.equal(getKitchenSpecification({ slug, kitchenCode: "104968" }), null);
  }
  assert.equal(buildOrderKitchenSpecifications({ kitchen: { slug: "ab-105732" }, contractNumber: "670104968" }).reference.apartment, "1.0.002");
});

test("ordered article snapshots take priority and stale product metadata cannot mislabel a replacement", () => {
  const details = buildOrderKitchenSpecifications({ kitchen: { slug: "ab-104968" }, items: [{
    id: "replacement", code: "REF", articleNumberSnapshot: "BOSCH-NEW", nameSnapshot: "BOSCH refrigerator", quantity: 2,
    kitchenItem: { articleNumber: "OLD", name: "Amica refrigerator", productInfoSummary: "Amica", catalogArticle: { articleNumber: "OLD", name: "Amica" } },
  }, { id: "unknown", code: "REF-UNKNOWN", articleNumberSnapshot: "UNKNOWN-MODEL", nameSnapshot: "Refrigerator",
    kitchenItem: { articleNumber: "OLD", productInfoSummary: "Amica" },
  }] });
  assert.equal(details.orderedItems[0].articleNumber, "BOSCH-NEW");
  assert.equal(details.orderedItems[0].manufacturer, "BOSCH");
  assert.equal(details.orderedItems[0].quantity, 2);
  assert.equal(details.orderedItems[1].manufacturer, "");
});

test("manufacturer resolution uses matching product metadata or the exact AB article", () => {
  const details = buildOrderKitchenSpecifications({ kitchen: { slug: "ab-104968" }, items: [{
    code: "REF", articleNumberSnapshot: "OL-KGCN388140E", kitchenItem: { articleNumber: "OL-KGCN388140E",
      productInfoSummary: "Amica fridge", catalogArticle: { articleNumber: "OL-KGCN388140E", name: "Refrigerator" } },
  }, { code: "SINK", articleNumberSnapshot: "526335" }, { code: "OVEN", articleNumberSnapshot: "EH92364E-A + 9EC744100C" }] });
  assert.deepEqual(details.orderedItems.map((item) => item.manufacturer), ["Amica", "BLANCO", "Archi-AM"]);
});

test("kitchens without ABs still show their own ordered articles as plain serializable data", () => {
  const details = buildOrderKitchenSpecifications({ kitchen: { slug: "other", name: "Other kitchen" }, items: [{
    code: "AEG-OVEN", nameSnapshot: "AEG oven", articleNumberSnapshot: "AEG-01", priceSnapshot: { toJSON() { throw new Error("Decimal leaked"); } },
  }] });
  assert.equal(details.reference, null);
  assert.equal(details.orderedItems[0].manufacturer, "AEG");
  assert.equal(JSON.parse(JSON.stringify(details)).orderedItems[0].name, "AEG oven");
  assert.deepEqual(buildOrderKitchenSpecifications().orderedItems, []);
});

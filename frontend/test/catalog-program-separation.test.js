import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("admin catalog separates records and prices by selected program", () => {
  const page = read("app/admin/catalog/articles/page.js");
  const exportRoute = read("app/api/admin/catalog/export/route.js");
  const articleRoute = read("app/api/admin/catalog/articles/[id]/route.js");

  assert.match(page, /selectedProgramId/);
  assert.match(page, /CatalogArticleProgramPrice/);
  assert.match(page, /CatalogBlendeProgramPrice/);
  assert.match(page, /CatalogServiceProgramPrice/);
  assert.match(page, /name="programmId"/);
  assert.match(page, /programCatalogTabsStyle/);
  assert.match(exportRoute, /searchParams\.get\("programmId"\)/);
  assert.match(exportRoute, /capp\."programmId" = \$\{programmId\}/);
  assert.match(exportRoute, /includeAllPrograms/);
  assert.match(exportRoute, /getSheetName\("Articles"/);
  assert.match(exportRoute, /appendCatalogSheets/);
  assert.match(exportRoute, /appendCombinedProgramSheet/);
  assert.match(exportRoute, /\["No\.", "Type", "Program", "Article number", "Code"/);
  assert.match(page, /includeAllPrograms=true/);
  assert.match(articleRoute, /catalogArticleProgramPrice\.upsert/);
  assert.match(articleRoute, /syncCatalogProgramKitchenItemPrices/);
});

test("Burger import uses the supplier article and blende codes printed in the PDF", () => {
  const importer = read("scripts/import-burger-cindy-price-list.js");

  assert.match(importer, /backfillImpulsProgramPrices/);
  assert.match(importer, /createdAt: \{ lt: cutoff \}/);
  assert.match(importer, /DEFAULT_PROGRAMM_ID = "IP 2200"/);
  assert.match(importer, /buildParsedFromImpulsCatalog/);
  assert.match(importer, /source: "H3002", target: "H3072", price: 124/);
  assert.match(importer, /source: "H6002", target: "H6072", price: 146/);
  assert.match(importer, /target: "A-EGSPV594 \+ TGV60"/);
  assert.match(importer, /target: "FH664621E\+FWK124\+HFLH6072"/);
  assert.match(importer, /target: "EWA34660W\+TV60\+WU1672"/);
  assert.match(importer, /source: "ZB60SG", target: "ZBE60", price: 20/);
  assert.match(importer, /source: "UPK20", target: "UP20K", price: 33/);
  assert.match(importer, /source: "HPEF4302", target: "HPE7072", price: 79/);
  assert.match(importer, /removeObsoleteBurgerProgramPrices/);
  assert.match(importer, /Burger article and blende identifiers match the Typen-NR\./);
});

test("Impuls seed keeps the canonical cabinet casing and dimensions", () => {
  const seed = read("prisma/seed.js");
  const importer = read("scripts/import-burger-cindy-price-list.js");
  const us50 = seed.match(/\{ articleNumber: "US50",[^\n]+\}/)?.[0] || "";
  const us60 = seed.match(/\{ articleNumber: "US60",[^\n]+\}/)?.[0] || "";
  const refrigerator = seed.match(/\{ articleNumber: "OL-KGCN388140E",[^\n]+\}/)?.[0] || "";
  const burgerHood = seed.match(/\{ itemType: ItemType\.COMPONENT, code: "CAB-HOOD-BURGER103898-HFLH6072",[^\n]+\}/)?.[0] || "";

  assert.match(seed, /REFRIGERATOR_CATALOG_NAME_EN = "Freestanding Refrigerator 181 cm"/);
  assert.match(seed, /articleNumber: "OL-KGCN388140E"[^\n]+heightMm: 1810/);
  assert.doesNotMatch(refrigerator, /widthMm/);
  assert.match(seed, /name: "Upper Cabinet 60 cm"/);
  assert.match(seed, /US60: \{ name: "Lower Cabinet with Drawer 60 cm" \}/);
  assert.match(seed, /articleNumber: "US2A60", name: "Lower Cabinet with 3 Drawers 60 cm", nameDe: "Unterschrank mit 3 Schubladen 60 cm"/);
  for (const width of ["30", "40", "45", "50", "60", "80", "90", "100"]) {
    assert.match(seed, new RegExp(`articleNumber: "US2A${width}", name: "Lower Cabinet with 3 Drawers ${width} cm"`));
  }
  assert.match(seed, /SEED_RECONCILE_EXISTING=true/);
  assert.doesNotMatch(seed, /catalogArticle\.updateMany/);
  assert.doesNotMatch(us50, /depthMm/);
  assert.doesNotMatch(us60, /depthMm/);
  assert.match(importer, /name: "Freestanding Refrigerator 181 cm"[\s\S]+?heightMm: 1810/);
  assert.match(importer, /"OL-KGCN388140E": \{[\s\S]+?widthMm: null, heightMm: 1810/);
  assert.match(importer, /US50: \{[^\n]+depthMm: null/);
  assert.match(importer, /US60: \{[^\n]+depthMm: null/);
  assert.match(seed, /REF-BURGER103898-KGCN388140E[^\n]+heightMm: 1810/);
  assert.doesNotMatch(seed.match(/REF-BURGER103898-KGCN388140E[^\n]+/)?.[0] || "", /widthMm/);
  assert.doesNotMatch(burgerHood, /heightMm/);
  assert.match(seed, /CAB-BASE-BURGER103898-US50[^\n]+name: "Lower Cabinet with Drawer"/);
  assert.match(seed, /CAB-BASE-BURGER103898-US60-UPE65[^\n]+name: "Lower Cabinet with Drawer and corner end panel"/);
  assert.doesNotMatch(seed.match(/CAB-BASE-BURGER103898-US50[^\n]+/)?.[0] || "", /depthMm/);
  assert.doesNotMatch(seed.match(/CAB-BASE-BURGER103898-US60-UPE65[^\n]+/)?.[0] || "", /depthMm/);
});

const assert = require("node:assert/strict");
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const kitchen = await prisma.kitchen.findUnique({
    where: { slug: "ab-105789" },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { catalogArticle: true, catalogBlende: true, catalogService: true } },
      contracts: true, claimParts: true,
    },
  });
  if (process.argv.includes("--catalog")) {
    const articles = await prisma.catalogArticle.findMany({
      where: { articleNumber: { in: ["A-EH923640E + 9EC744100C", "PLR60", "SP60", "US30", "OL-KGCN388140E", "A-EGSPV597210 + TGV60", "H3002", "FH664621E + FWK124 + HD6002", "H6002", "526335 + 517720"] } },
      select: { articleNumber: true, price: true, widthMm: true, heightMm: true, depthMm: true },
    });
    console.log(JSON.stringify({ existingKitchen: Boolean(kitchen), articles }, null, 2));
    return;
  }
  assert.ok(kitchen, "Kitchen must exist");
  assert.equal(kitchen.items.length, 18);
  for (const item of kitchen.items) {
    assert.equal(item.catalogLinkStatus, "MATCHED", `${item.code}: link status`);
    assert.ok((item.catalogArticle || item.catalogBlende || item.catalogService)?.isActive, `${item.code}: active catalog relation`);
    if (item.itemType === "SERVICE") assert.ok(item.catalogServiceId);
    else if (item.componentKey === "base-end-blende") assert.ok(item.catalogBlendeId);
    else assert.ok(item.catalogArticleId, `${item.code}: catalog article`);
    if (item.isLocked) {
      assert.equal(Number(item.price), 0);
      assert.equal(item.catalogPriceSyncMode, "LOCKED_INCLUDED");
    } else {
      const articlePrice = Number((item.catalogArticle || item.catalogService)?.price || 0);
      const fillerPrice = Number(item.catalogBlende?.price || 0) * (item.catalogBlendeQuantity || 1);
      assert.equal(Number(item.price), articlePrice + fillerPrice, `${item.code}: catalog price parity`);
    }
  }
  const byKey = (key) => kitchen.items.find((item) => item.componentKey === key);
  assert.equal(byKey("sink-base").catalogArticle.articleNumber, "SP60");
  assert.equal(byKey("sink-base").widthMm, 600);
  assert.match(byKey("sink-base").infoText, /hinge right/);
  for (const [key, article, filler] of [
    ["base-module-1", "US30", "UPEF65"],
    ["base-module-2", "US30", "UPK20"],
    ["dishwasher-base", "A-EGSPV597210 + TGV60", null],
    ["wall-cabinet-3", "H6002", "HPK2002"],
  ]) {
    assert.equal(byKey(key).catalogArticle.articleNumber, article);
    assert.equal(byKey(key).catalogBlende?.code || null, filler);
  }
  assert.equal(byKey("dishwasher-base").blendeCode, null);
  assert.equal(byKey("dishwasher-base").blendePrice, null);
  assert.equal(byKey("dishwasher-base").catalogBlendeQuantity, null);
  assert.equal(byKey("extractor-hood").isActive, false);
  assert.equal(kitchen.items.filter((item) => item.isLocked).length, 4);
  const optional = kitchen.items.filter((item) => item.itemType === "COMPONENT" && item.isActive && !item.isLocked);
  assert.equal(optional.length, 8);
  for (const prefix of ["670", "111"]) {
    assert.ok(kitchen.contracts.some((contract) => contract.contractNumber === `${prefix}105789` && contract.isActive && contract.kitchenId === kitchen.id));
  }
  for (const [key, article] of [
    ["sink", "526335"], ["faucet", "517720"], ["sink-cabinet", "SP60"],
    ["oven", "A-EH923640E"], ["oven-drawer", "UHK"], ["cooktop", "9EC744100C"],
    ["worktop-left", "PLR60-1"], ["worktop-right", "PLR60-2"], ["worktop-end-panel", "WU16"],
  ]) assert.equal(kitchen.claimParts.find((part) => part.partKey === key)?.articleCode, article, key);
  console.log(JSON.stringify({
    slug: kitchen.slug, linkedItems: kitchen.items.length, selectableComponents: optional.length,
    optionalTotal: optional.reduce((sum, item) => sum + Number(item.price), 0),
    claimParts: kitchen.claimParts.map(({ partKey, articleCode }) => ({ partKey, articleCode })),
    contracts: kitchen.contracts.map((entry) => entry.contractNumber),
  }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());

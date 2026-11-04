import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../lib/prisma.js";
import { listKitchenContractsForAdmin, getKitchenContractForAdmin } from "../lib/catalog.js";
import { isTestContractNumber } from "../lib/order-kind.js";

test("contract lists, search totals and direct details honor the admin role", {
  skip: process.env.ADMIN_PERFORMANCE_DB_TEST !== "1",
}, async (t) => {
  t.after(() => prisma.$disconnect());
  const admin = { role: "ADMIN", permissions: ["FRG"] };
  const superadmin = { role: "SUPERADMIN" };
  const px = { role: "PX_ADMIN", permissions: ["FRG"] };
  const [live, all, pxList, search] = await Promise.all([
    listKitchenContractsForAdmin({}, 1, admin),
    listKitchenContractsForAdmin({}, 1, superadmin),
    listKitchenContractsForAdmin({}, 1, px),
    listKitchenContractsForAdmin({ query: "111" }, 1, admin),
  ]);
  const [expected] = await prisma.$queryRaw`
    SELECT COUNT(*) AS total FROM "KitchenContract"
    WHERE REGEXP_REPLACE("contractNumber", '[[:space:]]', '', 'g') NOT LIKE '111%'
  `;
  assert.equal(live.totalItems, Number(expected.total));
  assert.equal(pxList.totalItems, all.totalItems);
  assert.ok(live.items.every(row => !isTestContractNumber(row.contractNumber)));
  assert.ok(search.items.every(row => !isTestContractNumber(row.contractNumber)));
  const sample = await prisma.kitchenContract.findFirst({ where: { contractNumber: { startsWith: "111" } } });
  if (sample) {
    assert.equal(await getKitchenContractForAdmin(sample.id, admin), null);
    assert.equal((await getKitchenContractForAdmin(sample.id, superadmin)).id, sample.id);
  }
  console.log(JSON.stringify({ adminContracts: live.totalItems, superadminContracts: all.totalItems, pxContracts: pxList.totalItems }));
});

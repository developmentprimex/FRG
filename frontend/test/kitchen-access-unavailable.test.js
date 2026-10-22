import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  assertContractAllowsRepurchase,
  REPURCHASE_UNAVAILABLE_CODE,
  REPURCHASE_UNAVAILABLE_MESSAGE,
} from "../lib/contract-repurchase-restrictions.js";

function loadSource(relativePath) {
  return fs.readFileSync(new URL(relativePath, import.meta.url), "utf8")
    .replace(/^import[\s\S]*?;\r?\n/gm, "")
    .replace(/^export\s+/gm, "");
}

function loadRoute(contract, lookupError) {
  const events = [];
  const prisma = {
    kitchenContract: {
      async findUnique() {
        if (lookupError) throw lookupError;
        return contract;
      },
    },
  };
  const { CONTRACT_ERRORS, getKitchenContractForAccess } = new Function(
    "prisma", "KitchenStatus", "OrderStatus", "ItemType",
    `${loadSource("../lib/kitchen-contracts.js")}; return { CONTRACT_ERRORS, getKitchenContractForAccess };`,
  )(prisma, { ACTIVE: "ACTIVE" }, { NEW: "NEW" }, {});

  const dependencies = {
    NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200 }) },
    CONTRACT_ERRORS,
    getKitchenContractForAccess,
    getContractOrderState: async () => ({ editableOrder: null, confirmedItems: [] }),
    getOrderKindForContractNumber: () => "live",
    ORDER_KIND_TEST: "test",
    prisma,
    PUBLIC_VISIT_EVENT_TYPES: {},
    safelyTrackPublicVisitEvent: async (event) => { events.push(event); },
    assertContractAllowsRepurchase,
    REPURCHASE_UNAVAILABLE_CODE,
    REPURCHASE_UNAVAILABLE_MESSAGE,
  };
  const POST = new Function(...Object.keys(dependencies),
    `${loadSource("../app/api/kitchen-access/route.js")}; return POST;`,
  )(...Object.values(dependencies));
  return { POST, events };
}

const activeContract = {
  id: "contract-1", contractNumber: "670105651", isActive: true,
  kitchen: { slug: "available-kitchen", status: "ACTIVE" },
};

for (const [description, contract, number] of [
  ["unknown contract", null, "999999999"],
  ["missing kitchen", { ...activeContract, kitchen: null }, "670105651"],
  ["inactive kitchen", { ...activeContract, kitchen: { status: "INACTIVE" } }, "670105651"],
  ["explicitly restricted contract", activeContract, "670105650"],
]) {
  test(`${description} returns the existing localized modal code`, async () => {
    const { POST, events } = loadRoute(contract);
    const response = await POST({ json: async () => ({ contractNumber: number }) });
    assert.equal(response.body.ok, false);
    assert.equal(response.body.code, REPURCHASE_UNAVAILABLE_CODE);
    assert.equal(response.body.error, REPURCHASE_UNAVAILABLE_MESSAGE);
    assert.ok(response.status >= 400);
    assert.equal(events.at(-1).contractNumber, number);
  });
}

test("available kitchen continues to the configurator", async () => {
  const { POST } = loadRoute(activeContract);
  const response = await POST({ json: async () => ({ contractNumber: " 670 105651 " }) });
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.kitchenSlug, "available-kitchen");
});

for (const [description, contract, number, lookupError] of [
  ["empty input", null, ""],
  ["inactive contract", { ...activeContract, isActive: false }, "670105651"],
  ["database failure", null, "670105651", new Error("Database unavailable")],
]) {
  test(`${description} keeps its own error instead of the kitchen notice`, async () => {
    const { POST } = loadRoute(contract, lookupError);
    const response = await POST({ json: async () => ({ contractNumber: number }) });
    assert.equal(response.body.ok, false);
    assert.equal(response.body.code, undefined);
    assert.notEqual(response.body.error, REPURCHASE_UNAVAILABLE_MESSAGE);
    assert.ok(response.status >= 400);
  });
}

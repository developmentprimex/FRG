import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { getAdminPagination } from "../lib/admin-pagination.js";
import { getPriceBreakdown } from "../lib/price-utils.js";

function loadFunctions(file, names, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const context = vm.createContext(dependencies);
  for (const name of names) {
    const match = source.match(new RegExp(`(?:export )?(?:async )?function ${name}\\([^]*?^}`, "m"));
    assert.ok(match, name);
    vm.runInContext(match[0].replace(/^export /, ""), context);
  }
  return context;
}

test("orders fetch only the requested page while totals cover all matching orders", async () => {
  let listQuery;
  const delegate = {
    groupBy: async ({ where }) => {
      assert.equal(where.status, "CONFIRMED");
      return [{ status: "CONFIRMED", _count: { _all: 41 }, _sum: { totalPrice: 119 } }];
    },
    findMany: async (args) => {
      listQuery = args;
      return [{ id: "last", totalPrice: "119", kitchenContractId: null }];
    },
  };
  let selectedKind;
  const api = loadFunctions("../lib/catalog.js", ["getAdminOrderWhere", "getOrdersPageForAdmin", "getOrdersForAdminByKind", "addContractOrderSequence"], {
    prisma: {}, getAdminPagination, getPriceBreakdown, ORDER_KIND_LIVE: "live",
    OrderStatus: { CONFIRMED: "CONFIRMED" },
    getOrderDelegate: (_, kind) => { selectedKind = kind; return delegate; },
  });
  const result = await api.getOrdersPageForAdmin({ status: "CONFIRMED" }, 999, "test");
  assert.equal(selectedKind, "test");
  assert.equal(listQuery.skip, 40);
  assert.equal(listQuery.take, 20);
  assert.equal(listQuery.where.status, "CONFIRMED");
  assert.equal(result.pagination.page, 3);
  assert.equal(result.summary.totalOrders, 41);
  assert.equal(result.summary.confirmedGross, 119);
  assert.equal(result.summary.confirmedNet, 100);
  assert.equal(result.summary.confirmedVat, 19);
  assert.equal(result.pagination.items[0].totalPrice, 119);
});

test("contract sequence includes earlier orders outside the visible page", async () => {
  const api = loadFunctions("../lib/catalog.js", ["addContractOrderSequence"], {
    prisma: {}, ORDER_KIND_LIVE: "live", getOrderDelegate: () => ({ findMany: async () => [
      { id: "first", kitchenContractId: "contract" }, { id: "visible", kitchenContractId: "contract" },
    ] }),
  });
  const [row] = await api.addContractOrderSequence([{ id: "visible", kitchenContractId: "contract" }]);
  assert.equal(row.contractOrderSequence, 2);
  assert.equal(row.contractOrderCount, 2);
});

test("cancellation counts retain all statuses while search and pagination limit rows", async () => {
  let listQuery;
  let countQuery;
  const api = loadFunctions("../lib/order-cancellations.js", ["getCancellationRequestsPage", "getCancellationRequestForAdmin"], {
    getAdminPagination, ADMIN_ORDER_SELECT: { id: true },
    prisma: { orderCancellationRequest: {
      groupBy: async (args) => { countQuery = args; return [
        { status: "RECEIVED", _count: { _all: 25 } }, { status: "APPROVED", _count: { _all: 8 } },
      ]; },
      findMany: async (args) => { listQuery = args; return []; },
      findUnique: async ({ where }) => ({ id: where.id }),
    } },
  });
  const result = await api.getCancellationRequestsPage({ status: "RECEIVED", q: "customer", page: 2 });
  assert.equal(countQuery.where.OR[0].referenceNumber.contains, "customer");
  assert.equal(countQuery.where.status, undefined);
  assert.equal(listQuery.where.status, "RECEIVED");
  assert.equal(listQuery.skip, 20);
  assert.equal(listQuery.take, 20);
  assert.equal(result.totalMatching, 33);
  assert.equal(result.pagination.totalItems, 25);
  assert.equal((await api.getCancellationRequestForAdmin("one")).id, "one");
});

test("empty and invalid pagination cannot produce a negative database offset", () => {
  for (const page of [undefined, "bad", -1, 999]) {
    const result = getAdminPagination(0, page);
    assert.equal(result.page, 1);
    assert.equal(result.totalPages, 1);
  }
});

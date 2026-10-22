import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { getAdminPagination } from "../lib/admin-pagination.js";
import { getPriceBreakdown } from "../lib/price-utils.js";
import { filterAdminKitchens } from "../lib/admin-kitchen-search.js";
import { Prisma } from "@prisma/client";

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

test("kitchen search preserves normalization and hydrates only the matching page", async () => {
  let query;
  const candidates = Array.from({ length: 25 }, (_, index) => ({ id: String(index), name: "Küche 105 807" }));
  const api = loadFunctions("../lib/catalog.js", ["listKitchensPageForAdmin"], {
    getAdminPagination, filterAdminKitchens,
    prisma: { kitchen: { findMany: async (args) => {
      if (args.select.description) return [...candidates, { id: "other", name: "Other kitchen" }];
      query = args;
      return [];
    } } },
  });
  const result = await api.listKitchensPageForAdmin("kuche105807", 2);
  assert.equal(result.totalItems, 25);
  assert.equal(result.totalKitchens, 26);
  assert.equal(query.where.id.in.length, 5);
  assert.equal(query.where.id.in[0], "20");
  const emptyResult = await api.listKitchensPageForAdmin("missing", 999);
  assert.equal(emptyResult.totalItems, 0);
  assert.equal(emptyResult.totalKitchens, 26);
  assert.equal(query.where.id.in.length, 0);
});

test("unfiltered kitchens use bounded database reads", async () => {
  let query;
  const api = loadFunctions("../lib/catalog.js", ["listKitchensPageForAdmin"], {
    getAdminPagination, filterAdminKitchens,
    prisma: { kitchen: { count: async () => 41, findMany: async (args) => { query = args; return []; } } },
  });
  assert.equal((await api.listKitchensPageForAdmin("", 999)).page, 3);
  assert.equal(query.skip, 40);
  assert.equal(query.take, 20);
});

test("contracts apply usage/search filters to both count and bounded detail query", async () => {
  const queries = [];
  const api = loadFunctions("../lib/catalog.js", ["listKitchenContractsForAdmin"], {
    Prisma, getAdminPagination,
    attachOrdersToContracts: async rows => rows,
    attachRegistrationsToContracts: async rows => rows,
    prisma: { $queryRaw: async (strings, ...values) => {
      const query = Prisma.sql(strings, ...values);
      queries.push(query);
      return query.text.includes('matching_contracts') ? [{ total: 41n }] : [];
    } },
  });
  const result = await api.listKitchenContractsForAdmin({ usage: "multiple", query: "Berlin", status: "active" }, 999);
  assert.equal(result.page, 3);
  assert.equal(result.totalItems, 41);
  for (const query of queries) {
    assert.match(query.text, /HAVING COUNT\(o\."id"\) >= 2/);
    assert.ok(query.values.includes('%Berlin%'));
    assert.match(query.text, /kc\."isActive" = true/);
  }
  assert.deepEqual(queries[1].values.slice(-2), [20, 40]);
  queries.length = 0;
  await api.listKitchenContractsForAdmin({ contractId: "detail" });
  assert.equal(queries.length, 1);
  assert.doesNotMatch(queries[0].text, /OFFSET/);
});

test("contract database pagination agrees with the full filtered list", {
  skip: process.env.ADMIN_PERFORMANCE_DB_TEST !== "1",
}, async () => {
  const { prisma } = await import("../lib/prisma.js");
  const api = loadFunctions("../lib/catalog.js", ["listKitchenContractsForAdmin"], {
    Prisma, prisma, getAdminPagination,
    attachOrdersToContracts: async rows => rows,
    attachRegistrationsToContracts: async rows => rows,
  });
  try {
    for (const filters of [{}, { usage: "unused" }, { usage: "multiple" }, { status: "active" }, { query: "105" }]) {
      const all = await api.listKitchenContractsForAdmin(filters);
      const page = await api.listKitchenContractsForAdmin(filters, 2);
      assert.equal(page.totalItems, all.length);
      const offset = (page.page - 1) * page.pageSize;
      assert.deepEqual(page.items.map(row => row.id), all.slice(offset, offset + page.pageSize).map(row => row.id));
    }
  } finally { await prisma.$disconnect(); }
});

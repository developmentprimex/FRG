import assert from "node:assert/strict";
import test from "node:test";
// Provide a database double before loading modules so no live database is used.
const unexpectedQuery = async () => { throw new Error("Unexpected database query"); };
const prisma = { publicVisitEvent: {
  create: unexpectedQuery,
  deleteMany: unexpectedQuery,
  count: unexpectedQuery,
  findMany: unexpectedQuery,
} };
globalThis.prisma = prisma;
const { loadContractAccessPageData } = await import("../lib/public-visit-reports.js");
const { PUBLIC_VISIT_EVENT_TYPES, trackPublicVisitEvent } = await import("../lib/public-visit-tracking.js");

test("retention cleanup preserves old contract access attempts", async (t) => {
  const oldDate = new Date("2000-01-01");
  const retainedTypes = [
    PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED,
    PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED,
    PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED,
    PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED,
  ];
  let rows = [...retainedTypes, PUBLIC_VISIT_EVENT_TYPES.PAGE_OPENED].map((eventType) => ({
    eventType, createdAt: oldDate,
  }));
  let cleanupCalled = false;
  t.mock.method(prisma.publicVisitEvent, "create", async ({ data }) => data);
  t.mock.method(prisma.publicVisitEvent, "deleteMany", async ({ where }) => {
    cleanupCalled = true;
    rows = rows.filter((row) => !(
      row.createdAt < where.createdAt.lt
      && !where.eventType.notIn.includes(row.eventType)
    ));
    return { count: 1 };
  });
  await trackPublicVisitEvent({ eventType: PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED });
  assert.equal(cleanupCalled, true);
  assert.deepEqual(rows.map((row) => row.eventType), retainedTypes);
});

test("contract history exposes entries beyond the first 100 and keeps date filters", async (t) => {
  const rows = Array.from({ length: 205 }, (_, id) => ({ id: String(id) }));
  const filters = { dateFrom: "2025-01-01", dateTo: "2025-12-31" };
  let countWhere;
  let query;
  t.mock.method(prisma.publicVisitEvent, "count", async ({ where }) => {
    countWhere = where;
    return rows.length;
  });
  t.mock.method(prisma.publicVisitEvent, "findMany", async (args) => {
    query = args;
    return rows.slice(args.skip, args.skip + args.take);
  });

  const second = await loadContractAccessPageData(filters, "2");
  assert.equal(second.page, 2);
  assert.equal(second.totalPages, 3);
  assert.equal(second.total, 205);
  assert.deepEqual(second.events, rows.slice(100, 200));
  assert.deepEqual(query.where, countWhere);
  assert.equal(query.where.createdAt.gte.toISOString(), "2025-01-01T00:00:00.000Z");
  assert.ok(query.where.createdAt.lte >= query.where.createdAt.gte);
  assert.deepEqual(query.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);

  const last = await loadContractAccessPageData(filters, "999");
  assert.equal(last.page, 3);
  assert.deepEqual(last.events, rows.slice(200));
  for (const invalid of ["bad", "-2", "1.5"]) {
    assert.equal((await loadContractAccessPageData(filters, invalid)).page, 1);
  }
});

test("empty contract history uses the first page without an invalid offset", async (t) => {
  t.mock.method(prisma.publicVisitEvent, "count", async () => 0);
  t.mock.method(prisma.publicVisitEvent, "findMany", async ({ skip }) => {
    assert.equal(skip, 0);
    return [];
  });
  assert.deepEqual(await loadContractAccessPageData({}, "999"), {
    events: [], page: 1, total: 0, totalPages: 1,
  });
});

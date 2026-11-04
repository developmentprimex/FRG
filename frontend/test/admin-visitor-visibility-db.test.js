import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { loadContractAccessPageData, loadRecentServiceVisitData, loadServiceVisitSummary } from "../lib/public-visit-reports.js";

// Read-only integration test: CTE fixtures shadow the database tables.
test("111 visits are excluded before counts, pagination and claim summary aggregation", {
  skip: process.env.ADMIN_PERFORMANCE_DB_TEST !== "1",
}, async (t) => {
  const createdAt = "2026-11-03T12:00:00Z";
  const rows = [];
  const add = (id, eventType, extra = {}) => rows.push({ id, eventType, createdAt,
    contractNumberLast4: "5678", ...extra });
  for (let i = 0; i < 130; i++) {
    add(`test-${i}`, "CONTRACT_TEST_ACCEPTED");
    add(`claim-test-${i}`, "SERVICE_CONTRACT_FOUND", { metadata: { orderKind: "test" } });
  }
  for (let i = 0; i < 105; i++) add(`live-${String(i).padStart(3, "0")}`, "CONTRACT_ACCEPTED", { contractNumber: "670123456" });
  for (const eventType of ["CONTRACT_REJECTED", "SERVICE_CONTRACT_FOUND", "SERVICE_CLAIM_SUBMITTED"]) {
    add(`stored-${eventType}`, eventType, { contractNumber: " 111 123456" });
    add(`linked-${eventType}`, eventType, { kitchenContractId: "test-contract" });
    add(`metadata-${eventType}`, eventType, { metadata: { orderKind: "test" } });
  }
  add("live-found", "SERVICE_CONTRACT_FOUND", { contractNumber: "670123456" });
  add("live-claim", "SERVICE_CLAIM_SUBMITTED", { contractNumber: "670123456" });
  add("live-not-found", "SERVICE_CONTRACT_NOT_FOUND", { contractNumber: "670999999" });
  add("old-live", "CONTRACT_ACCEPTED", { createdAt: "2025-01-01T12:00:00Z" });
  const queryRaw = prisma.$queryRaw.bind(prisma);
  const findMany = prisma.publicVisitEvent.findMany;
  prisma.$queryRaw = (strings, ...values) => queryRaw(Prisma.sql`
    WITH "KitchenContract" AS (
      SELECT 'test-contract'::text AS id, '111123456'::text AS "contractNumber"
    ), "PublicVisitEvent" AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS fixture(
        id text, "eventType" text, "contractNumber" text, metadata jsonb,
        "kitchenContractId" text, "contractNumberLast4" text, "createdAt" timestamp,
        path text, "visitorKey" text, "ipHash" text, "userAgentHash" text
      )
    ) ${Prisma.sql(strings, ...values)}
  `);
  prisma.publicVisitEvent.findMany = async ({ where }) => rows.filter(row => where.id.in.includes(row.id));
  t.after(async () => {
    prisma.$queryRaw = queryRaw;
    prisma.publicVisitEvent.findMany = findMany;
    await prisma.$disconnect();
  });
  const filters = { excludeTestContracts: true, dateFrom: "2026-11-01", dateTo: "2026-11-30" };
  const access = await loadContractAccessPageData(filters, 2);
  assert.equal(access.total, 105);
  assert.equal(access.page, 2);
  assert.equal(access.totalPages, 2);
  assert.equal(access.events.length, 5);
  assert.ok(access.events.every(row => row.id.startsWith("live-")));
  const claims = await loadRecentServiceVisitData(filters);
  assert.deepEqual(claims.map(row => row.id).sort(), ["live-claim", "live-found"]);
  const summary = await loadServiceVisitSummary(filters);
  assert.equal(summary.found, 1);
  assert.equal(summary.notFound, 1);
  assert.equal(summary.claimsSubmitted, 1);
  assert.equal(summary.testLookups, 0);
  const unrestricted = await loadServiceVisitSummary({ dateFrom: filters.dateFrom });
  assert.ok(unrestricted.testLookups > 0);
});

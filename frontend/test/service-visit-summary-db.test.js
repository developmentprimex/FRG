import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { calculateServiceVisitSummary, loadServiceVisitSummary } from "../lib/public-visit-reports.js";

// Opt-in read-only PostgreSQL test: the CTE shadows the real table with fixtures.
test("SQL service summary matches existing semantics for identities, junk, PX and dates", {
  skip: process.env.ADMIN_PERFORMANCE_DB_TEST !== "1",
}, async (t) => {
  const fixtures = [
    { eventType: "PAGE_OPENED", path: "/service", visitorKey: "same" },
    { eventType: "PAGE_OPENED", path: "/service", visitorKey: "same" },
    { eventType: "PAGE_OPENED", path: "/service", ipHash: "ip", userAgentHash: "ua" },
    { eventType: "PAGE_OPENED", path: "/service", visitorKey: "", ipHash: "", userAgentHash: "ua" },
    { eventType: "PAGE_OPENED", path: "/service" },
    { eventType: "PAGE_OPENED", path: "/", visitorKey: "other" },
    { eventType: "SERVICE_CONTRACT_LOOKUP", contractNumberLast4: " INED " },
    { eventType: "SERVICE_CONTRACT_LOOKUP", contractNumberLast4: "ined", kitchenContractId: "real" },
    { eventType: "SERVICE_CONTRACT_FOUND", metadata: { orderKind: "test" } },
    { eventType: "SERVICE_CONTRACT_FOUND", metadata: { orderKind: "live" } },
    { eventType: "SERVICE_CONTRACT_NOT_FOUND" },
    { eventType: "SERVICE_CLAIM_SUBMITTED" },
    { eventType: "SERVICE_CLAIM_SUBMITTED", createdAt: "2025-01-01T12:00:00Z" },
  ].map((row) => ({ createdAt: "2026-10-16T12:00:00Z", ...row }));
  const queryRaw = prisma.$queryRaw.bind(prisma);
  t.after(async () => { prisma.$queryRaw = queryRaw; await prisma.$disconnect(); });
  prisma.$queryRaw = (strings, ...values) => queryRaw(Prisma.sql`
    WITH "PublicVisitEvent" AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(fixtures)}::jsonb) AS fixture(
        "eventType" text, "path" text, "visitorKey" text, "ipHash" text, "userAgentHash" text,
        "metadata" jsonb, "kitchenContractId" text, "contractNumberLast4" text, "createdAt" timestamp
      )
    ) ${Prisma.sql(strings, ...values)}
  `);
  assert.deepEqual(await loadServiceVisitSummary(), calculateServiceVisitSummary(fixtures));
  assert.deepEqual(await loadServiceVisitSummary({ dateFrom: "2026-10-01", dateTo: "2026-10-31" }),
    calculateServiceVisitSummary(fixtures.filter((row) => row.createdAt.startsWith("2026"))));
  assert.deepEqual(await loadServiceVisitSummary({ dateFrom: "2030-01-01" }), calculateServiceVisitSummary([]));
  await prisma.$disconnect();
});

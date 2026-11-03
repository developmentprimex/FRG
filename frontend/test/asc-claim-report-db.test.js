// SELECT-only CTE fixtures: no database records or mail deliveries are created.
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { normalizeAscKitchenFilters } from "../lib/asc-kitchen-report.js";
import { buildAscClaimReportSql, buildAscClaimDetailsSql, buildAscClaimDeliveriesSql, assembleAscClaimReport } from "../lib/asc-claim-report.js";

const fixture = Prisma.raw(`WITH
 "KitchenContract" (id, "kitchenId", "contractType", "contractNumber") AS (VALUES
  ('f1','k1','FRG','670000001'),('f1-alias','k1','FRG',' 670000001 '),('f2','k1','FRG','222000001'),
  ('a1','shell','ARC','670100001'),('a2','shell','ARC','670100002'),('px','k1','FRG','111000001')),
 "ServiceClaim" (id, "contractNumber", "createdAt", "claimSequence", "ticketSeries") AS (VALUES
  ('old','670 000001',timestamp '2026-09-10',1,'live'),
  ('frg','222000001',timestamp '2026-09-30 22:00',7,'live'),
  ('arc1','670100001',timestamp '2026-10-25 22:59:59',1,'live'),
  ('arc2','670100002',timestamp '2026-10-25 12:00',1,'live'),
  ('next','670100001',timestamp '2026-10-25 23:00',3,'live'),
  ('unknown','999000001',timestamp '2026-10-25 12:00',1,'live'),
  ('px',' 111 000001',timestamp '2026-10-25 12:00',1,'test'),
  ('test-series','670000001',timestamp '2026-10-25 12:00',2,'test')),
 "ServiceClaimEmailAttempt" (id, "claimId", "attemptedAt", delivery) AS (VALUES
  ('old','old',timestamp '2026-09-10','{"recipients":[{"email":" KD@MYARCHITECTO.DE ","status":"SENT"},{"email":"kd@myarchitecto.de","status":"SENT"},{"email":"verwaltung@hbi-wohnen.de","status":"SENT"}]}'::jsonb),
  ('frg','frg',timestamp '2026-10-01','{"recipients":[{"email":"kd@myarchitecto.de","status":"SENT"},{"email":"verwaltung@hbi-wohnen.de","status":"SENT"}]}'::jsonb),
  ('resend','old',timestamp '2026-10-25 10:00','{"recipients":[{"email":"kd@myarchitecto.de","status":"SENT"},{"email":"verwaltung@hbi-wohnen.de","status":"FAILED"},{"email":"other@example.com","status":"SENT"}]}'::jsonb),
  ('arc','arc1',timestamp '2026-10-25 22:59:59','{"recipients":[{"email":"kd@myarchitecto.de","status":"SENT"},{"email":"verwaltung@hbi-wohnen.de","status":"SENT"}]}'::jsonb),
  ('unknown','unknown',timestamp '2026-10-25 12:00','{"recipients":[{"email":"verwaltung@hbi-wohnen.de","status":"SENT"},{"email":"kd@myarchitecto.de","status":"UNKNOWN"}]}'::jsonb),
  ('future','old',timestamp '2026-10-25 23:00','{"recipients":[{"email":"kd@myarchitecto.de","status":"SENT"}]}'::jsonb),
  ('confirmation','arc2',timestamp '2026-10-25 12:00','{"kind":"customer-confirmation","recipients":[{"email":"kd@myarchitecto.de","status":"SENT"}]}'::jsonb),
  ('bad','arc2',timestamp '2026-10-25 12:00','{"recipients":{}}'::jsonb),
  ('px','px',timestamp '2026-10-25 12:00','{"recipients":[{"email":"kd@myarchitecto.de","status":"SENT"}]}'::jsonb),
  ('test-series','test-series',timestamp '2026-10-25 12:00','{"recipients":[{"email":"kd@myarchitecto.de","status":"SENT"}]}'::jsonb)), `);

function withFixture(query) {
  const tail = Prisma.sql([query.strings[0].replace(/^\s*WITH\s+/, ""), ...query.strings.slice(1)], ...query.values);
  return Prisma.sql`${fixture}${tail}`;
}

test("ASC cases and successful deliveries reconcile across months, recipients, sources, resends and kitchen repeats", { skip: !process.env.DATABASE_URL }, async () => {
  try {
    const now = new Date("2026-11-02T10:00Z");
    const day = normalizeAscKitchenFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25" }, now);
    const records = await prisma.$queryRaw(withFixture(buildAscClaimReportSql(day)));
    const report = assembleAscClaimReport(records, day);
    assert.deepEqual(report.previous, { claims: 2, emailsKd: 2, emailsHbi: 2 });
    assert.deepEqual(report.current, { claims: 3, emailsKd: 2, emailsHbi: 2 });
    assert.deepEqual(report.total, { claims: 5, emailsKd: 4, emailsHbi: 4 });
    const details = await prisma.$queryRaw(withFixture(buildAscClaimDetailsSql(day)));
    assert.equal(details.length, report.total.claims);
    const byId = new Map(details.map(row => [row.id, row]));
    assert.equal(byId.get("old").kitchenClaimsTotal, 2);
    assert.equal(byId.get("frg").kitchenClaimOrdinal, 2);
    assert.equal(byId.get("frg").claimSequence, 7);
    assert.equal(byId.get("arc1").kitchenClaimsTotal, 1);
    assert.equal(byId.get("arc2").kitchenClaimsTotal, 1);
    assert.equal(byId.get("arc1").kitchenClaimsInPeriod, 1);
    assert.notEqual(byId.get("arc1").kitchenKey, byId.get("arc2").kitchenKey);
    const deliveries = await prisma.$queryRaw(withFixture(buildAscClaimDeliveriesSql(day)));
    assert.equal(deliveries.length, report.total.emailsKd + report.total.emailsHbi);
    assert.equal(deliveries.filter(row => row.attemptId === "old" && row.recipient === "kd@myarchitecto.de").length, 1);
    assert(!deliveries.some(row => ["px", "test-series", "confirmation", "future", "bad"].includes(row.attemptId)));
    for (const [contractType, total] of [["FRG", { claims: 2, emailsKd: 3, emailsHbi: 2 }], ["ARC", { claims: 2, emailsKd: 1, emailsHbi: 1 }]]) {
      const filters = normalizeAscKitchenFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25", contractType }, now);
      const result = assembleAscClaimReport(await prisma.$queryRaw(withFixture(buildAscClaimReportSql(filters))), filters);
      assert.deepEqual(result.total, total);
    }
    const month = normalizeAscKitchenFilters({ month: "2026-10" }, now);
    const monthly = assembleAscClaimReport(await prisma.$queryRaw(withFixture(buildAscClaimReportSql(month))), month);
    assert.deepEqual(monthly.previous, { claims: 1, emailsKd: 1, emailsHbi: 1 });
    assert.deepEqual(monthly.current, { claims: 5, emailsKd: 4, emailsHbi: 3 });
    const allFilters = normalizeAscKitchenFilters({ period: "ALL" }, now);
    const all = assembleAscClaimReport(await prisma.$queryRaw(withFixture(buildAscClaimReportSql(allFilters))), allFilters);
    assert.deepEqual(all.previous, { claims: 0, emailsKd: 0, emailsHbi: 0 });
    assert.deepEqual(all.total, { claims: 6, emailsKd: 5, emailsHbi: 4 });
  } finally { await prisma.$disconnect(); }
});

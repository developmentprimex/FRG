// Optional PostgreSQL check: node --env-file=.env --test test/business-reports-db.test.js
// Uses only SELECTs and CTE fixtures, never writes to the connected database.
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { buildBusinessReportSql, assembleBusinessReport } from "../lib/admin-business-reports.js";
import { normalizeBusinessReportFilters } from "../lib/business-report-filters.js";
import { buildServiceClaimListWhere } from "../lib/service-claim-admin-query.js";

const fixture = Prisma.raw(`WITH
  "KitchenContract" (id, "contractNumber", "contractType", "kitchenId", "createdAt") AS (VALUES
    ('f1', '670000001', 'FRG', 'k1', timestamp '2026-09-01'),
    ('f2', '670000002', 'FRG', 'k1', timestamp '2026-10-24 22:00'),
    ('a1', '670000003', 'ARC', 'k2', timestamp '2026-10-25 22:59:59'),
    ('a2', '670000004', 'ARC', 'k2', timestamp '2026-10-25 23:00'),
    ('px', '111000001', 'FRG', 'kp', timestamp '2026-10-25 10:00')
  ), "Kitchen" (id, "createdAt") AS (VALUES
    ('k1', timestamp '2026-08-01'), ('k2', timestamp '2026-08-01'), ('kp', timestamp '2026-08-01')
  ), "Order" (id, "contractNumber", "kitchenContractId", status, "createdAt", "totalPrice") AS (VALUES
    ('old', '670000001', 'f1', 'CONFIRMED', timestamp '2026-09-10', 595.00::numeric),
    ('in', '670000002', 'f2', 'CONFIRMED', timestamp '2026-10-24 22:00', 119.00::numeric),
    ('small-a', '670000002', 'f2', 'NEW', timestamp '2026-10-25 12:00', 0.03::numeric),
    ('small-b', '670000002', 'f2', 'CANCELLED', timestamp '2026-10-25 12:01', 0.03::numeric),
    ('out', '670000002', 'f2', 'CANCELLED', timestamp '2026-10-25 23:00', 238.00::numeric),
    ('px-order', '111000001', 'px', 'CONFIRMED', timestamp '2026-10-25 10:00', 11900.00::numeric)
  ), "ServiceClaim" (id, "contractNumber", "createdAt") AS (VALUES
    ('claim', '670000003', timestamp '2026-09-10'),
    ('new-claim', '670000002', timestamp '2026-10-24 22:00'),
    ('out-claim', '670000002', timestamp '2026-10-25 23:00'),
    ('px-claim', '111000001', timestamp '2026-10-25 12:00')
  ), "OrderEmailAttempt" (id, "orderId", "orderKind", "attemptedAt", delivery) AS (VALUES
    ('e1', 'old', 'live', timestamp '2026-10-25 12:00', '{"recipients":[{"email":"a@example.com","status":"SENT"},{"email":"A@example.com","status":"SENT"},{"email":"b@example.com","status":"FAILED"}]}'::jsonb),
    ('e2', 'old', 'test', timestamp '2026-10-25 12:00', '{"recipients":[{"email":"test@example.com","status":"SENT"}]}'::jsonb),
    ('e3', 'old', 'live', timestamp '2026-10-25 13:00', '{"recipients":[{"email":"a@example.com","status":"SENT"}]}'::jsonb)
  ), "ServiceClaimEmailAttempt" (id, "claimId", "attemptedAt", delivery) AS (VALUES
    ('ce1', 'claim', timestamp '2026-10-25 12:00', '{"recipients":[{"email":" KD@MYARCHITECTO.DE ","status":"SENT"},{"email":"kd@myarchitecto.de","status":"SENT"},{"email":"verwaltung@hbi-wohnen.de","status":"SENT"},{"email":"other@example.com","status":"UNKNOWN"}]}'::jsonb),
    ('ce2', 'px-claim', timestamp '2026-10-25 12:00', '{"recipients":[{"email":"kd@myarchitecto.de","status":"SENT"}]}'::jsonb),
    ('ce3', 'claim', timestamp '2026-10-25 13:00', '{"recipients":[{"email":"verwaltung@hbi-wohnen.de","status":"FAILED"},{"email":"kd@myarchitecto.de","status":"UNKNOWN"}]}'::jsonb),
    ('ce4', 'claim', timestamp '2026-10-25 14:00', '{"recipients":[{"email":"kd@myarchitecto.de","status":"SENT"}]}'::jsonb),
    ('ce5', 'new-claim', timestamp '2026-10-25 14:00', '{"recipients":[{"email":"334primex.eu@gmail.com","status":"SENT"}]}'::jsonb)
  ), "ClaimFeedbackInvitation" ("claimId", "sentAt") AS (VALUES ('claim', timestamp '2026-10-25 14:00')),
  "OrderCancellationRequest" ("submittedContractNumber", "receivedAt", status, "customerEmailSentAt", "internalEmailSentAt", "finalEmailSentAt") AS (VALUES
    ('670000001', timestamp '2026-10-24 22:00', 'APPROVED', timestamp '2026-10-25 15:00', timestamp '2026-10-25 15:00', NULL::timestamp),
    ('670000003', timestamp '2026-10-25 22:59:59', 'RECEIVED', NULL::timestamp, NULL::timestamp, NULL::timestamp),
    ('999999999', timestamp '2026-10-25 12:00', 'REJECTED', NULL::timestamp, NULL::timestamp, NULL::timestamp),
    ('670000001', timestamp '2026-10-25 23:00', 'RECEIVED', NULL::timestamp, NULL::timestamp, NULL::timestamp),
    ('111000001', timestamp '2026-10-25 12:00', 'RECEIVED', NULL::timestamp, NULL::timestamp, NULL::timestamp)
  ), `);

test("SQL reconciles source split, first model dates, DST, send dates, recipients and test exclusions", { skip: !process.env.DATABASE_URL }, async () => {
  try {
    for (const groupBy of ["DAY", "WEEK", "MONTH"]) {
      const filters = normalizeBusinessReportFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25", groupBy });
      const sql = buildBusinessReportSql(filters);
      const tail = Prisma.sql([sql.strings[0].replace(/^\s*WITH\s+/, ""), ...sql.strings.slice(1)], ...sql.values);
      const records = await prisma.$queryRaw(Prisma.sql`${fixture}${tail}`);
      const report = assembleBusinessReport(records, filters);
      assert.deepEqual(report.Fragmento.total, { orders: 3, salesNet: 100.06, salesGross: 119.06, cancellationRequests: 3, kitchens: 0, contracts: 1, emails: 4 });
      assert.deepEqual(report.ASC.total, { claims: 1, frgKitchens: 0, arcKitchens: 1, emailsKd: 2, emailsHbi: 1 });
      assert.equal(report.ASC.rows[0].period, { DAY: "2026-10-25", WEEK: "2026-10-19", MONTH: "2026-10-01" }[groupBy]);
    }
    const filters = normalizeBusinessReportFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25", contractType: "ARC" });
    const sql = buildBusinessReportSql(filters);
    const tail = Prisma.sql([sql.strings[0].replace(/^\s*WITH\s+/, ""), ...sql.strings.slice(1)], ...sql.values);
    const report = assembleBusinessReport(await prisma.$queryRaw(Prisma.sql`${fixture}${tail}`), filters);
    assert.equal(report.Fragmento.total.orders, 0);
    assert.equal(report.Fragmento.total.salesNet, 0);
    assert.equal(report.Fragmento.total.salesGross, 0);
    assert.equal(report.Fragmento.total.cancellationRequests, 1);
    assert.equal(report.Fragmento.total.emails, 0);
    assert.equal(report.ASC.total.emailsKd, 2);
    assert.equal(report.ASC.total.emailsHbi, 1);
    const where = buildServiceClaimListWhere({ dateFrom: "2026-10-25", dateTo: "2026-10-25", claimType: "live" });
    const detailRows = await prisma.$queryRaw(Prisma.sql`${fixture} filtered AS (SELECT sc.id FROM "ServiceClaim" sc ${where}) SELECT * FROM filtered`);
    assert.deepEqual(detailRows.map(row => row.id), ["new-claim"]);
  } finally { await prisma.$disconnect(); }
});

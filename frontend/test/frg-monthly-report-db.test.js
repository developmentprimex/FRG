// Every fixture is a SELECT/CTE; this test does not modify database records.
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { normalizeFrgMonthlyFilters, buildFrgMonthlySql, buildFrgMonthlySalesSql, assembleFrgMonthlyReport } from "../lib/frg-monthly-report.js";

const fixture = Prisma.raw(`WITH
 "Kitchen" (id, "createdAt") AS (VALUES
  ('shared',timestamp '2026-09-01'),
  ('new-kitchen',timestamp '2026-10-31 22:59:59'),
  ('future-kitchen',timestamp '2026-10-31 23:00'),
  ('test-only',timestamp '2026-10-10'),
  ('shell',timestamp '2026-10-10')),
 "KitchenContract" (id, "contractNumber", "contractType", "kitchenId", "createdAt") AS (VALUES
  ('f1','670000001','FRG','shared',timestamp '2026-09-01'),
  ('f2','222000001','FRG','shared',timestamp '2026-09-30 22:00'),
  ('duplicate','736000001','FRG','shared',timestamp '2026-10-15'),
  ('f3','670000003','FRG','new-kitchen',timestamp '2026-10-31 22:59:59'),
  ('future','670000004','FRG','future-kitchen',timestamp '2026-10-31 23:00'),
  ('a','670000005','ARC','shell',timestamp '2026-10-10'),
  ('px-only','111000006','FRG','test-only',timestamp '2026-10-10'),
  ('px',' 111 000001','FRG','shared',timestamp '2026-10-10')),
 "Order" (id, "kitchenContractId", "contractNumber", status, "totalPrice", "createdAt", "confirmedAt") AS (VALUES
  ('old','f1','670000001','CONFIRMED',119::numeric,timestamp '2026-08-01',timestamp '2026-09-10'),
  ('current','f2','222000001','CONFIRMED',238::numeric,timestamp '2026-09-01',timestamp '2026-09-30 22:00'),
  ('legacy','f3','670000003','CONFIRMED',0.03::numeric,timestamp '2026-10-31 22:59:59',NULL::timestamp),
  ('future','f3','670000003','CONFIRMED',999::numeric,timestamp '2026-10-01',timestamp '2026-10-31 23:00'),
  ('new','f1','670000001','NEW',1000::numeric,timestamp '2026-10-01',NULL::timestamp),
  ('cancelled','f1','670000001','CANCELLED',2000::numeric,timestamp '2026-10-01',timestamp '2026-10-02'),
  ('arc','a','670000005','CONFIRMED',3000::numeric,timestamp '2026-10-01',timestamp '2026-10-02'),
  ('test','px','670999999','CONFIRMED',4000::numeric,timestamp '2026-10-01',timestamp '2026-10-02'),
  ('test-number','f1',' 111 222222','CONFIRMED',5000::numeric,timestamp '2026-10-01',timestamp '2026-10-02')),
 "OrderCancellationRequest" (id, "orderId", "submittedContractNumber", status, "receivedAt", "customerEmailSentAt", "internalEmailSentAt", "finalEmailSentAt") AS (VALUES
  ('old','old','670000001','RECEIVED',timestamp '2026-09-20',timestamp '2026-09-20',timestamp '2026-10-01',NULL::timestamp),
  ('received',NULL,'670000002','RECEIVED',timestamp '2026-10-02',NULL::timestamp,NULL::timestamp,NULL::timestamp),
  ('approved','cancelled','670000001','APPROVED',timestamp '2026-10-02',NULL::timestamp,NULL::timestamp,timestamp '2026-10-03'),
  ('rejected',NULL,'670000003','REJECTED',timestamp '2026-10-02',NULL::timestamp,NULL::timestamp,NULL::timestamp),
  ('unmatched',NULL,'670999998','RECEIVED',timestamp '2026-10-02',NULL::timestamp,NULL::timestamp,NULL::timestamp),
  ('px','test','670999999','RECEIVED',timestamp '2026-10-02',timestamp '2026-10-02',NULL::timestamp,NULL::timestamp),
  ('arc','arc','670000001','RECEIVED',timestamp '2026-10-02',timestamp '2026-10-02',NULL::timestamp,NULL::timestamp)),
 "OrderEmailAttempt" (id, "orderId", "orderKind", "attemptedAt", delivery) AS (VALUES
  ('old','old','live',timestamp '2026-09-10','{"recipients":[{"email":"A@example.com","status":"SENT"},{"email":" a@example.com ","status":"SENT"},{"email":"b@example.com","status":"SENT"}]}'::jsonb),
  ('resend','old','live',timestamp '2026-10-10','{"recipients":[{"email":"a@example.com","status":"SENT"},{"email":"b@example.com","status":"SENT"},{"email":"failed@example.com","status":"FAILED"},{"email":"unknown@example.com","status":"UNKNOWN"},{"email":" ","status":"SENT"}]}'::jsonb),
  ('new','new','live',timestamp '2026-10-10','{"recipients":[{"email":"c@example.com","status":"SENT"}]}'::jsonb),
  ('test-kind','old','test',timestamp '2026-10-10','{"recipients":[{"email":"x@example.com","status":"SENT"}]}'::jsonb),
  ('px','test','live',timestamp '2026-10-10','{"recipients":[{"email":"x@example.com","status":"SENT"}]}'::jsonb),
  ('arc','arc','live',timestamp '2026-10-10','{"recipients":[{"email":"x@example.com","status":"SENT"}]}'::jsonb),
  ('bad-shape','old','live',timestamp '2026-10-10','{"recipients":{}}'::jsonb)), `);

function withFixture(query) {
  return Prisma.sql`${fixture}${Prisma.sql([query.strings[0].replace(/^\s*WITH\s+/, ""), ...query.strings.slice(1)], ...query.values)}`;
}

test("monthly SQL counts each kitchen once by its creation date despite multiple contract prefixes and months", { skip: !process.env.DATABASE_URL }, async () => {
  try {
    const filters = normalizeFrgMonthlyFilters({ month: "2026-10" }, new Date("2026-11-02T10:00Z"));
    const report = assembleFrgMonthlyReport(await prisma.$queryRaw(withFixture(buildFrgMonthlySql(filters))), filters);
    assert.deepEqual(report.previous, { kitchens: 1, sales: 1, net: 100, vat: 19, gross: 119, cancellationRequests: 1, emails: 3, legacySales: 0 });
    assert.deepEqual(report.current, { kitchens: 1, sales: 2, net: 200.03, vat: 38, gross: 238.03, cancellationRequests: 4, emails: 5, legacySales: 1 });
    assert.equal(report.total.kitchens, 2);
    assert.equal(report.total.gross, 357.03);
    assert.equal(report.total.net, 300.03);
    assert.equal(report.total.vat, 57);
    const sales = await prisma.$queryRaw(withFixture(buildFrgMonthlySalesSql(filters)));
    assert.deepEqual(sales.map(order => order.id), ["old", "current", "legacy"]);
    assert.deepEqual(sales.map(order => order.historicalDateFallback), [false, false, true]);
    const partial = normalizeFrgMonthlyFilters({ month: "2026-10" }, new Date("2026-10-15T12:00Z"));
    const throughToday = assembleFrgMonthlyReport(await prisma.$queryRaw(withFixture(buildFrgMonthlySql(partial))), partial);
    assert.equal(throughToday.current.kitchens, 0);
    assert.equal(throughToday.current.sales, 1);
    assert.equal(throughToday.current.gross, 238);
    const loadRange = async input => {
      const selected = normalizeFrgMonthlyFilters(input, new Date("2026-11-02T10:00Z"));
      const records = await prisma.$queryRaw(withFixture(buildFrgMonthlySql(selected)));
      return assembleFrgMonthlyReport(records, selected);
    };
    const firstDay = await loadRange({ dateFrom: "2026-10-01", dateTo: "2026-10-01" });
    assert.equal(firstDay.previous.kitchens, 1);
    assert.equal(firstDay.current.kitchens, 0);
    assert.equal(firstDay.previous.sales, 1);
    assert.equal(firstDay.current.sales, 1);
    assert.equal(firstDay.current.gross, 238);
    assert.equal(firstDay.current.emails, 1);
    const lastDay = await loadRange({ dateFrom: "2026-10-31", dateTo: "2026-10-31" });
    assert.equal(lastDay.previous.kitchens, 1);
    assert.equal(lastDay.current.kitchens, 1);
    assert.equal(lastDay.previous.sales, 2);
    assert.equal(lastDay.current.sales, 1);
    assert.equal(lastDay.current.gross, 0.03);
    const earlyRange = await loadRange({ dateFrom: "2026-10-01", dateTo: "2026-10-30" });
    assert.equal(earlyRange.total.kitchens, 1);
    assert.equal(earlyRange.total.sales, 2);
    const beforeOctober = await loadRange({ dateTo: "2026-09-30" });
    assert.equal(beforeOctober.previous.sales, 0);
    assert.equal(beforeOctober.current.sales, 1);
    assert.equal(beforeOctober.total.gross, 119);
    const all = await loadRange({ period: "ALL" });
    assert.equal(all.previous.kitchens, 0);
    assert.equal(all.previous.sales, 0);
    assert.equal(all.current.kitchens, 3);
    assert.equal(all.total.sales, 4);
    assert.equal(all.total.gross, 1356.03);
  } finally { await prisma.$disconnect(); }
});

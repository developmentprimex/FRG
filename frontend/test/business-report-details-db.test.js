// Read-only CTE fixtures: no records are inserted or modified.
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { buildBusinessReportDetailsSql, loadBusinessReportDetails } from "../lib/business-report-details.js";
import { normalizeBusinessReportFilters } from "../lib/business-report-filters.js";

const fixture = Prisma.raw(`WITH
 "KitchenContract" (id, "contractNumber", "contractType") AS (VALUES
 ('f', '670000001', 'FRG'), ('a', '670000002', 'ARC'), ('px', '111000001', 'FRG')),
 "Order" (id, "orderNumber", "contractNumber", "kitchenContractId", "firstName", "lastName", status, "totalPrice", "createdAt") AS (VALUES
 ('a', 'O-1', '670000001', 'f', 'Test', 'A', 'CONFIRMED', 119.00::numeric, timestamp '2026-10-24 22:00'),
 ('b', 'O-2', '670000001', 'f', 'Test', 'B', 'NEW', 0.03::numeric, timestamp '2026-10-25 12:00'),
 ('c', 'O-3', '670000001', 'f', 'Test', 'C', 'CANCELLED', 0.03::numeric, timestamp '2026-10-25 12:01'),
 ('out', 'O-4', '670000001', 'f', 'Test', 'D', 'CONFIRMED', 238.00::numeric, timestamp '2026-10-25 23:00'),
 ('px', 'P-1', ' 111 000001', 'px', 'Test', 'PX', 'NEW', 11900::numeric, timestamp '2026-10-25 10:00'),
 ('parent-px', 'P-2', '670999999', 'px', 'Test', 'PX', 'NEW', 11900::numeric, timestamp '2026-10-25 10:00')),
 "ServiceClaim" (id, "contractNumber", "ticketNumber", "claimSequence", "fullName", "problemDescription", "createdAt") AS (VALUES
 ('ca', '670000002', 1001, 1, 'Test A', 'Oven', timestamp '2026-10-24 22:00'),
 ('cb', '670000002', 1002, 2, 'Test B', 'Door', timestamp '2026-10-25 22:59:59'),
 ('out', '670000002', 1003, 3, 'Test C', 'Sink', timestamp '2026-10-25 23:00'),
 ('px', ' 111 000001', 1004, 1, 'Test PX', 'Test', timestamp '2026-10-25 10:00')), `);

test("detail query returns each live record once and matches rounding, date cutoffs and source filters", { skip: !process.env.DATABASE_URL }, async () => {
  try {
    async function load(scope, contractType = "") {
      const filters = normalizeBusinessReportFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25", contractType });
      const query = buildBusinessReportDetailsSql(filters, scope);
      const tail = Prisma.sql([query.strings[0].replace(/^\s*WITH\s+/, ""), ...query.strings.slice(1)], ...query.values);
      const rows = await prisma.$queryRaw(Prisma.sql`${fixture}${tail}`);
      return loadBusinessReportDetails(filters, scope, { $queryRaw: async () => rows });
    }
    const orders = await load("FRG");
    assert.deepEqual(orders.map(row => row.reference), ["O-1", "O-2", "O-3"]);
    assert.deepEqual(orders.map(row => row.salesNet), [100, 0.03, 0.03]);
    assert.deepEqual(orders.map(row => row.salesGross), [119, 0.03, 0.03]);
    assert(orders.every(row => row.day === "2026-10-25"));
    assert.equal(orders[0].time, "00:00");
    assert.deepEqual(await load("FRG", "ARC"), []);
    const claims = await load("ASC", "ARC");
    assert.deepEqual(claims.map(row => row.reference), ["#1001 670000002 KD 01", "#1002 670000002 KD 02"]);
    assert.deepEqual(claims.map(row => row.issue), ["Oven", "Door"]);
    assert.equal(claims[1].time, "23:59");
    assert.deepEqual(await load("ASC", "FRG"), []);
  } finally { await prisma.$disconnect(); }
});

test("ASC export works on main databases without the optional ticketNumber column", { skip: !process.env.DATABASE_URL }, async () => {
  try {
    const oldSchema = Prisma.raw(`WITH "KitchenContract" (id, "contractNumber", "contractType") AS (
      VALUES ('f', '670000001', 'FRG')
    ), "ServiceClaim" (id, "contractNumber", "claimSequence", "fullName", "problemDescription", "createdAt") AS (
      VALUES ('claim', '670000001', 2, 'Test Customer', 'Oven', timestamp '2026-10-25 12:00')
    ), `);
    const filters = normalizeBusinessReportFilters({ period: "ALL" });
    const query = buildBusinessReportDetailsSql(filters, "ASC");
    const tail = Prisma.sql([query.strings[0].replace(/^\s*WITH\s+/, ""), ...query.strings.slice(1)], ...query.values);
    const rows = await prisma.$queryRaw(Prisma.sql`${oldSchema}${tail}`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ticketNumber, null);
    const details = await loadBusinessReportDetails(filters, "ASC", { $queryRaw: async () => rows });
    assert.equal(details[0].reference, "670000001 KD 02");
  } finally { await prisma.$disconnect(); }
});

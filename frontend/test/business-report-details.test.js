import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx/xlsx.mjs";
import { buildBusinessReportDetailsSql, buildBusinessReportDetailSheet } from "../lib/business-report-details.js";
import { normalizeBusinessReportFilters } from "../lib/business-report-filters.js";
import { buildStandardExcelWorkbook } from "../lib/standard-excel.js";

const filters = normalizeBusinessReportFilters({ dateFrom: "2026-09-01", dateTo: "2026-09-30", groupBy: "MONTH" });
const record = (id, day, time, net, gross) => ({ id, day, time, reference: id, contractNumber: "670000001", contractType: "FRG", customer: "Test Customer", status: "CONFIRMED", salesNet: net, salesGross: gross });

test("individual orders retain their own prices and reconcile each day and the grand total", () => {
  const sheet = buildBusinessReportDetailSheet([
    record("order-c", "2026-09-24", "09:00", 50, 59.5),
    record("order-b", "2026-09-07", "12:00", 200, 238),
    record("order-a", "2026-09-07", "08:00", 100, 119),
  ], "FRG", filters);
  assert.equal(sheet.name, "Order details");
  assert.deepEqual(sheet.rows.map(row => row[2]), ["order-a", "order-b", null, "order-c", null, null]);
  assert.deepEqual(sheet.rows[0].slice(7), [1, 100, 119]);
  assert.deepEqual(sheet.rows[1].slice(7), [1, 200, 238]);
  assert.equal(sheet.rows[2][0], "TOTAL 07/09/2026");
  assert.deepEqual(sheet.rows[2].slice(7), [2, 300, 357]);
  assert.deepEqual(sheet.rows[4].slice(7), [1, 50, 59.5]);
  assert.equal(sheet.rows[5][0], "TOTAL");
  assert.deepEqual(sheet.rows[5].slice(7), [3, 350, 416.5]);
  assert.deepEqual(sheet.totalRows, [2, 4, 5]);
  const { buffer } = buildStandardExcelWorkbook({ description: "DETAILS", timeZone: "Europe/Berlin", sheets: [sheet] });
  const ws = XLSX.read(buffer, { type: "buffer", cellNF: true }).Sheets["Order details"];
  assert.equal(ws.B7.z, "dd/mm/yyyy");
  assert.equal(XLSX.utils.format_cell(ws.B7), "07/09/2026");
  assert.equal(ws.D7.v, "order-a");
  assert.equal(ws.J7.v, 100);
  assert.equal(ws.K8.v, 238);
  assert.equal(ws.J12.v, 350);
  assert.equal(ws.K12.v, 416.5);
  assert.equal(ws.J12.z, "#,##0.00");
});

test("daily totals sum rounded order cents without adding subtotals a second time", () => {
  const sheet = buildBusinessReportDetailSheet([
    record("a", "2026-09-07", "08:00", 0.03, 0.03),
    record("b", "2026-09-07", "09:00", 0.03, 0.03),
    record("c", "2026-09-08", "09:00", 0.1, 0.12),
  ], "FRG", filters);
  assert.deepEqual(sheet.rows.at(-1).slice(7), [3, 0.16, 0.18]);
});

test("orders in the repeated DST hour retain their actual chronological order", () => {
  const sheet = buildBusinessReportDetailSheet([
    { ...record("later", "2026-10-25", "02:10", 1, 1.19), createdAt: new Date("2026-10-25T01:10:00Z") },
    { ...record("earlier", "2026-10-25", "02:50", 1, 1.19), createdAt: new Date("2026-10-25T00:50:00Z") },
  ], "FRG", filters);
  assert.deepEqual(sheet.rows.slice(0, 2).map(row => row[2]), ["earlier", "later"]);
});

test("claim details retain individual references and issues without inventing sales amounts", () => {
  const sheet = buildBusinessReportDetailSheet([
    { ...record("a", "2026-09-07", "08:00"), reference: "#1001 670000001 KD 01", issue: "Oven does not heat" },
    { ...record("b", "2026-09-07", "09:00"), reference: "#1002 670000001 KD 02", issue: "Damaged door" },
  ], "ASC", filters);
  assert.equal(sheet.name, "Claim details");
  assert.equal(sheet.rows[0][2], "#1001 670000001 KD 01");
  assert.equal(sheet.rows[0][6], "Oven does not heat");
  assert.equal(sheet.rows[1][6], "Damaged door");
  assert.equal(sheet.rows[2][7], 2);
  assert.equal(sheet.rows[3][7], 2);
  assert.equal(sheet.headers.length, 8);
  assert.deepEqual(sheet.currencyColumns, []);
});

test("empty details preserve the table and zero totals for both export scopes", () => {
  for (const scope of ["FRG", "ASC"]) {
    const sheet = buildBusinessReportDetailSheet([], scope, filters);
    assert.equal(sheet.rows.length, 1);
    assert.equal(sheet.rows[0][0], "TOTAL");
    assert.equal(sheet.rows[0][7], 0);
    if (scope === "FRG") assert.deepEqual(sheet.rows[0].slice(8), [0, 0]);
  }
});

test("detail SQL binds the same Berlin date boundaries and contract filter and rejects unknown scopes", () => {
  const dst = normalizeBusinessReportFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25", contractType: "ARC" });
  for (const scope of ["FRG", "ASC"]) {
    const query = buildBusinessReportDetailsSql(dst, scope);
    assert(query.values.some(value => value instanceof Date && value.toISOString() === "2026-10-24T22:00:00.000Z"));
    assert(query.values.some(value => value instanceof Date && value.toISOString() === "2026-10-25T23:00:00.000Z"));
    assert(query.values.includes("ARC"));
  }
  assert.throws(() => buildBusinessReportDetailsSql(filters, "UNKNOWN"), /Invalid report scope/);
  assert.throws(() => buildBusinessReportDetailSheet([], "UNKNOWN", filters), /Invalid report scope/);
});

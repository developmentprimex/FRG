import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx/xlsx.mjs";
import { normalizeAscKitchenFilters, assembleAscKitchenReport, getAscKitchenReportSheets, ascActivityOnly } from "../lib/asc-kitchen-report.js";
import { assembleBusinessReport } from "../lib/admin-business-reports.js";
import { buildStandardExcelWorkbook } from "../lib/standard-excel.js";

const now = new Date("2026-10-28T10:00Z");
const filters = normalizeAscKitchenFilters({}, now);

test("ASC keeps both source categories and supports month, day, all-time and contract source filters", () => {
  assert.equal(filters.dateFrom, "2026-10-01");
  assert.equal(filters.previousDate, "2026-09-30");
  assert.equal(filters.contractType, "");
  assert.equal(normalizeAscKitchenFilters({ contractType: "ARC" }, now).contractType, "ARC");
  assert.equal(normalizeAscKitchenFilters({ contractType: "FRG" }, now).contractType, "FRG");
  const day = normalizeAscKitchenFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25" }, now);
  assert.equal(day.previousDate, "2026-10-24");
  assert.equal(day.end - day.start, 25 * 60 * 60 * 1000);
  assert.equal(normalizeAscKitchenFilters({ period: "ALL" }, now).start, null);
});

test("each category and the combined row reconcile previous plus current to total in Excel", () => {
  const report = assembleAscKitchenReport([
    { bucket: "previous", category: "fromFragmento", value: 113 },
    { bucket: "current", category: "fromFragmento", value: 29 },
    { bucket: "previous", category: "otherKitchens", value: 100 },
    { bucket: "current", category: "otherKitchens", value: 5 },
  ], filters);
  assert.deepEqual(report.total, { fromFragmento: 142, otherKitchens: 105 });
  assert.deepEqual(report.combined, { previous: 213, current: 34, total: 247 });
  const sheets = getAscKitchenReportSheets(report);
  assert.deepEqual(sheets[0].headers, ["Category", "Through 30/09/2026", "October 2026", "Total"]);
  assert.deepEqual(sheets[0].rows[0].slice(1), [113, 29, 142]);
  assert.deepEqual(sheets[0].rows[1].slice(1), [100, 5, 105]);
  assert.deepEqual(sheets[0].rows[2], ["Total", 213, 34, 247]);
  const { buffer } = buildStandardExcelWorkbook({ description: "ASC_TEST", sheets, timeZone: "Europe/Berlin", now });
  const book = XLSX.read(buffer, { type: "buffer" });
  const sheet = book.Sheets["ASC kitchens"];
  assert.equal(sheet.C7.v, 113);
  assert.equal(sheet.D7.v, 29);
  assert.equal(sheet.E7.v, 142);
  assert.equal(sheet.E8.v, 105);
  assert.equal(sheet.E9.v, 247);
  assert.equal(sheet.E9.t, "n");
  const empty = assembleAscKitchenReport([], filters);
  assert.deepEqual(empty.combined, { previous: 0, current: 0, total: 0 });
  assert.equal(getAscKitchenReportSheets(empty)[0].rows.length, 3);
});

test("ASC activity retains claims and recipient deliveries without duplicate kitchen metrics or empty dates", () => {
  const report = assembleBusinessReport([
    { scope: "ASC", period: "2026-10-01", metric: "frgKitchens", value: 20 },
    { scope: "ASC", period: "2026-10-02", metric: "arcKitchens", value: 10 },
    { scope: "ASC", period: "2026-10-03", metric: "claims", value: 2 },
    { scope: "ASC", period: "2026-10-03", metric: "emailsKd", value: 3 },
    { scope: "ASC", period: "2026-10-04", metric: "emailsHbi", value: 4 },
  ], filters);
  const activity = ascActivityOnly(report);
  assert.deepEqual(activity.ASC.columns.map(([key]) => key), ["claims", "emailsKd", "emailsHbi"]);
  assert.deepEqual(activity.ASC.rows.map(row => row.period), ["2026-10-03", "2026-10-04"]);
  assert.deepEqual(activity.ASC.total, { claims: 2, emailsKd: 3, emailsHbi: 4 });
  assert.equal(report.ASC.columns.length, 5);
  assert.equal(report.ASC.rows.length, 4);
});

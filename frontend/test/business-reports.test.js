import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx/xlsx.mjs";
import { normalizeBusinessReportFilters, buildBusinessReportQuery } from "../lib/business-report-filters.js";
import * as businessFilterHelpers from "../lib/business-report-filters.js";
import { assembleBusinessReport, buildBusinessReportSql, getBusinessReportSheets } from "../lib/admin-business-reports.js";
import { buildStandardExcelWorkbook } from "../lib/standard-excel.js";

const now = new Date("2026-10-25T23:30:00Z"); // Monday in Berlin, after the DST change.
test("calendar presets and custom ranges use Berlin days and Monday weeks", () => {
  const range = input => {
    const { dateFrom, dateTo } = normalizeBusinessReportFilters(input, now);
    return [dateFrom, dateTo];
  };
  assert.deepEqual(range({ period: "TODAY" }), ["2026-10-26", "2026-10-26"]);
  assert.deepEqual(range({ period: "THIS_WEEK" }), ["2026-10-26", "2026-10-26"]);
  assert.deepEqual(range({}), ["2026-10-01", "2026-10-26"]);
  assert.deepEqual(range({ period: "LAST_MONTH" }), ["2026-09-01", "2026-09-30"]);
  assert.deepEqual(range({ period: "ALL" }), ["", ""]);
  assert.deepEqual(range({ period: "CUSTOM" }), ["", ""]);
  assert.deepEqual(range({ dateFrom: "2026-10-26", dateTo: "2026-10-01" }), ["2026-10-01", "2026-10-26"]);
  assert.equal(normalizeBusinessReportFilters({ period: "LAST_MONTH" }, new Date("2026-01-01T10:00Z")).dateFrom, "2025-12-01");
  assert.equal(normalizeBusinessReportFilters({ groupBy: "bad" }, now).groupBy, "DAY");
});

test("detail, return and export queries preserve the exact business range and grouping", () => {
  for (const input of [{ period: "ALL", groupBy: "WEEK", contractType: "ARC" }, { dateFrom: "2026-09-01", dateTo: "2026-09-30", groupBy: "MONTH" }]) {
    const filters = normalizeBusinessReportFilters(input, now);
    const params = Object.fromEntries(new URLSearchParams(buildBusinessReportQuery(filters, { type: "CLAIM", status: "RECEIVED" })));
    assert.deepEqual(normalizeBusinessReportFilters(params, new Date("2027-01-01")), { ...filters, period: filters.period === "ALL" ? "ALL" : "CUSTOM" });
    assert.equal(params.type, "CLAIM");
    assert.equal(params.status, "RECEIVED");
  }
});

test("report SQL binds DST-sensitive range, contract type and grouping as parameters", () => {
  const filters = normalizeBusinessReportFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25", groupBy: "WEEK", contractType: "ARC" }, now);
  const query = buildBusinessReportSql(filters);
  assert(query.values.includes("week"));
  assert(query.values.includes("ARC"));
  assert(query.values.some(value => value instanceof Date && value.toISOString() === "2026-10-24T22:00:00.000Z"));
  assert(query.values.some(value => value instanceof Date && value.toISOString() === "2026-10-25T23:00:00.000Z"));
});

test("preset navigation remembers which button was clicked while freezing the exact date range", () => {
  // On Monday, Today and This week have identical dates but different selected buttons.
  const filters = normalizeBusinessReportFilters({ period: "THIS_WEEK", groupBy: "MONTH", contractType: "ARC" }, now);
  const params = Object.fromEntries(new URLSearchParams(buildBusinessReportQuery(filters, { type: "CLAIM", status: "RECEIVED" })));
  assert.equal(params.period, "CUSTOM");
  assert.equal(params.preset, "THIS_WEEK");
  assert.equal(params.dateFrom, "2026-10-26");
  assert.equal(params.dateTo, "2026-10-26");
  assert.equal(params.groupBy, "MONTH");
  assert.equal(params.contractType, "ARC");
  assert.equal(params.status, "RECEIVED");
  const normalized = normalizeBusinessReportFilters(params, now);
  assert.equal(businessFilterHelpers.getActiveBusinessReportPeriod(normalized, params.preset, now), "THIS_WEEK");
  const switched = new URLSearchParams(buildBusinessReportQuery({ ...normalized, preset: params.preset }));
  assert.equal(switched.get("preset"), "THIS_WEEK");
});

test("active periods match custom dates and reject stale or unrelated preset labels", () => {
  const active = (input, preset = "") => businessFilterHelpers.getActiveBusinessReportPeriod(normalizeBusinessReportFilters(input, now), preset, now);
  assert.equal(active({}), "THIS_MONTH");
  assert.equal(active({ period: "ALL" }), "ALL");
  assert.equal(active({ dateFrom: "2026-10-01", dateTo: "2026-10-26" }), "THIS_MONTH");
  assert.equal(active({ dateFrom: "2026-09-01", dateTo: "2026-09-30" }), "LAST_MONTH");
  assert.equal(active({ dateFrom: "2026-10-04", dateTo: "2026-10-17" }, "THIS_WEEK"), "CUSTOM");
  assert.equal(active({ dateFrom: "2026-10-04", dateTo: "2026-10-17" }, "INVALID"), "CUSTOM");
});

test("Fragmento and ASC totals and Excel sheets remain separate and numeric", () => {
  const records = [
    { period: "2026-10-01", scope: "Fragmento", metric: "orders", value: 4 },
    { period: "2026-10-02", scope: "Fragmento", metric: "orders", value: 2 },
    { period: "2026-10-02", scope: "Fragmento", metric: "cancellationRequests", value: 3 },
    { period: "2026-10-01", scope: "Fragmento", metric: "confirmedOrders", value: 3 },
    { period: "2026-10-02", scope: "ASC", metric: "claims", value: 7 },
    { period: "2026-10-02", scope: "ASC", metric: "frgKitchens", value: 2 },
    { period: "2026-10-02", scope: "ASC", metric: "arcKitchens", value: 5 },
    { period: "2026-10-02", scope: "ASC", metric: "emailsKd", value: 8 },
    { period: "2026-10-02", scope: "ASC", metric: "emailsHbi", value: 3 },
  ];
  const report = assembleBusinessReport(records, normalizeBusinessReportFilters({}, now));
  assert.equal(report.Fragmento.total.orders, 6);
  assert.equal(report.Fragmento.total.cancellationRequests, 3);
  assert.equal(report.ASC.total.claims, 7);
  assert.equal(report.ASC.total.frgKitchens, 2);
  assert.equal(report.ASC.total.arcKitchens, 5);
  assert.equal(report.Fragmento.total.claims, undefined);
  const { buffer } = buildStandardExcelWorkbook({ description: "TEST", sheets: getBusinessReportSheets(report) });
  const book = XLSX.read(buffer, { type: "buffer" });
  assert.deepEqual(book.SheetNames, ["Fragmento", "ASC", "Report notes"]);
  const frg = XLSX.utils.sheet_to_json(book.Sheets.Fragmento, { header: 1 });
  const asc = XLSX.utils.sheet_to_json(book.Sheets.ASC, { header: 1 });
  assert.equal(frg[8][1], "TOTAL");
  assert.equal(frg[8][2], 6);
  const cancellationColumn = frg[5].indexOf("CANCELLATION REQUESTS");
  assert(cancellationColumn > 0);
  assert.equal(frg[8][cancellationColumn], 3);
  assert.equal(asc[7][2], 7);
  assert.equal(asc[7][3], 2);
  assert.equal(asc[7][4], 5);
  assert.equal(asc[5][5], "EMAILS TO KD@MYARCHITECTO.DE");
  assert.equal(asc[5][6], "EMAILS TO VERWALTUNG@HBI-WOHNEN.DE");
  assert.equal(asc[7][5], 8);
  assert.equal(asc[7][6], 3);
  assert.equal(assembleBusinessReport([], report.filters).ASC.total.claims, 0);
});

test("Fragmento sales keep cents in period totals and numeric two-decimal Excel cells", () => {
  const report = assembleBusinessReport([
    { period: "2026-10-01", scope: "Fragmento", metric: "orders", value: 2 },
    { period: "2026-10-01", scope: "Fragmento", metric: "salesGross", value: 0.1 },
    { period: "2026-10-01", scope: "Fragmento", metric: "salesGross", value: 0.2 },
    { period: "2026-10-01", scope: "Fragmento", metric: "salesNet", value: 0.25 },
    { period: "2026-10-02", scope: "Fragmento", metric: "salesGross", value: 119 },
    { period: "2026-10-02", scope: "Fragmento", metric: "salesNet", value: 100 },
  ], normalizeBusinessReportFilters({}, now));
  assert.equal(report.Fragmento.rows[0].salesGross, 0.3);
  assert.equal(report.Fragmento.total.salesGross, 119.3);
  assert.equal(report.Fragmento.total.salesNet, 100.25);
  assert.equal(report.ASC.total.salesGross, undefined);
  const empty = assembleBusinessReport([], report.filters).Fragmento.total;
  assert.equal(empty.salesGross, 0);
  assert.equal(empty.salesNet, 0);
  const { buffer } = buildStandardExcelWorkbook({ description: "SALES", sheets: getBusinessReportSheets(report) });
  const book = XLSX.read(buffer, { type: "buffer", cellNF: true });
  const sheet = book.Sheets.Fragmento;
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  for (const [header, expected] of [["SALES EXCL. VAT (EUR)", 100.25], ["SALES INCL. VAT (EUR)", 119.3]]) {
    const column = rows[5].indexOf(header);
    assert(column > 0, header);
    const cell = sheet[XLSX.utils.encode_cell({ r: 8, c: column })];
    assert.equal(cell.t, "n");
    assert.equal(cell.v, expected);
    assert.equal(cell.z, "#,##0.00");
  }
});

test("business period dates stay sortable and display dd/mm/yyyy without timezone shifts", () => {
  const dates = ["2026-03-29", "2026-10-25"];
  const report = assembleBusinessReport(dates.flatMap(period => [
    { period, scope: "Fragmento", metric: "orders", value: 1 },
    { period, scope: "ASC", metric: "claims", value: 1 },
  ]), normalizeBusinessReportFilters({ period: "ALL" }, now));
  for (const timeZone of ["UTC", "Europe/Berlin"]) {
    const { buffer } = buildStandardExcelWorkbook({ description: "DATES", timeZone, sheets: getBusinessReportSheets(report) });
    const book = XLSX.read(buffer, { type: "buffer", cellNF: true });
    for (const name of ["Fragmento", "ASC"]) {
      const sheet = book.Sheets[name];
      for (const [address, formatted, month, day] of [["B7", "29/03/2026", 3, 29], ["B8", "25/10/2026", 10, 25]]) {
        const cell = sheet[address];
        assert.equal(cell.t, "n");
        assert.equal(cell.z, "dd/mm/yyyy");
        assert.equal(XLSX.utils.format_cell(cell), formatted);
        const parsed = XLSX.SSF.parse_date_code(cell.v);
        assert.deepEqual([parsed.y, parsed.m, parsed.d, parsed.H, parsed.M], [2026, month, day, 0, 0]);
      }
      assert.equal(sheet.B9.v, "TOTAL");
    }
  }
});


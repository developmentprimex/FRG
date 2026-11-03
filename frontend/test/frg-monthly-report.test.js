import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx/xlsx.mjs";
import { normalizeFrgMonthlyFilters, buildFrgMonthlyQuery, assembleFrgMonthlyReport, getFrgMonthlySheets, frgReportPeriodLabel } from "../lib/frg-monthly-report.js";
import { orderStatusUpdateData } from "../lib/order-confirmation-date.js";
import { buildStandardExcelWorkbook } from "../lib/standard-excel.js";

const now = new Date("2026-11-02T10:00:00Z");
const filters = normalizeFrgMonthlyFilters({ month: "2026-10" }, now);

test("monthly periods include all previous history and Berlin month cutoffs across DST and year boundaries", () => {
  assert.equal(filters.start.toISOString(), "2026-09-30T22:00:00.000Z");
  assert.equal(filters.end.toISOString(), "2026-10-31T23:00:00.000Z");
  assert.equal(filters.previousDate, "2026-09-30");
  assert.equal(filters.dateTo, "2026-10-31");
  assert.equal(normalizeFrgMonthlyFilters({ month: "2024-02" }, now).monthEnd, "2024-02-29");
  assert.equal(normalizeFrgMonthlyFilters({ month: "2026-01" }, now).previousDate, "2025-12-31");
  const current = normalizeFrgMonthlyFilters({}, now);
  assert.equal(current.month, "2026-11");
  assert.equal(current.end.toISOString(), now.toISOString());
  assert.equal(current.dateTo, "2026-11-02");
  for (const month of ["2026-13", "2026-00", "2027-01", "not-a-month"]) {
    assert.equal(normalizeFrgMonthlyFilters({ month }, now).month, current.month);
  }
  assert.equal(normalizeFrgMonthlyFilters({ dateTo: "2026-09-30", contractType: "ARC" }, now).month, "2026-09");
  const query = Object.fromEntries(new URLSearchParams(buildFrgMonthlyQuery(filters)));
  assert.equal(query.contractType, "FRG");
  assert.equal(query.dateFrom, "2026-10-01");
  assert.equal(query.dateTo, "2026-10-31");
  assert.equal(normalizeFrgMonthlyFilters(query, now).end.toISOString(), filters.end.toISOString());
});

test("a single Berlin day uses the preceding day as opening balance and includes the full DST day", () => {
  const day = normalizeFrgMonthlyFilters({ dateFrom: "2026-10-25", dateTo: "2026-10-25" }, now);
  assert.equal(day.previousDate, "2026-10-24");
  assert.equal(day.start.toISOString(), "2026-10-24T22:00:00.000Z");
  assert.equal(day.end.toISOString(), "2026-10-25T23:00:00.000Z");
  assert.equal(day.end - day.start, 25 * 60 * 60 * 1000);
  assert.equal(day.isMonth, false);
  assert.equal(day.exportPeriod, "2026-10-25");
  assert.equal(frgReportPeriodLabel(day), "25/10/2026");
  const spring = normalizeFrgMonthlyFilters({ dateFrom: "2026-03-29", dateTo: "2026-03-29" }, now);
  assert.equal(spring.end - spring.start, 23 * 60 * 60 * 1000);
});

test("custom ranges, open bounds, reversed dates and month shortcuts preserve the exact chosen period", () => {
  const range = normalizeFrgMonthlyFilters({ month: "2026-09", dateFrom: "2026-10-10", dateTo: "2026-10-20" }, now);
  assert.equal(range.previousDate, "2026-10-09");
  assert.equal(range.start.toISOString(), "2026-10-09T22:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-10-20T22:00:00.000Z");
  assert.equal(range.isMonth, false);
  assert.equal(frgReportPeriodLabel(range), "10/10/2026 – 20/10/2026");
  const reversed = normalizeFrgMonthlyFilters({ dateFrom: "2026-10-20", dateTo: "2026-10-10" }, now);
  assert.equal(reversed.dateFrom, range.dateFrom);
  assert.equal(reversed.dateTo, range.dateTo);
  const through = normalizeFrgMonthlyFilters({ dateTo: "2026-10-15" }, now);
  assert.equal(through.start, null);
  assert.equal(through.previousDate, "");
  assert.equal(frgReportPeriodLabel(through), "Through 15/10/2026");
  const from = normalizeFrgMonthlyFilters({ dateFrom: "2026-10-10", period: "CUSTOM" }, now);
  assert.equal(from.dateTo, "2026-11-02");
  assert.equal(from.end.toISOString(), now.toISOString());
  const crossMonth = normalizeFrgMonthlyFilters({ dateFrom: "2026-09-15", dateTo: "2026-10-15" }, now);
  assert.equal(frgReportPeriodLabel(crossMonth), "15/09/2026 – 15/10/2026");
  assert.equal(frgReportPeriodLabel(filters), "October 2026");
  assert.equal(frgReportPeriodLabel(filters, "de"), "Oktober 2026");
  for (const input of [range, through, from, crossMonth]) {
    const roundTrip = normalizeFrgMonthlyFilters(Object.fromEntries(new URLSearchParams(buildFrgMonthlyQuery(input))), now);
    assert.equal(roundTrip.start?.toISOString(), input.start?.toISOString());
    assert.equal(roundTrip.end.toISOString(), input.end.toISOString());
  }
});

test("presets include today, Monday weeks, months and all time, while freezing dated links", () => {
  for (const period of ["TODAY", "THIS_WEEK", "THIS_MONTH", "LAST_MONTH", "ALL"]) {
    const selected = normalizeFrgMonthlyFilters({ period }, now);
    assert.equal(selected.preset, period);
    const params = Object.fromEntries(new URLSearchParams(buildFrgMonthlyQuery(selected)));
    assert.equal(params.preset, period);
    const roundTrip = normalizeFrgMonthlyFilters(params, now);
    assert.equal(roundTrip.preset, period);
    assert.equal(roundTrip.start?.toISOString(), selected.start?.toISOString());
    assert.equal(roundTrip.end.toISOString(), selected.end.toISOString());
  }
  const all = normalizeFrgMonthlyFilters({ period: "ALL", month: "2026-09" }, now);
  assert.equal(all.start, null);
  assert.equal(all.previousDate, "");
  assert.equal(all.end.toISOString(), now.toISOString());
  assert.equal(all.exportPeriod, "ALL");
  assert.equal(frgReportPeriodLabel(all), "All time");
  const today = normalizeFrgMonthlyFilters({ period: "TODAY" }, now);
  assert.equal(today.dateFrom, "2026-11-02");
  assert.equal(today.dateTo, "2026-11-02");
  const frozen = normalizeFrgMonthlyFilters(Object.fromEntries(new URLSearchParams(buildFrgMonthlyQuery(today))), new Date("2026-11-03T12:00Z"));
  assert.equal(frozen.dateFrom, "2026-11-02");
  assert.equal(frozen.dateTo, "2026-11-02");
  assert.equal(frozen.preset, "CUSTOM");
});

test("the seven approved rows reconcile previous plus current to cumulative, including zero months and cents", () => {
  const report = assembleFrgMonthlyReport([
    { bucket: "previous", metric: "kitchens", value: 140 }, { bucket: "current", metric: "kitchens", value: 20 },
    { bucket: "previous", metric: "gross", value: 0.1 }, { bucket: "current", metric: "gross", value: 0.2 },
    { bucket: "current", metric: "cancellationRequests", value: 2 }, { bucket: "current", metric: "emails", value: 25 },
  ], filters);
  assert.equal(report.metrics.length, 7);
  assert.equal(report.total.kitchens, 160);
  assert.equal(report.total.gross, 0.3);
  assert.equal(report.total.cancellationRequests, 2);
  assert.equal(report.total.emails, 25);
  const empty = assembleFrgMonthlyReport([], filters);
  assert(empty.metrics.every(([key]) => empty.total[key] === 0));
});

test("the original confirmation date is recorded only on the first actual confirmation", () => {
  assert.deepEqual(orderStatusUpdateData("CONFIRMED", { status: "NEW" }, now), { status: "CONFIRMED", confirmedAt: now });
  assert.deepEqual(orderStatusUpdateData("CONFIRMED", { status: "EMAILED" }, now), { status: "CONFIRMED", confirmedAt: now });
  assert.deepEqual(orderStatusUpdateData("CONFIRMED", { status: "CONFIRMED" }, now), { status: "CONFIRMED" });
  assert.deepEqual(orderStatusUpdateData("CONFIRMED", { status: "CANCELLED", confirmedAt: new Date("2026-09-01") }, now), { status: "CONFIRMED" });
  assert.deepEqual(orderStatusUpdateData("CANCELLED", { status: "CONFIRMED" }, now), { status: "CANCELLED" });
});

test("FRG Excel keeps three sheets and only the requested order columns with numeric amounts and dates", () => {
  const report = assembleFrgMonthlyReport([
    { bucket: "previous", metric: "kitchens", value: 140 }, { bucket: "current", metric: "kitchens", value: 20 },
    { bucket: "current", metric: "sales", value: 1 }, { bucket: "current", metric: "net", value: 100 },
    { bucket: "current", metric: "vat", value: 19 }, { bucket: "current", metric: "gross", value: 119 },
  ], filters);
  const order = { id: "sale", saleAt: new Date("2026-10-10T10:00Z"), createdAt: new Date("2026-09-01"), orderNumber: "FRG-1", status: "CONFIRMED",
    firstName: "Customer", lastName: "Example", email: "customer@example.com", phone: "+4912345678",
    contractNumber: "670105777", totalPrice: 119, kitchen: { slug: "other", name: "Kitchen" },
    kitchenContract: { project: { housingCompany: { name: "Company A" } } },
    address1: "Example street 1", postalCode: "10115", city: "Berlin", country: "Germany",
    paidAt: new Date("2026-10-10T10:05Z"), preferredDeliveryDate: new Date("2026-10-15T10:00Z"),
    items: [{ code: "OVEN", nameSnapshot: "BOSCH oven", articleNumberSnapshot: "BOSCH-01", itemType: "COMPONENT", priceSnapshot: 59.5, quantity: 2 },
      { code: "BASE", nameSnapshot: "Base cabinet", itemType: "COMPONENT", priceSnapshot: 1000, quantity: 1, kitchenItem: { isLocked: true } }] };
  const sheets = getFrgMonthlySheets(report, [order]);
  assert.deepEqual(sheets.map(sheet => sheet.name), ["Fragmento", "Order details", "Item details"]);
  assert.deepEqual(sheets[0].rows[0].slice(1), [140, 20, 160]);
  assert.deepEqual(sheets[1].headers, ["Sale date (Berlin)", "Order created", "Order", "Customer", "Email", "Phone", "Contract number", "Company", "Customer address",
    "Paid at", "Requested delivery", "Purchased units", "Net (EUR)", "VAT (EUR)", "Gross (EUR)"]);
  assert.equal(sheets[1].rows[0].length, sheets[1].headers.length);
  assert.deepEqual(sheets[1].rows[0].slice(0, 12), [order.saleAt, order.createdAt, "FRG-1", "Customer Example", "customer@example.com", "+4912345678",
    "670105777", "Company A", "Example street 1, 10115, Berlin, Germany", order.paidAt, order.preferredDeliveryDate, 2]);
  assert.deepEqual(sheets[1].rows[0].slice(12), [100, 19, 119]);
  const items = sheets[2];
  assert.deepEqual(items.headers, ["Sale date (Berlin)", "Customer", "Contract number", "Article number", "Product", "Category", "Manufacturer",
    "Quantity", "Line net (EUR)", "Line VAT (EUR)", "Line gross (EUR)"]);
  assert(items.rows.every(row => row.length === items.headers.length));
  assert.deepEqual(items.rows[0], [order.saleAt, "Customer Example", "670105777", "BOSCH-01", "BOSCH oven", "Electrical appliance", "BOSCH", 2, 100, 19, 119]);
  assert.equal(items.rows[1][6], "Not recorded");
  assert.deepEqual(items.rows[1].slice(7), [1, 0, 0, 0]);
  const { buffer } = buildStandardExcelWorkbook({ description: "MONTHLY_TEST", timeZone: "Europe/Berlin", sheets, now });
  const book = XLSX.read(buffer, { type: "buffer", cellNF: true });
  assert.deepEqual(book.SheetNames, ["Fragmento", "Order details", "Item details"]);
  const summary = book.Sheets.Fragmento;
  assert.equal(summary.C7.v, 140);
  assert.equal(summary.D7.v, 20);
  assert.equal(summary.E7.v, 160);
  assert.equal(summary.D9.v, 100);
  assert.equal(summary.D9.t, "n");
  assert.equal(summary.D9.z, "#,##0.00");
  assert.equal(summary.D10.v, 19);
  assert.equal(summary.D11.v, 119);
  const orderSheet = book.Sheets["Order details"];
  assert.deepEqual(XLSX.utils.sheet_to_json(orderSheet, { header: 1 })[5], ["NR", ...sheets[1].headers.map(header => header.toUpperCase())]);
  assert.equal(orderSheet.A7.v, 1);
  for (const [cell, value] of [["N7", 100], ["O7", 19], ["P7", 119]]) {
    assert.equal(orderSheet[cell].v, value);
    assert.equal(orderSheet[cell].t, "n");
    assert.equal(orderSheet[cell].z, "#,##0.00");
  }
  for (const cell of ["B7", "C7", "K7", "L7"]) {
    assert.equal(orderSheet[cell].t, "n");
    assert.equal(orderSheet[cell].z, "dd.mm.yyyy hh:mm");
  }
  assert.equal(orderSheet["!autofilter"].ref, "A6:P7");
  const itemSheet = book.Sheets["Item details"];
  assert.deepEqual(XLSX.utils.sheet_to_json(itemSheet, { header: 1 })[5], ["NR", ...items.headers.map(header => header.toUpperCase())]);
  assert.equal(itemSheet.A7.v, 1);
  assert.equal(itemSheet.H7.v, "BOSCH");
  assert.equal(itemSheet.I7.v, 2);
  assert.equal(itemSheet.B7.t, "n");
  assert.equal(itemSheet.B7.z, "dd.mm.yyyy hh:mm");
  for (const [cell, value] of [["J7", 100], ["K7", 19], ["L7", 119], ["J8", 0], ["K8", 0], ["L8", 0]]) {
    assert.equal(itemSheet[cell].v, value);
    assert.equal(itemSheet[cell].t, "n");
    assert.equal(itemSheet[cell].z, "#,##0.00");
  }
  assert.equal(itemSheet["!autofilter"].ref, "A6:L8");
});

test("daily, arbitrary and all-time Excel headers describe the actual reporting bounds", () => {
  for (const [input, previous, current] of [
    [{ dateFrom: "2026-10-15", dateTo: "2026-10-15" }, "Through 14/10/2026", "15/10/2026"],
    [{ dateFrom: "2026-10-10", dateTo: "2026-10-20" }, "Through 09/10/2026", "10/10/2026 – 20/10/2026"],
    [{ period: "ALL" }, "Before selected period", "All time"],
  ]) {
    const selected = normalizeFrgMonthlyFilters(input, now);
    const sheets = getFrgMonthlySheets(assembleFrgMonthlyReport([], selected));
    assert.deepEqual(sheets[0].headers, ["Description", previous, current, "Total"]);
    assert(sheets.every(sheet => sheet.title.includes(current)));
  }
});

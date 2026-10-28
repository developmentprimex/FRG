import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx/xlsx.mjs";
import { normalizeAscKitchenFilters, assembleAscKitchenReport, getAscKitchenReportSheets } from "../lib/asc-kitchen-report.js";
import { assembleAscClaimReport, getAscClaimReportSheets, claimProductDetails, claimReportSubmissions, loadAscClaimDetails, loadReportSubmissions } from "../lib/asc-claim-report.js";
import { buildStandardExcelWorkbook } from "../lib/standard-excel.js";

const now = new Date("2026-10-28T10:00Z");
const filters = normalizeAscKitchenFilters({}, now);

test("ASC details work on main without the separate claim-processing schema", async () => {
  const claim = { id: "legacy-main", createdAt: new Date("2026-10-10"), contractNumber: "670000001", claimSequence: 1, contractId: "contract" };
  let reads = 0;
  const db = {
    $queryRaw: async () => {
      reads++;
      if (reads === 1) return [claim];
      if (reads === 2) return [{ relation: null }];
      return [];
    },
    kitchenContract: { findMany: async () => [{ id: "contract", appliances: [{ applianceType: "fridge", brand: "bosch" }] }] },
  };
  const details = await loadAscClaimDetails(filters, db);
  assert.equal(details.claims.length, 1);
  assert.deepEqual(details.claims[0].submissions, []);
  assert.equal(details.claims[0].contract.appliances[0].brand, "bosch");
  assert.deepEqual(details.deliveries, []);
  assert.equal(reads, 3);
});

test("ASC reads existing optional follow-ups without requiring their feature's Prisma delegate", async () => {
  const saved = [{ id: "followup", claimId: "case", createdAt: now, payload: { problemDescription: "Saved follow-up" } }];
  let reads = 0;
  const db = { $queryRaw: async (_strings, ...parameters) => {
    reads++;
    if (reads === 1) return [{ relation: '"ServiceClaimSubmission"' }];
    assert.deepEqual(parameters[0].values, ["case"]);
    assert.equal(parameters[1], filters.end);
    return saved;
  } };
  assert.deepEqual(await loadReportSubmissions(db, ["case"], filters.end), saved);
  assert.equal(reads, 2);
});

test("claim product categories distinguish appliances from their fronts, drawers and other components", () => {
  assert.equal(claimProductDetails({ name: "Amica oven", componentId: "component-claim-oven" }).category, "Electrical appliances");
  assert.equal(claimProductDetails({ name: "Dishwasher front", componentId: "component-claim-furniture-front" }).category, "Cabinets");
  assert.equal(claimProductDetails({ name: "Sink cabinet", componentId: "component-claim-sink-cabinet" }).category, "Cabinets");
  assert.equal(claimProductDetails({ name: "Worktop" }).category, "Other components");
  assert.equal(claimProductDetails({ name: "Unspecified issue" }).category, "Not recorded");
});

test("manufacturer resolution uses recorded data and exact articles and never assumes an upload's default brand", () => {
  assert.equal(claimProductDetails({ componentId: "reference-electrical-oven", name: "Oven", manufacturer: "Siemens" }).manufacturer, "Siemens");
  assert.equal(claimProductDetails({ componentId: "component-claim-oven", name: "BOSCH oven" }).manufacturer, "BOSCH");
  const ab = claimProductDetails({ name: "Sink", articleCode: "526335" }, { kitchen: { slug: "other", items: [{ articleNumber: "526335", manufacturer: "BLANCO" }] } });
  assert.equal(ab.manufacturer, "BLANCO");
  assert.equal(ab.manufacturerSource, "Current metadata, matching article");
  const contract = { kitchen: { slug: "other", items: [{ articleNumber: "OLD", name: "Amica oven" }] },
    appliances: [{ applianceType: "oven", brand: "bosch", articleNumber: "OLD" }] };
  assert.equal(claimProductDetails({ componentId: "reference-electrical-oven", name: "Oven", articleCode: "NEW" }, contract).manufacturer, "Not recorded");
  assert.equal(claimProductDetails({ componentId: "reference-electrical-oven", name: "Oven", applianceType: "oven" }, contract).manufacturer, "BOSCH");
  assert.equal(claimProductDetails({ componentId: "reference-electrical-oven", name: "Oven", articleCode: "OLD" }, contract).manufacturer, "Amica");
});

test("uploaded-plan electrical claims resolve their saved contract brand by appliance type and legacy labels", () => {
  const contract = { kitchen: { slug: "pdf-only-kitchen" }, appliances: [
    { applianceType: "fridge", brand: "bosch", articleNumber: null, isPresent: true },
    { applianceType: "dishwasher", brand: "aeg", articleNumber: null },
    { applianceType: "extractor_hood", brand: "amica", articleNumber: null },
    { applianceType: "oven", brand: "Siemens", articleNumber: "OVEN-CURRENT" },
  ] };
  for (const [area, brand] of [
    [{ name: "Fridge / freezer", applianceType: "fridge" }, "BOSCH"],
    [{ name: "Dishwasher", applianceType: "dishwasher" }, "AEG"],
    [{ name: "Geschirrspüler" }, "AEG"],
    [{ name: "Kühlschrank" }, "BOSCH"],
    [{ name: "Dunstabzugshaube" }, "Amica"],
    [{ name: "Oven", applianceType: "oven" }, "Siemens"],
  ]) {
    const product = claimProductDetails({ componentId: "reference-electrical-legacy-1", code: "REFERENCE-ELECTRICAL", ...area }, contract);
    assert.equal(product.manufacturer, brand);
    assert.equal(product.manufacturerSource, "Current contract inventory, matching appliance type");
  }
  assert.equal(claimProductDetails({ componentId: "reference-electrical-1", name: "Oven", applianceType: "oven", manufacturer: "Historical brand" }, contract).manufacturer, "Historical brand");
  assert.equal(claimProductDetails({ componentId: "reference-electrical-1", name: "Oven", applianceType: "oven", articleCode: "OLDER-OVEN" }, contract).manufacturer, "Not recorded");
  assert.equal(claimProductDetails({ componentId: "reference-electrical-1", name: "Oven", applianceType: "oven", articleCode: "OVEN-CURRENT" }, contract).manufacturerSource, "Current inventory, matching article");
});

test("inventory type matching does not assign appliance brands to furniture, absent, ambiguous or unlinked products", () => {
  const area = { componentId: "reference-electrical-legacy-1", name: "Fridge / freezer", applianceType: "fridge", code: "REFERENCE-ELECTRICAL" };
  const fridge = { applianceType: "fridge", brand: "bosch" };
  for (const appliances of [[], [{ ...fridge, isPresent: false }], [{ ...fridge, brand: null }],
    [fridge, { ...fridge, brand: "aeg" }], [fridge, { ...fridge, brand: null }], [{ ...fridge, applianceType: "oven" }]]) {
    assert.equal(claimProductDetails(area, { appliances }).manufacturer, "Not recorded");
  }
  assert.equal(claimProductDetails(area).manufacturer, "Not recorded");
  const contract = { appliances: [fridge, { applianceType: "dishwasher", brand: "bosch" }, { applianceType: "oven", brand: "bosch" }, { applianceType: "hob", brand: "amica" }] };
  for (const furniture of [
    { name: "Dishwasher front", componentId: "reference-furniture-1", applianceType: "dishwasher" },
    { name: "Tür Spülmaschine", componentId: "reference-furniture-2" },
    { name: "Oberschrank links neben dem Kühlschrank", componentId: "reference-furniture-3" },
    { name: "Filter", componentId: "reference-electrical-filter-1" },
  ]) assert.equal(claimProductDetails(furniture, contract).manufacturer, "Not recorded");
  assert.equal(claimProductDetails({ name: "Oven / hob set", claimPartKey: "oven-set", componentId: "component-claim-oven" }, contract).manufacturer, "Not recorded");
  assert.equal(claimProductDetails({ ...area, applianceType: "unknown" }, contract).manufacturer, "Not recorded");
});

test("follow-ups remain within their original case, skip duplicate initial payloads and respect the cutoff", () => {
  const claim = { id: "c", createdAt: new Date("2026-09-01"), submissions: [
    { id: "later", createdAt: new Date("2026-10-12"), payload: { problemDescription: "Later" } },
    { id: "c", createdAt: new Date("2026-09-01"), payload: { id: "c" } },
    { id: "earlier", createdAt: new Date("2026-10-10"), payload: { problemDescription: "Earlier" } },
    { id: "future", createdAt: new Date("2026-11-01"), payload: {} },
  ] };
  assert.deepEqual(claimReportSubmissions(claim, filters.end).map(row => row.submissionId), ["c", "earlier", "later"]);
  assert.equal(claimReportSubmissions({ id: "legacy", createdAt: now }, filters.end).length, 1);
});

function detailedFixture() {
  const old = { id: "old", createdAt: new Date("2026-09-10"), contractNumber: "670000001", contractType: "FRG", fullName: "Customer A", claimSequence: 1, ticketNumber: 1001,
    requestType: "complaint", problemDescription: "Oven does not heat", serialNumber: "SERIAL-A",
    problemAreasJson: JSON.stringify([{ componentId: "component-claim-oven", name: "Amica oven", code: "OVEN-A", serialNumber: "SERIAL-A", detail: "Does not heat" }]),
    kitchenClaimOrdinal: 1, kitchenClaimsTotal: 2, kitchenClaimsInPeriod: 1,
    contract: { kitchen: { slug: "kitchen-a", name: "Kitchen A" }, project: { housingCompany: { name: "Company A" } } },
    processing: { status: "DONE", completedAt: new Date("2026-10-20") },
    submissions: [{ id: "old", createdAt: new Date("2026-09-10"), payload: { id: "old" } },
      { id: "followup", createdAt: new Date("2026-10-10"), payload: { fullName: "Customer A", requestType: "complaint", problemDescription: "Cabinet door damaged",
        problemAreasJson: JSON.stringify([{ componentId: "component-wall-cabinet-1", name: "Wall cabinet", manufacturer: "Burger", code: "H6002", detail: "Door damaged", serialNumber: "SERIAL-B" }]) } }],
  };
  const current = { id: "current", createdAt: new Date("2026-10-12"), contractNumber: "222000001", contractType: "FRG", fullName: "Customer A", claimSequence: 7, ticketNumber: 1002,
    kitchenClaimOrdinal: 2, kitchenClaimsTotal: 2, kitchenClaimsInPeriod: 1, contract: old.contract, problemDescription: "The oven was mentioned in free text only" };
  const upload = { id: "upload", createdAt: new Date("2026-10-15"), contractNumber: "670100001", contractType: "ARC", fullName: "Customer B", claimSequence: 1, ticketNumber: 1003,
    kitchenClaimOrdinal: 1, kitchenClaimsTotal: 1, kitchenClaimsInPeriod: 1, problemDescription: "Appliance issue",
    problemAreasJson: JSON.stringify([{ componentId: "reference-electrical-oven", name: "Oven", code: "REFERENCE-OVEN" }]),
    contract: { kitchen: { slug: "pdf-only-kitchen", name: "Archived kitchen plan" }, appliances: [{ applianceType: "oven", brand: "bosch" }] } };
  const deliveries = [
    { attemptId: "old", claimId: "old", attemptedAt: new Date("2026-09-10"), recipient: "kd@myarchitecto.de" },
    { attemptId: "newer", claimId: "old", attemptedAt: new Date("2026-10-04"), recipient: "kd@myarchitecto.de" },
    { attemptId: "earlier", claimId: "old", attemptedAt: new Date("2026-10-03"), recipient: "kd@myarchitecto.de" },
    { attemptId: "hbi", claimId: "old", attemptedAt: new Date("2026-10-02"), recipient: "verwaltung@hbi-wohnen.de" },
  ];
  const report = assembleAscClaimReport([
    { bucket: "previous", metric: "claims", value: 1 }, { bucket: "current", metric: "claims", value: 2 },
    { bucket: "previous", metric: "emailsKd", value: 1 }, { bucket: "current", metric: "emailsKd", value: 2 },
    { bucket: "current", metric: "emailsHbi", value: 1 },
  ], filters);
  return { report, data: { claims: [old, current, upload], deliveries } };
}

test("ASC Excel keeps only the requested claim columns and four sheets, preserving products and manufacturers from follow-ups", () => {
  const { report, data } = detailedFixture();
  const sheets = getAscClaimReportSheets(report, data);
  assert.deepEqual(sheets.map(sheet => sheet.name), ["ASC", "Claim details", "Email deliveries"]);
  assert.deepEqual(sheets[0].rows.map(row => row.slice(1)), [[1, 2, 3], [1, 2, 3], [0, 1, 1]]);
  const claims = sheets[1];
  assert.equal(claims.rows.length, 3);
  assert(claims.rows.every(row => row.length === claims.headers.length));
  const value = (sheet, row, label) => sheet.rows[row][sheet.headers.indexOf(label)];
  assert.deepEqual(claims.headers, ["Claim created (Berlin)", "Claim reference", "Contract number", "Company", "Customer", "Email", "Phone", "Customer address",
    "Categories", "Affected products", "Manufacturers", "Serial number(s)",
    "Email sent to kd@myarchitecto.de", "Email sent to verwaltung@hbi-wohnen.de"]);
  assert.equal(value(claims, 0, "Claim reference"), "#1001 670000001 KD 01");
  assert.equal(value(claims, 0, "Contract number"), "670000001");
  assert.equal(value(claims, 0, "Company"), "Company A");
  assert.equal(value(claims, 0, "Customer"), "Customer A");
  assert.equal(value(claims, 0, "Categories"), "Electrical appliances / Cabinets");
  assert.equal(value(claims, 1, "Categories"), "Not recorded");
  assert.equal(value(claims, 0, "Manufacturers"), "Amica / Burger");
  assert.equal(value(claims, 0, "Affected products"), "Amica oven\nWall cabinet");
  assert.equal(value(claims, 0, "Serial number(s)"), "SERIAL-A\nSERIAL-B");
  assert.deepEqual(claims.rows.map(row => row.slice(-2)), [["Yes", "Yes"], ["No", "No"], ["No", "No"]]);
  assert.equal(value(claims, 2, "Manufacturers"), "BOSCH");
  assert.equal(sheets[2].rows.length, 4);
  const [kitchenSheet] = getAscKitchenReportSheets(assembleAscKitchenReport([], filters));
  const { buffer } = buildStandardExcelWorkbook({ description: "ASC_CLAIMS", sheets: [kitchenSheet, ...sheets], now, timeZone: "Europe/Berlin" });
  const book = XLSX.read(buffer, { type: "buffer", cellNF: true });
  assert.deepEqual(book.SheetNames, ["ASC kitchens", "ASC", "Claim details", "Email deliveries"]);
  assert.equal(book.Sheets.ASC.C7.v, 1);
  assert.equal(book.Sheets.ASC.D7.v, 2);
  assert.equal(book.Sheets.ASC.E7.v, 3);
  const rows = XLSX.utils.sheet_to_json(book.Sheets["Claim details"], { header: 1 });
  assert.deepEqual(rows[5], ["NR", ...claims.headers.map(header => header.toUpperCase())]);
  assert.equal(rows[6][0], 1);
  assert.equal(rows[6][2], "#1001 670000001 KD 01");
  assert.equal(typeof rows[6][1], "number"); // sortable Excel timestamp
  assert.equal(rows[8][11], "BOSCH");
  assert.deepEqual(rows[6].slice(-2), ["Yes", "Yes"]);
  assert.equal(book.Sheets["Email deliveries"]["!autofilter"].ref, "A6:J10");
});

test("each email flag uses only that case and recipient, including successful deliveries before the selected month", () => {
  const { data } = detailedFixture();
  data.deliveries = [
    { attemptId: "old-kd", claimId: "old", attemptedAt: new Date("2026-09-10"), recipient: "kd@myarchitecto.de" },
    { attemptId: "upload-hbi", claimId: "upload", attemptedAt: new Date("2026-10-15"), recipient: "verwaltung@hbi-wohnen.de" },
  ];
  const report = assembleAscClaimReport([
    { bucket: "previous", metric: "claims", value: 1 }, { bucket: "current", metric: "claims", value: 2 },
    { bucket: "previous", metric: "emailsKd", value: 1 }, { bucket: "current", metric: "emailsHbi", value: 1 },
  ], filters);
  const [, details, deliveries] = getAscClaimReportSheets(report, data);
  assert.deepEqual(details.rows.map(row => row.slice(-2)), [["Yes", "No"], ["No", "No"], ["No", "Yes"]]);
  assert.equal(deliveries.rows.length, 2);
});

test("exports reject a mismatch between cumulative totals and the supporting cases or deliveries", () => {
  const { report, data } = detailedFixture();
  assert.throws(() => getAscClaimReportSheets(report, { ...data, claims: data.claims.slice(0, 2) }), /do not reconcile/);
  assert.throws(() => getAscClaimReportSheets(report, { ...data, deliveries: data.deliveries.slice(0, 2) }), /do not reconcile/);
  const empty = assembleAscClaimReport([], filters);
  const sheets = getAscClaimReportSheets(empty);
  assert.equal(sheets[1].rows.length, 0);
  assert.deepEqual(sheets[0].rows.map(row => row.slice(1)), [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
});

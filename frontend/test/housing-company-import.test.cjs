const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const XLSX = require("xlsx");
const { parseWorkbook, buildPlan, applyImport } = require("../lib/housing-company-import.cjs");
const { parseArgs } = require("../scripts/import-housing-companies.cjs");
const workbook = path.resolve(__dirname, "../../VETEM_SHEET_1_HOUSING_COMPANIES_KUZHINAT.xlsx");

function fakeDb(initial = {}) {
  let serial = 0;
  const state = { housingCompany: [], propertyObject: [], project: [], kitchenContract: [], ...structuredClone(initial) };
  const db = {};
  for (const table of Object.keys(state)) db[table] = {
    findMany: async () => structuredClone(state[table]),
    create: async ({ data }) => { const row = { id: `new-${++serial}`, ...data }; state[table].push(row); return row; },
    updateMany: async ({ where, data }) => {
      const rows = state[table].filter((row) => Object.entries(where).every(([key, value]) => row[key] === value));
      rows.forEach((row) => Object.assign(row, data));
      return { count: rows.length };
    },
  };
  db.$transaction = async (callback) => {
    const snapshot = structuredClone(state);
    try { return await callback(db); } catch (error) { Object.assign(state, snapshot); throw error; }
  };
  return { db, state };
}

test("workbook maps all 257 codes to the screenshot's 14 objects, preserving suffixes and gaps", () => {
  const companies = parseWorkbook(workbook);
  assert.equal(companies.length, 5);
  assert.equal(companies.flatMap((c) => c.entries).length, 257);
  assert.equal(companies.flatMap((c) => c.objects).length, 14);
  const arge = companies[0];
  assert.deepEqual(arge.objects.map((object) => arge.entries.filter((e) => e.objectName === object).length), [14, 14, 17, 14, 14, 16, 12, 12, 18]);
  assert.equal(arge.entries.find((e) => e.base === "105759").abCode, "AB-105759-56");
  assert.ok(!arge.entries.some((e) => e.base === "105773"));
  assert.deepEqual(companies[1].objects.map((object) => companies[1].entries.filter((e) => e.objectName === object).length), [65, 49]);
  assert.ok(!JSON.stringify(companies).includes("Store Address"));
  assert.ok(!JSON.stringify(companies).includes("Beekebreite"));
});

test("rejects malformed workbook codes rather than partially importing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "housing-test-"));
  const file = path.join(dir, "invalid.xlsx");
  try {
    const w = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet([
      ["Housing Company / Company Name", "Kuzhina", "Objektet", "Kodet e kuzhinave (AB)"],
      ["Company", 1, "Diverse", "AB-104332oops"],
    ]), "Sheet1");
    XLSX.writeFile(w, file);
    assert.throws(() => parseWorkbook(file), /Invalid AB code/);
  } finally { fs.rmSync(file); fs.rmdirSync(dir); }
});

test("import preserves existing fields, links both prefixes and ARC shells, and is idempotent", async () => {
  const companies = parseWorkbook(workbook);
  const contract = (id, number, slug, type = "FRG") => ({ id, contractNumber: number, projectId: "old-project", kitchenId: "same-kitchen", contractType: type, notes: "retain", kitchen: { slug, kitchenCode: null } });
  const { db, state } = fakeDb({
    housingCompany: [{ id: "arge", name: companies[0].name, address: "Keep existing address", phone: "123" }],
    propertyObject: [{ id: "old-object", housingCompanyId: "arge", name: "Hamburg", address1: "Keep street" }],
    project: [{ id: "old-project", housingCompanyId: "arge", propertyObjectId: "old-object", name: "Hamburg" }],
    kitchenContract: [contract("c1", "670105759", "ab-105759"), contract("c2", "111105759", "ab-105759"), contract("c3", "670103796", "pdf-only-kitchen", "ARC"), contract("other", "670103898", "burger-103898")],
  });
  const before = structuredClone(state);
  const preview = await buildPlan(db, companies);
  assert.equal(preview.summary.relink, 3);
  assert.deepEqual(state, before, "preview must not mutate the database");
  const result = await applyImport(db, companies);
  assert.equal(result.summary.unchanged, 3);
  assert.equal(result.summary.missing, 511);
  assert.equal(state.housingCompany.length, 5);
  assert.equal(state.propertyObject.length, 15);
  assert.equal(state.housingCompany[0].address, "Keep existing address");
  assert.equal(state.propertyObject[0].address1, "Keep street");
  assert.ok(state.housingCompany.slice(1).every((c) => c.address === undefined));
  assert.ok(state.propertyObject.slice(1).every((o) => o.address1 === undefined));
  assert.equal(state.kitchenContract[0].kitchenId, "same-kitchen");
  assert.equal(state.kitchenContract[0].notes, "retain");
  assert.equal(state.kitchenContract[3].projectId, "old-project");
  assert.equal(state.kitchenContract[0].projectId, state.kitchenContract[1].projectId);
  assert.equal(state.project.find((p) => p.id === state.kitchenContract[0].projectId).name, "Haus 3");
  const after = structuredClone(state);
  await applyImport(db, companies);
  assert.deepEqual(state, after);
});

test("ambiguous companies and mismatched kitchens block all writes", async () => {
  const companies = parseWorkbook(workbook);
  const { db, state } = fakeDb({
    housingCompany: [{ id: "a", name: companies[0].name }, { id: "b", name: companies[0].name.toUpperCase() }],
    kitchenContract: [{ id: "c", contractNumber: "670104332", projectId: null, contractType: "FRG", kitchen: { slug: "ab-104296", kitchenCode: "104 296" } }],
  });
  const plan = await buildPlan(db, companies);
  assert.ok(plan.conflicts.some((c) => c.includes("Multiple companies")));
  assert.ok(plan.conflicts.some((c) => c.includes("Kitchen mismatch")));
  const before = structuredClone(state);
  await assert.rejects(applyImport(db, companies), /Multiple companies/);
  assert.deepEqual(state, before);
});

test("supplier suffix matches exactly and multiple representations are rejected", async () => {
  const companies = parseWorkbook(workbook);
  const row = (number) => ({ id: number, contractNumber: number, projectId: null, contractType: "FRG", kitchen: { slug: "ab-105759", kitchenCode: "105 759" } });
  const { db } = fakeDb({ kitchenContract: [row("67010575956")] });
  const plan = await buildPlan(db, companies);
  assert.equal(plan.entries.find((e) => e.contractId)?.abCode, "AB-105759-56");
  const ambiguous = fakeDb({ kitchenContract: [row("67010575956"), row("670105759")] });
  assert.ok((await buildPlan(ambiguous.db, companies)).conflicts.some((c) => c.includes("Ambiguous")));
});

test("CLI defaults to dry run and rejects applying an offline plan", () => {
  assert.equal(parseArgs([]).apply, false);
  assert.throws(() => parseArgs(["--offline", "--apply"]), /cannot be combined/);
  assert.throws(() => parseArgs(["--typo"]), /Unknown argument/);
});

test("a failed contract update rolls back company and object creation", async () => {
  const companies = parseWorkbook(workbook);
  const { db, state } = fakeDb({ kitchenContract: [{ id: "c", contractNumber: "670104332", projectId: null,
    contractType: "FRG", kitchen: { slug: "ab-104332", kitchenCode: "104 332" } }] });
  db.kitchenContract.updateMany = async () => ({ count: 0 });
  const before = structuredClone(state);
  await assert.rejects(applyImport(db, companies), /changed during import/);
  assert.deepEqual(state, before);
});

test("all real-kitchen contracts share ownership, while unknown kitchens and ARC shells stay isolated", async () => {
  const companies = parseWorkbook(workbook);
  const row = (number, slug, type = "FRG", kitchenCode = null) => ({ id: number, contractNumber: number,
    projectId: null, contractType: type, kitchenId: slug, kitchen: { slug, kitchenCode } });
  const { db, state } = fakeDb({ kitchenContract: [
    ...["111105808", "670105808", "222105808", "670111111"].map(n => row(n, "ab-105808")),
    ...["111103898", "670103898", "222103898"].map(n => row(n, "burger-103898")),
    row("111103796", "pdf-only-kitchen", "ARC"), row("unknown-arc", "pdf-only-kitchen", "ARC"),
    row("custom-arc", "ab-104332", "ARC"),
  ] });
  const plan = await buildPlan(db, companies);
  assert.equal(plan.summary.matchedByKitchen, 3);
  assert.equal(plan.summary.link, 6);
  assert.equal(plan.summary.unmatchedContracts, 4);
  assert.equal(plan.summary.remainingWithoutCompany, 4);
  assert.deepEqual(plan.conflicts, []);
  await applyImport(db, companies);
  const project = state.project.find(p => p.name === "Haus 6");
  assert.ok(state.kitchenContract.slice(0, 4).every(c => c.projectId === project.id));
  assert.ok(state.kitchenContract.slice(4, 7).every(c => c.projectId === null));
  assert.equal(state.kitchenContract[8].projectId, null);
  const after = structuredClone(state);
  await applyImport(db, companies);
  assert.deepEqual(state, after);
});

test("contradictory kitchen slug and code block writes even for nonstandard numbers", async () => {
  const { db, state } = fakeDb({ kitchenContract: [{ id: "c", contractNumber: "222105808", projectId: null,
    contractType: "FRG", kitchen: { slug: "ab-105808", kitchenCode: "104332" } }] });
  const before = structuredClone(state);
  await assert.rejects(applyImport(db, parseWorkbook(workbook)), /Ambiguous kitchen codes/);
  assert.deepEqual(state, before);
});

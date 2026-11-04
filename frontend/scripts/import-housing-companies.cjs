const fs = require("node:fs");
const path = require("node:path");
const { loadImportCompanies, buildPlan, applyImport } = require("../lib/housing-company-import.cjs");

function parseArgs(argv) {
  const options = { apply: false, offline: false, input: path.resolve(__dirname, "../../VETEM_SHEET_1_HOUSING_COMPANIES_KUZHINAT.xlsx") };
  for (const arg of argv) {
    if (arg === "--apply") options.apply = true;
    else if (arg === "--dry-run") options.apply = false;
    else if (arg === "--offline") options.offline = true;
    else if (arg.startsWith("--input=")) options.input = path.resolve(arg.slice(8));
    else if (arg.startsWith("--report=")) options.report = path.resolve(arg.slice(9));
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.offline && options.apply) throw new Error("--offline cannot be combined with --apply");
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return console.log("npm run import:housing-companies -- [--dry-run|--apply] [--offline] [--input=file.xlsx] [--report=plan.json]\nDefault: preview only. Offline validates the workbook without a database. Missing contracts are reported, never created.");
  const companies = loadImportCompanies(options.input);
  let prisma;
  try {
    if (!options.offline) {
      require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
      const { PrismaClient } = require("@prisma/client");
      prisma = new PrismaClient();
    }
    const emptyDb = Object.fromEntries(["housingCompany", "propertyObject", "project", "kitchenContract"].map((name) => [name, { findMany: async () => [] }]));
    const plan = await buildPlan(prisma || emptyDb, companies);
    const report = { mode: options.offline ? "offline (database not checked)" : options.apply ? "apply" : "dry-run", input: options.input, ...plan };
    if (options.report) fs.writeFileSync(options.report, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ mode: report.mode, summary: plan.summary, conflicts: plan.conflicts,
      companyAddressChanges: plan.companies.filter((company) => company.addressAction !== "unchanged")
        .map(({ name, previousAddress, address, addressAction }) => ({ name, previousAddress, address, action: addressAction })),
      unmatchedContracts: plan.unmatchedContracts,
      missingContracts: plan.entries.filter((entry) => entry.action === "missing"),
      objects: companies.flatMap((company) => company.objects.map((object) => ({ company: company.name, object,
        abCodes: company.entries.filter((entry) => entry.objectName === object).length }))),
      changes: plan.entries.filter((entry) => ["link", "relink"].includes(entry.action)),
      report: options.report || "Use --report=plan.json for all entries, including missing contracts.",
    }, null, 2));
    if (plan.conflicts.length) throw new Error("Resolve reported conflicts before applying.");
    if (options.apply) {
      const verified = await applyImport(prisma, companies);
      console.log("Applied and verified: " + JSON.stringify(verified.summary));
    } else console.log(options.offline ? "Workbook validated. Run without --offline to inspect database links." : "Preview only. Use --apply to save these links.");
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { parseArgs };

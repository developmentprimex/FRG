const XLSX = require("xlsx");

// Object boundaries come from the supplied screenshot. The workbook supplies
// company names and the exact AB codes, including the Haus 3 suffixes.
const OBJECT_RULES = [
  ["Hof A", 102695, 102695], ["Hof A", 103796, 103859],
  ["Hof B", 105236, 105236], ["Hof B", 105671, 105675], ["Hof B", 105677, 105719],
  ["Haus 1", 104968, 104968], ["Haus 1", 105732, 105744],
  ["Haus 2", 105745, 105758], ["Haus 3", 105759, 105776],
  ["Haus 4", 105777, 105790], ["Haus 5", 105791, 105804],
  ["Haus 6", 105805, 105820], ["Haus 7", 105821, 105832],
  ["Haus 8", 105833, 105844], ["Haus 9", 105845, 105862],
];
const PREFIXES = ["111", "670"];
const normalizeName = (value) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("de");
const isSharedShell = (contract) => contract.contractType === "ARC" && contract.kitchen?.slug === "pdf-only-kitchen";
function kitchenCodes(kitchen) {
  return [kitchen?.kitchenCode, kitchen?.slug].map((value) => {
    const match = /^(?:(?:ab|burger)-)?(\d{3}\s?\d{3})(?:-(\d{2}))?$/i.exec(String(value || "").trim());
    return match ? match[1].replace(/\s/g, "") + (match[2] || "") : null;
  }).filter(Boolean);
}

function parseWorkbook(file) {
  const workbook = XLSX.readFile(file);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
  const headerIndex = rows.findIndex((row) => row.includes("Housing Company / Company Name") && row.includes("Kodet e kuzhinave (AB)"));
  if (headerIndex < 0) throw new Error("Workbook company/code headers were not found.");
  const header = rows[headerIndex];
  const index = (name) => header.indexOf(name);
  for (const name of ["Kuzhina", "Objektet", "Store Address"]) if (index(name) < 0) throw new Error(`Missing header: ${name}`);
  const seen = new Set();
  const companies = rows.slice(headerIndex + 1).filter((row) => row[index("Housing Company / Company Name")]).map((row) => {
    const name = String(row[index("Housing Company / Company Name")]).trim();
    const address = String(row[index("Store Address")]).trim();
    if (!address) throw new Error(`Missing Store Address for ${name}`);
    const objects = String(row[index("Objektet")]).split(",").map((s) => s.trim()).filter(Boolean);
    const tokens = String(row[index("Kodet e kuzhinave (AB)")]).split(/[,\s]+/).filter(Boolean);
    const entries = tokens.map((abCode) => {
      const match = /^AB-(\d{6})(?:-(\d{2}))?$/.exec(abCode);
      if (!match) throw new Error(`Invalid AB code: ${abCode}`);
      if (seen.has(match[1])) throw new Error(`Duplicate AB base: ${abCode}`);
      seen.add(match[1]);
      const objectName = objects.length === 1 ? objects[0] : OBJECT_RULES.find(([object, from, to]) => objects.includes(object) && +match[1] >= from && +match[1] <= to)?.[0];
      if (!objectName) throw new Error(`No object mapping for ${name}: ${abCode}`);
      return { abCode, base: match[1], suffix: match[2] || "", objectName };
    });
    if (entries.length !== Number(row[index("Kuzhina")])) throw new Error(`Code count mismatch for ${name}`);
    if (objects.some((object) => !entries.some((entry) => entry.objectName === object))) throw new Error(`Unmapped object for ${name}`);
    // This is the company's postal address, never the kitchen/building address.
    return { name, address, objects, entries };
  });
  if (!companies.length || new Set(companies.map((c) => normalizeName(c.name))).size !== companies.length) throw new Error("Missing or duplicate companies.");
  return companies;
}

async function buildPlan(db, companies) {
  const [owners, objects, projects, contracts] = await Promise.all([
    db.housingCompany.findMany(), db.propertyObject.findMany(), db.project.findMany(),
    db.kitchenContract.findMany({ include: { kitchen: { select: { slug: true, kitchenCode: true } } } }),
  ]);
  const conflicts = [];
  const companyPlans = companies.map((company) => {
    const matches = owners.filter((owner) => normalizeName(owner.name) === normalizeName(company.name));
    if (matches.length > 1) conflicts.push(`Multiple companies match ${company.name}`);
    const owner = matches[0];
    const objectPlans = company.objects.map((name) => {
      const matches = objects.filter((object) => object.housingCompanyId === owner?.id && normalizeName(object.name) === normalizeName(name));
      if (matches.length > 1) conflicts.push(`Multiple objects match ${company.name} / ${name}`);
      const object = matches[0];
      const byObject = projects.find((project) => project.propertyObjectId === object?.id);
      const byName = projects.find((project) => project.housingCompanyId === owner?.id && normalizeName(project.name) === normalizeName(name));
      if (byObject && byObject.housingCompanyId !== owner?.id) conflicts.push(`Inconsistent owner for project ${byObject.id}`);
      if (byName && byName.id !== byObject?.id) conflicts.push(`Project name already used: ${company.name} / ${name}`);
      return { name, objectId: object?.id || null, projectId: byObject?.id || null };
    });
    return { name: company.name, id: owner?.id || null, address: company.address,
      previousAddress: owner?.address ?? null,
      addressAction: !owner ? "create" : owner.address === company.address ? "unchanged" : "update",
      objects: objectPlans };
  });
  const byNumber = new Map(contracts.map((contract) => [contract.contractNumber, contract]));
  const entries = [];
  for (const company of companies) for (const entry of company.entries) for (const prefix of PREFIXES) {
    const target = companyPlans.find((c) => c.name === company.name).objects.find((o) => o.name === entry.objectName);
    // A supplier suffix is metadata, not a numeric range. Support contracts
    // storing it explicitly, but never fuzzy-match the last six digits.
    const candidates = [prefix + entry.base];
    if (entry.suffix) candidates.push(prefix + entry.base + entry.suffix, prefix + entry.base + "-" + entry.suffix);
    const matches = candidates.map((number) => byNumber.get(number)).filter(Boolean);
    if (matches.length > 1) conflicts.push(`Ambiguous contracts for ${prefix} / ${entry.abCode}`);
    const contract = matches[0];
    if (contract && !isSharedShell(contract)) {
      const kitchen = contract.kitchen;
      const codes = kitchenCodes(kitchen);
      if (!codes.includes(entry.base) && !codes.includes(entry.base + entry.suffix)) conflicts.push(`Kitchen mismatch: ${contract.contractNumber} -> ${kitchen.slug}`);
    }
    entries.push({ company: company.name, object: entry.objectName, abCode: entry.abCode,
      contractNumber: contract?.contractNumber || candidates[0], contractId: contract?.id || null,
      previousProjectId: contract?.projectId || null, targetProjectId: target.projectId,
      action: !contract ? "missing" : target.projectId && contract.projectId === target.projectId ? "unchanged" : contract.projectId ? "relink" : "link" });
  }
  // Real kitchen identity applies to every contract number, including 222 and
  // exceptional numbers. Never propagate ownership through the shared ARC shell.
  const sourceEntries = companies.flatMap((company) => company.entries.map((entry) => ({ ...entry, company: company.name })));
  const mapped = new Map(entries.filter((entry) => entry.contractId).map((entry) => [entry.contractId, entry]));
  for (const contract of contracts) {
    if (isSharedShell(contract)) continue;
    const codes = kitchenCodes(contract.kitchen);
    const matches = sourceEntries.filter((entry) => codes.includes(entry.base) || codes.includes(entry.base + entry.suffix));
    if (matches.length > 1) {
      conflicts.push(`Ambiguous kitchen codes: ${contract.contractNumber} -> ${contract.kitchen?.slug}`);
      continue;
    }
    if (!matches.length) continue;
    const source = matches[0];
    const existing = mapped.get(contract.id);
    if (existing) {
      if (existing.abCode !== source.abCode) conflicts.push(`Kitchen mismatch: ${contract.contractNumber} -> ${source.abCode}`);
      continue;
    }
    const target = companyPlans.find((company) => company.name === source.company).objects.find((object) => object.name === source.objectName);
    const entry = { company: source.company, object: source.objectName, abCode: source.abCode,
      contractNumber: contract.contractNumber, contractId: contract.id, matchedBy: "kitchen",
      previousProjectId: contract.projectId || null, targetProjectId: target.projectId,
      action: target.projectId && contract.projectId === target.projectId ? "unchanged" : contract.projectId ? "relink" : "link" };
    entries.push(entry);
    mapped.set(contract.id, entry);
  }
  const unmatchedContracts = contracts.filter((contract) => !mapped.has(contract.id)).map((contract) => {
    const project = projects.find((project) => project.id === contract.projectId);
    const owner = owners.find((owner) => owner.id === project?.housingCompanyId);
    return { contractNumber: contract.contractNumber, kitchen: contract.kitchen?.slug,
      previousProjectId: contract.projectId || null, company: owner?.name || null,
      reason: isSharedShell(contract) ? "Shared ARC shell; no exact contract-number match" : "Kitchen code absent or ambiguous in workbook" };
  });
  return { companies: companyPlans, entries, conflicts, unmatchedContracts, summary: {
    totalContracts: contracts.length, unmatchedContracts: unmatchedContracts.length,
    remainingWithoutCompany: unmatchedContracts.filter((contract) => !contract.company).length,
    matchedByKitchen: entries.filter((entry) => entry.matchedBy === "kitchen").length,
    companies: companies.length, abCodes: companies.reduce((n, c) => n + c.entries.length, 0),
    createCompanies: companyPlans.filter((c) => !c.id).length,
    updateCompanyAddresses: companyPlans.filter((c) => c.addressAction === "update").length,
    createObjects: companyPlans.flatMap((c) => c.objects).filter((o) => !o.objectId).length,
    createProjects: companyPlans.flatMap((c) => c.objects).filter((o) => !o.projectId).length,
    ...Object.fromEntries(["link", "relink", "unchanged", "missing"].map((action) => [action, entries.filter((e) => e.action === action).length])),
  } };
}

async function applyImport(prisma, companies) {
  return prisma.$transaction(async (tx) => {
    const plan = await buildPlan(tx, companies);
    if (plan.conflicts.length) throw new Error(plan.conflicts.join("\n"));
    for (const company of plan.companies) {
      const owner = company.id ? company : await tx.housingCompany.create({ data: { name: company.name, address: company.address } });
      if (company.addressAction === "update") {
        const result = await tx.housingCompany.updateMany({
          where: { id: company.id, address: company.previousAddress },
          data: { address: company.address },
        });
        if (result.count !== 1) throw new Error(`Company address changed during import: ${company.name}`);
      }
      for (const object of company.objects) {
        const objectId = object.objectId || (await tx.propertyObject.create({ data: { name: object.name, housingCompanyId: owner.id } })).id;
        const projectId = object.projectId || (await tx.project.create({ data: { name: object.name, housingCompanyId: owner.id, propertyObjectId: objectId } })).id;
        for (const entry of plan.entries.filter((e) => e.company === company.name && e.object === object.name && ["link", "relink"].includes(e.action))) {
          const result = await tx.kitchenContract.updateMany({ where: { id: entry.contractId, projectId: entry.previousProjectId }, data: { projectId } });
          if (result.count !== 1) throw new Error(`Contract changed during import: ${entry.contractNumber}`);
        }
      }
    }
    const verification = await buildPlan(tx, companies);
    if (verification.conflicts.length || verification.companies.some((c) => c.addressAction !== "unchanged")
      || verification.entries.some((e) => ["link", "relink"].includes(e.action))) throw new Error("Import verification failed");
    return verification;
  }, { isolationLevel: "Serializable", timeout: 120000 });
}

module.exports = { parseWorkbook, buildPlan, applyImport };

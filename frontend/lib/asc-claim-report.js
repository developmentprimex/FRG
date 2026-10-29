import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { normalizeAscKitchenFilters } from "./asc-kitchen-report.js";
import { frgReportPeriodLabel, reportDisplayDate } from "./frg-monthly-report.js";
import { isElectricalApplianceProblemArea } from "./service-claim-serial-number.js";
import { stripProductDimensionsFromLabel } from "./product-label-format.js";
import { getKitchenSpecification } from "./frg-monthly-report.js";
import { inferApplianceBrand, getContractApplianceBrandLabel, getInventoryApplianceTypes, normalizeContractApplianceType } from "./contract-appliances.js";
import { formatBusinessClaimReference as formatServiceClaimReference } from "./business-report-reference.js";

const AREA_PREFIXES = /^(?:Küchenbereiche:|Kitchen areas:|Mutfak bölgeleri:|Zonas de la cocina:|Zones concernées :|Кухонные зоны:)/;
const text = (value) => String(value || "").trim();
const normalized = (value) => text(value).toLowerCase().replace(/\s+/g, " ");

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

export function classifyClaimArea(area = {}) {
  const identity = normalized(`${area.componentId || ""} ${area.code || ""} ${area.claimPartKey || ""}`);
  const name = normalized(`${area.name || ""} ${area.nameDe || ""}`);
  // A furniture front, drawer or filter is not the appliance behind it.
  if (/front|drawer|filter|blende|panel|worktop|sink|faucet/.test(identity + " " + name)
      && !/sink-cabinet|sinkbase|sink base cabinet|sink lower cabinet/.test(identity + " " + name)) {
    return /front|drawer/.test(identity + " " + name) ? "cabinets" : "other";
  }
  if (isElectricalApplianceProblemArea(area)) return "electrical";
  if (/cabinet|sinkbase|\bschrank\b|unterschrank|oberschrank|hochschrank|\bcab-|\bus\d|\bwu\d|furniture-front|oven-drawer/.test(identity + " " + name)) return "cabinets";
  if (!identity.includes("reference-furniture") && /\b(?:kühlschrank|kuehlschrank|geschirrspüler|geschirrspueler|waschmaschine|backofen|kochfeld|dunstabzugshaube|herd)\b/.test(name)) return "electrical";
  if (/reference-furniture|\btop-|\bsink|worktop|blende|faucet|spüle|spuele|arbeitsplatte|sockel|rückwand|rueckwand|armatur|besteck|beleuchtung|lighting/.test(identity + " " + name)) return "other";
  return "unknown";
}

export function extractClaimAnalyticsAreas(claim) {
  const structured = parseArray(claim.problemAreasJson).filter((area) => area && typeof area === "object" && (area.name || area.code || area.componentId));
  if (structured.length) return structured;
  // Older submissions store only the selected-area header. Never classify free problem text.
  const lines = text(claim.problemDescription).split("\n").map((line) => line.trim());
  let names = [];
  if (AREA_PREFIXES.test(lines[0] || "")) {
    const inline = lines[0].replace(AREA_PREFIXES, "").trim();
    if (inline) names = inline.split(",");
    else for (const line of lines.slice(1)) { if (!line) break; names.push(line.split(":")[0]); }
  } else {
    const index = lines.indexOf("Ausgewählte Küchenbereiche:");
    if (index >= 0) for (const line of lines.slice(index + 1)) { if (!line.startsWith("-")) break; names.push(line.slice(1)); }
  }
  return names.map((name) => ({ name: stripProductDimensionsFromLabel(name).trim() })).filter((area) => area.name);
}


export const ASC_CLAIM_RECIPIENTS = ["kd@myarchitecto.de", "verwaltung@hbi-wohnen.de"];
export const ASC_CLAIM_METRICS = [["claims", "Claims"], ["emailsKd", `Emails to ${ASC_CLAIM_RECIPIENTS[0]}`], ["emailsHbi", `Emails to ${ASC_CLAIM_RECIPIENTS[1]}`]];
export const ASC_CLAIM_NOTES = [
  "Claims count distinct retained cases by their original creation date. Follow-up submissions within the same open case do not create another claim. Test contract numbers starting with 111 and test ticket series are excluded.",
  "Emails count successful logged recipient deliveries on their actual send dates, independently of the claim creation date. The two listed recipients are counted separately. Successful resends count again; duplicate entries for the same recipient within one attempt count once. Customer confirmations, other recipients, failed, skipped, unknown and historical unlogged deliveries are excluded.",
  "Claim details has one row per case up to the report cutoff, combining affected products, manufacturers and serial numbers from its submissions, including follow-ups. Each recipient's Yes/No flag indicates whether a successful delivery was recorded through the cutoff, including previous periods. No means no recorded successful delivery, not proof that an unlogged email was never sent.",
  "Kitchen claim totals include cases up to the report cutoff: Fragmento contracts sharing a Kitchen record are grouped together; other uploaded kitchens use their individual contract identity, never their shared technical shell. Case ordinal is the chronological case number within that kitchen, not the highest stored contract sequence.",
  "Manufacturers use recorded claim data or an exact article match against the kitchen AB/product/inventory metadata. Electrical claims without a real article code can also match a single installed appliance type in that contract's saved inventory, including legacy appliance labels. Lookup sources are shown; current metadata is not a historical manufacturer snapshot. Missing or ambiguous manufacturers/categories are marked Not recorded. No default brand is assumed for uploaded kitchens.",
  "Processing status and completion date are current operational data at export time, not reconstructed historical status. Historical repeat counts and submissions are bounded by the report cutoff.",
];

function claimSources(filters) {
  const typeFilter = filters.contractType ? Prisma.sql`AND c."contractType" = ${filters.contractType}` : Prisma.empty;
  return Prisma.sql`WITH claim_sources AS (
    SELECT sc.*, c.id AS "contractId", c."kitchenId", c."contractType",
      CASE WHEN c."contractType" = 'FRG' THEN 'FRG:' || c."kitchenId"
        WHEN c."contractType" = 'ARC' THEN 'ARC:' || c.id
        ELSE 'UNKNOWN:' || REGEXP_REPLACE(sc."contractNumber", '[[:space:]]+', '', 'g') END AS "kitchenKey"
    FROM "ServiceClaim" sc
    LEFT JOIN LATERAL (
      SELECT kc.id, kc."kitchenId", kc."contractType" FROM "KitchenContract" kc
      WHERE REGEXP_REPLACE(kc."contractNumber", '[[:space:]]+', '', 'g') = REGEXP_REPLACE(sc."contractNumber", '[[:space:]]+', '', 'g')
      ORDER BY (kc."contractNumber" = sc."contractNumber") DESC, kc.id LIMIT 1
    ) c ON TRUE
    WHERE REGEXP_REPLACE(sc."contractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
      AND COALESCE(to_jsonb(sc)->>'ticketSeries', 'live') <> 'test'
      AND sc."createdAt" AT TIME ZONE 'UTC' < ${filters.end} ${typeFilter}
  )`;
}

function deliveryRows() {
  return Prisma.sql`delivery_rows AS (
    SELECT DISTINCT a.id AS "attemptId", a."claimId", a."attemptedAt", lower(btrim(r->>'email')) AS recipient,
      COALESCE(a.delivery->>'kind', 'claim-notification') AS kind
    FROM "ServiceClaimEmailAttempt" a JOIN claim_sources sc ON sc.id = a."claimId"
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.delivery->'recipients') = 'array'
      THEN a.delivery->'recipients' ELSE '[]'::jsonb END) r
    WHERE r->>'status' = 'SENT' AND lower(btrim(r->>'email')) IN (${Prisma.join(ASC_CLAIM_RECIPIENTS)})
      AND COALESCE(a.delivery->>'kind', '') <> 'customer-confirmation'
  )`;
}

export function buildAscClaimReportSql(filters) {
  return Prisma.sql`${claimSources(filters)}, ${deliveryRows()}, events AS (
    SELECT sc."createdAt" AS at, 'claims' AS metric, 1::int AS value FROM claim_sources sc
    UNION ALL
    SELECT d."attemptedAt", CASE WHEN d.recipient = ${ASC_CLAIM_RECIPIENTS[0]} THEN 'emailsKd' ELSE 'emailsHbi' END, 1
    FROM delivery_rows d
  ) SELECT CASE WHEN e.at AT TIME ZONE 'UTC' < ${filters.start} THEN 'previous' ELSE 'current' END AS bucket,
    e.metric, SUM(e.value)::int AS value
  FROM events e WHERE e.at AT TIME ZONE 'UTC' < ${filters.end} GROUP BY 1, 2`;
}

export function assembleAscClaimReport(records, filters) {
  const empty = () => Object.fromEntries(ASC_CLAIM_METRICS.map(([key]) => [key, 0]));
  const previous = empty(), current = empty(), total = empty();
  for (const record of records) {
    if (!(record.metric in total) || !["previous", "current"].includes(record.bucket)) continue;
    (record.bucket === "previous" ? previous : current)[record.metric] += Number(record.value);
  }
  for (const [key] of ASC_CLAIM_METRICS) total[key] = previous[key] + current[key];
  return { filters, metrics: ASC_CLAIM_METRICS, previous, current, total, notes: ASC_CLAIM_NOTES };
}

export async function loadAscClaimReport(input = {}, db = prisma, now = new Date()) {
  const filters = normalizeAscKitchenFilters(input, now);
  return assembleAscClaimReport(await db.$queryRaw(buildAscClaimReportSql(filters)), filters);
}

export function buildAscClaimDetailsSql(filters) {
  return Prisma.sql`${claimSources(filters)}
    SELECT sc.*, COUNT(*) OVER (PARTITION BY sc."kitchenKey")::int AS "kitchenClaimsTotal",
      COUNT(*) FILTER (WHERE sc."createdAt" AT TIME ZONE 'UTC' >= ${filters.start} OR ${filters.start}::timestamptz IS NULL)
        OVER (PARTITION BY sc."kitchenKey")::int AS "kitchenClaimsInPeriod",
      ROW_NUMBER() OVER (PARTITION BY sc."kitchenKey" ORDER BY sc."createdAt", sc.id)::int AS "kitchenClaimOrdinal"
    FROM claim_sources sc ORDER BY sc."createdAt", sc.id`;
}

export function buildAscClaimDeliveriesSql(filters) {
  return Prisma.sql`${claimSources(filters)}, ${deliveryRows()}
    SELECT * FROM delivery_rows d WHERE d."attemptedAt" AT TIME ZONE 'UTC' < ${filters.end}
    ORDER BY d."attemptedAt", d."attemptId", d.recipient`;
}

// The main schema does not include the separate claim-processing feature.
// Read existing follow-ups when that optional table is present; never create it.
export async function loadReportSubmissions(db, ids, cutoff) {
  const [table] = await db.$queryRaw`SELECT to_regclass('"ServiceClaimSubmission"')::text AS relation`;
  if (!table?.relation) return [];
  return db.$queryRaw`SELECT id, "claimId", payload, "createdAt" FROM "ServiceClaimSubmission"
    WHERE "claimId" IN (${Prisma.join(ids)}) AND "createdAt" AT TIME ZONE 'UTC' < ${cutoff}
    ORDER BY "createdAt", id`;
}

export async function loadAscClaimDetails(filters, db = prisma) {
  const claims = await db.$queryRaw(buildAscClaimDetailsSql(filters));
  if (!claims.length) return { claims: [], deliveries: [] };
  const ids = claims.map(claim => claim.id);
  const contractIds = [...new Set(claims.map(claim => claim.contractId).filter(Boolean))];
  const [submissions, contracts, deliveries] = await Promise.all([
    loadReportSubmissions(db, ids, filters.end),
    contractIds.length ? db.kitchenContract.findMany({ where: { id: { in: contractIds } }, include: {
      kitchen: { include: { items: { include: { catalogArticle: true } } } }, appliances: true,
      project: { include: { housingCompany: true, propertyObject: true } },
    } }) : [],
    db.$queryRaw(buildAscClaimDeliveriesSql(filters)),
  ]);
  const byContract = new Map(contracts.map(contract => [contract.id, contract]));
  const bySubmission = new Map();
  for (const row of submissions) {
    if (!bySubmission.has(row.claimId)) bySubmission.set(row.claimId, []);
    bySubmission.get(row.claimId).push(row);
  }
  return { claims: claims.map(claim => ({ ...claim, contract: byContract.get(claim.contractId) || null,
    submissions: bySubmission.get(claim.id) || [] })), deliveries };
}

const clean = value => String(value || "").trim();
const articleKey = value => clean(value).replace(/\s+/g, "").toUpperCase();
const categoryLabels = { cabinets: "Cabinets", electrical: "Electrical appliances", other: "Other components", unknown: "Not recorded" };
const unique = values => [...new Set(values.filter(Boolean))];

// Older uploaded-plan claims have generic REFERENCE codes and may identify the
// appliance only by its label. Match known appliance labels, never problem text
// or the shared upload kitchen's inventory.
function claimApplianceTypes(area) {
  if (clean(area.applianceType)) {
    const type = normalizeContractApplianceType(area.applianceType);
    return type ? [type] : [];
  }
  const types = getInventoryApplianceTypes(area);
  if (types.length) return types;
  const label = clean(area.name || area.nameDe).toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
  const legacyTypes = { geschirrspuler: "dishwasher", geschirrspueler: "dishwasher", dunstabzugshaube: "extractor_hood",
    kuhlschrank: "fridge", kuehlschrank: "fridge", "kuhl-/gefrierkombination": "fridge", "kuhl-gefrierkombination": "fridge" };
  return legacyTypes[label] ? [legacyTypes[label]] : [];
}

export function claimProductDetails(area, contract = null) {
  const category = classifyClaimArea(area);
  const article = clean(area.articleCode || area.code);
  const base = { category: categoryLabels[category], product: clean(area.name || area.nameDe || area.code || area.componentId) || "Not recorded",
    article, serialNumber: clean(area.serialNumber), manufacturer: "Not recorded", manufacturerSource: "Not recorded" };
  if (clean(area.manufacturer || area.brand)) return { ...base, manufacturer: clean(area.manufacturer || area.brand), manufacturerSource: "Recorded claim" };
  const labelBrand = category === "electrical" ? getContractApplianceBrandLabel(inferApplianceBrand(area)) : "";
  if (labelBrand) return { ...base, manufacturer: labelBrand, manufacturerSource: "Recorded claim label" };
  const codes = article.split("+").map(articleKey).filter(code => code && !code.startsWith("REFERENCE-"));
  const reference = getKitchenSpecification(contract?.kitchen);
  const abBrands = unique((reference?.articles || []).filter(row => codes.includes(articleKey(row.articleNumber))).map(row => clean(row.manufacturer)));
  if (abBrands.length) return { ...base, manufacturer: abBrands.join(" / "), manufacturerSource: "Matching AB article" };
  const matchingItems = (contract?.kitchen?.items || []).filter(item => codes.includes(articleKey(item.articleNumber)));
  const productBrands = unique(matchingItems.flatMap(item => [item, item.catalogArticle].filter(product => product && codes.includes(articleKey(product.articleNumber)))
    .map(product => clean(product.manufacturer || product.brand) || (category === "electrical" ? getContractApplianceBrandLabel(inferApplianceBrand(product)) : ""))));
  if (productBrands.length === 1) return { ...base, manufacturer: productBrands[0], manufacturerSource: "Current metadata, matching article" };
  if (category === "electrical") {
    const inventory = (contract?.appliances || []).filter(appliance => appliance.isPresent !== false);
    const inventoryBrands = unique(inventory.filter(appliance => codes.includes(articleKey(appliance.articleNumber)))
      .map(appliance => getContractApplianceBrandLabel(appliance.brand) || clean(appliance.brand)));
    if (inventoryBrands.length === 1) return { ...base, manufacturer: inventoryBrands[0], manufacturerSource: "Current inventory, matching article" };
    // A different known article may be a replacement. Do not override it with
    // the current appliance's brand based only on its type.
    if (!codes.length) {
      const types = claimApplianceTypes(area);
      if (types.length === 1) {
        const matches = inventory.filter(appliance => normalizeContractApplianceType(appliance.applianceType) === types[0]);
        const brands = unique(matches.map(appliance => getContractApplianceBrandLabel(appliance.brand) || clean(appliance.brand)));
        if (matches.length && brands.length === 1 && matches.every(appliance => clean(appliance.brand))) {
          return { ...base, manufacturer: brands[0], manufacturerSource: "Current contract inventory, matching appliance type" };
        }
      }
    }
  }
  return base;
}

export function claimReportSubmissions(claim, cutoff) {
  const followUps = (claim.submissions || []).filter(row => row.id !== claim.id && row.payload?.id !== claim.id && new Date(row.createdAt) < cutoff)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id.localeCompare(b.id));
  return [{ ...claim, submissionId: claim.id, submissionAt: claim.createdAt, initial: true },
    ...followUps.map(row => ({ ...row.payload, submissionId: row.id, submissionAt: row.createdAt, initial: false }))];
}

const reference = claim => formatServiceClaimReference(claim.contractNumber, claim.claimSequence, claim.ticketNumber);
const periodOf = (date, filters) => filters.start && new Date(date) < filters.start ? "Previous" : "Selected period";

export function getAscClaimReportSheets(report, data = { claims: [], deliveries: [] }) {
  const { filters } = report;
  const range = `${frgReportPeriodLabel(filters)}; ${filters.contractType || "All sources"}; Europe/Berlin; cutoff ${filters.end.toISOString()}`;
  const summary = { name: "ASC", title: `CLAIMS AND EMAILS | ${range}`,
    headers: ["Description", filters.previousDate ? `Through ${reportDisplayDate(filters.previousDate)}` : "Before selected period", frgReportPeriodLabel(filters), "Total"],
    rows: report.metrics.map(([key, label]) => [label, report.previous[key], report.current[key], report.total[key]]), highlightHeader: true };
  const claimRows = [];
  const observed = [];
  const sentByClaim = new Map();
  const claimById = new Map(data.claims.map(claim => [claim.id, claim]));
  for (const delivery of data.deliveries) {
    const claim = claimById.get(delivery.claimId);
    if (!claim) throw new Error("Email delivery has no matching claim in this report.");
    if (!ASC_CLAIM_RECIPIENTS.includes(delivery.recipient)) throw new Error("Unexpected email recipient in ASC report.");
    const bucket = periodOf(delivery.attemptedAt, filters) === "Previous" ? "previous" : "current";
    if (!sentByClaim.has(claim.id)) sentByClaim.set(claim.id, {});
    const key = delivery.recipient === ASC_CLAIM_RECIPIENTS[0] ? "emailsKd" : "emailsHbi";
    const counts = sentByClaim.get(claim.id);
    counts[key] = (counts[key] || 0) + 1;
    observed.push({ bucket, metric: key, value: 1 });
  }
  for (const claim of data.claims) {
    const contract = claim.contract || {}, project = contract.project || {};
    const submissions = claimReportSubmissions(claim, filters.end);
    observed.push({ bucket: periodOf(claim.createdAt, filters) === "Previous" ? "previous" : "current", metric: "claims", value: 1 });
    const products = [];
    for (const submission of submissions) {
      const areas = extractClaimAnalyticsAreas(submission);
      for (const area of areas.length ? areas : [{}]) {
        products.push(claimProductDetails(area, contract));
      }
    }
    const sent = sentByClaim.get(claim.id) || {};
    claimRows.push([claim.createdAt, reference(claim), claim.contractNumber, project.housingCompany?.name || "",
      claim.fullName, claim.email || "", claim.phone || "", claim.clientAddress || "", claim.clientPostalCode || "", claim.clientCity || "", claim.clientCountry || "",
      unique(products.map(product => product.category)).join(" / "), unique(products.map(product => product.product)).join("\n"),
      unique(products.map(product => product.manufacturer)).join(" / "), unique([clean(claim.serialNumber), ...products.map(product => product.serialNumber)]).join("\n"),
      sent.emailsKd ? "Yes" : "No", sent.emailsHbi ? "Yes" : "No"]);
  }
  const reconciled = assembleAscClaimReport(observed, filters);
  for (const bucket of ["previous", "current", "total"]) for (const [metric] of report.metrics) {
    if (reconciled[bucket][metric] !== report[bucket][metric]) throw new Error(`ASC details do not reconcile: ${bucket} ${metric}`);
  }
  return [summary, {
    name: "Claim details", title: `CLAIM DETAILS | ${range}`, highlightHeader: true,
    headers: ["Claim created (Berlin)", "Claim reference", "Contract number", "Company", "Customer", "Email", "Phone", "Customer address", "Postal code", "City", "Country",
      "Categories", "Affected products", "Manufacturers", "Serial number(s)",
      ...ASC_CLAIM_RECIPIENTS.map(email => `Email sent to ${email}`)], rows: claimRows,
  }];
}

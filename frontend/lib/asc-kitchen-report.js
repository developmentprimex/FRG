import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { normalizeBusinessReportFilters } from "./business-report-filters.js";
import { normalizeFrgMonthlyFilters, frgReportPeriodLabel, reportDisplayDate } from "./frg-monthly-report.js";

export const ASC_KITCHEN_CATEGORIES = [
  ["fromFragmento", "Kitchens from Fragmento"],
  ["otherKitchens", "Other kitchens (uploads / other companies)"],
];

export const ASC_KITCHEN_NOTES = [
  "Kitchens from Fragmento: each Kitchen record with at least one non-test FRG contract counts once, regardless of contract prefixes, using the kitchen creation date. Fragmento kitchens are available in ASC through the shared database; a separate historical ASC transfer date is not recorded.",
  "Other kitchens: each non-test ARC contract represents one individually registered/uploaded kitchen, including HBI and other companies. A shared technical kitchen shell does not merge different uploaded kitchens. Updating or re-uploading an existing kitchen plan does not create another addition.",
  "Test contracts starting with 111 are excluded. The kitchen source filter selects kitchens from Fragmento, other kitchens, or both categories. Current classifications and currently retained records are used.",
  "Previous includes all additions before the selected start date; selected period includes additions in the chosen date range, with an inclusive end date and a cutoff at now. Total equals previous plus selected period. Dates use Europe/Berlin.",
];

export function normalizeAscKitchenFilters(input = {}, now = new Date()) {
  return { ...normalizeFrgMonthlyFilters(input, now), contractType: normalizeBusinessReportFilters(input, now).contractType };
}

export function buildAscKitchenSql(filters) {
  const category = filters.contractType === "FRG" ? "fromFragmento" : filters.contractType === "ARC" ? "otherKitchens" : "";
  const sourceFilter = category ? Prisma.sql`AND e.category = ${category}` : Prisma.empty;
  return Prisma.sql`WITH live_contracts AS (
    SELECT * FROM "KitchenContract"
    WHERE REGEXP_REPLACE("contractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
  ), kitchen_events AS (
    SELECT k.id, k."createdAt" AS "addedAt", 'fromFragmento' AS category
    FROM "Kitchen" k
    WHERE EXISTS (SELECT 1 FROM live_contracts c WHERE c."kitchenId" = k.id AND c."contractType" = 'FRG')
    UNION ALL
    SELECT c.id, c."createdAt", 'otherKitchens'
    FROM live_contracts c WHERE c."contractType" = 'ARC'
  )
  SELECT CASE WHEN e."addedAt" AT TIME ZONE 'UTC' < ${filters.start} THEN 'previous' ELSE 'current' END AS bucket,
    e.category, COUNT(*)::int AS value
  FROM kitchen_events e WHERE e."addedAt" AT TIME ZONE 'UTC' < ${filters.end} ${sourceFilter}
  GROUP BY 1, 2`;
}

export function assembleAscKitchenReport(records, filters) {
  const empty = () => Object.fromEntries(ASC_KITCHEN_CATEGORIES.map(([key]) => [key, 0]));
  const previous = empty(), current = empty(), total = empty();
  for (const record of records) {
    if (!(record.category in total) || !["previous", "current"].includes(record.bucket)) continue;
    (record.bucket === "previous" ? previous : current)[record.category] += Number(record.value);
  }
  for (const [key] of ASC_KITCHEN_CATEGORIES) total[key] = previous[key] + current[key];
  const combined = { previous: 0, current: 0, total: 0 };
  for (const [key] of ASC_KITCHEN_CATEGORIES) {
    combined.previous += previous[key]; combined.current += current[key]; combined.total += total[key];
  }
  return { filters, categories: ASC_KITCHEN_CATEGORIES, previous, current, total, combined, notes: ASC_KITCHEN_NOTES };
}

export async function loadAscKitchenReport(input = {}, db = prisma, now = new Date()) {
  const filters = normalizeAscKitchenFilters(input, now);
  return assembleAscKitchenReport(await db.$queryRaw(buildAscKitchenSql(filters)), filters);
}

// Kitchen quantities live in the cumulative category table; the activity table
// retains claims and email deliveries for the selected dates and grouping.
export function ascActivityOnly(report) {
  const columns = report.ASC.columns.filter(([key]) => !["frgKitchens", "arcKitchens"].includes(key));
  const rows = report.ASC.rows.filter(row => columns.some(([key]) => Number(row[key]) !== 0));
  const total = Object.fromEntries(columns.map(([key]) => [key, report.ASC.total[key]]));
  return { ...report, ASC: { columns, rows, total } };
}

export function getAscKitchenReportSheets(report) {
  const { filters } = report;
  const range = `${frgReportPeriodLabel(filters)}; ${filters.contractType || "FRG + ARC"}; Europe/Berlin; cutoff ${filters.end.toISOString()}`;
  return [{
    name: "ASC kitchens", title: `ASC KITCHENS | ${range}`,
    headers: ["Category", filters.previousDate ? `Through ${reportDisplayDate(filters.previousDate)}` : "Before selected period", frgReportPeriodLabel(filters), "Total"],
    rows: [...report.categories.map(([key, label]) => [label, report.previous[key], report.current[key], report.total[key]]),
      ["Total", report.combined.previous, report.combined.current, report.combined.total]],
    highlightHeader: true, totalRows: [report.categories.length],
  }, {
    name: "Report notes", title: `ASC KITCHEN DEFINITIONS | ${range}`, headers: ["Definition"], rows: report.notes.map(note => [note]),
  }];
}

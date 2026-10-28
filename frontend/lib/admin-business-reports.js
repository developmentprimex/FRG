import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { REPORT_TIME_ZONE } from "./admin-date-time.js";
import { reportDayStart } from "./business-report-dates.js";
import { normalizeBusinessReportFilters, shiftReportDate } from "./business-report-filters.js";
import { VAT_RATE } from "./price-utils.js";

export const FRAGMENTO_REPORT_COLUMNS = [
  ["orders", "Orders"],
  ["salesNet", "Sales excl. VAT (EUR)", "currency"], ["salesGross", "Sales incl. VAT (EUR)", "currency"],
  ["cancellationRequests", "Cancellation requests"],
  ["kitchens", "Kitchen models added"], ["contracts", "Kitchen contracts added"], ["emails", "Emails sent (recipients)"],
];
export const ASC_REPORT_COLUMNS = [
  ["claims", "Claims"], ["frgKitchens", "FRG kitchen models added"], ["arcKitchens", "ARC kitchens added"],
  ["emailsKd", "Emails to kd@myarchitecto.de"], ["emailsHbi", "Emails to verwaltung@hbi-wohnen.de"],
];

export const BUSINESS_REPORT_NOTES = [
  "Periods use Europe/Berlin. Weeks start on Monday. Test contracts starting with 111 are excluded.",
  "Business tables use the date range and contract type; the type/status filters apply only to the order/claim detail table.",
  "FRG kitchen models are counted once when the first live contract is added, using the later of the model creation date and first live contract creation date. FRG contracts count individual kitchen assignments.",
  "ARC kitchens are counted individually by live ARC contract creation date, including uploaded plans that share a technical kitchen model. Updating or re-uploading a plan for an existing contract does not count it again.",
  "FRG contracts are available in ASC through the shared kitchen database. A separate historical transfer date is not recorded.",
  "Orders and claims use creation dates. Cancellation requests use their received date and include all statuses (received, approved and rejected), including requests not yet matched to an order. Only periods with activity are listed.",
  "Emails count successful recipient deliveries on the logged send date, including successful resends. Fragmento includes order and cancellation emails. ASC counts recorded claim emails to kd@myarchitecto.de and verwaltung@hbi-wohnen.de separately; other recipients, feedback invitations and redirected local test emails are excluded. Failed, skipped, unknown and historical unlogged deliveries are not included.",
  "Fragmento sales use the stored gross prices of the same orders included in the order count, across all statuses. Net sales are calculated per order using 19% VAT and rounded to cents before summing. Service costs are applied separately.",
];

export function buildBusinessReportSql(filters) {
  const conditions = [];
  // Prisma timestamps are UTC without a PostgreSQL timezone. Interpret them
  // explicitly, since comparing to a bound timestamptz otherwise uses the DB session zone.
  if (filters.dateFrom) conditions.push(Prisma.sql`e."happenedAt" AT TIME ZONE 'UTC' >= ${reportDayStart(filters.dateFrom)}`);
  if (filters.dateTo) conditions.push(Prisma.sql`e."happenedAt" AT TIME ZONE 'UTC' < ${reportDayStart(shiftReportDate(filters.dateTo, 1))}`);
  if (filters.contractType) conditions.push(Prisma.sql`e."contractType" = ${filters.contractType}`);
  const where = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
  const grouping = { DAY: "day", WEEK: "week", MONTH: "month" }[filters.groupBy] || "day";
  return Prisma.sql`
    WITH live_contracts AS (
      SELECT * FROM "KitchenContract" WHERE REGEXP_REPLACE("contractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
    ), live_orders AS (
      SELECT o.*, c."contractType" FROM "Order" o
      LEFT JOIN live_contracts c ON c."id" = o."kitchenContractId"
      WHERE REGEXP_REPLACE(COALESCE(o."contractNumber", ''), '[[:space:]]+', '', 'g') NOT LIKE '111%'
        AND NOT EXISTS (SELECT 1 FROM "KitchenContract" tc WHERE tc."id" = o."kitchenContractId" AND REGEXP_REPLACE(tc."contractNumber", '[[:space:]]+', '', 'g') LIKE '111%')
    ), live_claims AS (
      SELECT sc.*, c."contractType" FROM "ServiceClaim" sc
      LEFT JOIN live_contracts c ON c."contractNumber" = sc."contractNumber"
      WHERE REGEXP_REPLACE(sc."contractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
    ), events AS (
      SELECT o."createdAt" AS "happenedAt", o."contractType", 'Fragmento' AS scope, 'orders' AS metric, 1::numeric AS value
      FROM live_orders o
      UNION ALL
      SELECT o."createdAt", o."contractType", 'Fragmento', 'salesGross', o."totalPrice"::numeric
      FROM live_orders o
      UNION ALL
      SELECT o."createdAt", o."contractType", 'Fragmento', 'salesNet', ROUND(o."totalPrice"::numeric / ${1 + VAT_RATE}::numeric, 2)
      FROM live_orders o
      UNION ALL
      SELECT cr."receivedAt", c."contractType", 'Fragmento', 'cancellationRequests', 1
      FROM "OrderCancellationRequest" cr
      LEFT JOIN live_contracts c ON c."contractNumber" = cr."submittedContractNumber"
      WHERE REGEXP_REPLACE(cr."submittedContractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
      UNION ALL
      SELECT c."createdAt", c."contractType", 'Fragmento', 'contracts', 1
      FROM live_contracts c WHERE c."contractType" = 'FRG'
      UNION ALL
      SELECT GREATEST(k."createdAt", c."firstAt"), c."contractType", s.scope,
        CASE WHEN s.scope = 'Fragmento' THEN 'kitchens' ELSE 'frgKitchens' END, 1
      FROM (SELECT "kitchenId", "contractType", MIN("createdAt") AS "firstAt" FROM live_contracts WHERE "contractType" = 'FRG' GROUP BY "kitchenId", "contractType") c
      JOIN "Kitchen" k ON k.id = c."kitchenId" CROSS JOIN (VALUES ('Fragmento'), ('ASC')) s(scope)
      UNION ALL
      SELECT c."createdAt", c."contractType", 'ASC', 'arcKitchens', 1
      FROM live_contracts c WHERE c."contractType" = 'ARC'
      UNION ALL
      SELECT sc."createdAt", sc."contractType", 'ASC', 'claims', 1 FROM live_claims sc
      UNION ALL
      SELECT a."attemptedAt", o."contractType", 'Fragmento', 'emails', COUNT(DISTINCT lower(r->>'email'))
      FROM "OrderEmailAttempt" a JOIN live_orders o ON o.id = a."orderId"
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.delivery->'recipients') = 'array' THEN a.delivery->'recipients' ELSE '[]'::jsonb END) r
      WHERE a."orderKind" = 'live' AND r->>'status' = 'SENT' AND COALESCE(r->>'email', '') <> ''
      GROUP BY a.id, a."attemptedAt", o."contractType"
      UNION ALL
      SELECT a."attemptedAt", sc."contractType", 'ASC',
        CASE lower(btrim(r->>'email')) WHEN 'kd@myarchitecto.de' THEN 'emailsKd' ELSE 'emailsHbi' END,
        COUNT(DISTINCT lower(btrim(r->>'email')))
      FROM "ServiceClaimEmailAttempt" a JOIN live_claims sc ON sc.id = a."claimId"
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.delivery->'recipients') = 'array' THEN a.delivery->'recipients' ELSE '[]'::jsonb END) r
      WHERE r->>'status' = 'SENT' AND lower(btrim(r->>'email')) IN ('kd@myarchitecto.de', 'verwaltung@hbi-wohnen.de')
      GROUP BY a.id, a."attemptedAt", sc."contractType",
        CASE lower(btrim(r->>'email')) WHEN 'kd@myarchitecto.de' THEN 'emailsKd' ELSE 'emailsHbi' END
      UNION ALL
      SELECT m."sentAt", c."contractType", 'Fragmento', 'emails', 1
      FROM "OrderCancellationRequest" cr LEFT JOIN live_contracts c ON c."contractNumber" = cr."submittedContractNumber"
      CROSS JOIN LATERAL (VALUES (cr."customerEmailSentAt"), (cr."internalEmailSentAt"), (cr."finalEmailSentAt")) m("sentAt")
      WHERE m."sentAt" IS NOT NULL AND REGEXP_REPLACE(cr."submittedContractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
    )
    SELECT to_char(date_trunc(${grouping}, e."happenedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${REPORT_TIME_ZONE}), 'YYYY-MM-DD') AS period,
      e.scope, e.metric, SUM(e.value)::double precision AS value
    FROM events e ${where} GROUP BY 1, 2, 3 ORDER BY 1, 2, 3
  `;
}

export function assembleBusinessReport(records, filters) {
  const scopes = {};
  for (const [scope, columns] of [["Fragmento", FRAGMENTO_REPORT_COLUMNS], ["ASC", ASC_REPORT_COLUMNS]]) {
    const empty = () => Object.fromEntries(columns.map(([key]) => [key, 0]));
    const byPeriod = new Map();
    for (const record of records.filter(row => row.scope === scope)) {
      if (!columns.some(([key]) => key === record.metric)) continue;
      if (!byPeriod.has(record.period)) byPeriod.set(record.period, { period: record.period, ...empty() });
      byPeriod.get(record.period)[record.metric] += Number(record.value);
    }
    const rows = [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));
    for (const row of rows) {
      for (const [key, , format] of columns) {
        if (format === "currency") row[key] = Number(row[key].toFixed(2));
      }
    }
    const total = rows.reduce((sum, row) => {
      for (const [key] of columns) sum[key] += row[key];
      return sum;
    }, empty());
    for (const [key, , format] of columns) {
      if (format === "currency") total[key] = Number(total[key].toFixed(2));
    }
    scopes[scope] = { columns, rows, total };
  }
  return { filters, ...scopes, notes: BUSINESS_REPORT_NOTES };
}

export async function loadBusinessReportData(input = {}, db = prisma) {
  const filters = normalizeBusinessReportFilters(input);
  const records = await db.$queryRaw(buildBusinessReportSql(filters));
  return assembleBusinessReport(records, filters);
}

export function getBusinessReportSheets(report) {
  const range = `${report.filters.dateFrom || "All"} - ${report.filters.dateTo || "All"}; ${report.filters.groupBy}; ${report.filters.contractType || "FRG + ARC"}; Europe/Berlin`;
  const sheets = ["Fragmento", "ASC"].map(scope => {
    const { columns, rows, total } = report[scope];
    const values = row => columns.map(([key]) => row[key]);
    return {
      name: scope, title: `${scope.toUpperCase()} | ${range}`,
      headers: ["Period starting", ...columns.map(([, label]) => label)],
      currencyColumns: columns.flatMap(([, , format], index) => format === "currency" ? [index + 1] : []),
      highlightHeader: true,
      totalRows: [rows.length],
      dateColumns: [0],
      rows: [...rows.map(row => [new Date(`${row.period}T00:00:00.000Z`), ...values(row)]), ["TOTAL", ...values(total)]],
    };
  });
  return [...sheets, { name: "Report notes", title: "REPORT DEFINITIONS", headers: ["Definition"], rows: report.notes.map(note => [note]) }];
}

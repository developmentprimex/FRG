import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { REPORT_TIME_ZONE } from "./admin-date-time.js";
import { workDayStart } from "./work-processing-rules.js";
import { normalizeBusinessReportFilters, shiftReportDate } from "./business-report-filters.js";
import { VAT_RATE } from "./price-utils.js";
import { formatServiceClaimReference } from "./service-claim-email-subject.js";

export function buildBusinessReportDetailsSql(filters, scope) {
  if (!["FRG", "ASC"].includes(scope)) throw new Error("Invalid report scope.");
  const orders = scope === "FRG";
  const conditions = [Prisma.sql`REGEXP_REPLACE(COALESCE(r."contractNumber", ''), '[[:space:]]+', '', 'g') NOT LIKE '111%'`];
  if (orders) conditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "KitchenContract" tc WHERE tc.id = r."kitchenContractId" AND REGEXP_REPLACE(tc."contractNumber", '[[:space:]]+', '', 'g') LIKE '111%')`);
  if (filters.dateFrom) conditions.push(Prisma.sql`r."createdAt" AT TIME ZONE 'UTC' >= ${workDayStart(filters.dateFrom)}`);
  if (filters.dateTo) conditions.push(Prisma.sql`r."createdAt" AT TIME ZONE 'UTC' < ${workDayStart(shiftReportDate(filters.dateTo, 1))}`);
  if (filters.contractType) conditions.push(Prisma.sql`c."contractType" = ${filters.contractType}`);
  const source = orders
    ? Prisma.sql`"Order" r LEFT JOIN live_contracts c ON c.id = r."kitchenContractId"`
    : Prisma.sql`"ServiceClaim" r LEFT JOIN live_contracts c ON c."contractNumber" = r."contractNumber"`;
  const fields = orders
    ? Prisma.sql`r."orderNumber" AS reference, COALESCE(r."contractNumber", c."contractNumber", '') AS "contractNumber",
      CONCAT_WS(' ', r."firstName", r."lastName") AS customer, r.status::text AS status,
      ROUND(r."totalPrice"::numeric / ${1 + VAT_RATE}::numeric, 2)::double precision AS "salesNet",
      r."totalPrice"::double precision AS "salesGross"`
    : Prisma.sql`r."contractNumber", r."ticketNumber", r."claimSequence", r."fullName" AS customer,
      r."problemDescription" AS issue`;
  return Prisma.sql`WITH live_contracts AS (
    SELECT * FROM "KitchenContract" WHERE REGEXP_REPLACE("contractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
  )
  SELECT r.id, r."createdAt", c."contractType",
    to_char(r."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${REPORT_TIME_ZONE}, 'YYYY-MM-DD') AS day,
    to_char(r."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${REPORT_TIME_ZONE}, 'HH24:MI') AS time,
    ${fields}
  FROM ${source}
  WHERE ${Prisma.join(conditions, " AND ")}
  ORDER BY r."createdAt", r.id`;
}

export async function loadBusinessReportDetails(input, scope, db = prisma) {
  const filters = normalizeBusinessReportFilters(input);
  const records = await db.$queryRaw(buildBusinessReportDetailsSql(filters, scope));
  return records.map(row => scope === "ASC" ? {
    ...row, reference: formatServiceClaimReference(row.contractNumber, row.claimSequence, row.ticketNumber),
  } : row);
}

export function buildBusinessReportDetailSheet(records, scope, filters) {
  if (!["FRG", "ASC"].includes(scope)) throw new Error("Invalid report scope.");
  const orders = scope === "FRG";
  const headers = ["Date", "Time (Berlin)", orders ? "Order" : "Claim", "Contract number", "Contract type", "Customer",
    ...(orders ? ["Status", "Orders", "Sales excl. VAT (EUR)", "Sales incl. VAT (EUR)"] : ["Issue", "Claims"])];
  const rows = [];
  const totalRows = [];
  const total = { count: 0, net: 0, gross: 0 };
  const days = new Map();
  for (const record of [...records].sort((a, b) => a.day.localeCompare(b.day)
    || (a.createdAt && b.createdAt ? new Date(a.createdAt) - new Date(b.createdAt) : a.time.localeCompare(b.time))
    || String(a.id).localeCompare(String(b.id)))) {
    if (!days.has(record.day)) days.set(record.day, []);
    days.get(record.day).push(record);
  }
  function appendTotal(label, values) {
    const row = Array(headers.length).fill(null);
    row[0] = label;
    row[7] = values.count;
    if (orders) { row[8] = values.net / 100; row[9] = values.gross / 100; }
    totalRows.push(rows.length);
    rows.push(row);
  }
  for (const [day, items] of days) {
    const subtotal = { count: 0, net: 0, gross: 0 };
    for (const item of items) {
      const base = [new Date(`${day}T00:00:00.000Z`), item.time, item.reference, item.contractNumber || "", item.contractType || "", item.customer || ""];
      rows.push([...base, ...(orders ? [item.status, 1, item.salesNet, item.salesGross] : [item.issue || "", 1])]);
      subtotal.count++;
      if (orders) { subtotal.net += Math.round(item.salesNet * 100); subtotal.gross += Math.round(item.salesGross * 100); }
    }
    const [year, month, date] = day.split("-");
    appendTotal(`TOTAL ${date}/${month}/${year}`, subtotal);
    for (const key of ["count", "net", "gross"]) total[key] += subtotal[key];
  }
  appendTotal("TOTAL", total);
  return {
    name: orders ? "Order details" : "Claim details",
    title: `${orders ? "ORDER" : "CLAIM"} DETAILS | ${filters.dateFrom || "All"} - ${filters.dateTo || "All"}; ${filters.contractType || "FRG + ARC"}; Europe/Berlin`,
    headers, rows, highlightHeader: true, totalRows, dateColumns: [0], currencyColumns: orders ? [8, 9] : [],
  };
}

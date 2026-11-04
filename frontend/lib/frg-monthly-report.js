import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { reportDateKey as workDateKey, reportDayStart as workDayStart } from "./business-report-dates.js";
import { shiftReportDate, normalizeBusinessReportFilters, BUSINESS_REPORT_PERIODS, getActiveBusinessReportPeriod } from "./business-report-filters.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inferApplianceBrand, getContractApplianceBrandLabel } from "./contract-appliances.js";
import { VAT_RATE } from "./price-utils.js";
import { formatAdminMonth } from "./admin-date-time.js";
import { getPurchasedReportItems } from "./report-details.js";

// Optional existing AB metadata enriches report articles without installing the
// separate AB import/sync feature or requiring its files on main.
let reportSpecifications;
function readReportSpecifications() {
  if (reportSpecifications !== undefined) return reportSpecifications;
  try { reportSpecifications = JSON.parse(readFileSync(join(process.cwd(), "data/kitchen-specifications/index.json"), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; reportSpecifications = {}; }
  return reportSpecifications;
}

const normalizeArticle = (value) => String(value || "").replace(/\s+/g, "").toUpperCase();

// Dashboard and legacy kitchens may use six digits with a grouping hyphen.
// Never infer a document from a contract number, partial code or layout variant.
export function getKitchenSpecification(kitchen = {}) {
  const identityMatch = /^(?:ab-)?(\d{3})-?(\d{3})$/.exec(String(kitchen?.slug || ""));
  const identity = identityMatch ? `ab-${identityMatch[1]}${identityMatch[2]}` : null;
  const specifications = readReportSpecifications();
  return identity && Object.hasOwn(specifications, identity) ? specifications[identity] : null;
}

function manufacturerForItem(item, reference) {
  const article = item.articleNumberSnapshot || item.kitchenItem?.articleNumber || "";
  const kitchenItem = item.kitchenItem || {};
  const catalog = kitchenItem.catalogArticle || {};
  const snapshotBrand = getContractApplianceBrandLabel(inferApplianceBrand({ name: item.nameSnapshot, nameDe: item.nameDeSnapshot }));
  if (snapshotBrand) return snapshotBrand;

  // Current product metadata is only valid for the article actually ordered.
  const productBrand = [catalog, kitchenItem]
    .filter((product) => article && normalizeArticle(product.articleNumber) === normalizeArticle(article))
    .map((product) => product.manufacturer || product.brand || getContractApplianceBrandLabel(inferApplianceBrand(product)))
    .find(Boolean);
  if (productBrand) return productBrand;

  const codes = String(article).split("+").map(normalizeArticle).filter(Boolean);
  const manufacturers = (reference?.articles || [])
    .filter((entry) => codes.includes(normalizeArticle(entry.articleNumber)))
    .map((entry) => entry.manufacturer).filter(Boolean);
  return [...new Set(manufacturers)].join(" / ");
}

export function buildOrderKitchenSpecifications(order = {}, reference = getKitchenSpecification(order.kitchen)) {
  const kitchen = order.kitchen || {};
  return {
    kitchen: { id: kitchen.id || "", slug: kitchen.slug || "", name: kitchen.name || "",
      kitchenCode: kitchen.kitchenCode || "", programmId: kitchen.programmId || "" },
    reference,
    orderedItems: (order.items || []).map((item, index) => ({
      id: item.id || `${item.code || "item"}-${index}`,
      code: item.code || "",
      articleNumber: item.articleNumberSnapshot || item.kitchenItem?.articleNumber || "",
      name: item.nameSnapshot || item.kitchenItem?.name || item.code || "",
      nameDe: item.nameDeSnapshot || "",
      itemType: item.itemType || "",
      quantity: Number(item.quantity ?? 1),
      manufacturer: manufacturerForItem(item, reference),
    })),
  };
}

export const FRG_MONTHLY_METRICS = [
  ["kitchens", "Kitchens added to Fragmento"],
  ["sales", "Orders"],
  ["net", "Sales excl. VAT (EUR)", "currency"],
  ["vat", "VAT (EUR)", "currency"],
  ["gross", "Sales incl. VAT (EUR)", "currency"],
  ["cancellationRequests", "Cancellation requests"],
  ["emails", "Emails sent (recipients)"],
];

export const FRG_MONTHLY_NOTES = [
  "FRG only. Each kitchen record counts once on its own creation date, regardless of how many contract numbers or prefixes refer to it. A kitchen must have a non-test FRG contract; kitchens with only test contracts starting with 111 and test orders are excluded.",
  "Previous includes all records before the selected start date; current includes the selected date range up to the report cutoff. Total equals previous plus current. All time has zero previous activity. Dates use Europe/Berlin and the end date is inclusive.",
  "Sales include only orders currently CONFIRMED, by their recorded confirmation date. For historical orders without that date, the creation date is used and explicitly marked as a historical fallback. This is a current-state report, not a frozen accounting close.",
  "Amounts use stored order prices. Net is rounded per order using the system VAT rate of 19%; VAT equals gross minus rounded net. Updating catalog prices does not change stored order prices.",
  "Cancellation requests count once on their received date, across all request statuses. A request alone does not deduct a sale. Successful order and cancellation email recipient deliveries count on their logged send date, including resends; failed, skipped, unknown and unlogged historical deliveries are excluded.",
  "Order details contain one row per order. Item details contain one row per purchased order item; base kitchen items are excluded. Unknown manufacturers are shown as Not recorded. Item-level net rounding can differ from order-level rounding.",
];

const one = value => String(Array.isArray(value) ? value[0] || "" : value || "");
const monthIsValid = value => /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value);
export const reportDisplayDate = key => `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;

export function normalizeFrgMonthlyFilters(input = {}, now = new Date()) {
  const today = workDateKey(now);
  const requested = one(input.month);
  const requestedPeriod = one(input.period).toUpperCase();
  const explicitRange = [...BUSINESS_REPORT_PERIODS, "CUSTOM"].includes(requestedPeriod)
    || one(input.dateFrom) || one(input.dateTo);
  const month = !explicitRange && monthIsValid(requested) && requested <= today.slice(0, 7)
    ? requested : today.slice(0, 7);
  const next = new Date(`${month}-01T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const selectedMonthEnd = shiftReportDate(next.toISOString().slice(0, 10), -1);
  const useMonth = !explicitRange && !!requested;
  const range = normalizeBusinessReportFilters(useMonth
    ? { dateFrom: `${month}-01`, dateTo: selectedMonthEnd > today ? today : selectedMonthEnd, period: "CUSTOM" }
    : input, now);
  // Reports stop at now, including when a URL contains future dates.
  const dateFrom = range.dateFrom > today ? today : range.dateFrom;
  const dateTo = range.dateTo > today ? today : range.dateTo || (dateFrom ? today : "");
  const start = dateFrom ? workDayStart(dateFrom) : null;
  const end = new Date(Math.min(workDayStart(shiftReportDate(dateTo || today, 1)).getTime(), now.getTime()));
  const selectedMonth = (dateFrom || dateTo || today).slice(0, 7);
  const followingMonth = new Date(`${selectedMonth}-01T12:00:00Z`);
  followingMonth.setUTCMonth(followingMonth.getUTCMonth() + 1);
  const monthEnd = shiftReportDate(followingMonth.toISOString().slice(0, 10), -1);
  const preferred = useMonth && selectedMonth === today.slice(0, 7) ? "THIS_MONTH" : one(input.preset);
  const preset = getActiveBusinessReportPeriod({ ...range, dateFrom, dateTo }, preferred, now);
  const isMonth = dateFrom === `${selectedMonth}-01`
    && (dateTo === monthEnd || (selectedMonth === today.slice(0, 7) && dateTo === today))
    && !["TODAY", "THIS_WEEK", "ALL"].includes(preset);
  const exportPeriod = isMonth ? selectedMonth
    : !dateFrom && !dateTo ? "ALL"
      : dateFrom === dateTo ? dateFrom : `${dateFrom || "ALL"}_${dateTo}`;
  return { month: selectedMonth, isMonth, dateFrom, dateTo, previousDate: dateFrom ? shiftReportDate(dateFrom, -1) : "", monthEnd,
    start, end, asOfDate: dateTo || today, exportPeriod, contractType: "FRG", groupBy: "MONTH", period: range.period, preset };
}

export function buildFrgMonthlyQuery(filters) {
  const params = new URLSearchParams({ dateFrom: filters.dateFrom, dateTo: filters.dateTo,
    contractType: "FRG", groupBy: "MONTH", period: filters.period === "ALL" ? "ALL" : "CUSTOM" });
  const preset = BUSINESS_REPORT_PERIODS.includes(filters.period) ? filters.period : filters.preset;
  if (BUSINESS_REPORT_PERIODS.includes(preset)) params.set("preset", preset);
  return params.toString();
}

export function frgReportPeriodLabel(filters, language = "en") {
  if (filters.isMonth) return formatAdminMonth(filters.month, language);
  if (!filters.dateFrom && !filters.dateTo) return language === "de" ? "Gesamter Zeitraum" : "All time";
  if (!filters.dateFrom) return `${language === "de" ? "Bis" : "Through"} ${reportDisplayDate(filters.dateTo)}`;
  if (filters.dateFrom === filters.dateTo) return reportDisplayDate(filters.dateFrom);
  return `${reportDisplayDate(filters.dateFrom)} – ${reportDisplayDate(filters.dateTo)}`;
}

// Shared source rules keep the summary and exported individual sales identical.
function frgSources() {
  return Prisma.sql`WITH live_contracts AS (
    SELECT * FROM "KitchenContract"
    WHERE REGEXP_REPLACE("contractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
  ), frg_orders AS (
    SELECT o.*, COALESCE(o."confirmedAt", o."createdAt") AS "saleAt"
    FROM "Order" o JOIN live_contracts c ON c.id = o."kitchenContractId"
    WHERE c."contractType" = 'FRG'
      AND REGEXP_REPLACE(COALESCE(o."contractNumber", ''), '[[:space:]]+', '', 'g') NOT LIKE '111%'
  ), frg_cancellations AS (
    SELECT cr.* FROM "OrderCancellationRequest" cr
    LEFT JOIN "Order" o ON o.id = cr."orderId"
    LEFT JOIN "KitchenContract" oc ON oc.id = o."kitchenContractId"
    LEFT JOIN "KitchenContract" c ON c."contractNumber" = cr."submittedContractNumber"
    WHERE REGEXP_REPLACE(cr."submittedContractNumber", '[[:space:]]+', '', 'g') NOT LIKE '111%'
      AND REGEXP_REPLACE(COALESCE(o."contractNumber", ''), '[[:space:]]+', '', 'g') NOT LIKE '111%'
      AND REGEXP_REPLACE(COALESCE(oc."contractNumber", ''), '[[:space:]]+', '', 'g') NOT LIKE '111%'
      AND COALESCE(oc."contractType", c."contractType", 'FRG') = 'FRG'
  )`;
}

export function buildFrgMonthlySql(filters) {
  return Prisma.sql`${frgSources()}, events AS (
    SELECT k."createdAt" AS at, 'kitchens' AS metric, 1::numeric AS value
      FROM "Kitchen" k
      WHERE EXISTS (SELECT 1 FROM live_contracts c WHERE c."kitchenId" = k.id AND c."contractType" = 'FRG')
    UNION ALL SELECT o."saleAt", 'sales', 1 FROM frg_orders o WHERE o.status = 'CONFIRMED'
    UNION ALL SELECT o."saleAt", 'gross', o."totalPrice"::numeric FROM frg_orders o WHERE o.status = 'CONFIRMED'
    UNION ALL SELECT o."saleAt", 'net', ROUND(o."totalPrice"::numeric / ${1 + VAT_RATE}::numeric, 2)
      FROM frg_orders o WHERE o.status = 'CONFIRMED'
    UNION ALL SELECT o."saleAt", 'vat', o."totalPrice"::numeric - ROUND(o."totalPrice"::numeric / ${1 + VAT_RATE}::numeric, 2)
      FROM frg_orders o WHERE o.status = 'CONFIRMED'
    UNION ALL SELECT o."saleAt", 'legacySales', 1 FROM frg_orders o WHERE o.status = 'CONFIRMED' AND o."confirmedAt" IS NULL
    UNION ALL SELECT cr."receivedAt", 'cancellationRequests', 1 FROM frg_cancellations cr
    UNION ALL
    SELECT a."attemptedAt", 'emails', COUNT(DISTINCT lower(btrim(r->>'email')))
      FROM "OrderEmailAttempt" a JOIN frg_orders o ON o.id = a."orderId"
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(a.delivery->'recipients') = 'array'
        THEN a.delivery->'recipients' ELSE '[]'::jsonb END) r
      WHERE a."orderKind" = 'live' AND r->>'status' = 'SENT' AND btrim(COALESCE(r->>'email', '')) <> ''
      GROUP BY a.id, a."attemptedAt"
    UNION ALL
    SELECT m.at, 'emails', 1 FROM frg_cancellations cr
      CROSS JOIN LATERAL (VALUES (cr."customerEmailSentAt"), (cr."internalEmailSentAt"), (cr."finalEmailSentAt")) m(at)
      WHERE m.at IS NOT NULL
  ) SELECT CASE WHEN e.at AT TIME ZONE 'UTC' < ${filters.start} THEN 'previous' ELSE 'current' END AS bucket,
      e.metric, SUM(e.value)::double precision AS value
    FROM events e WHERE e.at AT TIME ZONE 'UTC' < ${filters.end}
    GROUP BY 1, 2`;
}

export function assembleFrgMonthlyReport(records, filters) {
  const empty = () => Object.fromEntries([...FRG_MONTHLY_METRICS.map(([key]) => [key, 0]), ["legacySales", 0]]);
  const previous = empty(), current = empty(), total = empty();
  for (const record of records) {
    if (!(record.metric in total) || !["previous", "current"].includes(record.bucket)) continue;
    const target = record.bucket === "previous" ? previous : current;
    target[record.metric] += Number(record.value);
  }
  for (const [key] of Object.entries(total)) {
    previous[key] = Math.round(previous[key] * 100) / 100;
    current[key] = Math.round(current[key] * 100) / 100;
    total[key] = Math.round((previous[key] + current[key]) * 100) / 100;
  }
  return { filters, previous, current, total, metrics: FRG_MONTHLY_METRICS, notes: FRG_MONTHLY_NOTES };
}

export async function loadFrgMonthlyReport(input, db = prisma, now = new Date()) {
  const filters = normalizeFrgMonthlyFilters(input, now);
  return assembleFrgMonthlyReport(await db.$queryRaw(buildFrgMonthlySql(filters)), filters);
}

export function buildFrgMonthlySalesSql(filters) {
  return Prisma.sql`${frgSources()}
    SELECT o.id, o."saleAt", (o."confirmedAt" IS NULL) AS "historicalDateFallback"
    FROM frg_orders o WHERE o.status = 'CONFIRMED' AND o."saleAt" AT TIME ZONE 'UTC' < ${filters.end}
    ORDER BY o."saleAt", o.id`;
}

export async function loadFrgMonthlySales(filters, db = prisma) {
  const records = await db.$queryRaw(buildFrgMonthlySalesSql(filters));
  if (!records.length) return [];
  const orders = await db.order.findMany({ where: { id: { in: records.map(row => row.id) } }, include: {
    kitchen: true,
    kitchenContract: { include: { project: { include: { housingCompany: true, propertyObject: true } } } },
    items: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { kitchenItem: { include: { catalogArticle: true } } } },
  } });
  const byId = new Map(orders.map(order => [order.id, order]));
  return records.map(record => ({ ...byId.get(record.id), ...record }));
}

function itemCategory(item) {
  if (item.itemType === "SERVICE") return "Service";
  const name = [item.nameSnapshot, item.nameDeSnapshot, item.code].filter(Boolean).join(" ");
  if (/\b(oven|hob|cooktop|fridge|freezer|refrigerator|dishwasher|extractor|backofen|kochfeld|kühlschrank|geschirrspüler|dunstabzug)\b/i.test(name)) return "Electrical appliance";
  if (/\b(cabinet|cupboard|schrank|unterschrank|oberschrank|hochschrank)\b/i.test(name)) return "Cabinet";
  if (item.itemType === "ACCESSORY") return "Accessory";
  return "Component / package";
}

export function getFrgMonthlySheets(report, orders = []) {
  const { filters } = report;
  const periodLabel = frgReportPeriodLabel(filters);
  const range = `${periodLabel}; cutoff ${filters.end.toISOString()}; Europe/Berlin; FRG`;
  const summary = {
    name: "Fragmento", title: `FRAGMENTO REPORT | ${range}`,
    headers: ["Description", filters.previousDate ? `Through ${reportDisplayDate(filters.previousDate)}` : "Before selected period", periodLabel, "Total"],
    rows: report.metrics.map(([key, label]) => [label, report.previous[key], report.current[key], report.total[key]]),
    currencyRows: report.metrics.flatMap(([, , format], index) => format === "currency" ? [index] : []), highlightHeader: true,
  };
  const salesRows = [], itemRows = [];
  for (const order of orders) {
    const contract = order.kitchenContract || {}, project = contract.project || {};
    const customer = [order.firstName, order.lastName].filter(Boolean).join(" ");
    const gross = Math.round(Number(order.totalPrice) * 100);
    const net = Math.round(gross / (1 + VAT_RATE));
    const salesItems = getPurchasedReportItems(order);
    const specifications = buildOrderKitchenSpecifications({ ...order, items: salesItems });
    salesRows.push([order.saleAt, order.createdAt, order.orderNumber, customer, order.email, order.phone,
      order.contractNumber || contract.contractNumber || "", project.housingCompany?.name || "",
      [order.address1, order.address2].filter(Boolean).join(", "), order.postalCode || "", order.city || "", order.country || "",
      order.paidAt, order.preferredDeliveryDate,
      salesItems.reduce((sum, item) => sum + item.quantity, 0), net / 100, (gross - net) / 100, gross / 100]);
    for (const [index, item] of salesItems.entries()) {
      const details = specifications.orderedItems[index];
      const unitCents = Math.round(Number(item.priceSnapshot) * 100);
      const lineGross = unitCents * item.quantity;
      const lineNet = Math.round(lineGross / (1 + VAT_RATE));
      itemRows.push([order.saleAt, customer, order.orderNumber, details.articleNumber, details.name,
        itemCategory(item), details.manufacturer || "Not recorded", item.quantity,
        lineNet / 100, (lineGross - lineNet) / 100, lineGross / 100]);
    }
  }
  return [summary, {
    name: "Order details", title: `ORDERS | ${range}`,
    headers: ["Sale date (Berlin)", "Order created", "Order", "Customer", "Email", "Phone", "Contract number", "Company", "Customer address", "Postal code", "City", "Country",
      "Paid at", "Requested delivery", "Purchased units", "Net (EUR)", "VAT (EUR)", "Gross (EUR)"],
    rows: salesRows, highlightHeader: true, currencyColumns: [15, 16, 17],
  }, {
    name: "Item details", title: `ORDERED ITEMS | ${range}`,
    headers: ["Sale date (Berlin)", "Customer", "Order", "Article number", "Product", "Category", "Manufacturer",
      "Quantity", "Line net (EUR)", "Line VAT (EUR)", "Line gross (EUR)"],
    rows: itemRows, highlightHeader: true, currencyColumns: [8, 9, 10],
  }];
}

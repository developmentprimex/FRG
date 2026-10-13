import { AdminWorkOverview } from "../../components/admin-work-overview";
﻿import { getPriceBreakdown } from "../../lib/price-utils";
import { AdminShell } from "../../components/admin-shell";
import { AdminDashboardCharts } from "../../components/admin-dashboard-charts";
import { listKitchensForAdmin } from "../../lib/catalog";
import { requireAdminPage } from "../../lib/auth";
import { getProviderCountryConfig } from "../../lib/address-verification";
import { prisma } from "../../lib/prisma";
import { Prisma } from "@prisma/client";
import { cache } from "react";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = ["NEW", "EMAILED", "CONFIRMED", "CANCELLED"];
const PERIOD_OPTIONS = [
  { value: "7d", labelKey: "dashboard.last7Days", fallbackLabel: "Last 7 days", days: 7 },
  { value: "30d", labelKey: "dashboard.last30Days", fallbackLabel: "Last 30 days", days: 30 },
  { value: "90d", labelKey: "dashboard.last90Days", fallbackLabel: "Last 90 days", days: 90 },
  { value: "all", labelKey: "dashboard.allTime", fallbackLabel: "All time", days: null },
];
const ARTICLE_NUMBER_BY_CODE = {
  "WM-B-EWA34660W": "EWA34660W",
  "DISH-B-600-STD": "A-EGSPV597210",
  "REF-B-545-1800-700": "KGC 15495 S",
  "HOOD-B-FH664621E": "FH664621E",
  "ACC-CUTLERY-ZB60SG": "ZB60SG",
  "SINK-B-BOTTON-45": "517467",
  "ACC-LIGHT-003": "KA220043_S3",
  "LIGHT-B-LED-001": "KA220043_S3",
  "WM-C-EWA34660W": "EWA34660W",
  "DISH-C-600-STD": "A-EGSPV597210",
  "REF-C-545-1800-700": "KGC 15495 S",
  "ACC-CUTLERY-001": "ZB60SG",
  "SINK-C-BOTTON-45": "517467",
  "ACC-LIGHT-003": "KA220043_S3",
  "LIGHT-C-LED-001": "KA220043_S3",
};
const TOP_ITEM_GROUP_METADATA_BY_ARTICLE_NUMBER = {
  EWA34660W: {
    preferredCode: "WM-B-EWA34660W",
    preferredName: "Washing Machine (60 x 60 x 87.8 cm)",
    preferredItemType: "COMPONENT",
  },
  "A-EGSPV597210": {
    preferredCode: "DISH-B-600-STD",
    preferredName: "Dishwasher (60 x 60 x 87.8 cm)",
    preferredItemType: "COMPONENT",
  },
  "KGC 15495 S": {
    preferredCode: "REF-B-545-1800-700",
    preferredName: "Refrigerator (54.5 x 180 x 70 cm)",
    preferredItemType: "COMPONENT",
  },
  FH664621E: {
    preferredCode: "HOOD-B-FH664621E",
    preferredName: "FH664621E Extractor Hood",
    preferredItemType: "COMPONENT",
  },
  ZB60SG: {
    preferredCode: "ACC-CUTLERY-ZB60SG",
    preferredName: "Besteckeinsatz ZB60SG",
    preferredItemType: "ACCESSORY",
  },
  KA220043_S3: {
    preferredCode: "LIGHT-B-LED-001",
    preferredName: "LED Lighting Set",
    preferredItemType: "COMPONENT",
  },
  "517467": {
    preferredCode: "ACC-WASTE-001",
    preferredName: "Waste separation system Blanco Botton",
    preferredItemType: "ACCESSORY",
  },
};
const TOP_ITEM_GROUP_METADATA_BY_CODE = {
  "OVEN-B-600-HOB": {
    groupKey: "mapped:oven-600-hob",
    preferredCode: "OVEN-B-600-HOB",
    preferredName: "Built-in Oven and Hob (60 x 60 x 87.8 cm)",
    preferredItemType: "COMPONENT",
  },
  "OVEN-C-600-HOB": {
    groupKey: "mapped:oven-600-hob",
    preferredCode: "OVEN-B-600-HOB",
    preferredName: "Built-in Oven and Hob (60 x 60 x 87.8 cm)",
    preferredItemType: "COMPONENT",
  },
  "SINKBASE-B-600": {
    groupKey: "mapped:sinkbase-600",
    preferredCode: "SINKBASE-B-600",
    preferredName: "Sink Base Cabinet (60 x 60 x 87.8 cm)",
    preferredItemType: "COMPONENT",
  },
  "SINKBASE-C-600": {
    groupKey: "mapped:sinkbase-600",
    preferredCode: "SINKBASE-B-600",
    preferredName: "Sink Base Cabinet (60 x 60 x 87.8 cm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-B-L-600": {
    groupKey: "mapped:cab-wall-left-600",
    preferredCode: "CAB-WALL-B-L-600",
    preferredName: "Wall Cabinet left (60 x 72.3 x 32 cm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-C-L-600": {
    groupKey: "mapped:cab-wall-left-600",
    preferredCode: "CAB-WALL-B-L-600",
    preferredName: "Wall Cabinet left (60 x 72.3 x 32 cm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-B-ML-600": {
    groupKey: "mapped:cab-wall-mid-left-600",
    preferredCode: "CAB-WALL-B-ML-600",
    preferredName: "Wall Cabinet mid-left (60 x 72.3 x 32 cm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-C-ML-600": {
    groupKey: "mapped:cab-wall-mid-left-600",
    preferredCode: "CAB-WALL-B-ML-600",
    preferredName: "Wall Cabinet mid-left (60 x 72.3 x 32 cm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-B-MR-600": {
    groupKey: "mapped:cab-wall-mid-right-600",
    preferredCode: "CAB-WALL-B-MR-600",
    preferredName: "Wall Cabinet mid-right (60 x 72.3 x 32 cm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-C-MR-600": {
    groupKey: "mapped:cab-wall-mid-right-600",
    preferredCode: "CAB-WALL-B-MR-600",
    preferredName: "Wall Cabinet mid-right (60 x 72.3 x 32 cm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-B-R-600": {
    groupKey: "mapped:cab-wall-right-600",
    preferredCode: "CAB-WALL-B-R-600",
    preferredName: "Wall Cabinet right (60 x 72.3 x 32 cm)",
    preferredItemType: "COMPONENT",
  },
  "CAB-WALL-C-R-600": {
    groupKey: "mapped:cab-wall-right-600",
    preferredCode: "CAB-WALL-B-R-600",
    preferredName: "Wall Cabinet right (60 x 72.3 x 32 cm)",
    preferredItemType: "COMPONENT",
  },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function getPeriod(value) {
  return PERIOD_OPTIONS.find((option) => option.value === value) || PERIOD_OPTIONS[1];
}

function getPeriodStartDate(period) {
  if (!period.days) return null;
  const date = new Date();
  date.setDate(date.getDate() - period.days + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function getDateKeys(startDate, earliestCreatedAt) {
  if (!startDate && !earliestCreatedAt) return [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(startDate) : new Date(earliestCreatedAt);
  start.setHours(0, 0, 0, 0);

  const keys = [];
  for (const day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    keys.push(toDateKey(day));
  }
  return keys;
}

function getItemKey(item) {
  const code = String(item.code || "").trim();
  if (code) return code;
  return [item.itemType, item.nameSnapshot].join("::");
}

function deriveArticleNumberFromCode(code) {
  const normalizedCode = String(code || "").trim();
  if (!normalizedCode) return null;

  if (/^DISH-/i.test(normalizedCode)) return "A-EGSPV597210 + TGV60";
  if (/^REF-/i.test(normalizedCode)) return "OL-KGCN388140E";
  if (/^OVEN-/i.test(normalizedCode)) return "EBX943600S + OL-KMI754000E";
  if (/^CAB-HOOD-/i.test(normalizedCode)) return "FH664621E + FWK124 + HD6002";
  if (/^HOOD-/i.test(normalizedCode)) return normalizedCode.includes("KHF") ? "KHF664611S + FWP18" : "FH 664 621 E";
  if (/^LIGHT-/i.test(normalizedCode)) return "KA220043_S3";
  if (/CUTLERY/i.test(normalizedCode)) return "ZB60SG";
  if (/WASTE|BOTTON/i.test(normalizedCode)) return "517467";

  const articleMatch = normalizedCode.match(/(?:^|[-_ ])(US\d{2,3}|H\d{4}|HD\d{4}|HPK\d{4}|UPK\d{2}|ZB60SG|KA220043_S3|OL-KGCN388140E|KGCN388140E|EWA34660W|TGV60|WU16|EGSPV597210|EBX943600S|KMI754000E|FH664621E|KHF664611S|FWK124|FWP18)(?:$|[-_ ])/i);
  return articleMatch ? articleMatch[1].toUpperCase() : null;
}

function resolveTopItemArticleNumber(row) {
  const code = String(row?.code || "").trim();
  return String(row?.articleNumber || "").trim()
    || ARTICLE_NUMBER_BY_CODE[code]
    || deriveArticleNumberFromCode(code)
    || null;
}

function isDefaultDashboardItem(row) {
  const code = String(row?.code || "").trim().toUpperCase();
  const name = String(row?.nameSnapshot || row?.canonicalName || "").trim().toLowerCase();

  return code === "OVEN-B-600-HOB"
    || code === "SINKBASE-B-600"
    || code === "SINK-WORKTOP"
    || code.startsWith("TOP-")
    || name === "worktop"
    || name === "sink lower cabinet";
}

function compareTopItemsByArticleCode(a, b) {
  const leftArticle = String(a.articleNumber || a.canonicalArticleNumber || a.code || "").trim();
  const rightArticle = String(b.articleNumber || b.canonicalArticleNumber || b.code || "").trim();
  const articleCompare = leftArticle.localeCompare(rightArticle, undefined, { numeric: true, sensitivity: "base" });
  if (articleCompare) return articleCompare;

  const nameCompare = String(a.name || a.canonicalName || a.fallbackName || "").localeCompare(
    String(b.name || b.canonicalName || b.fallbackName || ""),
    undefined,
    { numeric: true, sensitivity: "base" },
  );
  if (nameCompare) return nameCompare;

  return String(a.code || "").localeCompare(String(b.code || ""), undefined, { numeric: true, sensitivity: "base" });
}

function compareTopItemsByQuantity(a, b) {
  const quantityCompare = Number(b.quantity || 0) - Number(a.quantity || 0);
  return quantityCompare || compareTopItemsByArticleCode(a, b);
}

function compareTopItemsByRevenue(a, b) {
  const revenueCompare = Number(b.revenue || 0) - Number(a.revenue || 0);
  return revenueCompare || compareTopItemsByArticleCode(a, b);
}

function choosePreferredText(currentValue, nextValue) {
  const current = String(currentValue || "").trim();
  const next = String(nextValue || "").trim();
  if (!current) return next || null;
  if (!next) return current;
  return current.localeCompare(next) <= 0 ? current : next;
}

function choosePreferredItemType(currentValue, nextValue, preferredValue = null) {
  if (preferredValue) return preferredValue;

  const priority = { COMPONENT: 3, ACCESSORY: 2, SERVICE: 1 };
  const current = String(currentValue || "").trim();
  const next = String(nextValue || "").trim();
  if (!current) return next || null;
  if (!next) return current;
  return (priority[next] || 0) > (priority[current] || 0) ? next : current;
}

function getTopItemGrouping(row, articleNumber) {
  const normalizedArticleNumber = String(articleNumber || "").trim();
  const normalizedCode = String(row.code || "").trim();

  if (normalizedArticleNumber) {
    const metadata = TOP_ITEM_GROUP_METADATA_BY_ARTICLE_NUMBER[normalizedArticleNumber] || {};
    return {
      groupKey: `article:${normalizedArticleNumber}`,
      preferredCode: metadata.preferredCode || normalizedCode || null,
      preferredName: metadata.preferredName || null,
      preferredItemType: metadata.preferredItemType || null,
    };
  }

  const mapped = TOP_ITEM_GROUP_METADATA_BY_CODE[normalizedCode];
  if (mapped) {
    return mapped;
  }

  return {
    groupKey: `code:${getItemKey(row)}`,
    preferredCode: normalizedCode || null,
    preferredName: null,
    preferredItemType: null,
  };
}

function normalizeCountryName(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return getProviderCountryConfig(trimmed)?.providerName || trimmed;
}

function deriveCountry(order) {
  if (typeof order.country === "string" && order.country.trim()) {
    return normalizeCountryName(order.country);
  }

  const city = String(order.city || "").trim().toLowerCase();
  const postalCode = String(order.postalCode || "").trim();
  const compactPostalCode = postalCode.replace(/\s+/g, "");

  if (["prishtine", "prishtina", "pristina"].includes(city)) return "Kosovo";
  if (["berlin", "hamburg", "munich", "münchen", "frankfurt", "cologne", "köln", "stuttgart", "dusseldorf", "düsseldorf"].includes(city)) return "Germany";
  if (["budapest", "debrecen", "szeged", "miskolc", "pecs", "pécs", "gyor", "győr"].includes(city)) return "Hungary";
  if (["vienna", "wien", "graz", "linz", "salzburg"].includes(city)) return "Austria";
  if (["zurich", "zürich", "geneva", "basel", "bern"].includes(city)) return "Switzerland";
  if (["prague", "praha", "brno", "ostrava"].includes(city)) return "Czechia";
  if (["bratislava", "kosice", "košice"].includes(city)) return "Slovakia";
  if (["warsaw", "krakow", "kraków", "wroclaw", "wrocław"].includes(city)) return "Poland";
  if (/^de[-\s]?\d{5}$/i.test(compactPostalCode)) return "Germany";

  return "Unknown";
}

function buildOrderFilterConditions({ startDate, kitchenId, status }, alias = "o") {
  const table = Prisma.raw(alias);
  const filters = [];
  if (startDate) filters.push(Prisma.sql`${table}."createdAt" >= ${startDate}`);
  if (kitchenId) filters.push(Prisma.sql`${table}."kitchenId" = ${kitchenId}`);
  if (status) filters.push(Prisma.sql`${table}."status"::text = ${status}`);
  return filters;
}

function buildOrderWhereClause(filters, alias = "o") {
  const conditions = buildOrderFilterConditions(filters, alias);
  return conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

function buildOrderAndClause(filters, alias = "o") {
  const conditions = buildOrderFilterConditions(filters, alias);
  return conditions.length ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

async function loadDashboardSummary(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  const [row] = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS "totalOrders",
      COALESCE(SUM(o."totalPrice"), 0) AS "totalRevenue",
      COUNT(*) FILTER (WHERE o."status" = 'EMAILED')::int AS "emailedOrders",
      MIN(o."createdAt") AS "earliestCreatedAt"
    FROM "Order" o
    ${whereClause}
  `;

  return {
    totalOrders: Number(row?.totalOrders || 0),
    totalRevenue: Number(row?.totalRevenue || 0),
    emailedOrders: Number(row?.emailedOrders || 0),
    earliestCreatedAt: row?.earliestCreatedAt || null,
  };
}

async function loadDailyStatusRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  return prisma.$queryRaw`
    SELECT
      DATE_TRUNC('day', o."createdAt")::date AS "date",
      o."status"::text AS "status",
      COUNT(*)::int AS "count"
    FROM "Order" o
    ${whereClause}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `;
}

async function loadPaymentRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  return prisma.$queryRaw`
    SELECT
      COALESCE(NULLIF(BTRIM(o."paymentMethod"), ''), 'Not captured') AS "label",
      COUNT(*)::int AS "value"
    FROM "Order" o
    ${whereClause}
    GROUP BY 1
    ORDER BY 2 DESC, 1 ASC
  `;
}

async function loadGeographyRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");
  return prisma.$queryRaw`
    SELECT
      COALESCE(NULLIF(BTRIM(o."country"), ''), '') AS "country",
      COALESCE(NULLIF(BTRIM(o."city"), ''), 'Not captured') AS "city",
      COALESCE(NULLIF(BTRIM(o."postalCode"), ''), '') AS "postalCode",
      COUNT(*)::int AS "orders",
      COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
    FROM "Order" o
    ${whereClause}
    GROUP BY 1, 2, 3
    ORDER BY 4 DESC, 2 ASC, 3 ASC
  `;
}

async function loadGroupedItemRows(filters) {
  const whereClause = buildOrderWhereClause(filters, "o");

  try {
    const hasArticleNumberColumn = await hasKitchenItemArticleNumberColumn();
    if (hasArticleNumberColumn) {
      return prisma.$queryRaw`
        SELECT
          oi."itemType"::text AS "itemType",
          oi."code" AS "code",
          oi."nameSnapshot" AS "nameSnapshot",
          MAX(ki."name") FILTER (WHERE ki."name" IS NOT NULL) AS "canonicalName",
          ki."articleNumber" AS "articleNumber",
          SUM(oi."quantity")::int AS "quantity",
          COALESCE(SUM(oi."quantity" * oi."priceSnapshot"), 0) AS "revenue"
        FROM "OrderItem" oi
        JOIN "Order" o ON o."id" = oi."orderId"
        LEFT JOIN "KitchenItem" ki ON ki."id" = oi."kitchenItemId"
        ${whereClause}
        GROUP BY 1, 2, 3, 5
        ORDER BY 6 DESC, 7 DESC, 3 ASC
      `;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("articleNumber") && !message.includes("column")) {
      throw error;
    }
  }

  return prisma.$queryRaw`
    SELECT
      oi."itemType"::text AS "itemType",
      oi."code" AS "code",
      oi."nameSnapshot" AS "nameSnapshot",
      NULL::text AS "canonicalName",
      NULL::text AS "articleNumber",
      SUM(oi."quantity")::int AS "quantity",
      COALESCE(SUM(oi."quantity" * oi."priceSnapshot"), 0) AS "revenue"
    FROM "OrderItem" oi
    JOIN "Order" o ON o."id" = oi."orderId"
    ${whereClause}
    GROUP BY 1, 2, 3, 4, 5
    ORDER BY 6 DESC, 7 DESC, 3 ASC
  `;
}

function buildOwnerStatsOrderFilter({ startDate, kitchenId, status }) {
  return buildOrderAndClause({ startDate, kitchenId, status }, "o");
}

function buildProjectContractJoinFilter({ kitchenId }) {
  return kitchenId ? Prisma.sql`AND kc."kitchenId" = ${kitchenId}` : Prisma.empty;
}

async function loadProjectAnalytics({ startDate, kitchenId, status }) {
  const orderFilter = buildOrderAndClause({ startDate, kitchenId, status }, "o");
  const contractJoinFilter = buildProjectContractJoinFilter({ kitchenId });

  const projectRows = await prisma.$queryRaw`
    SELECT
      prj."id",
      prj."name",
      prj."projectCode",
      prj."status",
      prj."managerName",
      prj."housingCompanyId",
      hc."name" AS "housingCompanyName",
      pobj."id" AS "propertyObjectId",
      pobj."name" AS "propertyObjectName",
      pobj."country" AS "objectCountry",
      pobj."city" AS "objectCity",
      pobj."postalCode" AS "objectPostalCode",
      pobj."address1" AS "objectAddress1",
      pobj."address2" AS "objectAddress2",
      COUNT(DISTINCT kc."id")::int AS "contractCount",
      COUNT(DISTINCT kc."id") FILTER (WHERE o."id" IS NOT NULL)::int AS "usedContractCount",
      COUNT(DISTINCT o."id")::int AS "orderCount",
      COUNT(DISTINCT o."kitchenId")::int AS "kitchenCount",
      COALESCE(SUM(o."totalPrice"), 0) AS "totalRevenue"
    FROM "Project" prj
    JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
    JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id" ${contractJoinFilter}
    LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    GROUP BY prj."id", hc."id", pobj."id"
    ORDER BY "totalRevenue" DESC, "orderCount" DESC, "contractCount" DESC, prj."name" ASC
  `;

  const timelineRows = await prisma.$queryRaw`
    SELECT
      prj."id" AS "projectId",
      DATE_TRUNC('day', o."createdAt")::date AS "date",
      COUNT(*)::int AS "orders",
      COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
    FROM "Project" prj
    JOIN "KitchenContract" kc ON kc."projectId" = prj."id" ${contractJoinFilter}
    JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `;

  const kitchenRows = await prisma.$queryRaw`
    SELECT
      prj."id" AS "projectId",
      COALESCE(NULLIF(BTRIM(k."name"), ''), 'Unknown kitchen') AS "kitchenName",
      COUNT(*)::int AS "orders",
      COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
    FROM "Project" prj
    JOIN "KitchenContract" kc ON kc."projectId" = prj."id" ${contractJoinFilter}
    JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    LEFT JOIN "Kitchen" k ON k."id" = o."kitchenId"
    GROUP BY 1, 2
    ORDER BY 1 ASC, 4 DESC, 2 ASC
  `;

  const statusRows = await prisma.$queryRaw`
    SELECT
      prj."id" AS "projectId",
      o."status"::text AS "status",
      COUNT(*)::int AS "count"
    FROM "Project" prj
    JOIN "KitchenContract" kc ON kc."projectId" = prj."id" ${contractJoinFilter}
    JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `;

  const contractRows = await prisma.$queryRaw`
    SELECT
      prj."id" AS "projectId",
      kc."id",
      kc."contractNumber",
      kc."isActive",
      kc."usedAt",
      kc."building",
      kc."floor",
      kc."unitNumber",
      COALESCE(NULLIF(BTRIM(k."name"), ''), 'Unknown kitchen') AS "kitchenName",
      COUNT(o."id")::int AS "orderCount",
      COALESCE(SUM(o."totalPrice"), 0) AS "revenue",
      MAX(o."createdAt") AS "latestOrderAt"
    FROM "Project" prj
    JOIN "KitchenContract" kc ON kc."projectId" = prj."id" ${contractJoinFilter}
    LEFT JOIN "Kitchen" k ON k."id" = kc."kitchenId"
    LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    GROUP BY prj."id", kc."id", k."id"
    ORDER BY 1 ASC, "orderCount" DESC, kc."contractNumber" ASC
  `;

  const locationRows = await prisma.$queryRaw`
    SELECT
      prj."id" AS "projectId",
      COALESCE(NULLIF(BTRIM(o."country"), ''), NULLIF(BTRIM(pobj."country"), ''), '') AS "country",
      COALESCE(NULLIF(BTRIM(o."city"), ''), NULLIF(BTRIM(pobj."city"), ''), 'Not captured') AS "city",
      COALESCE(NULLIF(BTRIM(o."postalCode"), ''), NULLIF(BTRIM(pobj."postalCode"), ''), '') AS "postalCode",
      COUNT(o."id")::int AS "orders",
      COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
    FROM "Project" prj
    JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    JOIN "KitchenContract" kc ON kc."projectId" = prj."id" ${contractJoinFilter}
    LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    GROUP BY 1, 2, 3, 4
    ORDER BY 1 ASC, 5 DESC, 3 ASC
  `;

  const hasArticleNumberColumn = await hasKitchenItemArticleNumberColumn();
  const itemRows = hasArticleNumberColumn
    ? await prisma.$queryRaw`
        SELECT
          prj."id" AS "projectId",
          oi."itemType"::text AS "itemType",
          oi."code" AS "code",
          oi."nameSnapshot" AS "nameSnapshot",
          MAX(ki."name") FILTER (WHERE ki."name" IS NOT NULL) AS "canonicalName",
          ki."articleNumber" AS "articleNumber",
          SUM(oi."quantity")::int AS "quantity",
          COALESCE(SUM(oi."quantity" * oi."priceSnapshot"), 0) AS "revenue"
        FROM "Project" prj
        JOIN "KitchenContract" kc ON kc."projectId" = prj."id" ${contractJoinFilter}
        JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
        JOIN "OrderItem" oi ON oi."orderId" = o."id"
        LEFT JOIN "KitchenItem" ki ON ki."id" = oi."kitchenItemId"
        GROUP BY 1, 2, 3, 4, 6
        ORDER BY 1 ASC, 7 DESC, 8 DESC, 4 ASC
      `
    : await prisma.$queryRaw`
        SELECT
          prj."id" AS "projectId",
          oi."itemType"::text AS "itemType",
          oi."code" AS "code",
          oi."nameSnapshot" AS "nameSnapshot",
          NULL::text AS "canonicalName",
          NULL::text AS "articleNumber",
          SUM(oi."quantity")::int AS "quantity",
          COALESCE(SUM(oi."quantity" * oi."priceSnapshot"), 0) AS "revenue"
        FROM "Project" prj
        JOIN "KitchenContract" kc ON kc."projectId" = prj."id" ${contractJoinFilter}
        JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
        JOIN "OrderItem" oi ON oi."orderId" = o."id"
        GROUP BY 1, 2, 3, 4, 5, 6
        ORDER BY 1 ASC, 7 DESC, 8 DESC, 4 ASC
      `;

  return {
    projectRows,
    timelineRows,
    kitchenRows,
    statusRows,
    contractRows,
    locationRows,
    itemRows,
  };
}

async function loadPropertyOwnerAnalytics({ startDate, kitchenId, status }) {
  const orderFilter = buildOwnerStatsOrderFilter({ startDate, kitchenId, status });

  const ownerRows = await prisma.$queryRaw`
    SELECT
      hc."id",
      hc."name",
      COUNT(DISTINCT pobj."id")::int AS "objectCount",
      COUNT(DISTINCT kc."id")::int AS "contractCount",
      COUNT(DISTINCT o."id")::int AS "orderCount",
      COUNT(DISTINCT o."kitchenId")::int AS "kitchenCount",
      COALESCE(SUM(o."totalPrice"), 0) AS "totalRevenue"
    FROM "HousingCompany" hc
    LEFT JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
    LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    GROUP BY hc."id"
    ORDER BY "totalRevenue" DESC, "orderCount" DESC, hc."name" ASC
  `;

  const timelineRows = await prisma.$queryRaw`
    SELECT
      hc."id" AS "ownerId",
      DATE_TRUNC('day', o."createdAt")::date AS "date",
      COUNT(*)::int AS "orders",
      COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
    FROM "HousingCompany" hc
    JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
    JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `;

  const kitchenRows = await prisma.$queryRaw`
    SELECT
      hc."id" AS "ownerId",
      COALESCE(NULLIF(BTRIM(k."name"), ''), 'Unknown kitchen') AS "kitchenName",
      COUNT(*)::int AS "orders",
      COALESCE(SUM(o."totalPrice"), 0) AS "revenue"
    FROM "HousingCompany" hc
    JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
    JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    LEFT JOIN "Kitchen" k ON k."id" = o."kitchenId"
    GROUP BY 1, 2
    ORDER BY 1 ASC, 4 DESC, 2 ASC
  `;

  const statusRows = await prisma.$queryRaw`
    SELECT
      hc."id" AS "ownerId",
      o."status"::text AS "status",
      COUNT(*)::int AS "count"
    FROM "HousingCompany" hc
    JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
    JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
    GROUP BY 1, 2
    ORDER BY 1 ASC, 2 ASC
  `;

  const hasArticleNumberColumn = await hasKitchenItemArticleNumberColumn();
  const itemRows = hasArticleNumberColumn
    ? await prisma.$queryRaw`
        SELECT
          hc."id" AS "ownerId",
          oi."itemType"::text AS "itemType",
          oi."code" AS "code",
          oi."nameSnapshot" AS "nameSnapshot",
          MAX(ki."name") FILTER (WHERE ki."name" IS NOT NULL) AS "canonicalName",
          ki."articleNumber" AS "articleNumber",
          SUM(oi."quantity")::int AS "quantity",
          COALESCE(SUM(oi."quantity" * oi."priceSnapshot"), 0) AS "revenue"
        FROM "HousingCompany" hc
        JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
        JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
        JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
        JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
        JOIN "OrderItem" oi ON oi."orderId" = o."id"
        LEFT JOIN "KitchenItem" ki ON ki."id" = oi."kitchenItemId"
        GROUP BY 1, 2, 3, 4, 6
        ORDER BY 1 ASC, 7 DESC, 8 DESC, 4 ASC
      `
    : await prisma.$queryRaw`
        SELECT
          hc."id" AS "ownerId",
          oi."itemType"::text AS "itemType",
          oi."code" AS "code",
          oi."nameSnapshot" AS "nameSnapshot",
          NULL::text AS "canonicalName",
          NULL::text AS "articleNumber",
          SUM(oi."quantity")::int AS "quantity",
          COALESCE(SUM(oi."quantity" * oi."priceSnapshot"), 0) AS "revenue"
        FROM "HousingCompany" hc
        JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
        JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
        JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
        JOIN "Order" o ON o."kitchenContractId" = kc."id" ${orderFilter}
        JOIN "OrderItem" oi ON oi."orderId" = o."id"
        GROUP BY 1, 2, 3, 4, 5, 6
        ORDER BY 1 ASC, 7 DESC, 8 DESC, 4 ASC
      `;

  return {
    ownerRows,
    timelineRows,
    kitchenRows,
    statusRows,
    itemRows,
  };
}

const hasKitchenItemArticleNumberColumn = cache(async function hasKitchenItemArticleNumberColumn() {
  const rows = await prisma.$queryRaw`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'KitchenItem'
      AND column_name = 'articleNumber'
    LIMIT 1
  `;

  return rows.length > 0;
});

export default async function AdminDashboardPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const period = getPeriod(normalizeParam(params.period));
  const kitchenId = normalizeParam(params.kitchenId);
  const status = normalizeParam(params.status);
  const validStatus = ORDER_STATUSES.includes(status) ? status : "";
  const startDate = getPeriodStartDate(period);

  const dashboardFilters = { startDate, kitchenId, status: validStatus };
  const [
    kitchens,
    propertyOwnerAnalyticsRaw,
    projectAnalyticsRaw,
    summary,
    dailyStatusRows,
    paymentRows,
    geographyRows,
    groupedItemRows,
  ] = await Promise.all([
    listKitchensForAdmin(),
    loadPropertyOwnerAnalytics({ startDate, kitchenId, status: validStatus }),
    loadProjectAnalytics({ startDate, kitchenId, status: validStatus }),
    loadDashboardSummary(dashboardFilters),
    loadDailyStatusRows(dashboardFilters),
    loadPaymentRows(dashboardFilters),
    loadGeographyRows(dashboardFilters),
    loadGroupedItemRows(dashboardFilters),
  ]);
  const totalOrders = summary.totalOrders;
  const totalRevenue = summary.totalRevenue;
  const averageOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
  const emailedOrders = summary.emailedOrders;
  const conversionRate = totalOrders ? (emailedOrders / totalOrders) * 100 : 0;

  const dateKeys = getDateKeys(startDate, summary.earliestCreatedAt);
  const dailyStatusByDate = new Map(
    dateKeys.map((date) => [
      date,
      {
        date,
        label: formatDateLabel(date),
        NEW: 0,
        EMAILED: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
      },
    ]),
  );
  for (const row of dailyStatusRows) {
    const dateKey = toDateKey(row.date);
    if (!dailyStatusByDate.has(dateKey)) {
      dailyStatusByDate.set(dateKey, {
        date: dateKey,
        label: formatDateLabel(dateKey),
        NEW: 0,
        EMAILED: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
      });
    }
    dailyStatusByDate.get(dateKey)[row.status] = Number(row.count || 0);
  }

  const itemStats = new Map();
  const typeSplit = new Map();
  for (const row of groupedItemRows) {
    if (isDefaultDashboardItem(row)) continue;

    const quantity = Number(row.quantity || 0);
    const revenue = Number(row.revenue || 0);
    const code = String(row.code || "").trim();
    const canonicalName = String(row.canonicalName || "").trim() || null;
    const fallbackName = String(row.nameSnapshot || "").trim() || "";
    const canonicalArticleNumber = resolveTopItemArticleNumber(row);
    const grouping = getTopItemGrouping({ code, itemType: row.itemType, nameSnapshot: row.nameSnapshot }, canonicalArticleNumber);
    const existingItem = itemStats.get(grouping.groupKey) || {
      itemType: grouping.preferredItemType || row.itemType,
      code: grouping.preferredCode || code,
      canonicalName: null,
      fallbackName,
      canonicalArticleNumber: null,
      quantity: 0,
      revenue: 0,
    };
    existingItem.itemType = choosePreferredItemType(existingItem.itemType, row.itemType, grouping.preferredItemType);
    existingItem.code = grouping.preferredCode || choosePreferredText(existingItem.code, code);
    existingItem.canonicalName = grouping.preferredName || choosePreferredText(existingItem.canonicalName, canonicalName);
    existingItem.fallbackName = choosePreferredText(existingItem.fallbackName, fallbackName);
    existingItem.canonicalArticleNumber = choosePreferredText(existingItem.canonicalArticleNumber, canonicalArticleNumber);
    existingItem.quantity += quantity;
    existingItem.revenue += revenue;
    itemStats.set(grouping.groupKey, existingItem);

    const existingType = typeSplit.get(row.itemType) || { label: row.itemType, value: 0 };
    existingType.value += quantity;
    typeSplit.set(row.itemType, existingType);
  }

  const geographyStats = new Map();
  for (const row of geographyRows) {
    const country = deriveCountry(row);
    const city = String(row.city || "").trim() || "Not captured";
    const postalCode = String(row.postalCode || "").trim();
    const locationLabel = [city, postalCode].filter(Boolean).join(" ");
    const geographyKey = `${country}::${city.toLowerCase()}::${postalCode.toLowerCase()}`;
    const existingLocation = geographyStats.get(geographyKey) || {
      country,
      city,
      postalCode,
      label: `${locationLabel || city}, ${country}`,
      orders: 0,
      revenue: 0,
    };
    existingLocation.orders += Number(row.orders || 0);
    existingLocation.revenue += Number(row.revenue || 0);
    geographyStats.set(geographyKey, existingLocation);
  }

  const dailyStatusData = Array.from(dailyStatusByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const resolvedItemStats = Array.from(itemStats.values()).map((item) => ({
    ...item,
    name: item.canonicalName || item.fallbackName || item.code || "",
    articleNumber: item.canonicalArticleNumber || null,
  }));
  const topItemsByQuantity = resolvedItemStats.slice().sort(compareTopItemsByQuantity);
  const topItemsByRevenue = resolvedItemStats.slice().sort(compareTopItemsByRevenue);
  const itemTypeData = Array.from(typeSplit.values()).sort((a, b) => b.value - a.value);
  const paymentData = paymentRows
    .map((row) => ({ label: row.label, value: Number(row.value || 0) }))
    .sort((a, b) => b.value - a.value);
  const geographyData = Array.from(geographyStats.values())
    .map((row) => ({
      ...row,
      orderShare: totalOrders ? (row.orders / totalOrders) * 100 : 0,
    }))
    .sort((a, b) => b.orders - a.orders);
  const companyTimelineById = new Map();
  for (const owner of propertyOwnerAnalyticsRaw.ownerRows) {
    companyTimelineById.set(owner.id, new Map(
      dateKeys.map((date) => [
        date,
        {
          date,
          label: formatDateLabel(date),
          orders: 0,
          revenue: 0,
        },
      ]),
    ));
  }

  for (const row of propertyOwnerAnalyticsRaw.timelineRows) {
    const ownerTimeline = companyTimelineById.get(row.ownerId);
    if (!ownerTimeline) continue;
    const dateKey = toDateKey(row.date);
    if (!ownerTimeline.has(dateKey)) {
      ownerTimeline.set(dateKey, {
        date: dateKey,
        label: formatDateLabel(dateKey),
        orders: 0,
        revenue: 0,
      });
    }

    ownerTimeline.set(dateKey, {
      date: dateKey,
      label: formatDateLabel(dateKey),
      orders: Number(row.orders || 0),
      revenue: Number(row.revenue || 0),
    });
  }

  const kitchenBreakdownByCompany = propertyOwnerAnalyticsRaw.kitchenRows.reduce((acc, row) => {
    if (!acc[row.ownerId]) acc[row.ownerId] = [];
    acc[row.ownerId].push({
      kitchenName: row.kitchenName || "Unknown kitchen",
      orders: Number(row.orders || 0),
      revenue: Number(row.revenue || 0),
    });
    return acc;
  }, {});

  const statusBreakdownByCompany = propertyOwnerAnalyticsRaw.statusRows.reduce((acc, row) => {
    if (!acc[row.ownerId]) acc[row.ownerId] = [];
    acc[row.ownerId].push({
      status: row.status || "",
      count: Number(row.count || 0),
    });
    return acc;
  }, {});

  const topItemsByCompanyMap = new Map();
  for (const row of propertyOwnerAnalyticsRaw.itemRows) {
    if (isDefaultDashboardItem(row)) continue;

    const ownerId = row.ownerId;
    if (!topItemsByCompanyMap.has(ownerId)) {
      topItemsByCompanyMap.set(ownerId, new Map());
    }

    const ownerItems = topItemsByCompanyMap.get(ownerId);
    const quantity = Number(row.quantity || 0);
    const revenue = Number(row.revenue || 0);
    const code = String(row.code || "").trim();
    const canonicalName = String(row.canonicalName || "").trim() || null;
    const fallbackName = String(row.nameSnapshot || "").trim() || "";
    const canonicalArticleNumber = resolveTopItemArticleNumber(row);
    const grouping = getTopItemGrouping({ code, itemType: row.itemType, nameSnapshot: row.nameSnapshot }, canonicalArticleNumber);
    const existingItem = ownerItems.get(grouping.groupKey) || {
      itemType: grouping.preferredItemType || row.itemType,
      code: grouping.preferredCode || code,
      canonicalName: null,
      fallbackName,
      canonicalArticleNumber: null,
      quantity: 0,
      revenue: 0,
    };
    existingItem.itemType = choosePreferredItemType(existingItem.itemType, row.itemType, grouping.preferredItemType);
    existingItem.code = grouping.preferredCode || choosePreferredText(existingItem.code, code);
    existingItem.canonicalName = grouping.preferredName || choosePreferredText(existingItem.canonicalName, canonicalName);
    existingItem.fallbackName = choosePreferredText(existingItem.fallbackName, fallbackName);
    existingItem.canonicalArticleNumber = choosePreferredText(existingItem.canonicalArticleNumber, canonicalArticleNumber);
    existingItem.quantity += quantity;
    existingItem.revenue += revenue;
    ownerItems.set(grouping.groupKey, existingItem);
  }

  const companyTopItemsById = Array.from(topItemsByCompanyMap.entries()).reduce((acc, [ownerId, items]) => {
    acc[ownerId] = Array.from(items.values())
      .map((item) => ({
        ...item,
        name: item.canonicalName || item.fallbackName || item.code || "",
        articleNumber: item.canonicalArticleNumber || null,
      }))
      .sort(compareTopItemsByQuantity);
    return acc;
  }, {});

  const companyAnalytics = {
    companies: propertyOwnerAnalyticsRaw.ownerRows
      .filter((owner) => Number(owner.contractCount || 0) || Number(owner.orderCount || 0))
      .map((owner) => {
        const totalRevenue = Number(owner.totalRevenue || 0);
        const orderCount = Number(owner.orderCount || 0);
        return {
          id: owner.id,
          name: owner.name || "",
          objectCount: Number(owner.objectCount || 0),
          contractCount: Number(owner.contractCount || 0),
          orderCount,
          kitchenCount: Number(owner.kitchenCount || 0),
          totalRevenue,
          averageOrderValue: orderCount ? totalRevenue / orderCount : 0,
        };
      }),
    defaultCompanyId: propertyOwnerAnalyticsRaw.ownerRows.find((owner) => Number(owner.contractCount || 0) || Number(owner.orderCount || 0))?.id || "",
    timelineByCompany: Array.from(companyTimelineById.entries()).reduce((acc, [ownerId, rows]) => {
      acc[ownerId] = Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
      return acc;
    }, {}),
    kitchenBreakdownByCompany,
    topItemsByCompany: companyTopItemsById,
    statusBreakdownByCompany,
  };

  const projectTimelineById = new Map();
  for (const project of projectAnalyticsRaw.projectRows) {
    projectTimelineById.set(project.id, new Map(
      dateKeys.map((date) => [
        date,
        {
          date,
          label: formatDateLabel(date),
          orders: 0,
          revenue: 0,
        },
      ]),
    ));
  }

  for (const row of projectAnalyticsRaw.timelineRows) {
    const projectTimeline = projectTimelineById.get(row.projectId);
    if (!projectTimeline) continue;
    const dateKey = toDateKey(row.date);
    if (!projectTimeline.has(dateKey)) {
      projectTimeline.set(dateKey, {
        date: dateKey,
        label: formatDateLabel(dateKey),
        orders: 0,
        revenue: 0,
      });
    }

    projectTimeline.set(dateKey, {
      date: dateKey,
      label: formatDateLabel(dateKey),
      orders: Number(row.orders || 0),
      revenue: Number(row.revenue || 0),
    });
  }

  const kitchenBreakdownByProject = projectAnalyticsRaw.kitchenRows.reduce((acc, row) => {
    if (!acc[row.projectId]) acc[row.projectId] = [];
    acc[row.projectId].push({
      kitchenName: row.kitchenName || "Unknown kitchen",
      orders: Number(row.orders || 0),
      revenue: Number(row.revenue || 0),
    });
    return acc;
  }, {});

  const statusBreakdownByProject = projectAnalyticsRaw.statusRows.reduce((acc, row) => {
    if (!acc[row.projectId]) acc[row.projectId] = [];
    acc[row.projectId].push({
      status: row.status || "",
      count: Number(row.count || 0),
    });
    return acc;
  }, {});

  const contractsByProject = projectAnalyticsRaw.contractRows.reduce((acc, row) => {
    if (!acc[row.projectId]) acc[row.projectId] = [];
    const unitParts = [row.building, row.floor, row.unitNumber].map((value) => String(value || "").trim()).filter(Boolean);
    acc[row.projectId].push({
      id: row.id,
      contractNumber: row.contractNumber || "",
      kitchenName: row.kitchenName || "Unknown kitchen",
      isActive: Boolean(row.isActive),
      usedAt: row.usedAt ? formatDateTime(row.usedAt) : "",
      unitLabel: unitParts.join(" / "),
      orderCount: Number(row.orderCount || 0),
      revenue: Number(row.revenue || 0),
      latestOrderAt: row.latestOrderAt ? formatDateTime(row.latestOrderAt) : "",
    });
    return acc;
  }, {});

  const locationsByProject = projectAnalyticsRaw.locationRows.reduce((acc, row) => {
    if (!acc[row.projectId]) acc[row.projectId] = [];
    const country = deriveCountry(row);
    const city = String(row.city || "").trim() || "Not captured";
    const postalCode = String(row.postalCode || "").trim();
    const locationLabel = [city, postalCode].filter(Boolean).join(" ");
    acc[row.projectId].push({
      country,
      city,
      postalCode,
      label: `${locationLabel || city}, ${country}`,
      orders: Number(row.orders || 0),
      revenue: Number(row.revenue || 0),
    });
    return acc;
  }, {});

  const topItemsByProjectMap = new Map();
  for (const row of projectAnalyticsRaw.itemRows) {
    if (isDefaultDashboardItem(row)) continue;

    const projectId = row.projectId;
    if (!topItemsByProjectMap.has(projectId)) {
      topItemsByProjectMap.set(projectId, new Map());
    }

    const projectItems = topItemsByProjectMap.get(projectId);
    const quantity = Number(row.quantity || 0);
    const revenue = Number(row.revenue || 0);
    const code = String(row.code || "").trim();
    const canonicalName = String(row.canonicalName || "").trim() || null;
    const fallbackName = String(row.nameSnapshot || "").trim() || "";
    const canonicalArticleNumber = resolveTopItemArticleNumber(row);
    const grouping = getTopItemGrouping({ code, itemType: row.itemType, nameSnapshot: row.nameSnapshot }, canonicalArticleNumber);
    const existingItem = projectItems.get(grouping.groupKey) || {
      itemType: grouping.preferredItemType || row.itemType,
      code: grouping.preferredCode || code,
      canonicalName: null,
      fallbackName,
      canonicalArticleNumber: null,
      quantity: 0,
      revenue: 0,
    };
    existingItem.itemType = choosePreferredItemType(existingItem.itemType, row.itemType, grouping.preferredItemType);
    existingItem.code = grouping.preferredCode || choosePreferredText(existingItem.code, code);
    existingItem.canonicalName = grouping.preferredName || choosePreferredText(existingItem.canonicalName, canonicalName);
    existingItem.fallbackName = choosePreferredText(existingItem.fallbackName, fallbackName);
    existingItem.canonicalArticleNumber = choosePreferredText(existingItem.canonicalArticleNumber, canonicalArticleNumber);
    existingItem.quantity += quantity;
    existingItem.revenue += revenue;
    projectItems.set(grouping.groupKey, existingItem);
  }

  const projectTopItemsById = Array.from(topItemsByProjectMap.entries()).reduce((acc, [projectId, items]) => {
    acc[projectId] = Array.from(items.values())
      .map((item) => ({
        ...item,
        name: item.canonicalName || item.fallbackName || item.code || "",
        articleNumber: item.canonicalArticleNumber || null,
      }))
      .sort(compareTopItemsByQuantity);
    return acc;
  }, {});

  const projects = projectAnalyticsRaw.projectRows
    .filter((project) => Number(project.contractCount || 0) || Number(project.orderCount || 0))
    .map((project) => {
      const totalRevenue = Number(project.totalRevenue || 0);
      const orderCount = Number(project.orderCount || 0);
      const contractCount = Number(project.contractCount || 0);
      const projectLocations = locationsByProject[project.id] || [];
      return {
        id: project.id,
        name: project.name || "",
        projectCode: project.projectCode || "",
        status: project.status || "active",
        managerName: project.managerName || "",
        housingCompanyId: project.housingCompanyId || "",
        housingCompanyName: project.housingCompanyName || "",
        propertyObjectName: project.propertyObjectName || "",
        objectCity: project.objectCity || "",
        objectPostalCode: project.objectPostalCode || "",
        objectCountry: project.objectCountry || "",
        objectAddress: [project.objectAddress1, project.objectAddress2].filter(Boolean).join(", "),
        contractCount,
        usedContractCount: Number(project.usedContractCount || 0),
        unusedContractCount: Math.max(0, contractCount - Number(project.usedContractCount || 0)),
        orderCount,
        kitchenCount: Number(project.kitchenCount || 0),
        cityCount: projectLocations.filter((location) => location.city && location.city !== "Not captured").length,
        totalRevenue,
        averageOrderValue: orderCount ? totalRevenue / orderCount : 0,
      };
    })
    .sort((a, b) => {
      if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue;
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      if (b.contractCount !== a.contractCount) return b.contractCount - a.contractCount;
      return a.name.localeCompare(b.name);
    });

  const projectAnalytics = {
    projects,
    defaultProjectId: projects[0]?.id || "",
    timelineByProject: Array.from(projectTimelineById.entries()).reduce((acc, [projectId, rows]) => {
      acc[projectId] = Array.from(rows.values()).sort((a, b) => a.date.localeCompare(b.date));
      return acc;
    }, {}),
    kitchenBreakdownByProject,
    statusBreakdownByProject,
    contractsByProject,
    locationsByProject,
    topItemsByProject: projectTopItemsById,
  };

  const kpis = [
    {
      labelKey: "dashboard.totalOrders",
      fallbackLabel: "Total orders",
      value: String(totalOrders),
      trendKey: "dashboard.createdInSelectedPeriod",
      trendFallback: "Created in the selected period",
    },
    {
      labelKey: "dashboard.totalRevenue",
      fallbackLabel: "Total revenue",
      value: formatCurrency(totalRevenue),
      breakdown: [
        {
          labelKey: "dashboard.priceExclVat",
          fallbackLabel: "Price",
          value: formatCurrency(getPriceBreakdown(totalRevenue).net),
        },
        {
          labelKey: "dashboard.vatAmount",
          fallbackLabel: "VAT (19%)",
          value: formatCurrency(getPriceBreakdown(totalRevenue).vat),
        },
      ],
    },
    {
      labelKey: "dashboard.averageOrderValue",
      fallbackLabel: "Average order value",
      value: formatCurrency(averageOrderValue),
      trendKey: "dashboard.revenuePerOrder",
      trendFallback: "Revenue per order",
    },
    {
      labelKey: "dashboard.emailDispatchRate",
      fallbackLabel: "Email dispatch rate",
      value: formatPercent(conversionRate),
      trendKey: "dashboard.emailedOrdersOutOfTotal",
      trendFallback: "{emailed} emailed / {total} total",
      trendValues: { emailed: String(emailedOrders), total: String(totalOrders) },
    },
  ];

  return (
    <AdminShell adminEmail={admin.email}>
      <AdminWorkOverview />
      <AdminDashboardCharts
        kpis={kpis}
        periodOptions={PERIOD_OPTIONS.map(({ value, labelKey, fallbackLabel }) => ({ value, labelKey, fallbackLabel }))}
        selectedPeriod={period.value}
        kitchens={kitchens.map((kitchen) => ({ id: kitchen.id, name: kitchen.name }))}
        selectedKitchenId={kitchenId}
        statusOptions={ORDER_STATUSES}
        selectedStatus={validStatus}
        dailyStatusData={dailyStatusData}
        topItemsByQuantity={topItemsByQuantity}
        topItemsByRevenue={topItemsByRevenue}
        itemTypeData={itemTypeData}
        paymentData={paymentData}
        geographyData={geographyData}
        companyAnalytics={companyAnalytics}
        projectAnalytics={projectAnalytics}
      />
    </AdminShell>
  );
}

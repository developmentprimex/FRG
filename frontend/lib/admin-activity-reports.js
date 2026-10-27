import { formatBusinessClaimReference } from "./business-report-reference.js";
import { getOrderReportDetails, getPurchasedReportItems, getClaimReportIssueSummary } from "./report-details.js";
import { prisma } from "./prisma.js";
import { normalizeContractTypeFilter } from "./contract-type-filter.js";
import { ORDER_REPORT_STATUSES, loadOrderReportData, getOrderReportExportRows, calculateOrderReportSummary } from "./admin-order-reports.js";
import { queryServiceClaimsList } from "./service-claim-admin-query.js";

export const ACTIVITY_REPORT_STATUSES = [...ORDER_REPORT_STATUSES, "RECEIVED"];

const single = (value) => Array.isArray(value) ? value[0] || "" : value || "";
function dateValue(value) {
  const text = String(single(value)).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(new Date(text).getTime()) && new Date(text).toISOString().slice(0, 10) === text ? text : "";
}

export function normalizeActivityReportFilters(input = {}) {
  const type = String(single(input.type)).trim().toUpperCase();
  const status = String(single(input.status)).trim().toUpperCase();
  return {
    dateFrom: dateValue(input.dateFrom),
    contractType: normalizeContractTypeFilter(input.contractType),
    dateTo: dateValue(input.dateTo),
    type: ["ORDER", "CLAIM"].includes(type) ? type : "",
    status: ACTIVITY_REPORT_STATUSES.includes(status) ? status : "",
  };
}

export function buildActivityReportQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeActivityReportFilters(filters))) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function buildActivityReportRows(orders = [], claims = []) {
  const orderRows = getOrderReportExportRows(orders).map((row, index) => ({
    ...row,
    id: orders[index].id,
    type: "ORDER",
    reference: row.orderNumber,
    href: "/admin/orders/" + orders[index].id,
    phone: orders[index].phone || "",
    serialNumber: "",
    orderDetails: getOrderReportDetails(orders[index]),
    itemCount: getPurchasedReportItems(orders[index]).reduce((count, item) => count + Number(item.quantity || 0), 0),
    issue: "",
    requestType: "",
  }));
  const claimRows = claims.map((claim) => ({
    id: claim.id,
    type: "CLAIM",
    reference: formatBusinessClaimReference(claim.contractNumber, claim.claimSequence, claim.ticketNumber),
    href: "/admin/claims/" + claim.id,
    createdAt: claim.createdAt,
    status: "RECEIVED",
    paymentStatus: "",
    customer: String(claim.fullName || "").replace(/\s*\((female|male|diverse|other)\)\s*$/i, "").trim(),
    email: claim.email || "",
    phone: claim.phone || "",
    contractNumber: claim.contractNumber || "",
    city: claim.clientCity || "",
    country: claim.clientCountry || "",
    serialNumber: claim.serialNumber || "",
    issue: claim.problemDescription || "",
    issueSummary: getClaimReportIssueSummary(claim),
    requestType: claim.requestType || "",
    itemCount: null,
    gross: null,
    net: null,
    vat: null,
  }));
  return [...orderRows, ...claimRows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt) || String(a.id).localeCompare(String(b.id)));
}

export async function loadActivityReportData(filters = {}, dependencies = {}) {
  const normalized = normalizeActivityReportFilters(filters);
  const loadOrders = dependencies.loadOrders || loadOrderReportData;
  const loadClaims = dependencies.loadClaims || ((claimFilters) => queryServiceClaimsList(prisma, { ...claimFilters, reportTimeZone: "Europe/Berlin" }));
  const includeOrders = normalized.type !== "CLAIM" && normalized.status !== "RECEIVED";
  const includeClaims = normalized.type !== "ORDER" && (!normalized.status || normalized.status === "RECEIVED");
  const [orderData, claims] = await Promise.all([
    includeOrders ? loadOrders(normalized) : { orders: [], summary: calculateOrderReportSummary([]) },
    includeClaims ? loadClaims({ dateFrom: normalized.dateFrom, dateTo: normalized.dateTo, contractType: normalized.contractType, claimType: "live" }) : [],
  ]);
  return {
    filters: normalized,
    orders: orderData.orders,
    claims,
    rows: buildActivityReportRows(orderData.orders, claims),
    summary: { ...orderData.summary, totalClaims: claims.length, totalRecords: orderData.orders.length + claims.length },
  };
}

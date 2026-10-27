import { prisma } from "./prisma.js";
import { normalizeContractTypeFilter } from "./contract-type-filter.js";
import { getPriceBreakdown } from "./price-utils.js";
import { workDayStart } from "./work-processing-rules.js";

export const ORDER_REPORT_STATUSES = ["NEW", "EMAILED", "CONFIRMED", "CANCELLED"];

function getSingleValue(value) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export function normalizeOrderReportFilters(input = {}) {
  const status = String(getSingleValue(input.status)).trim().toUpperCase();

  return {
    dateFrom: String(getSingleValue(input.dateFrom)).trim(),
    contractType: normalizeContractTypeFilter(input.contractType),
    dateTo: String(getSingleValue(input.dateTo)).trim(),
    status: ORDER_REPORT_STATUSES.includes(status) ? status : "",
  };
}

export function buildOrderReportQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  const contractType = normalizeContractTypeFilter(filters.contractType);
  if (contractType) params.set("contractType", contractType);
  return params.toString();
}

function getOrderReportWhere(filters = {}) {
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.contractType) where.kitchenContract = { is: { contractType: filters.contractType } };

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = workDayStart(filters.dateFrom);
    if (filters.dateTo) {
      const endDate = new Date(`${filters.dateTo}T12:00:00Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      where.createdAt.lt = workDayStart(endDate.toISOString().slice(0, 10));
    }
  }

  return where;
}

export function calculateOrderReportSummary(orders = []) {
  const initial = {
    totalOrders: 0,
    doneOrders: 0,
    notDoneUnpaidOrders: 0,
    cancelledOrders: 0,
    totalGross: 0,
    confirmedGross: 0,
    confirmedNet: 0,
    confirmedVat: 0,
    averageConfirmedGross: 0,
    itemCount: 0,
    statusCounts: {
      NEW: 0,
      EMAILED: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
    },
  };

  const summary = orders.reduce((current, order) => {
    const gross = Number(order.totalPrice || 0);
    const status = String(order.status || "");
    const paymentStatus = String(order.paymentStatus || "UNPAID").toUpperCase();

    current.totalOrders += 1;
    current.totalGross += gross;
    current.itemCount += Array.isArray(order.items)
      ? order.items.reduce((count, item) => count + Number(item.quantity || 0), 0)
      : 0;

    if (Object.prototype.hasOwnProperty.call(current.statusCounts, status)) {
      current.statusCounts[status] += 1;
    }

    if (status === "CONFIRMED") {
      current.doneOrders += 1;
      current.confirmedGross += gross;
    }

    if (status === "CANCELLED") {
      current.cancelledOrders += 1;
    }

    if (status !== "CONFIRMED" && paymentStatus !== "PAID") {
      current.notDoneUnpaidOrders += 1;
    }

    return current;
  }, initial);

  const confirmedBreakdown = getPriceBreakdown(summary.confirmedGross);
  summary.confirmedNet = confirmedBreakdown.net;
  summary.confirmedVat = confirmedBreakdown.vat;
  summary.averageConfirmedGross = summary.doneOrders
    ? summary.confirmedGross / summary.doneOrders
    : 0;

  return summary;
}

export async function loadOrderReportData(filters = {}) {
  const normalizedFilters = normalizeOrderReportFilters(filters);
  const orders = await prisma.order.findMany({
    where: getOrderReportWhere(normalizedFilters),
    include: {
      kitchenContract: true,
      items: { include: { kitchenItem: { select: { isLocked: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    filters: normalizedFilters,
    orders,
    summary: calculateOrderReportSummary(orders),
  };
}

export function getOrderReportExportRows(orders = []) {
  return orders.map((order) => {
    const breakdown = getPriceBreakdown(order.totalPrice);
    const itemCount = Array.isArray(order.items)
      ? order.items.reduce((count, item) => count + Number(item.quantity || 0), 0)
      : 0;

    return {
      orderNumber: order.orderNumber || "",
      createdAt: order.createdAt || null,
      status: order.status || "",
      paymentStatus: order.paymentStatus || "",
      customer: [order.firstName, order.lastName].filter(Boolean).join(" "),
      email: order.email || "",
      contractNumber: order.contractNumber || order.kitchenContract?.contractNumber || "",
      city: order.city || "",
      country: order.country || "",
      itemCount,
      gross: breakdown.total,
      net: breakdown.net,
      vat: breakdown.vat,
    };
  });
}

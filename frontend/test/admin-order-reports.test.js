import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOrderReportSummary,
  normalizeOrderReportFilters,
} from "../lib/admin-order-reports.js";

function order(overrides = {}) {
  return {
    status: "NEW",
    paymentStatus: "UNPAID",
    totalPrice: 0,
    items: [],
    ...overrides,
  };
}

test("confirmed orders count as done and drive VAT totals", () => {
  const summary = calculateOrderReportSummary([
    order({ status: "CONFIRMED", paymentStatus: "PAID", totalPrice: 119, items: [{ quantity: 2 }] }),
    order({ status: "CONFIRMED", paymentStatus: "UNPAID", totalPrice: 238, items: [{ quantity: 1 }] }),
    order({ status: "NEW", paymentStatus: "UNPAID", totalPrice: 119, items: [{ quantity: 3 }] }),
  ]);

  assert.equal(summary.totalOrders, 3);
  assert.equal(summary.doneOrders, 2);
  assert.equal(summary.confirmedGross, 357);
  assert.equal(summary.confirmedNet, 300);
  assert.equal(Math.round(summary.confirmedVat), 57);
  assert.equal(summary.averageConfirmedGross, 178.5);
  assert.equal(summary.itemCount, 6);
});

test("not done unpaid excludes confirmed orders and paid open orders", () => {
  const summary = calculateOrderReportSummary([
    order({ status: "NEW", paymentStatus: "UNPAID" }),
    order({ status: "EMAILED", paymentStatus: "PENDING" }),
    order({ status: "NEW", paymentStatus: "PAID" }),
    order({ status: "CONFIRMED", paymentStatus: "UNPAID" }),
    order({ status: "CANCELLED", paymentStatus: "UNPAID" }),
  ]);

  assert.equal(summary.notDoneUnpaidOrders, 3);
  assert.equal(summary.doneOrders, 1);
  assert.equal(summary.cancelledOrders, 1);
  assert.deepEqual(summary.statusCounts, {
    NEW: 2,
    EMAILED: 1,
    CONFIRMED: 1,
    CANCELLED: 1,
  });
});

test("report filters trim values and only accept known statuses", () => {
  assert.deepEqual(
    normalizeOrderReportFilters({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      kitchenId: " kitchen-1 ",
      status: "confirmed",
    }),
    {
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      status: "CONFIRMED",
      contractType: "",
    },
  );

  assert.equal(normalizeOrderReportFilters({ status: "paid" }).status, "");
});


test("order report contract type filters query the related contract", async () => {
  const { prisma } = await import("../lib/prisma.js");
  const { loadOrderReportData } = await import("../lib/admin-order-reports.js");
  const original = prisma.order.findMany;
  try {
    for (const contractType of ["ARC", "FRG"]) {
      prisma.order.findMany = async ({ where }) => {
        assert.deepEqual(where.kitchenContract, { is: { contractType } });
        return [];
      };
      await loadOrderReportData({ contractType: contractType.toLowerCase() });
    }
  } finally {
    prisma.order.findMany = original;
  }
});

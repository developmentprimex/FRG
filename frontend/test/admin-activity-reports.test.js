import assert from "node:assert/strict";
import test from "node:test";
import { buildActivityReportRows, normalizeActivityReportFilters, buildActivityReportQuery, loadActivityReportData } from "../lib/admin-activity-reports.js";

const orders = [{ id: "o1", orderNumber: "6701-1", createdAt: new Date("2026-10-07T09:00:00Z"), status: "CONFIRMED", paymentStatus: "PAID", firstName: "Max", lastName: "Test", email: "max@example.com", totalPrice: 119, items: [{ quantity: 2 }], kitchenContract: { contractNumber: "6701" } }];
const claims = [{ id: "c1", contractNumber: "6701", createdAt: new Date("2026-10-08T09:00:00Z"), fullName: "Max Test (male)", serialNumber: "SN-123", problemDescription: "Oven does not heat", phone: "12345", clientCity: "Berlin", requestType: "complaint" }];

const dependencies = {
  loadOrders: async () => ({ orders, summary: { totalOrders: 1, confirmedGross: 119, confirmedNet: 100, confirmedVat: 19 } }),
  loadClaims: async () => claims,
};

test("mixed rows retain their own details and sort by date", () => {
  const rows = buildActivityReportRows(orders, claims);
  assert.deepEqual(rows.map(row => row.type), ["CLAIM", "ORDER"]);
  assert.equal(rows[0].href, "/admin/claims/c1");
  assert.equal(rows[0].customer, "Max Test");
  assert.equal(rows[0].issue, "Oven does not heat");
  assert.equal(rows[0].serialNumber, "SN-123");
  assert.equal(rows[0].gross, null);
  assert.equal(rows[0].net, null);
  assert.equal(rows[0].vat, null);
  assert.equal(rows[0].paymentStatus, "");
  assert.equal(rows[1].href, "/admin/orders/o1");
  assert.equal(rows[1].reference, "6701-1");
  assert.equal(rows[1].contractNumber, "6701");
  assert.equal(rows[1].itemCount, 2);
  assert.equal(rows[1].gross, 119);
  assert.equal(rows[1].net, 100);
});

test("both types load together without adding claims to order revenue", async () => {
  const report = await loadActivityReportData({}, dependencies);
  assert.equal(report.summary.totalRecords, 2);
  assert.equal(report.summary.totalClaims, 1);
  assert.equal(report.summary.confirmedGross, 119);
});

test("type and status filters select applicable records", async () => {
  for (const [filters, expected] of [
    [{ type: "ORDER" }, ["ORDER"]],
    [{ type: "CLAIM" }, ["CLAIM"]],
    [{ status: "RECEIVED" }, ["CLAIM"]],
    [{ status: "CONFIRMED" }, ["ORDER"]],
    [{ type: "CLAIM", status: "CONFIRMED" }, []],
    [{ type: "ORDER", status: "RECEIVED" }, []],
  ]) {
    const report = await loadActivityReportData(filters, dependencies);
    assert.deepEqual(report.rows.map(row => row.type), expected);
  }
});

test("date filters are forwarded and claims exclude PX test records", async () => {
  let passedOrders;
  let passedClaims;
  await loadActivityReportData({ dateFrom: "2026-10-01", dateTo: "2026-10-14" }, {
    loadOrders: async filters => { passedOrders = filters; return { orders: [], summary: {} }; },
    loadClaims: async filters => { passedClaims = filters; return []; },
  });
  assert.equal(passedOrders.dateFrom, "2026-10-01");
  assert.equal(passedOrders.dateTo, "2026-10-14");
  assert.deepEqual(passedClaims, { dateFrom: "2026-10-01", dateTo: "2026-10-14", claimType: "live" });
});

test("filter query preserves type and status and rejects invalid dates", () => {
  assert.deepEqual(normalizeActivityReportFilters({ type: [" claim "], status: "received", dateFrom: "2026-02-30", dateTo: "bad" }), { type: "CLAIM", status: "RECEIVED", dateFrom: "", dateTo: "" });
  const query = new URLSearchParams(buildActivityReportQuery({ type: "CLAIM", status: "RECEIVED", dateFrom: "2026-10-01" }));
  assert.equal(query.get("type"), "CLAIM");
  assert.equal(query.get("status"), "RECEIVED");
  assert.equal(query.get("dateFrom"), "2026-10-01");
  assert.deepEqual(buildActivityReportRows(), []);
});

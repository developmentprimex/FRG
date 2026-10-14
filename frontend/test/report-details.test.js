import assert from "node:assert/strict";
import test from "node:test";
import { getOrderReportDetails, getPurchasedReportItems } from "../lib/report-details.js";

test("order details retain saved products, quantities, article codes, and separate rows", () => {
  const details = getOrderReportDetails({ items: [
    { quantity: 2, nameSnapshot: "Upper Cabinet 60 cm", articleNumberSnapshot: "H6002", code: "CAB-1" },
    { quantity: 1, nameSnapshot: "Upper Cabinet 60 cm", articleNumberSnapshot: "H6002", code: "CAB-2" },
    { quantity: 1, nameSnapshot: "Worktop", code: "TOP-1" },
  ] });
  assert.equal(details, "2 × Upper Cabinet 60 cm [H6002]\n1 × Upper Cabinet 60 cm [H6002]\n1 × Worktop [TOP-1]");
});

test("legacy order details fall back to saved German names or codes", () => {
  assert.equal(getOrderReportDetails({ items: [{ nameDeSnapshot: "Arbeitsplatte", code: "TOP" }, { code: "CAB" }] }), "1 × Arbeitsplatte [TOP]\n1 × CAB");
  assert.equal(getOrderReportDetails({}), "");
});

test("purchased item details omit locked defaults regardless of saved price", () => {
  const order = { items: [
    { nameSnapshot: "Default oven", quantity: 1, priceSnapshot: 200, kitchenItem: { isLocked: true } },
    { nameSnapshot: "Upper Cabinet", quantity: 3, articleNumberSnapshot: "H6002", kitchenItem: { isLocked: false } },
    { nameSnapshot: "Free addition", quantity: 1, priceSnapshot: 0, kitchenItem: { isLocked: false } },
  ] };
  assert.equal(getOrderReportDetails(order), "3 × Upper Cabinet [H6002]\n1 × Free addition");
  assert.equal(getPurchasedReportItems(order).reduce((count, item) => count + item.quantity, 0), 4);
  assert.equal(getOrderReportDetails({ items: [order.items[0]] }), "");
});

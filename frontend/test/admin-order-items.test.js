import assert from "node:assert/strict";
import test from "node:test";
import { buildAdminOrderItems } from "../lib/admin-order-items.js";

test("670104332: included drawers do not inflate the 819 EUR additions", () => {
  const items = [
    ...Array.from({ length: 10 }, (_, id) => ({ id: `base-${id}`, priceSnapshot: "0", quantity: 1, kitchenItem: { isLocked: true } })),
    ...[1, 2].map(id => ({ id: `drawer-${id}`, articleNumberSnapshot: "US2A60", priceSnapshot: "461", quantity: 1, kitchenItem: { isLocked: true } })),
    ...[146, 346, 146, 181].map((price, id) => ({ id: `extra-${id}`, priceSnapshot: String(price), quantity: 1, kitchenItem: { isLocked: false } })),
  ];
  const result = buildAdminOrderItems({ totalPrice: "819", items });
  assert.equal(result.groups.included.length, 12);
  assert.equal(result.groups.additional.length, 4);
  assert.equal(result.itemsTotal, 819);
  assert.equal(result.matchesTotal, true);
  assert.equal(result.groups.included[10].savedUnitPrice, 461);
  assert.equal(result.groups.included[10].unitPrice, 0);
  assert.equal(items[10].priceSnapshot, "461");
});

test("saved article identity and quantity survive later catalog edits", () => {
  const result = buildAdminOrderItems({ totalPrice: "24.68", items: [{
    id: "a", articleNumberSnapshot: "ORDERED", priceSnapshot: "12.34", quantity: 2,
    kitchenItem: { isLocked: false, articleNumber: "CHANGED", price: 99 },
  }] });
  assert.equal(result.groups.additional[0].articleNumber, "ORDERED");
  assert.equal(result.itemsTotal, 24.68);
  assert.equal(result.matchesTotal, true);
});

test("zero-price optional items are not misclassified as defaults", () => {
  const result = buildAdminOrderItems({ items: [{ priceSnapshot: 0, kitchenItem: { isLocked: false } }] });
  assert.equal(result.groups.additional.length, 1);
  assert.equal(result.groups.included.length, 0);
});

test("deleted kitchen links remain unknown with their saved prices", () => {
  const result = buildAdminOrderItems({ totalPrice: 20, items: [{ priceSnapshot: 20, kitchenItem: null }] });
  assert.equal(result.groups.unknown.length, 1);
  assert.equal(result.itemsTotal, 20);
});

test("changed inclusion flags expose a mismatch instead of adjusting the order total", () => {
  const result = buildAdminOrderItems({ totalPrice: 461, items: [{ priceSnapshot: 461, kitchenItem: { isLocked: true } }] });
  assert.equal(result.matchesTotal, false);
  assert.equal(result.orderTotal, 461);
  assert.equal(result.itemsTotal, 0);
});

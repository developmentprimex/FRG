import test from "node:test";
import assert from "node:assert/strict";
import { deleteKitchenForAdmin } from "../lib/admin-kitchen-delete.js";

test("kitchen deletion targets one kitchen and excludes every protected relation", async () => {
  let query;
  await deleteKitchenForAdmin({ kitchen: { deleteMany: async (args) => {
    query = args;
    return { count: 1 };
  } } }, "kitchen-1");
  assert.deepEqual(query, { where: {
    id: "kitchen-1", orders: { none: {} }, testOrders: { none: {} }, contracts: { none: {} },
  } });
});

test("a protected or missing kitchen reports failure instead of success", async () => {
  await assert.rejects(
    deleteKitchenForAdmin({ kitchen: { deleteMany: async () => ({ count: 0 }) } }, "linked"),
    /linked orders, test orders, or contracts/,
  );
});

test("database failures propagate without reporting a successful deletion", async () => {
  const error = Object.assign(new Error("Foreign key constraint"), { code: "P2003" });
  await assert.rejects(
    deleteKitchenForAdmin({ kitchen: { deleteMany: async () => { throw error; } } }, "linked"),
    (actual) => actual === error,
  );
});

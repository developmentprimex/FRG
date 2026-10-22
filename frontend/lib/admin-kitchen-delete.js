export async function deleteKitchenForAdmin(db, id) {
  // Filter in the deletion itself so linked contracts cannot be cascade-deleted.
  const result = await db.kitchen.deleteMany({
    where: { id, orders: { none: {} }, testOrders: { none: {} }, contracts: { none: {} } },
  });
  if (!result.count) {
    throw new Error("Kitchen could not be deleted. It may no longer exist or has linked orders, test orders, or contracts.");
  }
}

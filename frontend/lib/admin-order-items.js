// Order rows are never merged: their saved article numbers and quantities are
// the record of what was submitted. Legacy orders have no inclusion snapshot.
export function buildAdminOrderItems(order) {
  const groups = { additional: [], included: [], unknown: [] };
  for (const item of order.items || []) {
    const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
    const savedUnitPrice = Number(item.priceSnapshot || 0);
    const included = Boolean(item.kitchenItem?.isLocked);
    const group = !item.kitchenItem ? "unknown" : included ? "included" : "additional";
    const unitPrice = included ? 0 : savedUnitPrice;
    groups[group].push({
      ...item,
      quantity,
      savedUnitPrice,
      unitPrice,
      lineTotal: Math.round(unitPrice * quantity * 100) / 100,
      articleNumber: item.articleNumberSnapshot || "",
    });
  }
  const itemsTotal = Math.round(Object.values(groups).flat().reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const orderTotal = Number(order.totalPrice || 0);
  return { groups, itemsTotal, orderTotal, matchesTotal: Math.abs(itemsTotal - orderTotal) < 0.005 };
}

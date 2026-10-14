export function getPurchasedReportItems(order) {
  return (order.items || []).filter((item) => !item.kitchenItem?.isLocked);
}

export function getOrderReportDetails(order) {
  return getPurchasedReportItems(order).map((item) => {
    const name = item.nameSnapshot || item.nameDeSnapshot || item.code || "Item";
    const article = item.articleNumberSnapshot || item.code || "";
    return String(item.quantity ?? 1) + " × " + name + (article && article !== name ? " [" + article + "]" : "");
  }).join("\n");
}

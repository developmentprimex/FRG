import { parseServiceClaimProblemAreas } from "./service-claim-problem-areas.js";

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

export function getClaimReportIssueSummary(claim) {
  const names = [...new Set(parseServiceClaimProblemAreas(claim.problemAreasJson).map((area) => area.name || area.nameDe || area.code).filter(Boolean))];
  if (names.length) return names.join(", ");
  return String(claim.problemDescription || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
}

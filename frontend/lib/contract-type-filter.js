export function normalizeContractTypeFilter(value) {
  const normalized = String(Array.isArray(value) ? value[0] || "" : value || "").trim().toUpperCase();
  return normalized === "ARC" || normalized === "FRG" ? normalized : "";
}

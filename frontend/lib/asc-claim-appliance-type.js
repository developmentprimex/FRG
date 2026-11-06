import { getInventoryApplianceTypes, normalizeContractApplianceType } from "./contract-appliances.js";

// Shared by overview and reports: use selected appliance metadata/labels, never
// free problem text or another contract's shared reference-kitchen inventory.
export function claimApplianceTypes(area) {
  if (String(area.applianceType || "").trim()) {
    const type = normalizeContractApplianceType(area.applianceType);
    return type ? [type] : [];
  }
  const types = getInventoryApplianceTypes(area);
  if (types.length) return types;
  const label = String(area.name || area.nameDe || "").trim().toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
  const legacyTypes = { geschirrspuler: "dishwasher", geschirrspueler: "dishwasher", dunstabzugshaube: "extractor_hood",
    kuhlschrank: "fridge", kuehlschrank: "fridge", "kuhl-/gefrierkombination": "fridge", "kuhl-gefrierkombination": "fridge" };
  return legacyTypes[label] ? [legacyTypes[label]] : [];
}

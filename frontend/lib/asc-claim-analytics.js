import { isElectricalApplianceProblemArea } from "./service-claim-serial-number.js";
import { stripProductDimensionsFromLabel } from "./product-label-format.js";

const AREA_PREFIXES = /^(?:Küchenbereiche:|Kitchen areas:|Mutfak bölgeleri:|Zonas de la cocina:|Zones concernées :|Кухонные зоны:)/;
const text = (value) => String(value || "").trim();
const normalized = (value) => text(value).toLowerCase().replace(/\s+/g, " ");

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

export function classifyClaimArea(area = {}) {
  const identity = normalized(`${area.componentId || ""} ${area.code || ""} ${area.claimPartKey || ""}`);
  const name = normalized(`${area.name || ""} ${area.nameDe || ""}`);
  // A furniture front, drawer or filter is not the appliance behind it.
  if (/front|drawer|filter|blende|panel|worktop|sink|faucet/.test(identity + " " + name)
      && !/sink[ -](?:base[ -]|lower[ -])?cabinet|sinkbase/.test(identity + " " + name)) {
    return /front|drawer/.test(identity + " " + name) ? "cabinets" : "other";
  }
  if (isElectricalApplianceProblemArea(area)) return "electrical";
  if (/cabinet|sinkbase|\bschrank\b|unterschrank|oberschrank|hochschrank|\bcab-|\bus\d|\bwu\d|furniture-front|oven-drawer/.test(identity + " " + name)) return "cabinets";
  if (!identity.includes("reference-furniture") && /\b(?:kühlschrank|kuehlschrank|geschirrspüler|geschirrspueler|waschmaschine|backofen|kochfeld|dunstabzugshaube|herd)\b/.test(name)) return "electrical";
  if (/reference-furniture|\btop-|\bsink|worktop|blende|faucet|spüle|spuele|arbeitsplatte|sockel|rückwand|rueckwand|armatur|besteck|beleuchtung|lighting/.test(identity + " " + name)) return "other";
  return "unknown";
}

export function extractClaimAnalyticsAreas(claim) {
  const structured = parseArray(claim.problemAreasJson).filter((area) => area && typeof area === "object" && (area.name || area.code || area.componentId));
  if (structured.length) return structured;
  // Older submissions store only the selected-area header. Never classify free problem text.
  const lines = text(claim.problemDescription).split("\n").map((line) => line.trim());
  let names = [];
  if (AREA_PREFIXES.test(lines[0] || "")) {
    const inline = lines[0].replace(AREA_PREFIXES, "").trim();
    if (inline) names = inline.split(",");
    else for (const line of lines.slice(1)) { if (!line) break; names.push(line.split(":")[0]); }
  } else {
    const index = lines.indexOf("Ausgewählte Küchenbereiche:");
    if (index >= 0) for (const line of lines.slice(index + 1)) { if (!line.startsWith("-")) break; names.push(line.slice(1)); }
  }
  return names.map((name) => ({ name: stripProductDimensionsFromLabel(name).trim() })).filter((area) => area.name);
}

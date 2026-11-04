import { ItemType } from "@prisma/client";
import { componentIdForItem, getLinkedComponentIds } from "../components/kitchen-selection-utils.js";
import { isStandaloneCatalogBlendeItem } from "./catalog-pricing.js";
import { stripProductDimensionsFromLabel } from "./product-label-format.js";

const CLAIM_LINKED_COMPONENT_META = {
  "component-extractor-hood": {
    code: "HOOD-B-FH664621E",
    articleCode: "FH664621E",
    name: "Extractor Hood",
    nameDe: "Flachschirmhaube",
  },
  "component-under-cabinet-light": {
    code: "ACC-LIGHT-003",
    name: "LED Lighting Set",
    nameDe: "LED-Beleuchtungsset",
  },
};

const CLAIM_COMPONENT_LABEL_OVERRIDES = {
  "component-sink-faucet": "Sink",
};

const CLAIM_BLENDE_COMPONENT_PREFIX = "component-claim-blende-";
const CLAIM_BLENDE_LABELS_BY_CODE = {
  UPK10: {
    name: "Filler Panel up to 10 cm",
    nameDe: "Passblende bis 10 cm",
  },
  UPK20: {
    name: "Filler Panel up to 20 cm",
    nameDe: "Passblende bis 20 cm",
  },
  UPEF65: {
    name: "Corner filler panel for Lower cabinet",
    nameDe: "Eckpassblende Unterschrank",
  },
};
// These Blenden share one form row with their source cabinet. Most are form-only
// companions; specific plans can still expose a separately clickable surface.
const SERVICE_CLAIM_FILTER_ARTICLE_CODE = "FWK124";
const CLAIM_BLENDE_COMPANION_SOURCE_KEYS_BY_SLUG = {
  // SP120, its sink, faucet and supplied UPK20 are one initial ASC set.
  // The affected-part control can then narrow the claim to any single part.
  "ab-109873": new Set(["sink-base", "base-module-2", "wall-cabinet-5"]),
  // The US30 and its UPK20 share a form row; only the thin PDF-drawn strip is
  // the Blende, while the exposed outer face remains part of the cabinet.
  "ab-105743": new Set(["base-module-1"]),
  // The US50 and its supplied UPK20 share a form row, while their two PDF
  // faces remain independently selectable in the plan.
  "ab-104968": new Set(["base-module-1"]),
  "ab-105734": new Set(["base-module-1"]),
  "ab-105737": new Set(["base-module-1"]),
  "ab-105740": new Set(["base-module-1"]),
  "ab-105805": new Set(["sink-base"]),
  "ab-105809": new Set(["sink-base"]),
  "ab-105813": new Set(["sink-base"]),
  "ab-105817": new Set(["sink-base"]),
  "ab-105822": new Set(["base-module-1"]),
  "ab-105825": new Set(["base-module-1"]),
  "ab-105828": new Set(["base-module-1"]),
  // Both supplied Blenden stay paired with their source lower cabinets in ASC.
  // The left corner UPK20 is a separate kitchen item and is unaffected here.
  "ab-105831": new Set(["base-module-1", "base-module-2"]),
  "ab-105834": new Set(["base-module-3"]),
  // The default inside-corner Blende and the cabinet on its right share the
  // same plan area, so ASC must ask which physical part is affected.
  "ab-110140": new Set(["base-module-2"]),
  "ab-110510": new Set(["base-module-2", "base-module-3", "wall-cabinet-4"]),
  // The UPEF65 stays paired with US40 and the UPK20 stays paired with U30.
  // The sink-run UPK20 is intentionally a separate ASC claim row.
  "ab-111539": new Set(["base-module-1", "base-module-2"]),
};
const CLAIM_PLAN_SELECTABLE_COMPANION_BLENDE_SOURCE_KEYS_BY_SLUG = {
  "ab-109873": new Set(["sink-base", "base-module-2", "wall-cabinet-5"]),
  "ab-105743": new Set(["base-module-1"]),
  "ab-104968": new Set(["base-module-1"]),
  "ab-105734": new Set(["base-module-1"]),
  "ab-105737": new Set(["base-module-1"]),
  "ab-105740": new Set(["base-module-1"]),
  // The UPEF65 is paired with the US60 in the form, but the PDF contains an
  // exact divider and both pieces must remain independently selectable.
  "ab-105831": new Set(["base-module-2"]),
  "ab-110140": new Set(["base-module-2"]),
  "ab-110510": new Set(["base-module-2", "base-module-3", "wall-cabinet-4"]),
  "ab-111539": new Set(["base-module-1", "base-module-2"]),
};
const CLAIM_BLENDE_QUANTITY_OVERRIDES_BY_SLUG = {
  // Both adjacent right-hand strips are independently drawn in this shared plan.
  "ab-105805": { "base-module-2": 2 },
  "ab-105809": { "base-module-2": 2 },
  "ab-105813": { "base-module-2": 2 },
  "ab-105817": { "base-module-2": 2 },
};
const CLAIM_BLENDE_META_OVERRIDES_BY_SLUG = {};
const CLAIM_STANDALONE_BLENDE_SOURCE_KEYS_BY_SLUG = {
  "ab-109955": new Set(["sink-base"]),
  "ab-105745": new Set(["sink-base"]),
  "ab-105748": new Set(["sink-base"]),
  "ab-105751": new Set(["sink-base"]),
  "ab-105754": new Set(["sink-base"]),
  "ab-111539": new Set(["sink-base"]),
};
// Legacy confirmed orders can predate a separately drawn component even when
// its ASC hotspot is present. Expose only the missing drawn target in
// claims; this does not modify the FRG order or its purchased-item snapshot.
const CLAIM_DRAWN_COMPONENT_OVERRIDES_BY_SLUG = {
  // This legacy ASC order does not always retain its optional UPK20 line, but
  // the narrow panel is explicitly drawn and claimable on the source plan.
  "ab-105758": [{
    componentId: "component-sink-end-blende",
    code: "BLENDE-AB105758-SINK-END",
    articleCode: "UPK20",
    name: "Filler Panel up to 20 cm",
    nameDe: "Passblende bis 20 cm",
    componentKey: "sink-end-blende",
  }],
  "ab-105831": [{
    componentId: "component-corner-blende",
    code: "BLENDE-AB105831-CORNER-LEFT",
    articleCode: "UPK20",
    name: "Filler Panel up to 20 cm",
    nameDe: "Passblende bis 20 cm",
    componentKey: "corner-blende",
  }],
};
const CLAIM_INDEPENDENT_BLENDE_QUANTITY_BY_SLUG = {
  "ab-104968": { "base-module-2": 2 },
  "ab-105734": { "base-module-2": 2 },
  "ab-105737": { "base-module-2": 2 },
  "ab-105740": { "base-module-2": 2 },
  // AB 105805 and its perspective variants are intentionally not listed:
  // their two supplied UPK20 pieces form one quantity-two corner-face target.
  "ab-105822": { "base-module-2": 2 },
  "ab-105825": { "base-module-2": 2 },
  "ab-105828": { "base-module-2": 2 },
  "ab-105834": { "base-module-2": 2 },
  "ab-105837": { "base-module-2": 2 },
  "ab-105840": { "base-module-2": 2 },
  "ab-105843": { "base-module-2": 2 },
  "ab-105747": { "base-module-2": 2 },
  "ab-105750": { "base-module-2": 2 },
  "ab-105753": { "base-module-2": 2 },
  "ab-105756": { "base-module-2": 2 },
};
const CLAIM_BLENDE_OVERRIDES_BY_SLUG = {
  // AB 101246 draws a narrow left filler beside both the H10072 and US50.
  // They are claimable parts even though the supplied DEFAULT rows have no Blende metadata.
  "ab-101246": [
    {
      sourceComponentKey: "wall-cabinet-1",
      code: "HP1072K",
      name: "Filler Panel for Upper Cabinet",
      nameDe: "Passblende Hängeschrank",
    },
    {
      sourceComponentKey: "base-module-1",
      code: "UP10K",
      name: "Filler Panel for Lower Cabinet",
      nameDe: "Passblende Unterschrank",
    },
  ],
  // The live AB 105745 kitchen row can predate its UPEF65 metadata. The panel
  // is visibly drawn beside the sink cabinet and must exist independently in claims.
  "ab-105745": [
    {
      sourceComponentKey: "sink-base",
      code: "UPEF65",
      name: "UPEF65 Corner Filler Panel",
      nameDe: "UPEF65 Eckpassblende",
    },
  ],
  "ab-105748": [
    {
      sourceComponentKey: "sink-base",
      code: "UPEF65",
      name: "UPEF65 Corner Filler Panel",
      nameDe: "UPEF65 Eckpassblende",
    },
  ],
  "ab-105751": [
    {
      sourceComponentKey: "sink-base",
      code: "UPEF65",
      name: "UPEF65 Corner Filler Panel",
      nameDe: "UPEF65 Eckpassblende",
    },
  ],
  "ab-105754": [
    {
      sourceComponentKey: "sink-base",
      code: "UPEF65",
      name: "UPEF65 Corner Filler Panel",
      nameDe: "UPEF65 Eckpassblende",
    },
  ],
  // The left end panel beside the US30 is drawn in this shared layout, but
  // legacy KitchenItem data did not retain its commercial UPK20 reference.
  "ab-105822": [
    {
      sourceComponentKey: "base-module-1",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105825": [
    {
      sourceComponentKey: "base-module-1",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105828": [
    {
      sourceComponentKey: "base-module-1",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  // These lower-right UPK20 strips are drawn in the plans but are not attached
  // to the locked sink cabinet in the commercial kitchen item data.
  "ab-105823": [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105826": [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105829": [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  "ab-105832": [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ],
  // This separately drawn upper-right HPK2002 face is present in the shared
  // perspective plan even though the legacy kitchen item has no Blende fields.
  "ab-105837": [
    {
      sourceComponentKey: "wall-cabinet-3",
      code: "HPK2002",
      name: "HPK2002 Filler Panel",
      nameDe: "HPK2002 Passblende",
    },
  ],
  "ab-105840": [
    {
      sourceComponentKey: "wall-cabinet-3",
      code: "HPK2002",
      name: "HPK2002 Filler Panel",
      nameDe: "HPK2002 Passblende",
    },
  ],
  "ab-105843": [
    {
      sourceComponentKey: "wall-cabinet-3",
      code: "HPK2002",
      name: "HPK2002 Filler Panel",
      nameDe: "HPK2002 Passblende",
    },
  ],
  "ab-110140": [
    {
      sourceComponentKey: "base-module-2",
      code: "UPEF65",
      name: "Corner filler panel for Lower cabinet",
      nameDe: "Eckpassblende Unterschrank",
    },
  ],
  // UE115 includes a narrow structural panel at the inside corner. It is not
  // a separately purchasable item, but it must be selectable apart in ASC.
  "ab-110401": [
    {
      sourceComponentKey: "base-module-3",
      code: "UPEF65",
      name: "Corner filler panel for Lower cabinet",
      nameDe: "Eckpassblende Unterschrank",
    },
  ],
};

// These PDF families draw a lower UPK20 beside the locked sink cabinet, but
// the legacy database rows predate the Blende metadata. Expose the drawn part
// only in claims, leaving the commercial kitchen item unchanged.
for (const slug of [
  "ab-105732", "ab-105735", "ab-105738", "ab-105741",
  "ab-105746", "ab-105749", "ab-105752", "ab-105755",
]) {
  CLAIM_BLENDE_OVERRIDES_BY_SLUG[slug] = [
    {
      sourceComponentKey: "sink-base",
      code: "UPK20",
      name: "UPK20 Filler Panel",
      nameDe: "UPK20 Passblende",
    },
  ];
}

function normalizeClaimBlendeCode(value) {
  return String(value || "").trim().replace(/\s+x\s*\d+$/i, "").trim();
}

function normalizeClaimArticlePartCode(value) {
  return normalizeClaimBlendeCode(value)
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isFlatScreenHoodCabinet(item = {}) {
  if (!String(item.code || "").trim().toUpperCase().startsWith("CAB-HOOD-")) {
    return false;
  }
  const articleCodes = String(item.articleNumber || item.articleCode || "")
    .split("+")
    .map((part) => part.trim().toUpperCase());
  return articleCodes.includes("FH664621E")
    && articleCodes.includes(SERVICE_CLAIM_FILTER_ARTICLE_CODE)
    && (articleCodes.includes("HD6002") || articleCodes.includes("HFLH6072"));
}

function getClaimBlendeQuantity(item = {}, resolvedCode = "") {
  const explicit = Number.parseInt(String(item.catalogBlendeQuantity || ""), 10);
  const rawCode = normalizeClaimBlendeCode(item.blendeCode).toUpperCase();
  const catalogCode = normalizeClaimBlendeCode(item.catalogBlende?.code).toUpperCase();
  const normalizedResolvedCode = String(resolvedCode || "").trim().toUpperCase();
  const catalogMatchesSavedBlende = !rawCode || !catalogCode || rawCode === catalogCode;
  if (
    Number.isFinite(explicit)
    && explicit > 0
    && catalogMatchesSavedBlende
    && (!normalizedResolvedCode || catalogCode === normalizedResolvedCode)
  ) return explicit;
  const match = `${item.blendeCode || ""} ${item.blendeLabel || ""}`.match(/\bx\s*(\d+)\b/i);
  return Math.max(1, Number.parseInt(match?.[1] || "1", 10) || 1);
}

function claimBlendeComponentId(componentKey) {
  const normalizedKey = String(componentKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalizedKey ? `${CLAIM_BLENDE_COMPONENT_PREFIX}${normalizedKey}` : "";
}

function buildClaimBlendeMeta(item = {}) {
  // A standalone filler is already its own selectable component. Its catalog
  // Blende relation describes that item; it must not create a second,
  // claims-only Blende attached to itself.
  if (isStandaloneCatalogBlendeItem(item)) return null;

  const componentKey = String(item.componentKey || "").trim();
  const savedCode = normalizeClaimBlendeCode(item.blendeCode);
  const catalogCode = normalizeClaimBlendeCode(item.catalogBlende?.code);
  const code = savedCode || catalogCode;
  const componentId = claimBlendeComponentId(componentKey);
  if (!componentId || !code) return null;
  const defaultLabels = CLAIM_BLENDE_LABELS_BY_CODE[code] || {};
  const catalogMatchesSavedBlende = !savedCode || !catalogCode
    || savedCode.toUpperCase() === catalogCode.toUpperCase();

  return {
    componentId,
    code,
    articleCode: code,
    name: String((catalogMatchesSavedBlende && item.catalogBlende?.name) || defaultLabels.name || item.blendeLabel || `${code} Filler Panel`).trim(),
    nameDe: String((catalogMatchesSavedBlende && item.catalogBlende?.nameDe) || defaultLabels.nameDe || item.blendeLabel || `${code} Passblende`).trim(),
    componentKey: `claim-blende-${componentKey}`,
    sourceComponentKey: componentKey,
    sourceKitchenItemCode: String(item.code || "").trim(),
    sourceWidthMm: Number(item.widthMm) || null,
    claimPartKey: "blende",
    blendeQuantity: getClaimBlendeQuantity(item, code),
  };
}

export const SERVICE_CLAIM_PART_COMPONENT_IDS = {
  sink: "component-claim-sink",
  "sink-cabinet": "component-claim-sink-cabinet",
  faucet: "component-claim-faucet",
  oven: "component-claim-oven",
  "oven-set": "component-claim-oven-set",
  "oven-drawer": "component-claim-oven-drawer",
  cooktop: "component-claim-cooktop",
  dishwasher: "component-claim-dishwasher",
  "furniture-front": "component-claim-furniture-front",
  filter: "component-claim-filter",
  "worktop-left": "component-claim-worktop-left",
  "worktop-right": "component-claim-worktop-right",
  "worktop-end-panel": "component-claim-worktop-end-panel",
  "worktop-end-panel-left": "component-claim-worktop-end-panel-left",
  "worktop-end-panel-right": "component-claim-worktop-end-panel-right",
};

export function getServiceClaimPartComponentId(part = {}) {
  const partKey = String(part?.partKey || "").trim();
  const fixedComponentId = SERVICE_CLAIM_PART_COMPONENT_IDS[partKey];
  if (fixedComponentId) return fixedComponentId;

  // Housing articles use their own claim identities; all faces belonging to
  // one supplied article share its part key and produce a single form row.
  if (partKey.startsWith("housing-")) {
    return `component-claim-${partKey}`;
  }

  // DEFAULT Uxx cabinets are claim-only products without a commercial price.
  // Reuse their existing kitchen component identity so claim metadata never
  // creates a duplicate form row or a second hotspot in ASC.
  if (partKey.startsWith("cabinet-")) {
    return componentIdForItem({
      componentKey: String(part?.sourceComponentKey || "").trim(),
    });
  }

  return "";
}

const ADDITIVE_SERVICE_CLAIM_PART_KEYS = new Set([
  // This panel is sold with the worktop but remains independently selectable
  // in claims. It must not replace the existing horizontal worktop selector.
  "worktop-end-panel",
  "worktop-end-panel-left",
  "worktop-end-panel-right",
  // The filter is physically inside the hood cabinet and has no useful plan
  // hotspot. It is selected manually without replacing the cabinet target.
  "filter",
  // The furniture front remains additive: ASC draws it independently from
  // the appliance basket/GS symbols without replacing the source assembly.
  "furniture-front",
]);

// These plans place the floor-height WU16 panel at the left worktop run.
// Other split L-kitchen plans place it at the right-hand end.
const LEFT_WORKTOP_END_PANEL_KITCHEN_SLUGS = new Set([
  "ab-105804",
  "ab-105793",
  "ab-105796",
  "ab-105799",
  "ab-105802",
  "ab-105805",
  "ab-105809",
  "ab-105813",
  "ab-105817",
  "ab-105833",
  "ab-105836",
  "ab-105839",
  "ab-105842",
]);

const SERVICE_CLAIM_LINKED_COMPONENT_GROUPS_BY_SLUG = {
  // US90 has two adjacent 45 cm fronts but is one commercial cabinet. Keep
  // both faces synchronized in ASC and collapse them to one claim form row.
  "ab-109873": [[
    "component-base-module-2",
    "component-base-module-3",
  ], [
    "component-wall-cabinet-5",
    "component-wall-cabinet-6",
  ]],
  // H9002 is drawn as two adjacent 45 cm fronts but is one 90 cm cabinet.
  "ab-110401": [[
    "component-wall-cabinet-2",
    "component-wall-cabinet-3",
  ]],
  // H8002 is drawn as two adjacent 40 cm fronts but is one 80 cm cabinet.
  "ab-110402": [[
    "component-wall-cabinet-4",
    "component-wall-cabinet-5",
  ]],
  // Burger 103898 draws the hood cabinet, extractor and its two LED symbols as
  // one supplied assembly. Keep all three claim targets in sync when any face
  // of that assembly is clicked, hovered, or removed.
  "ab-104332": [["component-wall-cabinet-2", "component-extractor-hood", "component-under-cabinet-light"]],
  "burger-103898": [[
    "component-wall-cabinet-2",
    "component-extractor-hood",
    "component-under-cabinet-light",
  ]],
  // These kitchens share two adjacent UPK20 strips at the same inside corner.
  // Keep their individual PDF-matched hotspots, but treat each pair as one
  // interaction so clicking either strip selects both.
  "ab-105822": [[
    "component-claim-blende-base-module-2",
    "component-claim-blende-base-module-2-2",
  ]],
  "ab-105825": [[
    "component-claim-blende-base-module-2",
    "component-claim-blende-base-module-2-2",
  ]],
  "ab-105828": [[
    "component-claim-blende-base-module-2",
    "component-claim-blende-base-module-2-2",
  ]],
  "ab-105834": [[
    "component-claim-blende-base-module-2",
    "component-claim-blende-base-module-2-2",
  ]],
  "ab-105837": [[
    "component-claim-blende-base-module-2",
    "component-claim-blende-base-module-2-2",
  ]],
  "ab-105840": [[
    "component-claim-blende-base-module-2",
    "component-claim-blende-base-module-2-2",
  ]],
  "ab-105843": [[
    "component-claim-blende-base-module-2",
    "component-claim-blende-base-module-2-2",
  ]],
};

export function getServiceClaimLinkedComponentIds(kitchenSlug, componentId) {
  const normalizedSlug = String(kitchenSlug || "").trim().toLowerCase();
  const normalizedComponentId = String(componentId || "").trim();
  const linkedGroup = (SERVICE_CLAIM_LINKED_COMPONENT_GROUPS_BY_SLUG[normalizedSlug] || [])
    .find((group) => group.includes(normalizedComponentId));

  return linkedGroup ? [...linkedGroup] : [componentId];
}

/**
 * Store one stable, canonical id for each commercial component that is drawn
 * with multiple linked faces. The plan may still expand that id back to every
 * face for painting, while contextual part choices (for example a filler
 * panel) can replace the complete component without leaving a second face
 * selected in form state.
 */
export function normalizeServiceClaimLinkedComponentSelection(
  kitchenSlug,
  componentIds = [],
) {
  const seenIds = new Set();
  const normalizedIds = [];

  for (const componentId of componentIds || []) {
    const linkedIds = getServiceClaimLinkedComponentIds(kitchenSlug, componentId);
    const normalizedId = linkedIds[0] || componentId;
    if (seenIds.has(normalizedId)) continue;
    seenIds.add(normalizedId);
    normalizedIds.push(normalizedId);
  }

  return normalizedIds;
}

export function updateServiceClaimLinkedComponentSelection({
  kitchenSlug,
  currentIds = [],
  componentId,
  isSelected,
  allowedComponentIds = [],
}) {
  const allowedIds = new Set(allowedComponentIds || []);
  const linkedIds = getServiceClaimLinkedComponentIds(kitchenSlug, componentId)
    .filter((id) => !allowedIds.size || allowedIds.has(id));
  const affectedIds = new Set(linkedIds.length ? linkedIds : [componentId]);
  const remainingIds = (currentIds || []).filter((id) => (
    (!allowedIds.size || allowedIds.has(id)) && !affectedIds.has(id)
  ));

  return isSelected ? [...remainingIds, ...affectedIds] : remainingIds;
}

export function collapseServiceClaimLinkedComponents(kitchenSlug, components = []) {
  const seenGroups = new Set();

  return (components || []).filter((component) => {
    const linkedIds = getServiceClaimLinkedComponentIds(kitchenSlug, component?.componentId);
    const groupKey = linkedIds.join("\u0000");
    if (seenGroups.has(groupKey)) return false;
    seenGroups.add(groupKey);
    return true;
  });
}

function resolveServiceClaimComponentName(componentId, meta = {}) {
  const override = CLAIM_COMPONENT_LABEL_OVERRIDES[componentId];
  if (override) {
    return override;
  }

  if (String(meta.code || "").trim().toUpperCase().startsWith("CAB-HOOD-")) {
    return "Cabinet";
  }

  const name = String(meta.name || meta.code || componentId).trim() || meta.code || componentId;
  const articleNumber = String(meta.articleNumber || meta.articleCode || "").toUpperCase();
  const claimName = articleNumber.includes(SERVICE_CLAIM_FILTER_ARTICLE_CODE)
    ? name.replace(/\s*\+\s*filter\b/gi, "").replace(/\s{2,}/g, " ").trim()
    : name;
  return stripProductDimensionsFromLabel(claimName);
}

function resolveServiceClaimComponentNameDe(componentId, meta = {}) {
  if (String(meta.code || "").trim().toUpperCase().startsWith("CAB-HOOD-")) {
    return "Schrank";
  }

  return stripProductDimensionsFromLabel(
    String(meta.nameDe || meta.name || meta.code || componentId).trim(),
  ) || meta.code || componentId;
}

function resolveServiceClaimArticleCode(meta = {}, kitchenSlug = "") {
  if (
    String(kitchenSlug || "").trim().toLowerCase() === "ab-101246"
    && String(meta.componentKey || "").trim().toLowerCase() === "worktop"
  ) {
    return "AP60";
  }
  const articleNumber = String(meta.articleNumber || meta.articleCode || "").trim();
  if (articleNumber) {
    const attachedBlendeCode = normalizeClaimArticlePartCode(
      meta.blendeCode || meta.catalogBlende?.code,
    );
    const articleParts = articleNumber.split("+").map((part) => {
      const trimmedPart = part.trim();
      return trimmedPart.replace(/\s+/g, "").toUpperCase() === "FH664621E"
        ? "FH664621E"
        : trimmedPart;
    }).filter((part) => (
      Boolean(part)
      && (!attachedBlendeCode || normalizeClaimArticlePartCode(part) !== attachedBlendeCode)
    ));
    if (String(meta.code || "").trim().toUpperCase().startsWith("CAB-HOOD-")) {
      const cabinetArticle = articleParts.find((part) => /^(?:HD\d+|HFLH\d+)$/i.test(part));
      if (cabinetArticle) return cabinetArticle;
    }
    const withoutFilter = articleParts.filter(
      (part) => part.toUpperCase() !== SERVICE_CLAIM_FILTER_ARTICLE_CODE,
    );
    return withoutFilter.length ? withoutFilter.join(" + ") : articleNumber;
  }

  if (String(meta.componentKey || "").trim().toLowerCase() === "worktop") {
    return "PLR60";
  }

  return String(meta.code || "").trim();
}

export function buildServiceClaimComponentMetaById(kitchen, kitchenConfig, kitchenSlug = kitchen?.slug) {
  const componentMetaById = new Map();

  for (const item of kitchen?.items || []) {
    if (item.itemType !== ItemType.COMPONENT) {
      continue;
    }
    const componentId = componentIdForItem(item);
    if (!componentId) {
      continue;
    }
    componentMetaById.set(componentId, {
      code: String(item.code || "").trim(),
      articleCode: resolveServiceClaimArticleCode(item, kitchenSlug),
      name: resolveServiceClaimComponentName(componentId, item),
      nameDe: resolveServiceClaimComponentNameDe(componentId, item),
      componentKey: String(item.componentKey || "").trim(),
    });
  }

  for (const comp of kitchenConfig?.components || []) {
    const componentId = componentIdForItem(comp);
    if (!componentId || componentMetaById.has(componentId)) {
      continue;
    }
    componentMetaById.set(componentId, {
      code: String(comp.code || "").trim(),
      articleCode: resolveServiceClaimArticleCode(comp, kitchenSlug),
      name: resolveServiceClaimComponentName(componentId, comp),
      nameDe: resolveServiceClaimComponentNameDe(componentId, comp),
      componentKey: String(comp.componentKey || "").trim(),
    });
  }

  return componentMetaById;
}

export function buildServiceClaimSelectableComponents({
  kitchen,
  kitchenConfig,
  kitchenSlug,
  confirmedItems = [],
  claimParts = [],
}) {
  const componentMetaById = buildServiceClaimComponentMetaById(kitchen, kitchenConfig, kitchenSlug);
  const selectableIds = new Set();
  const selectableMetaIds = new Set();
  const selectableMeta = [];
  const confirmedComponentCodes = new Set();
  const confirmedKitchenItemIds = new Set();

  for (const item of confirmedItems || []) {
    if (item?.itemType !== ItemType.COMPONENT) {
      continue;
    }

    const code = String(item.code || "").trim();
    if (code) {
      confirmedComponentCodes.add(code);
    }
    if (item.kitchenItemId) {
      confirmedKitchenItemIds.add(item.kitchenItemId);
    }
    if (item.kitchenItem?.id) {
      confirmedKitchenItemIds.add(item.kitchenItem.id);
    }
  }

  function isDefaultOrConfirmedComponent(item) {
    if (item?.itemType !== ItemType.COMPONENT) {
      return false;
    }
    if (item.isLocked) {
      return true;
    }

    const code = String(item.code || "").trim();
    return (code && confirmedComponentCodes.has(code)) || confirmedKitchenItemIds.has(item.id);
  }

  function addSelectableMeta(componentId, fallbackMeta = {}) {
    if (!componentId || selectableMetaIds.has(componentId)) {
      return;
    }

    selectableMetaIds.add(componentId);
    const resolvedMeta = componentMetaById.get(componentId) || {};
    const code = String(resolvedMeta.code || fallbackMeta.code || "").trim();
    const articleCode = String(
      resolvedMeta.articleCode
      || fallbackMeta.articleCode
      || code,
    ).trim();
    const name = resolveServiceClaimComponentName(componentId, {
      code,
      name: resolvedMeta.name || fallbackMeta.name,
    });
    const nameDe = resolveServiceClaimComponentNameDe(componentId, {
      code,
      name: resolvedMeta.name || fallbackMeta.name,
      nameDe: resolvedMeta.nameDe || fallbackMeta.nameDe,
    });

    selectableMeta.push({
      componentId,
      code,
      articleCode,
      name,
      nameDe,
      componentKey: String(resolvedMeta.componentKey || fallbackMeta.componentKey || "").trim(),
    });
  }

  function addSelectableComponent(componentId, fallbackMeta = {}) {
    if (!componentId) {
      return;
    }

    const linkedIds = [
      ...new Set(
        getLinkedComponentIds(kitchenSlug, componentId).flatMap((linkedId) =>
          getServiceClaimLinkedComponentIds(kitchenSlug, linkedId),
        ),
      ),
    ];
    linkedIds.forEach((linkedId) => {
      selectableIds.add(linkedId);
      addSelectableMeta(linkedId, linkedId === componentId
        ? fallbackMeta
        : CLAIM_LINKED_COMPONENT_META[linkedId]);
    });
  }

  const sourceItems = (kitchen?.items || [])
    .filter(isDefaultOrConfirmedComponent)
    .map((item) => ({
      item,
      fallbackMeta: {
        code: String(item.code || "").trim(),
        articleCode: resolveServiceClaimArticleCode(item),
        name: resolveServiceClaimComponentName(componentIdForItem(item), item),
        nameDe: resolveServiceClaimComponentNameDe(componentIdForItem(item), item),
        componentKey: String(item.componentKey || "").trim(),
      },
    }));
  const sourceItemCodes = new Set(
    sourceItems.map(({ item }) => String(item.code || "").trim()).filter(Boolean),
  );
  const sourceComponentKeys = new Set(
    sourceItems.map(({ item }) => String(item.componentKey || "").trim()).filter(Boolean),
  );

  function isClaimPartSourceSelectable(part = {}) {
    const sourceKitchenItemCode = String(part?.sourceKitchenItemCode || "").trim();
    const sourceComponentKey = String(part?.sourceComponentKey || "").trim();
    if (sourceKitchenItemCode) {
      return sourceItemCodes.has(sourceKitchenItemCode);
    }
    if (sourceComponentKey && sourceComponentKeys.has(sourceComponentKey)) {
      return true;
    }
    return !sourceKitchenItemCode && !sourceComponentKey;
  }

  const eligibleClaimParts = (claimParts || []).filter(isClaimPartSourceSelectable);

  const blendeQuantityOverrides = CLAIM_BLENDE_QUANTITY_OVERRIDES_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || {};
  const independentBlendeQuantities = CLAIM_INDEPENDENT_BLENDE_QUANTITY_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || {};
  const companionBlendeSourceKeys = CLAIM_BLENDE_COMPANION_SOURCE_KEYS_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || new Set();
  const planSelectableCompanionBlendeSourceKeys =
    CLAIM_PLAN_SELECTABLE_COMPANION_BLENDE_SOURCE_KEYS_BY_SLUG[
      String(kitchenSlug || "").toLowerCase()
    ] || new Set();
  const blendeMetaOverrides = CLAIM_BLENDE_META_OVERRIDES_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || {};
  const standaloneBlendeSourceKeys = CLAIM_STANDALONE_BLENDE_SOURCE_KEYS_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || new Set();
  const claimBlenden = sourceItems
    .map(({ item }) => buildClaimBlendeMeta(item))
    .filter(Boolean)
    .map((entry) => {
      const quantity = Number(blendeQuantityOverrides[entry.sourceComponentKey] || 0);
      return quantity > 0 && entry.code.toUpperCase() === "UPK20"
        ? { ...entry, blendeQuantity: quantity }
        : entry;
    })
    .map((entry) => (
      companionBlendeSourceKeys.has(entry.sourceComponentKey)
        ? {
          ...entry,
          isCompanionOption: true,
          ...(planSelectableCompanionBlendeSourceKeys.has(entry.sourceComponentKey)
            ? { isPlanSelectableCompanion: true }
            : {}),
        }
        : entry
    ))
    .map((entry) => (
      standaloneBlendeSourceKeys.has(entry.sourceComponentKey)
        ? { ...entry, isStandaloneClaimOption: true }
        : entry
    ))
    .flatMap((entry) => {
      const quantity = entry.code.toUpperCase() === "UPK20"
        ? Number(independentBlendeQuantities[entry.sourceComponentKey] || 0)
        : 1;
      if (quantity <= 1) return [entry];
      return Array.from({ length: quantity }, (_, index) => ({
        ...entry,
        componentId: index === 0 ? entry.componentId : `${entry.componentId}-${index + 1}`,
        componentKey: index === 0 ? entry.componentKey : `${entry.componentKey}-${index + 1}`,
        blendeIndex: index + 1,
      }));
    })
    .map((entry) => {
      const override = blendeMetaOverrides[entry.sourceComponentKey];
      return override
        ? { ...entry, ...override, articleCode: override.code }
        : entry;
    });
  const claimBlendeSourceKeys = new Set(claimBlenden.map((entry) => entry.sourceComponentKey));
  const sourceItemByComponentKey = new Map(
    sourceItems.map(({ item }) => [String(item.componentKey || "").trim(), item]),
  );
  (CLAIM_BLENDE_OVERRIDES_BY_SLUG[String(kitchenSlug || "").toLowerCase()] || []).forEach((override) => {
    const sourceItem = sourceItemByComponentKey.get(override.sourceComponentKey);
    if (!sourceItem || claimBlendeSourceKeys.has(override.sourceComponentKey)) return;
    const meta = buildClaimBlendeMeta({
      ...sourceItem,
      blendeCode: override.code,
      blendeLabel: override.name,
      catalogBlende: {
        code: override.code,
        name: override.name,
        nameDe: override.nameDe,
      },
    });
    if (meta) {
      const resolvedMeta = {
        ...meta,
        ...(companionBlendeSourceKeys.has(meta.sourceComponentKey)
          ? {
            isCompanionOption: true,
            ...(planSelectableCompanionBlendeSourceKeys.has(meta.sourceComponentKey)
              ? { isPlanSelectableCompanion: true }
              : {}),
          }
          : {}),
        ...(standaloneBlendeSourceKeys.has(meta.sourceComponentKey)
          ? { isStandaloneClaimOption: true }
          : {}),
      };
      claimBlenden.push(resolvedMeta);
      claimBlendeSourceKeys.add(resolvedMeta.sourceComponentKey);
    }
  });
  // AB 101246 claim catalog parts replace the identity of its two included
  // cabinet fillers without changing the kitchen/order catalog items.
  eligibleClaimParts
    .filter((part) => String(kitchenSlug || "").trim().toLowerCase() === "ab-101246"
      && String(part?.partKey || "").startsWith("blende-"))
    .forEach((part) => {
      const sourceComponentKey = String(part.sourceComponentKey || "").trim();
      const sourceItem = sourceItemByComponentKey.get(sourceComponentKey);
      const articleCode = String(part.articleCode || "").trim();
      if (!sourceItem || !articleCode) return;
      const meta = buildClaimBlendeMeta({
        ...sourceItem,
        blendeCode: articleCode,
        blendeLabel: part.name,
        catalogBlende: {
          code: articleCode,
          name: part.name,
          nameDe: part.nameDe,
        },
      });
      if (!meta) return;
      const existingIndex = claimBlenden.findIndex((entry) => entry.sourceComponentKey === sourceComponentKey);
      if (existingIndex >= 0) claimBlenden.splice(existingIndex, 1, meta);
      else claimBlenden.push(meta);
    });

  for (const entry of sourceItems) {
    const componentId = componentIdForItem(entry.item);
    if (!componentId) {
      continue;
    }
    addSelectableComponent(componentId, entry.fallbackMeta);
    // Older and newly imported kitchen slugs are not all present in the
    // configurator's static linked-component map. Detect the commercial hood
    // bundle itself so its extractor is always available as a separate claim.
    if (isFlatScreenHoodCabinet(entry.item)) {
      addSelectableComponent(
        "component-extractor-hood",
        CLAIM_LINKED_COMPONENT_META["component-extractor-hood"],
      );
    }
  }

  (CLAIM_DRAWN_COMPONENT_OVERRIDES_BY_SLUG[
    String(kitchenSlug || "").toLowerCase()
  ] || []).forEach(({ componentId, ...fallbackMeta }) => {
    addSelectableComponent(componentId, fallbackMeta);
  });

  const separatedSourceComponentIds = new Set(
    eligibleClaimParts
      .filter((part) => !ADDITIVE_SERVICE_CLAIM_PART_KEYS.has(String(part?.partKey || "").trim()))
      .filter((part) => getServiceClaimPartComponentId(part))
      .map((part) => componentIdForItem({ componentKey: part?.sourceComponentKey }))
      .filter(Boolean),
  );
  const hasSplitWorktopClaimParts = eligibleClaimParts.some(
    (part) => String(part?.partKey || "").trim() === "worktop-left",
  ) && eligibleClaimParts.some(
    (part) => String(part?.partKey || "").trim() === "worktop-right",
  );
  const normalizedKitchenSlug = String(kitchenSlug || "").trim().toLowerCase();
  const hiddenLinkedClaimFaceIds = new Set({
    "ab-109873": ["component-base-module-1"],
    // These ids are only the second drawn face of the commercial SPB cabinet.
    // The sink-cabinet claim part owns both faces and must produce one row.
    "ab-110401": ["component-base-module-2"],
    "ab-110402": ["component-base-module-2"],
  }[normalizedKitchenSlug] || []);
  // The end panel belongs to the right block in 105790, regardless of
  // whether both separate worktop claim parts are present in the input.
  const worktopEndPanelChoicePartKey = normalizedKitchenSlug === "ab-105790"
    ? "worktop-right"
    : hasSplitWorktopClaimParts
    ? LEFT_WORKTOP_END_PANEL_KITCHEN_SLUGS.has(normalizedKitchenSlug)
      ? "worktop-left"
      : "worktop-right"
    : "worktop";
  const separatedClaimParts = eligibleClaimParts
    .map((part) => {
      const partKey = String(part?.partKey || "").trim();
      const componentId = getServiceClaimPartComponentId(part);
      if (!componentId) {
        return null;
      }

      return {
        componentId,
        code: String(part?.articleCode || part?.sourceKitchenItemCode || "").trim(),
        articleCode: String(part?.articleCode || "").trim(),
        sourceKitchenItemCode: String(part?.sourceKitchenItemCode || "").trim(),
        name: String(part?.name || partKey).trim(),
        nameDe: String(part?.nameDe || "").trim(),
        componentKey: String(part?.sourceComponentKey || "").trim(),
        claimPartKey: partKey,
        ...(partKey === "worktop-end-panel"
          ? { contextualChoiceTriggerPartKey: worktopEndPanelChoicePartKey }
          : partKey === "worktop-end-panel-right"
          ? { contextualChoiceTriggerPartKey: "worktop-right" }
          : partKey === "worktop-end-panel-left"
          ? { contextualChoiceTriggerPartKey: "worktop-left" }
          : {}),
      };
    })
    .filter(Boolean);

  const separatedClaimPartIds = new Set(separatedClaimParts.map((part) => part.componentId));
  const resolvedSelectableIds = [
    ...[...selectableIds].filter((componentId) => (
      !separatedSourceComponentIds.has(componentId)
      && !hiddenLinkedClaimFaceIds.has(componentId)
    )),
    ...separatedClaimParts.map((part) => part.componentId),
    ...claimBlenden.map((blende) => blende.componentId),
  ];
  const resolvedSelectableMeta = [
    ...selectableMeta.filter((entry) => (
      !separatedSourceComponentIds.has(entry.componentId)
      && !hiddenLinkedClaimFaceIds.has(entry.componentId)
    )),
    ...separatedClaimParts,
    ...claimBlenden,
  ].filter((entry) => resolvedSelectableIds.includes(entry.componentId) || separatedClaimPartIds.has(entry.componentId));

  return {
    selectableComponentIds: resolvedSelectableIds,
    selectableComponents: resolvedSelectableMeta,
    visibleComponentIds: [...selectableIds],
    source: "kitchen",
  };
}

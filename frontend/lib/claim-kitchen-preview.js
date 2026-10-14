import { buildServiceClaimDishwasherSvgOverlay } from "./service-claim-dishwasher-masks.js";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { normalizeReferencePlanMarkerAppearance } from "./reference-plan-marker-appearance.js";
import { componentIdForItem } from "../components/kitchen-selection-utils.js";
import { getKitchenBySlug, serializeKitchenForLegacy } from "./catalog.js";
import { PLAN_HOTSPOTS_BY_SLUG, PLAN_IMAGE_BY_SLUG } from "./kitchen-plan-preview-data.js";
import { withBasePlinthExtension } from "./kitchen-plan-plinth.js";
import { loadKitchenSvgMarkup } from "./load-kitchen-svg.js";
import { parseServiceClaimProblemAreas } from "./service-claim-problem-areas.js";
import {
  buildServiceClaimBlendeHotspots,
  buildServiceClaimPartHotspots,
  isLShapedClaimKitchen,
} from "./service-claim-kitchen-hotspots.js";

import { REFERENCE_PLAN_EMAIL_DISPLAY_WIDTH } from "./email/claim-notification-layout.js";
export { REFERENCE_PLAN_EMAIL_DISPLAY_WIDTH };
export const REFERENCE_PLAN_EMAIL_PIXEL_RATIO = 2;
const REFERENCE_PLAN_MARKER_MAX_DIAMETER = 30 / 850;

export const PREVIEW_HIGHLIGHT_BOUNDS_BY_SLUG = {
  "kitchen-model-b": {
    "wall-cabinet-1": { x: 239, y: 214, width: 84, height: 118 },
    "wall-cabinet-2": { x: 322, y: 214, width: 84, height: 118 },
    "wall-cabinet-3": { x: 405, y: 214, width: 84, height: 118 },
    "wall-cabinet-4": { x: 488, y: 214, width: 84, height: 118 },
    "wall-cabinet-5": { x: 571, y: 214, width: 84, height: 118 },
    "extractor-hood": { x: 488, y: 314, width: 84, height: 14 },
    "under-cabinet-light": { x: 270, y: 319, width: 287, height: 18 },
    "base-module-1": { x: 237, y: 393, width: 86, height: 127 },
    "base-module-2": { x: 322, y: 393, width: 84, height: 127 },
    "base-module-3": { x: 405, y: 393, width: 84, height: 127 },
    "oven-module": { x: 488, y: 393, width: 84, height: 127 },
    "drawer-module": { x: 571, y: 393, width: 84, height: 127 },
    refrigerator: { x: 670, y: 270, width: 76, height: 250 },
    "sink-faucet": { x: 374, y: 364, width: 14, height: 33 },
    worktop: { x: 236, y: 392, width: 421, height: 7 },
  },
  "kitchen-model-c": {
    refrigerator: { x: 119, y: 220, width: 70, height: 220 },
    "extractor-hood": { x: 276, y: 189, width: 68, height: 48 },
    "wall-cabinet-1": { x: 470, y: 185, width: 72, height: 72 },
    "wall-cabinet-2": { x: 542, y: 185, width: 72, height: 72 },
    "wall-cabinet-3": { x: 614, y: 185, width: 72, height: 72 },
    "wall-cabinet-4": { x: 686, y: 185, width: 72, height: 72 },
    "under-cabinet-light": { x: 534, y: 262, width: 160, height: 15 },
    "cook-base-left": { x: 205, y: 338, width: 70, height: 97 },
    "oven-base": { x: 275, y: 338, width: 70, height: 97 },
    "cook-base-right": { x: 345, y: 338, width: 70, height: 97 },
    "wm-base": { x: 470, y: 338, width: 72, height: 97 },
    "sink-base": { x: 542, y: 338, width: 72, height: 97 },
    "dishwasher-base": { x: 614, y: 338, width: 72, height: 97 },
    "drawer-base-3": { x: 686, y: 338, width: 72, height: 97 },
    worktop: { x: 205, y: 338, width: 553, height: 3 },
    "sink-faucet": { x: 569, y: 302, width: 18, height: 28 },
  },
};

function normalizeKitchenSlug(kitchenSlug) {
  return String(kitchenSlug || "").trim().toLowerCase();
}

function inferKitchenSlugFromAreaCode(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) {
    return "";
  }

  if (normalizedCode.startsWith("T3D-")) {
    return "test-3d-kitchen";
  }
  if (
    normalizedCode.includes("-LS-")
    || normalizedCode.startsWith("REF-LS-")
    || normalizedCode.startsWith("SINKBASE-LS-")
    || normalizedCode.startsWith("DISH-LS-")
    || normalizedCode.startsWith("CORNER-LS-")
  ) {
    return "l-shaped-kitchen";
  }
  if (/(?:^|-)B(?:-|$)/.test(normalizedCode)) {
    return "kitchen-model-b";
  }
  if (/(?:^|-)C(?:-|$)/.test(normalizedCode)) {
    return "kitchen-model-c";
  }

  return "";
}

function inferKitchenSlugFromComponentId(componentId) {
  const normalizedComponentId = String(componentId || "").trim().toLowerCase();
  if (!normalizedComponentId) {
    return "";
  }

  if (
    normalizedComponentId === "component-oven-module"
    || normalizedComponentId === "component-base-module-1"
    || normalizedComponentId === "component-base-module-2"
    || normalizedComponentId === "component-base-module-3"
    || normalizedComponentId === "component-drawer-module"
  ) {
    return "kitchen-model-b";
  }
  if (
    normalizedComponentId === "component-oven-base"
    || normalizedComponentId === "component-wm-base"
    || normalizedComponentId === "component-sink-base"
    || normalizedComponentId === "component-dishwasher-base"
    || normalizedComponentId === "component-drawer-base-3"
    || normalizedComponentId === "component-cook-base-left"
    || normalizedComponentId === "component-cook-base-right"
  ) {
    return "kitchen-model-c";
  }
  if (
    normalizedComponentId === "component-corner-base"
    || normalizedComponentId === "component-drawer-base"
  ) {
    return "l-shaped-kitchen";
  }

  return "";
}

export function inferKitchenSlugFromSelectedAreas(selectedAreas = []) {
  const slugs = new Set(
    (Array.isArray(selectedAreas) ? selectedAreas : [])
      .flatMap((area) => [
        inferKitchenSlugFromAreaCode(area?.code),
        inferKitchenSlugFromComponentId(area?.componentId),
      ])
      .filter(Boolean),
  );

  return slugs.size === 1 ? [...slugs][0] : "";
}

/** Keeps the full kitchen as context while fading components that are not part of the client's order. */
export function applyVisibleComponentsToSvgMarkup(markup, visibleComponentIds) {
  if (!markup || !Array.isArray(visibleComponentIds) || !visibleComponentIds.length) {
    return markup || "";
  }

  const visibleSet = new Set(visibleComponentIds);
  return String(markup).replace(/<g\b([^>]*?\bdata-component-id="([^"]+)"[^>]*)>/gi, (match, attrs, componentId) => {
    if (visibleSet.has(componentId)) {
      return match;
    }

    if (/style\s*=/i.test(attrs)) {
      const nextAttrs = attrs.replace(/style=(["'])(.*?)\1/i, (_, quote, value) => {
        const cleaned = value
          .replace(/display\s*:\s*none\s*!?important?;?/gi, "")
          .replace(/opacity\s*:\s*[^;]+;?/gi, "")
          .trim();
        return `style=${quote}${cleaned ? `${cleaned};` : ""}opacity:0.3${quote}`;
      });
      return `<g${nextAttrs}>`;
    }

    return `<g${attrs} style="opacity:0.3">`;
  });
}

export async function resolveVisibleComponentIdsForContract(contractNumber, kitchenSlug) {
  const normalizedContract = String(contractNumber || "").trim();
  const normalizedSlug = normalizeKitchenSlug(kitchenSlug);
  if (!normalizedContract || !normalizedSlug) {
    return null;
  }

  const plan = await import("./service-claim-kitchen-plan.js")
    .then(({ getServiceClaimKitchenPlan }) => getServiceClaimKitchenPlan(normalizedContract))
    .catch(() => null);
  if (!plan || normalizeKitchenSlug(plan.kitchenSlug) !== normalizedSlug) {
    return null;
  }

  const planVisibleComponentIds = Array.isArray(plan.visibleComponentIds)
    ? plan.visibleComponentIds
    : plan.selectableComponentIds;
  const visibleComponentIds = Array.isArray(planVisibleComponentIds)
    ? planVisibleComponentIds.filter(Boolean)
    : [];
  return visibleComponentIds.length ? visibleComponentIds : null;
}

export function enhanceKitchenPreviewSvgMarkup(markup) {
  if (!markup) return "";

  return String(markup).replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    if (/style=/i.test(attrs)) {
      return `<svg${attrs.replace(/style=(["'])(.*?)\1/i, (styleMatch, quote, value) => ` style=${quote}${value};width:100%;height:auto;display:block${quote}`)}>`;
    }

    return `<svg${attrs} style="width:100%;height:auto;display:block">`;
  });
}

const PREVIEW_HIGHLIGHT_STROKE_WIDTH = 2.5;

function buildHighlightMarkup(bounds) {
  const inset = PREVIEW_HIGHLIGHT_STROKE_WIDTH / 2;
  return [
    `<rect x="${bounds.x + inset}" y="${bounds.y + inset}" width="${bounds.width - PREVIEW_HIGHLIGHT_STROKE_WIDTH}" height="${bounds.height - PREVIEW_HIGHLIGHT_STROKE_WIDTH}"`,
    ` rx="8" ry="8" fill="rgba(176, 90, 50, 0.08)" stroke="#8f3e2c" stroke-width="${PREVIEW_HIGHLIGHT_STROKE_WIDTH}"`,
    ` vector-effect="non-scaling-stroke" pointer-events="none"/>`,
  ].join("");
}

export function buildKitchenPreviewSvgMarkup({
  svgMarkup,
  kitchenSlug,
  highlightedComponentKeys = [],
  selectedComponentIds = [],
  visibleComponentIds = null,
}) {
  let baseMarkup = enhanceKitchenPreviewSvgMarkup(svgMarkup);
  if (!baseMarkup) return "";

  if (Array.isArray(visibleComponentIds) && visibleComponentIds.length) {
    baseMarkup = applyVisibleComponentsToSvgMarkup(baseMarkup, visibleComponentIds);
  }

  const boundsByKey = PREVIEW_HIGHLIGHT_BOUNDS_BY_SLUG[normalizeKitchenSlug(kitchenSlug)] || {};
  const highlightMarkup = [...new Set(highlightedComponentKeys.map((key) => String(key || "").trim()).filter(Boolean))]
    .map((key) => boundsByKey[key])
    .filter(Boolean)
    .map(buildHighlightMarkup)
    .join("");

  const dishwasherOverlay = buildServiceClaimDishwasherSvgOverlay({ kitchenSlug, selectedComponentIds });
  if (!highlightMarkup && !dishwasherOverlay) {
    return baseMarkup;
  }

  return baseMarkup.replace("</svg>", `${highlightMarkup}${dishwasherOverlay}</svg>`);
}

export function resolveClaimPreviewComponentKeys({ selectedAreas = [], kitchenConfig = null }) {
  const components = Array.isArray(kitchenConfig?.components) ? kitchenConfig.components : [];
  const componentById = new Map(components.map((item) => [componentIdForItem(item), item]));
  const componentByCode = new Map(
    components
      .map((item) => [String(item.code || "").trim().toUpperCase(), item])
      .filter(([code]) => code),
  );

  return selectedAreas
    .map((area) => {
      const explicitKey = String(area?.componentKey || "").trim();
      if (explicitKey) {
        return explicitKey;
      }

      const componentId = String(area?.componentId || "").trim();
      if (componentId && componentById.has(componentId)) {
        return String(componentById.get(componentId)?.componentKey || "").trim();
      }

      const code = String(area?.code || "").trim().toUpperCase();
      if (code && componentByCode.has(code)) {
        return String(componentByCode.get(code)?.componentKey || "").trim();
      }

      return "";
    })
    .filter(Boolean);
}

async function loadClaimKitchenPreviewContext(kitchenSlug) {
  const normalizedSlug = normalizeKitchenSlug(kitchenSlug);
  if (!normalizedSlug) {
    return null;
  }

  const kitchen = await getKitchenBySlug(normalizedSlug);
  if (!kitchen) {
    return null;
  }

  const kitchenConfig = serializeKitchenForLegacy(kitchen);
  const svgMarkup = await loadKitchenSvgMarkup(normalizedSlug).catch(() => "");
  if (!svgMarkup) {
    return null;
  }

  return {
    kitchen,
    kitchenConfig,
    svgMarkup,
  };
}

export async function renderClaimKitchenPreviewSvg({
  kitchenSlug,
  selectedAreas = [],
  contractNumber = null,
}) {
  const normalizedAreas = Array.isArray(selectedAreas)
    ? selectedAreas
    : parseServiceClaimProblemAreas(selectedAreas);
  const resolvedKitchenSlug = normalizeKitchenSlug(kitchenSlug)
    || inferKitchenSlugFromSelectedAreas(normalizedAreas);
  const context = await loadClaimKitchenPreviewContext(resolvedKitchenSlug);
  if (!context) {
    return null;
  }

  const highlightedComponentKeys = resolveClaimPreviewComponentKeys({
    selectedAreas: normalizedAreas,
    kitchenConfig: context.kitchenConfig,
  });
  const visibleComponentIds = await resolveVisibleComponentIdsForContract(contractNumber, resolvedKitchenSlug);
  const markup = buildKitchenPreviewSvgMarkup({
    svgMarkup: context.svgMarkup,
    kitchenSlug: resolvedKitchenSlug,
    highlightedComponentKeys,
    selectedComponentIds: normalizedAreas.map((area) => area.componentId),
    visibleComponentIds,
  });

  return markup
    ? {
        markup,
        highlightedComponentKeys,
        visibleComponentIds,
        kitchenName: context.kitchen?.name || "",
        kitchenSlug: resolvedKitchenSlug,
      }
    : null;
}

const PDF_PLAN_SOURCE_WIDTH = 842;
const PDF_PLAN_SOURCE_HEIGHT = 595;

const CLAIM_PREVIEW_SOURCE_HOTSPOT_OVERRIDES = {
  // AB 105811's legacy picker coordinates are based on its cropped display
  // canvas. The email compositor renders the original 842 x 595 SVG, where
  // the oven face is the fourth base unit: x=3557..4657 and y=126..1735 in
  // the SVG's inverted 1/12-unit coordinate system.
  "ab-105811": {
    "oven-module": {
      left: (3557 * 0.12 / PDF_PLAN_SOURCE_WIDTH) * 100,
      top: ((PDF_PLAN_SOURCE_HEIGHT - 1735 * 0.12) / PDF_PLAN_SOURCE_HEIGHT) * 100,
      width: ((4657 - 3557) * 0.12 / PDF_PLAN_SOURCE_WIDTH) * 100,
      height: ((1735 - 126) * 0.12 / PDF_PLAN_SOURCE_HEIGHT) * 100,
    },
  },
};

export function applyClaimPreviewSourceHotspotOverrides(kitchenSlug, hotspots = []) {
  const overrides = CLAIM_PREVIEW_SOURCE_HOTSPOT_OVERRIDES[normalizeKitchenSlug(kitchenSlug)];
  if (!overrides) return hotspots;

  return hotspots.map((hotspot) => {
    const override = overrides[String(hotspot?.componentKey || "").trim()];
    return override ? { ...hotspot, ...override } : hotspot;
  });
}

function getClaimPlanHotspotBounds(hotspot) {
  const points = Array.isArray(hotspot?.points) ? hotspot.points : [];
  if (points.length) {
    const xs = points.map(([x]) => Number(x)).filter(Number.isFinite);
    const ys = points.map(([, y]) => Number(y)).filter(Number.isFinite);
    if (xs.length && ys.length) {
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const right = Math.max(...xs);
      const bottom = Math.max(...ys);
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    }
  }

  const left = Number(hotspot?.left || 0);
  const top = Number(hotspot?.top || 0);
  const width = Number(hotspot?.width || 0);
  const height = Number(hotspot?.height || 0);
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function getClaimPlanCrop(hotspots) {
  if (!hotspots.length) {
    return { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
  }

  const bounds = hotspots.reduce((current, hotspot) => {
    const next = getClaimPlanHotspotBounds(hotspot);
    return {
      left: Math.min(current.left, next.left),
      top: Math.min(current.top, next.top),
      right: Math.max(current.right, next.right),
      bottom: Math.max(current.bottom, next.bottom),
    };
  }, { left: 100, top: 100, right: 0, bottom: 0 });
  const trailingX = 100 - bounds.right;
  const trailingY = 100 - bounds.bottom;
  const left = Math.max(0, bounds.left - Math.max(2.6, bounds.left * 0.6));
  const top = Math.max(0, bounds.top - Math.max(4, bounds.top * 0.5));
  const right = Math.min(99.5, bounds.right + Math.max(3.2, trailingX * 0.92));
  const bottom = Math.min(99.5, bounds.bottom + Math.max(1, trailingY * 0.85));
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function withClaimPreviewDerivedSinkFaucet(hotspots, components) {
  const hasFaucetComponent = (components || []).some(
    (item) => normalizedClaimPreviewValue(item?.componentKey) === "sink-faucet",
  );
  if (!hasFaucetComponent) return hotspots;

  const sinkBase = hotspots.find((hotspot) => hotspot?.componentKey === "sink-base");
  const worktop = hotspots.find((hotspot) => hotspot?.componentKey === "worktop");
  const existingFaucet = hotspots.find((hotspot) => hotspot?.componentKey === "sink-faucet");
  if (!sinkBase || !worktop || existingFaucet?.preserveManualSize) return hotspots;

  const width = Math.max(4.6, Math.min(Number(sinkBase.width || 0) * 0.34, 5.1));
  const height = 8;
  const center = existingFaucet
    ? Number(existingFaucet.left || 0) + Number(existingFaucet.width || 0) / 2
    : Number(sinkBase.left || 0) + Number(sinkBase.width || 0) / 2;
  return [
    ...hotspots.filter((hotspot) => hotspot?.componentKey !== "sink-faucet"),
    {
      componentKey: "sink-faucet",
      left: center - width / 2,
      top: Number(worktop.top || 0) - height,
      width,
      height,
    },
  ];
}

export function cropClaimPlanHotspot(hotspot, crop) {
  hotspot = { ...hotspot, claimSourceBounds: getClaimPlanHotspotBounds(hotspot) };
  const points = Array.isArray(hotspot?.points) ? hotspot.points : [];
  if (points.length) {
    const croppedPoints = points.map(([x, y]) => [
      ((Number(x) - crop.left) / crop.width) * 100,
      ((Number(y) - crop.top) / crop.height) * 100,
    ]);
    const xs = croppedPoints.map(([x]) => x).filter(Number.isFinite);
    const ys = croppedPoints.map(([, y]) => y).filter(Number.isFinite);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    const width = right - left;
    const height = bottom - top;
    const clipPath = croppedPoints
      .map(([x, y]) => `${width > 0 ? ((x - left) / width) * 100 : 0}% ${height > 0 ? ((y - top) / height) * 100 : 0}%`)
      .join(", ");
    return {
      ...hotspot,
      left,
      top,
      width,
      height,
      clipPath: `polygon(${clipPath})`,
    };
  }

  return {
    ...hotspot,
    left: ((Number(hotspot.left || 0) - crop.left) / crop.width) * 100,
    top: ((Number(hotspot.top || 0) - crop.top) / crop.height) * 100,
    width: (Number(hotspot.width || 0) / crop.width) * 100,
    height: (Number(hotspot.height || 0) / crop.height) * 100,
  };
}

function claimPlanComponentId(hotspot) {
  return String(hotspot?.componentId || (hotspot?.componentKey ? `component-${hotspot.componentKey}` : "")).trim();
}

function getClaimPlanClipPathPoints(hotspot) {
  const match = String(hotspot?.clipPath || "").match(/^polygon\((.*)\)$/);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((point) => {
      const [rawX, rawY] = point.trim().split(/\s+/);
      const localX = Number.parseFloat(String(rawX || "").replace("%", ""));
      const localY = Number.parseFloat(String(rawY || "").replace("%", ""));
      if (!Number.isFinite(localX) || !Number.isFinite(localY)) {
        return null;
      }

      return [
        Number(hotspot.left || 0) + (localX / 100) * Number(hotspot.width || 0),
        Number(hotspot.top || 0) + (localY / 100) * Number(hotspot.height || 0),
      ];
    })
    .filter(Boolean);
}

function claimPlanShapeMarkup(hotspot, width, height, attributes) {
  const clipPathPoints = getClaimPlanClipPathPoints(hotspot);
  const points = clipPathPoints.length
    ? clipPathPoints
    : Array.isArray(hotspot?.points) ? hotspot.points : [];
  if (points.length) {
    const renderedPoints = points
      .map(([x, y]) => `${(Number(x) / 100) * width},${(Number(y) / 100) * height}`)
      .join(" ");
    return `<polygon points="${renderedPoints}" ${attributes}/>`;
  }

  return `<rect x="${(Number(hotspot.left || 0) / 100) * width}" y="${(Number(hotspot.top || 0) / 100) * height}" width="${(Number(hotspot.width || 0) / 100) * width}" height="${(Number(hotspot.height || 0) / 100) * height}" rx="5" ry="5" ${attributes}/>`;
}

function buildClaimPlanMask(hotspots, width, height) {
  const shapes = hotspots.map((hotspot) => claimPlanShapeMarkup(hotspot, width, height, 'fill="#ffffff"')).join("");
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`);
}

function buildClaimPlanSelectionOverlay(
  hotspots,
  width,
  height,
  attributes = 'fill="rgba(62,188,116,0.34)" stroke="none"',
) {
  const shapes = hotspots.map((hotspot) => claimPlanShapeMarkup(
    hotspot,
    width,
    height,
    attributes,
  )).join("");
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`);
}

function normalizedClaimPreviewValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function resolveClaimPlanSourcePath(sourceHref) {
  const assetPath = String(sourceHref || "").split(/[?#]/, 1)[0];
  return path.join(process.cwd(), "public", decodeURIComponent(assetPath).replace(/^[/\\]+/, ""));
}

export function resolveSelectedClaimPlanHotspots({
  selectedAreas = [],
  claimHotspots = [],
  sourceHotspots = [],
  selectableComponents = [],
}) {
  const selectableById = new Map(
    selectableComponents
      .map((component) => [normalizedClaimPreviewValue(component?.componentId), component])
      .filter(([componentId]) => componentId),
  );
  const selectableByCode = new Map(
    selectableComponents
      .flatMap((component) => [component?.articleCode, component?.code]
        .map((code) => [normalizedClaimPreviewValue(code), component]))
      .filter(([code]) => code),
  );
  const used = new Set();

  return selectedAreas.flatMap((area) => {
    const componentId = normalizedClaimPreviewValue(area?.componentId);
    const exact = claimHotspots.filter(
      (hotspot) => normalizedClaimPreviewValue(claimPlanComponentId(hotspot)) === componentId,
    );
    let matches = exact;

    if (!matches.length) {
      const selectedComponent = selectableById.get(componentId)
        || selectableByCode.get(normalizedClaimPreviewValue(area?.code));
      const fallbackKeys = new Set([
        selectedComponent?.componentKey,
        selectedComponent?.sourceComponentKey,
      ].map(normalizedClaimPreviewValue).filter(Boolean));
      matches = claimHotspots.filter((hotspot) => (
        fallbackKeys.has(normalizedClaimPreviewValue(hotspot?.componentKey))
      ));
      if (!matches.length) {
        matches = sourceHotspots.filter((hotspot) => (
          fallbackKeys.has(normalizedClaimPreviewValue(hotspot?.componentKey))
        ));
      }
    }

    return matches.filter((hotspot) => {
      const key = [
        claimPlanComponentId(hotspot),
        hotspot?.componentKey,
        hotspot?.left,
        hotspot?.top,
      ].join("|");
      if (used.has(key)) return false;
      used.add(key);
      return true;
    });
  });
}

async function renderClaimPdfPlanPreviewPng({ kitchenSlug, selectedAreas, contractNumber, width }) {
  const normalizedSlug = normalizeKitchenSlug(kitchenSlug);
  const sourceHref = PLAN_IMAGE_BY_SLUG[normalizedSlug];
  const sourceHotspots = PLAN_HOTSPOTS_BY_SLUG[normalizedSlug] || [];
  if (!sourceHref || !sourceHotspots.length || !contractNumber) {
    return null;
  }

  const plan = await import("./service-claim-kitchen-plan.js")
    .then(({ getServiceClaimKitchenPlan }) => getServiceClaimKitchenPlan(contractNumber))
    .catch(() => null);
  if (!plan || normalizeKitchenSlug(plan.kitchenSlug) !== normalizedSlug) {
    return null;
  }

  const displayHotspots = withBasePlinthExtension(
    withClaimPreviewDerivedSinkFaucet(
      applyClaimPreviewSourceHotspotOverrides(normalizedSlug, sourceHotspots),
      plan.kitchenConfig?.components,
    ),
    normalizedSlug,
  );
  const preparedHotspots = buildServiceClaimBlendeHotspots(
    displayHotspots,
    plan.selectableComponents,
    plan.kitchenConfig?.components,
    normalizedSlug,
  );
  const crop = getClaimPlanCrop(preparedHotspots);
  const croppedSourceHotspots = preparedHotspots.map((hotspot) => cropClaimPlanHotspot(hotspot, crop));
  const claimHotspots = buildServiceClaimPartHotspots(croppedSourceHotspots, plan.claimParts, normalizedSlug);
  const visibleIds = new Set(plan.visibleComponentIds || []);
  const purchasedHotspots = croppedSourceHotspots.filter((hotspot) => visibleIds.has(claimPlanComponentId(hotspot)));
  const selectedHotspots = resolveSelectedClaimPlanHotspots({
    selectedAreas,
    claimHotspots,
    sourceHotspots: croppedSourceHotspots,
    selectableComponents: plan.selectableComponents,
  });
  const selectedHotspotIds = new Set(selectedHotspots.map(claimPlanComponentId));
  const hasSelectedWorktop = selectedHotspots.some((hotspot) => (
    hotspot?.componentKey === "worktop"
    || hotspot?.claimPartKey === "worktop-left"
    || hotspot?.claimPartKey === "worktop-right"
    || hotspot?.claimPartKey === "worktop-end-panel"
    || hotspot?.claimPartKey === "worktop-end-panel-left"
  ));
  const unselectedApplianceHotspots = hasSelectedWorktop && isLShapedClaimKitchen(normalizedSlug)
    ? claimHotspots.filter((hotspot) => (
        (
          hotspot?.claimPartKey === "cooktop"
          || hotspot?.claimApplianceSurface === "cooktop"
          || hotspot?.claimPartKey === "sink"
        )
        && !selectedHotspotIds.has(claimPlanComponentId(hotspot))
      ))
    : [];

  const sourcePath = resolveClaimPlanSourcePath(sourceHref);
  const sourceBytes = await fs.readFile(sourcePath).catch(() => null);
  if (!sourceBytes) {
    return null;
  }

  const canonical = await sharp(sourceBytes)
    .resize(PDF_PLAN_SOURCE_WIDTH, PDF_PLAN_SOURCE_HEIGHT, { fit: "fill" })
    .png()
    .toBuffer();
  const cropLeft = Math.max(0, Math.floor((crop.left / 100) * PDF_PLAN_SOURCE_WIDTH));
  const cropTop = Math.max(0, Math.floor((crop.top / 100) * PDF_PLAN_SOURCE_HEIGHT));
  const cropWidth = Math.min(PDF_PLAN_SOURCE_WIDTH - cropLeft, Math.ceil((crop.width / 100) * PDF_PLAN_SOURCE_WIDTH));
  const cropHeight = Math.min(PDF_PLAN_SOURCE_HEIGHT - cropTop, Math.ceil((crop.height / 100) * PDF_PLAN_SOURCE_HEIGHT));
  const outputWidth = Math.max(320, Number(width) || 900);
  const outputHeight = Math.max(1, Math.round(outputWidth * cropHeight / cropWidth));
  const original = await sharp(canonical)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .resize(outputWidth, outputHeight, { fit: "fill" })
    .png()
    .toBuffer();
  const faintPlan = await sharp(original)
    .composite([{
      input: {
        create: {
          width: outputWidth,
          height: outputHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 0.72 },
        },
      },
      blend: "over",
    }])
    .png()
    .toBuffer();
  const purchasedLayer = purchasedHotspots.length
    ? await sharp(original)
      .ensureAlpha()
      .composite([{ input: buildClaimPlanMask(purchasedHotspots, outputWidth, outputHeight), blend: "dest-in" }])
      .png()
      .toBuffer()
    : null;
  const applianceCutoutLayer = unselectedApplianceHotspots.length
    ? await sharp(original)
      .ensureAlpha()
      .composite([{
        input: buildClaimPlanMask(unselectedApplianceHotspots, outputWidth, outputHeight),
        blend: "dest-in",
      }])
      .png()
      .toBuffer()
    : null;
  const layers = [
    { input: faintPlan },
    ...(purchasedLayer ? [{ input: purchasedLayer }] : []),
    ...(selectedHotspots.length
      ? [{
          input: buildClaimPlanSelectionOverlay(
            selectedHotspots,
            outputWidth,
            outputHeight,
            normalizedSlug === "ab-105824"
              ? 'fill="rgba(62,188,116,0.58)" stroke="none"'
              : undefined,
          ),
        }]
      : []),
    ...(applianceCutoutLayer
      ? [
          { input: buildClaimPlanMask(unselectedApplianceHotspots, outputWidth, outputHeight) },
          { input: applianceCutoutLayer },
        ]
      : []),
  ];
  const content = await sharp({
    create: { width: outputWidth, height: outputHeight, channels: 4, background: "#ffffff" },
  })
    .composite(layers)
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();

  return {
    content,
    contentType: "image/png",
    width: outputWidth,
    height: outputHeight,
    highlightedComponentKeys: selectedHotspots.map((hotspot) => hotspot.componentKey).filter(Boolean),
    visibleComponentIds: [...visibleIds],
    kitchenName: plan.kitchenName || "",
    kitchenSlug: normalizedSlug,
    source: "pdf-plan",
  };
}

export async function renderClaimKitchenPreviewPng({
  kitchenSlug,
  selectedAreas = [],
  contractNumber = null,
  width = 900,
}) {
  const normalizedAreas = Array.isArray(selectedAreas)
    ? selectedAreas
    : parseServiceClaimProblemAreas(selectedAreas);
  const pdfPlanPreview = await renderClaimPdfPlanPreviewPng({
    kitchenSlug,
    selectedAreas: normalizedAreas,
    contractNumber,
    width,
  }).catch((error) => {
    console.warn("Claim PDF-plan preview rendering failed:", error?.message || error);
    return null;
  });
  if (pdfPlanPreview?.content) {
    return pdfPlanPreview;
  }

  const preview = await renderClaimKitchenPreviewSvg({ kitchenSlug, selectedAreas, contractNumber });
  if (!preview?.markup) {
    return null;
  }

  const content = await sharp(Buffer.from(preview.markup))
    .resize({ width })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
  const metadata = await sharp(content).metadata();
  return {
    ...preview,
    content,
    contentType: "image/png",
    width: metadata.width || width,
    height: metadata.height || null,
  };
}

export async function renderReferencePlanMarkersPng({
  content,
  markers = [],
  appearance,
}) {
  const normalizedMarkers = markers
    .map((marker) => ({
      x: Number(marker?.x),
      y: Number(marker?.y),
    }))
    .filter((marker) => (
      Number.isFinite(marker.x)
      && marker.x >= 0
      && marker.x <= 100
      && Number.isFinite(marker.y)
      && marker.y >= 0
      && marker.y <= 100
    ));
  if (!content?.length || !normalizedMarkers.length) return null;

  // Keep the 2x raster crisp, but scale every marker dimension with the sketch
  // using the actual proportions measured in the form at submission time.
  const rasterWidth = REFERENCE_PLAN_EMAIL_DISPLAY_WIDTH * REFERENCE_PLAN_EMAIL_PIXEL_RATIO;
  const canonical = await sharp(content)
    .rotate()
    .resize({ width: rasterWidth })
    .png()
    .toBuffer({ resolveWithObject: true });
  const width = Number(canonical.info?.width || 0);
  const height = Number(canonical.info?.height || 0);
  if (!width || !height) return null;

  const submittedAppearance = normalizeReferencePlanMarkerAppearance(appearance);
  const markerScale = Math.min(1, REFERENCE_PLAN_MARKER_MAX_DIAMETER / submittedAppearance.diameter);
  const markerAppearance = {
    diameter: submittedAppearance.diameter * markerScale,
    fontSize: Math.max(submittedAppearance.fontSize * markerScale, submittedAppearance.diameter * markerScale * 0.46),
    borderWidth: submittedAppearance.borderWidth * markerScale,
  };
  const markerDiameter = markerAppearance.diameter * width;
  const fontSize = markerAppearance.fontSize * width;
  const strokeWidth = markerAppearance.borderWidth * width;
  const markerRadius = (markerDiameter - strokeWidth) / 2;
  const markerMarkup = normalizedMarkers.map((marker) => {
    const cx = (marker.x / 100) * width;
    const cy = (marker.y / 100) * height;
    return `
      <g transform="translate(${cx} ${cy})">
        <circle r="${markerRadius}" fill="#b42318" stroke="#ffffff" stroke-width="${strokeWidth}" />
        <text
          x="0"
          y="${fontSize * 0.35}"
          text-anchor="middle"
          fill="#ffffff"
          font-family="Arial, Helvetica, sans-serif"
          font-size="${fontSize}"
          font-weight="900"
        >X</text>
      </g>
    `;
  }).join("");
  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${markerMarkup}
    </svg>
  `);

  return sharp(canonical.data)
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

export async function findReferencePlanMarkersInSnapshot(content) {
  const { data, info } = await sharp(content).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const visited = new Uint8Array(width * height);
  const markers = [];
  const isMarkerRed = (pixel) => {
    const offset = pixel * channels;
    return Math.abs(data[offset] - 180) <= 18
      && Math.abs(data[offset + 1] - 35) <= 18
      && Math.abs(data[offset + 2] - 24) <= 18
      && data[offset + 3] > 200;
  };

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (visited[pixel] || !isMarkerRed(pixel)) continue;
    const queue = [pixel];
    visited[pixel] = 1;
    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const x = current % width;
      const y = Math.floor(current / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const neighbor of [current - 1, current + 1, current - width, current + width]) {
        if (neighbor < 0 || neighbor >= width * height || visited[neighbor]) continue;
        const nx = neighbor % width;
        if (Math.abs(nx - x) > 1 || !isMarkerRed(neighbor)) continue;
        visited[neighbor] = 1;
        queue.push(neighbor);
      }
    }
    const diameter = Math.max(right - left + 1, bottom - top + 1);
    if (queue.length < 80 || diameter < 15 || diameter > width * 0.25) continue;
    if (Math.abs((right - left) - (bottom - top)) > diameter * 0.25) continue;
    markers.push({ x: ((left + right) / 2 / width) * 100, y: ((top + bottom) / 2 / height) * 100 });
  }
  return markers;
}

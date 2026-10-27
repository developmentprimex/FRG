"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { codePillStyle, mutedTextStyle, primaryButtonStyle } from "./admin-ui";
import { AdminLocalizedName, AdminPluralText, AdminText, useAdminI18n } from "./admin-i18n";
import {
  getCompatibleKindsForSlot,
  inferItemKind,
  isItemCompatibleWithSlot,
} from "../lib/kitchen-slot-compatibility";

const PLAN_BOUNDS_BY_SLUG = {
  "kitchen-model-b": {
    "component-wall-cabinet-1": { x: 239, y: 214, width: 84, height: 118 },
    "component-wall-cabinet-2": { x: 322, y: 214, width: 84, height: 118 },
    "component-wall-cabinet-3": { x: 405, y: 214, width: 84, height: 118 },
    "component-wall-cabinet-4": { x: 488, y: 214, width: 84, height: 118 },
    "component-wall-cabinet-5": { x: 571, y: 214, width: 84, height: 118 },
    "component-extractor-hood": { x: 488, y: 314, width: 84, height: 14 },
    "component-under-cabinet-light": { x: 270, y: 319, width: 287, height: 18 },
    "component-base-module-1": { x: 237, y: 393, width: 86, height: 127 },
    "component-base-module-2": { x: 322, y: 393, width: 84, height: 127 },
    "component-base-module-3": { x: 405, y: 393, width: 84, height: 127 },
    "component-oven-module": { x: 488, y: 393, width: 84, height: 127 },
    "component-drawer-module": { x: 571, y: 393, width: 84, height: 127 },
    "component-refrigerator": { x: 670, y: 270, width: 76, height: 250 },
    "component-sink-faucet": { x: 374, y: 364, width: 10, height: 29 },
    "component-worktop": { x: 236, y: 392, width: 421, height: 7 },
  },
};

function componentIdForKey(componentKey) {
  return `component-${String(componentKey || "")
    .replace(/[^a-z0-9#-]/gi, "")
    .toLowerCase()}`;
}

function getBounds(group) {
  if (!group || typeof group.getBBox !== "function") {
    return null;
  }

  try {
    const box = group.getBBox();
    if (box && box.width > 0 && box.height > 0) {
      return box;
    }
  } catch {}

  return null;
}

function getPlanBounds(group, componentId, kitchenSlug) {
  const manualBounds = PLAN_BOUNDS_BY_SLUG[String(kitchenSlug || "").trim().toLowerCase()]?.[componentId];
  if (manualBounds) {
    return manualBounds;
  }

  return getBounds(group);
}

function getViewBox(svg) {
  if (!svg) return null;

  const rawViewBox = svg.getAttribute("viewBox");
  if (rawViewBox) {
    const values = rawViewBox
      .trim()
      .split(/[\s,]+/)
      .map((value) => Number(value));

    if (values.length === 4 && values.every((value) => Number.isFinite(value))) {
      return {
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3],
      };
    }
  }

  const baseVal = svg.viewBox?.baseVal;
  if (baseVal?.width && baseVal?.height) {
    return {
      x: baseVal.x,
      y: baseVal.y,
      width: baseVal.width,
      height: baseVal.height,
    };
  }

  return null;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function applyAdminGroupVisualState(group, { selected }) {
  if (!group) return;

  const emphasisStroke = selected ? "#000000" : null;

  group.style.setProperty("opacity", "1", "important");
  group.style.setProperty("filter", "none", "important");

  group.querySelectorAll("path,line,polyline,polygon,rect,circle,ellipse,text").forEach((element) => {
    if (!element.dataset.originalStroke) {
      element.dataset.originalStroke = element.getAttribute("stroke") || "";
    }
    if (!element.dataset.originalStrokeWidth) {
      element.dataset.originalStrokeWidth = element.getAttribute("stroke-width") || "1";
    }
    if (!element.dataset.originalFill) {
      element.dataset.originalFill = element.getAttribute("fill") || "";
    }

    const originalStroke = element.dataset.originalStroke;
    const originalStrokeWidth = element.dataset.originalStrokeWidth;
    const originalFill = element.dataset.originalFill;

    element.style.setProperty(
      "stroke",
      selected ? (originalStroke === "none" ? "none" : emphasisStroke) : (originalStroke || ""),
      "important",
    );
    element.style.setProperty(
      "stroke-width",
      originalStrokeWidth || "",
      "important",
    );
    element.style.setProperty("vector-effect", "non-scaling-stroke", "important");

    if (element.tagName === "text") {
      element.style.setProperty("fill", selected ? "#000000" : (originalFill || ""), "important");
    } else if (selected && originalFill && originalFill !== "none" && originalFill !== "white") {
      element.style.setProperty("fill", "#000000", "important");
    } else if (originalFill) {
      element.style.setProperty("fill", originalFill, "important");
    } else {
      element.style.removeProperty("fill");
    }
  });
}

export function AdminKitchenLayoutEditor({ items, structureSlots, svgMarkup, kitchenSlug = "", requestedEditId = "" }) {
  const { translate } = useAdminI18n();
  const hostRef = useRef(null);
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [slotTargets, setSlotTargets] = useState([]);
  const [svgViewBox, setSvgViewBox] = useState(null);

  const componentsBySlot = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      if (item.itemType !== "COMPONENT" || !item.componentKey) continue;
      const bucket = map.get(item.componentKey) || [];
      bucket.push(item);
      map.set(item.componentKey, bucket);
    }
    return map;
  }, [items]);

  const slotsById = useMemo(
    () => new Map(structureSlots.map((slot) => [componentIdForKey(slot.componentKey), slot])),
    [structureSlots],
  );
  const selectedSlot = structureSlots.find((slot) => slot.componentKey === selectedSlotKey) || null;
  const selectedItems = selectedSlot ? componentsBySlot.get(selectedSlot.componentKey) || [] : [];
  const selectedPrimaryItem = selectedItems[0] || null;
  const openSlotCount = structureSlots.filter((slot) => !(componentsBySlot.get(slot.componentKey) || []).length).length;

  useEffect(() => {
    const host = hostRef.current;
    const svg = host?.querySelector("svg");
    if (!host || !svg) return undefined;

    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.pointerEvents = "none";

    setSvgViewBox(getViewBox(svg));

    const nextSlotTargets = [];

    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id") || "";
      const slot = slotsById.get(componentId);
      group.style.cursor = "default";
      if (!slot) {
        return;
      }

      const box = getPlanBounds(group, componentId, kitchenSlug);
      if (!box) return;

      nextSlotTargets.push({
        slot,
        componentId,
        bounds: box,
      });
    });

    setSlotTargets(nextSlotTargets);
    return undefined;
  }, [kitchenSlug, slotsById]);

  useEffect(() => {
    const svg = hostRef.current?.querySelector("svg");
    if (!svg) return;

    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id") || "";
      const slot = slotsById.get(componentId);
      if (!slot) return;

      const isSelected = slot.componentKey === selectedSlotKey;
      applyAdminGroupVisualState(group, { selected: isSelected });
    });
  }, [componentsBySlot, selectedSlotKey, slotsById]);

  return (
    <div style={layoutGridStyle}>
      <section style={canvasPanelStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: "1rem" }}><AdminText i18nKey="kitchenEditorAdmin.kitchenPlan" fallback="Kitchen plan" /></strong>
          <p style={mutedTextStyle}><AdminText i18nKey="kitchenEditorAdmin.planHelp" fallback="Click a slot to inspect it, then edit the assigned component from the item card below." /></p>
        </div>
        <div style={metricsRowStyle}>
          <span style={pillStyle}>
            <AdminPluralText count={structureSlots.length} singularKey="kitchenEditorAdmin.slotCount" pluralKey="kitchenEditorAdmin.slotsCount" singularFallback="{count} slot" pluralFallback="{count} slots" />
          </span>
          <span style={pillStyle}><AdminText i18nKey="kitchenEditorAdmin.openCount" fallback="{count} open" values={{ count: openSlotCount }} /></span>
          <span style={pillStyle}>
            <AdminPluralText count={items.filter((item) => item.itemType === "COMPONENT").length} singularKey="kitchenEditorAdmin.componentCount" pluralKey="kitchenEditorAdmin.componentsCount" singularFallback="{count} component" pluralFallback="{count} components" />
          </span>
        </div>
        <div style={svgCanvasStyle}>
          <div style={svgWrapStyle}>
            <div ref={hostRef} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
            {svgViewBox ? (
              <div style={slotOverlayStyle}>
                {slotTargets
                  .slice()
                  .sort((left, right) => (left.bounds.width * left.bounds.height) - (right.bounds.width * right.bounds.height))
                  .map((target) => {
                    const isSelected = target.slot.componentKey === selectedSlotKey;
                    const left = ((target.bounds.x - svgViewBox.x) / svgViewBox.width) * 100;
                    const top = ((target.bounds.y - svgViewBox.y) / svgViewBox.height) * 100;
                    const width = (target.bounds.width / svgViewBox.width) * 100;
                    const height = (target.bounds.height / svgViewBox.height) * 100;

                    return (
                      <div
                        key={target.slot.componentKey}
                        role="button"
                        tabIndex={0}
                        aria-label={target.slot.label}
                        onClick={() => setSelectedSlotKey(target.slot.componentKey)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedSlotKey(target.slot.componentKey);
                          }
                        }}
                        style={{
                          ...slotOverlayButtonStyle,
                          left: `${left}%`,
                          top: `${top}%`,
                          width: `${width}%`,
                          height: `${height}%`,
                          ...(isSelected ? selectedSlotOverlayButtonStyle : null),
                        }}
                      />
                    );
                  })}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <aside style={inspectorStyle}>
        <div style={{ display: "grid", gap: 6 }}>
          <strong style={{ fontSize: "1rem" }}><AdminText i18nKey="componentSlotPicker.selectedSlot" fallback="Selected slot" /></strong>
          {selectedSlot ? (
            <>
              <span style={codePillStyle}>{selectedSlot.label}</span>
              <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>{selectedSlot.zone}</span>
              {selectedPrimaryItem ? <span style={selectedHintStyle}><AdminText i18nKey="kitchenEditorAdmin.selectedInPlan" fallback="Selected in the plan" /></span> : null}
            </>
          ) : (
            <p style={mutedTextStyle}><AdminText i18nKey="kitchenEditorAdmin.noSlotSelectedHelp" fallback="No slot selected yet. Click a slot in the plan to inspect it." /></p>
          )}
        </div>

        {selectedSlot ? (
          <div style={itemSummaryStyle}>
            {selectedPrimaryItem ? (
              <>
                <AdminLocalizedName name={selectedPrimaryItem.name} nameDe={selectedPrimaryItem.nameDe || ""} as="strong" />
                <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}><AdminText i18nKey="orderDetailAdmin.itemCode" fallback="Item code" />: {selectedPrimaryItem.code}</span>
                <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>{formatCurrency(selectedPrimaryItem.price)}</span>
                {!isItemCompatibleWithSlot(selectedPrimaryItem, selectedSlot) ? (
                  <span style={{ color: "var(--app-danger-text)", fontSize: 13 }}>
                    {(() => {
                      const compatibleKinds = getCompatibleKindsForSlot(selectedSlot);
                      const itemKind = inferItemKind(selectedPrimaryItem);
                      return itemKind
                        ? translate("kitchenEditorAdmin.incompatibleItem", "This {kind} component cannot be placed in {slot}.")
                            .replace("{kind}", translate(`kitchenEditorAdmin.kind.${itemKind}`, itemKind))
                            .replace("{slot}", selectedSlot.label)
                        : translate("kitchenEditorAdmin.slotAcceptsKinds", "This slot only accepts {kinds} type components.")
                            .replace("{kinds}", compatibleKinds.map((kind) => translate(`kitchenEditorAdmin.kind.${kind}`, kind)).join(", "));
                    })()}
                  </span>
                ) : null}
                <a href={`?edit=${encodeURIComponent(selectedPrimaryItem.id)}#item-${selectedPrimaryItem.id}`} style={primaryMiniLinkStyle}>
                  <AdminText i18nKey="kitchenEditorAdmin.editItemBelow" fallback="Edit item below" />
                </a>
              </>
            ) : (
              <>
                <strong style={{ fontSize: "1.05rem" }}><AdminText i18nKey="kitchenEditorAdmin.emptySlot" fallback="Empty slot" /></strong>
                <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>
                  <AdminText i18nKey="kitchenEditorAdmin.emptySlotHelp" fallback="No component is assigned here. Components can only be edited from existing item cards below." />
                </span>
              </>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

const layoutGridStyle = {
  display: "grid",
  gap: 20,
  gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 360px)",
  alignItems: "start",
};

const canvasPanelStyle = {
  display: "grid",
  gap: 14,
  minWidth: 0,
  borderRadius: 18,
  padding: 18,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,245,239,0.88))",
};

const inspectorStyle = {
  display: "grid",
  gap: 14,
  minWidth: 0,
  borderRadius: 18,
  padding: 18,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,249,245,0.88))",
};

const svgCanvasStyle = {
  padding: 18,
  borderRadius: 14,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,240,232,0.74))",
  overflow: "hidden",
};

const svgWrapStyle = {
  position: "relative",
};

const slotOverlayStyle = {
  position: "absolute",
  inset: 0,
};

const slotOverlayButtonStyle = {
  position: "absolute",
  padding: 0,
  margin: 0,
  border: "1px solid transparent",
  borderRadius: 8,
  background: "transparent",
  cursor: "pointer",
};

const selectedSlotOverlayButtonStyle = {
  borderColor: "rgba(143, 62, 44, 0.38)",
  background: "rgba(143, 62, 44, 0.06)",
};

const metricsRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const pillStyle = {
  display: "inline-flex",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--app-accent)",
  background: "rgba(143, 62, 44, 0.08)",
};

const itemSummaryStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: "14px 16px",
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255, 245, 236, 0.98), rgba(255, 250, 246, 0.92))",
  border: "1px solid rgba(143, 62, 44, 0.2)",
  boxShadow: "0 14px 28px rgba(143, 62, 44, 0.08)",
};

const selectedHintStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  color: "#8f3e2c",
  background: "rgba(178, 77, 42, 0.12)",
};

const primaryMiniLinkStyle = {
  ...primaryButtonStyle,
  minHeight: 40,
  padding: "10px 14px",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

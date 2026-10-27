"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FormField,
  checkboxRowStyle,
  formGridStyle,
  inputStyle,
  mutedTextStyle,
  primaryButtonStyle,
  textareaStyle,
} from "./admin-ui";
import AdminSelect from "./admin-select";
import { AdminText, useAdminI18n } from "./admin-i18n";

const ITEM_TYPES = ["COMPONENT", "ACCESSORY", "SERVICE"];

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
  } catch {
    return null;
  }

  return null;
}

export default function AdminKitchenItemBuilder({
  action,
  items,
  legacyIconKeys,
  structureSlots,
  svgMarkup,
}) {
  const svgHostRef = useRef(null);
  const [itemType, setItemType] = useState("COMPONENT");
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const { translate } = useAdminI18n();

  const slotUsage = useMemo(() => {
    const usage = new Map();

    for (const item of items) {
      if (item.itemType !== "COMPONENT" || !item.componentKey) continue;
      const bucket = usage.get(item.componentKey) || [];
      bucket.push(item);
      usage.set(item.componentKey, bucket);
    }

    return usage;
  }, [items]);

  const hasStructuredSlots = structureSlots.length > 0;
  const isComponentType = itemType === "COMPONENT";
  const showStructure = hasStructuredSlots && isComponentType && svgMarkup;
  const selectedSlot = structureSlots.find((slot) => slot.componentKey === selectedSlotKey) || null;
  const selectedSlotItems = selectedSlot ? slotUsage.get(selectedSlot.componentKey) || [] : [];
  const availableSlotCount = structureSlots.filter((slot) => !(slotUsage.get(slot.componentKey) || []).length).length;

  useEffect(() => {
    if (!isComponentType || !hasStructuredSlots) {
      setSelectedSlotKey("");
    }
  }, [hasStructuredSlots, isComponentType]);

  useEffect(() => {
    const host = svgHostRef.current;
    const svg = host?.querySelector("svg");
    if (!host || !svg) {
      return undefined;
    }

    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";

    const namespace = "http://www.w3.org/2000/svg";
    const knownSlotIds = new Set(structureSlots.map((slot) => componentIdForKey(slot.componentKey)));

    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id") || "";
      const isKnownSlot = knownSlotIds.has(componentId);
      group.style.cursor = isKnownSlot ? "pointer" : "default";

      let frame = group.querySelector(".admin-slot-frame");
      if (!isKnownSlot) {
        if (frame) frame.remove();
        return;
      }

      const box = getBounds(group);
      if (!box) return;

      if (!frame) {
        frame = document.createElementNS(namespace, "rect");
        frame.classList.add("admin-slot-frame");
        frame.setAttribute("fill", "transparent");
        frame.setAttribute("pointer-events", "none");
        frame.setAttribute("vector-effect", "non-scaling-stroke");
        group.insertBefore(frame, group.firstChild);
      }

      frame.setAttribute("x", String(box.x - 8));
      frame.setAttribute("y", String(box.y - 8));
      frame.setAttribute("width", String(box.width + 16));
      frame.setAttribute("height", String(box.height + 16));
      frame.setAttribute("rx", "10");
      frame.setAttribute("ry", "10");
    });

    const onClick = (event) => {
      const group = event.target.closest("[data-component-id]");
      if (!group) return;

      const componentId = group.getAttribute("data-component-id") || "";
      const slot = structureSlots.find((entry) => componentIdForKey(entry.componentKey) === componentId);
      if (!slot) return;

      if ((slotUsage.get(slot.componentKey) || []).length) {
        return;
      }

      setSelectedSlotKey(slot.componentKey);
    };

    host.addEventListener("click", onClick, true);

    return () => {
      host.removeEventListener("click", onClick, true);
    };
  }, [slotUsage, structureSlots]);

  useEffect(() => {
    const svg = svgHostRef.current?.querySelector("svg");
    if (!svg) {
      return;
    }

    const slotByComponentId = new Map(
      structureSlots.map((slot) => [componentIdForKey(slot.componentKey), slot]),
    );

    svg.querySelectorAll("[data-component-id]").forEach((group) => {
      const componentId = group.getAttribute("data-component-id") || "";
      const slot = slotByComponentId.get(componentId);
      const frame = group.querySelector(".admin-slot-frame");
      if (!slot || !frame) return;

      const assignedItems = slotUsage.get(slot.componentKey) || [];
      const isSelected = slot.componentKey === selectedSlotKey;
      const isOccupied = assignedItems.length > 0;

      frame.setAttribute("stroke", isSelected ? "#8f3e2c" : isOccupied ? "#85756b" : "#2f7c68");
      frame.setAttribute("stroke-width", isSelected ? "4" : "2.5");
      frame.setAttribute("stroke-dasharray", isOccupied ? "8 4" : "");

      group.style.opacity = isSelected ? "1" : isOccupied ? "0.92" : "0.86";
      group.style.filter = isSelected ? "drop-shadow(0 10px 22px rgba(143, 62, 44, 0.18))" : "none";
    });
  }, [selectedSlotKey, slotUsage, structureSlots]);

  return (
    <form action={action} method="post" style={{ display: "grid", gap: 20 }}>
      {showStructure ? (
        <div style={structureGridStyle}>
          <div style={structurePreviewStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: "1rem", color: "var(--app-text)" }}><AdminText i18nKey="kitchenEditorAdmin.structure" fallback="Kitchen structure" /></strong>
              <p style={mutedTextStyle}>
                <AdminText i18nKey="kitchenEditorAdmin.structureHelp" fallback="Click an empty position in the plan, or choose it from the slot list. Occupied positions should be edited below instead of created again." />
              </p>
            </div>
            <div style={structureCanvasStyle}>
              <div ref={svgHostRef} dangerouslySetInnerHTML={{ __html: svgMarkup }} />
            </div>
          </div>

          <div style={slotListWrapStyle}>
            <div style={{ display: "grid", gap: 6 }}>
              <strong style={{ fontSize: "1rem", color: "var(--app-text)" }}><AdminText i18nKey="kitchenEditorAdmin.availableSlots" fallback="Available slots" /></strong>
              <span style={helperPillStyle}><AdminText i18nKey="kitchenEditorAdmin.openCount" fallback="{count} open" values={{ count: availableSlotCount }} /></span>
            </div>

            <div style={slotListStyle}>
              {structureSlots.map((slot) => {
                const assignedItems = slotUsage.get(slot.componentKey) || [];
                const isSelected = slot.componentKey === selectedSlotKey;
                const isOccupied = assignedItems.length > 0;

                return (
                  <button
                    key={slot.componentKey}
                    type="button"
                    onClick={() => !isOccupied && setSelectedSlotKey(slot.componentKey)}
                    disabled={isOccupied}
                    style={{
                      ...slotCardStyle,
                      ...(isSelected ? selectedSlotCardStyle : null),
                      ...(isOccupied ? occupiedSlotCardStyle : null),
                    }}
                  >
                    <div style={{ display: "grid", gap: 4, textAlign: "left" }}>
                      <strong style={{ fontSize: 14 }}>{slot.label}</strong>
                      <span style={{ color: "var(--app-text-muted)", fontSize: 12 }}>{slot.zone}</span>
                    </div>
                    <span style={slotStatusStyle}>
                      {isOccupied
                        ? assignedItems.length > 1
                          ? translate("kitchenEditorAdmin.itemsAssigned", "{count} items assigned").replace("{count}", assignedItems.length)
                          : assignedItems[0].name
                        : isSelected
                          ? translate("componentSlotPicker.selected", "Selected")
                          : translate("kitchenEditorAdmin.selectSlot", "Select slot")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div style={formGridStyle}>
        <FormField label={<AdminText i18nKey="orderDetailAdmin.type" fallback="Type" />}>
          <AdminSelect name="itemType" value={itemType} onChange={(event) => setItemType(event.target.value)} style={inputStyle}>
            {ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                <AdminText i18nKey={`orderDetailAdmin.itemType${type.charAt(0)}${type.slice(1).toLowerCase()}`} fallback={type} />
              </option>
            ))}
          </AdminSelect>
        </FormField>
        <FormField label={<AdminText i18nKey="orderDetailAdmin.itemCode" fallback="Item code" />}>
          <input name="code" placeholder="DISH-600-STD" required style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name" />}>
          <input name="name" placeholder={translate("kitchenEditorAdmin.displayName", "Display name")} required style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.price" fallback="Price" />}>
          <input name="price" placeholder="349.00" required style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="kitchenEditorAdmin.iconKey" fallback="Icon key" />}>
          <input name="iconKey" placeholder="dishwasher" list="legacy-icon-keys" style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="kitchenEditorAdmin.colorKey" fallback="Color key" />}>
          <input name="colorKey" placeholder="#001f7f" style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="componentSlotPicker.componentSlot" fallback="Component slot" />}>
          <input
            name="componentKey"
            value={isComponentType ? selectedSlotKey : ""}
            readOnly
            placeholder={hasStructuredSlots
              ? translate("kitchenEditorAdmin.chooseStructurePosition", "Choose a position from the structure")
              : translate("kitchenEditorAdmin.optionalFutureMapping", "Optional future mapping")}
            style={{
              ...inputStyle,
              background: hasStructuredSlots ? "rgba(248, 243, 236, 0.92)" : inputStyle.background,
            }}
          />
        </FormField>
        <FormField label={<AdminText i18nKey="catalogAdmin.sortOrder" fallback="Sort order" />}>
          <input name="sortOrder" type="number" defaultValue={0} style={inputStyle} />
        </FormField>
        <FormField label={<AdminText i18nKey="kitchenEditorAdmin.infoText" fallback="Info text" />} wide>
          <textarea name="infoText" rows={3} placeholder={translate("kitchenEditorAdmin.optionalProductInfo", "Optional product info")} style={textareaStyle} />
        </FormField>
      </div>

      {hasStructuredSlots && isComponentType ? (
        <div style={selectionSummaryStyle}>
          <strong style={{ fontSize: 14, color: "var(--app-text)" }}>
            {selectedSlot
              ? <AdminText i18nKey="kitchenEditorAdmin.selectedPosition" fallback="Selected position: {position}" values={{ position: selectedSlot.label }} />
              : <AdminText i18nKey="kitchenEditorAdmin.noPositionSelected" fallback="No kitchen position selected yet" />}
          </strong>
          <span style={{ color: "var(--app-text-muted)", fontSize: 13 }}>
            {selectedSlot
              ? selectedSlotItems.length
                ? <AdminText i18nKey="kitchenEditorAdmin.slotOccupied" fallback="This slot is already occupied and cannot be created again." />
                : <AdminText i18nKey="kitchenEditorAdmin.savedAs" fallback="{zone} • saved as {key}" values={{ zone: selectedSlot.zone, key: selectedSlot.componentKey }} />
              : <AdminText i18nKey="kitchenEditorAdmin.structuredKitchenHelp" fallback="For structured kitchens, components should be placed on a real slot instead of using a free-text catalog entry." />}
          </span>
        </div>
      ) : null}

      <div style={checkboxRowStyle}>
        <label><input name="isLocked" type="checkbox" value="true" /> <AdminText i18nKey="kitchenEditorAdmin.locked" fallback="Locked" /></label>
        <label><input name="isActive" type="checkbox" value="true" defaultChecked /> <AdminText i18nKey="catalogAdmin.active" fallback="Active" /></label>
      </div>

      <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="kitchenEditorAdmin.addItem" fallback="Add item" /></button>
      <datalist id="legacy-icon-keys">
        {legacyIconKeys.map((iconKey) => (
          <option key={iconKey} value={iconKey} />
        ))}
      </datalist>
    </form>
  );
}

const structureGridStyle = {
  display: "grid",
  gap: 18,
  gridTemplateColumns: "minmax(0, 1.3fr) minmax(280px, 0.95fr)",
  alignItems: "start",
};

const structurePreviewStyle = {
  display: "grid",
  gap: 14,
  borderRadius: 16,
  padding: 16,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,245,239,0.88))",
};

const structureCanvasStyle = {
  padding: 16,
  borderRadius: 14,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(247,240,232,0.74))",
  overflow: "auto",
};

const slotListWrapStyle = {
  display: "grid",
  gap: 14,
  borderRadius: 16,
  padding: 16,
  border: "1px solid var(--app-border)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,249,245,0.88))",
};

const slotListStyle = {
  display: "grid",
  gap: 10,
  maxHeight: 420,
  overflowY: "auto",
};

const slotCardStyle = {
  border: "1px solid rgba(47, 124, 104, 0.16)",
  borderRadius: 12,
  padding: "12px 14px",
  background: "rgba(244, 252, 249, 0.92)",
  display: "grid",
  gap: 8,
  cursor: "pointer",
};

const selectedSlotCardStyle = {
  border: "1px solid rgba(143, 62, 44, 0.22)",
  background: "linear-gradient(135deg, rgba(255,241,234,0.96), rgba(255,249,245,0.96))",
  boxShadow: "0 14px 24px rgba(143, 62, 44, 0.08)",
};

const occupiedSlotCardStyle = {
  border: "1px dashed rgba(133, 117, 107, 0.45)",
  background: "rgba(244, 240, 237, 0.9)",
  cursor: "not-allowed",
};

const slotStatusStyle = {
  fontSize: 12,
  color: "var(--app-text-muted)",
  textAlign: "left",
  lineHeight: 1.4,
};

const helperPillStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--app-accent)",
  background: "rgba(143, 62, 44, 0.08)",
};

const selectionSummaryStyle = {
  display: "grid",
  gap: 6,
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  background: "rgba(255, 248, 242, 0.88)",
};

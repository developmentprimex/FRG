"use client";

import { useState } from "react";
import AdminSelect from "./admin-select";
import { useAdminI18n } from "./admin-i18n";

export function AdminComponentSlotPicker({
  name,
  label = "",
  labelI18nKey = "componentSlotPicker.componentSlot",
  labelFallback = "Component slot",
  slots,
  defaultValue = "",
  occupiedByKey = {},
  allowOccupiedKey = "",
  helperText = "Select a kitchen slot for this component.",
  compact = false,
  allowEmpty = true,
}) {
  const { translate } = useAdminI18n();
  const resolvedLabel = label || translate(labelI18nKey, labelFallback);
  const [selectedKey, setSelectedKey] = useState(defaultValue || "");
  const selectedSlot = slots.find((slot) => slot.componentKey === selectedKey) || null;

  return (
    <div style={rootStyle}>
      <div style={headerStyle}>
        <strong style={{ fontSize: 14 }}>{resolvedLabel}</strong>
        {!compact ? (
          <span style={helperStyle}>
            {selectedSlot ? `${selectedSlot.label} (${selectedSlot.zone})` : helperText}
          </span>
        ) : null}
      </div>

      <input type="hidden" name={name} value={selectedKey} />

      {compact ? (
        <div
          style={{
            ...compactControlStyle,
            ...(selectedKey ? selectedCardStyle : null),
          }}
        >
          <div style={compactSelectionStyle}>
            <span style={iconWrapStyle}>
              {selectedSlot ? <SlotIcon componentKey={selectedSlot.componentKey} /> : <NoneIcon />}
            </span>
            <div style={textWrapStyle}>
              <strong style={{ fontSize: 13 }}>
                {selectedSlot ? selectedSlot.label : translate("componentSlotPicker.noSlotSelected", "No slot selected")}
              </strong>
              <span style={metaStyle}>
                {selectedSlot
                  ? `${selectedSlot.zone} • ${translate("componentSlotPicker.selectedSlot", "Selected slot")}`
                  : translate("componentSlotPicker.assignThisComponentToKitchenSlot", "Assign this component to a kitchen slot")}
              </span>
            </div>
          </div>

          <AdminSelect
            value={selectedKey}
            onChange={(event) => setSelectedKey(event.target.value)}
            style={compactSelectStyle}
            aria-label={resolvedLabel}
          >
            <option value="" disabled={!allowEmpty}>
              {allowEmpty
                ? translate("componentSlotPicker.none", "None")
                : translate("componentSlotPicker.choosePosition", "Choose position")}
            </option>
            {slots.map((slot) => {
              const occupiedLabels = occupiedByKey[slot.componentKey] || [];
              const isOccupied = occupiedLabels.length > 0 && slot.componentKey !== allowOccupiedKey;

              return (
                <option key={slot.componentKey} value={slot.componentKey} disabled={isOccupied}>
                  {slot.label} ({slot.zone}){isOccupied ? ` - ${translate("componentSlotPicker.occupied", "occupied")}` : ""}
                </option>
              );
            })}
          </AdminSelect>
        </div>
      ) : (
      <div style={gridStyle}>
        {allowEmpty ? (
          <button
            type="button"
            onClick={() => setSelectedKey("")}
            style={{
              ...cardStyle,
              ...(selectedKey === "" ? selectedCardStyle : null),
            }}
          >
            <span style={iconWrapStyle}>
              <NoneIcon />
            </span>
            <div style={textWrapStyle}>
              <strong style={{ fontSize: 13 }}>{translate("componentSlotPicker.none", "None")}</strong>
              <span style={metaStyle}>{translate("componentSlotPicker.noSlotAssigned", "No slot assigned")}</span>
            </div>
          </button>
        ) : null}

        {slots.map((slot) => {
          const occupiedLabels = occupiedByKey[slot.componentKey] || [];
          const isOccupied = occupiedLabels.length > 0 && slot.componentKey !== allowOccupiedKey;
          const isSelected = selectedKey === slot.componentKey;

          return (
            <button
              key={slot.componentKey}
              type="button"
              onClick={() => {
                if (!isOccupied) {
                  setSelectedKey(slot.componentKey);
                }
              }}
              disabled={isOccupied}
              style={{
                ...cardStyle,
                ...(isSelected ? selectedCardStyle : null),
                ...(isOccupied ? occupiedCardStyle : null),
              }}
            >
              <span style={iconWrapStyle}>
                <SlotIcon componentKey={slot.componentKey} />
              </span>
              <div style={textWrapStyle}>
                <strong style={{ fontSize: 13 }}>{slot.label}</strong>
                <span style={metaStyle}>{slot.zone}</span>
                {isOccupied ? (
                  <span style={occupiedTextStyle}>
                    {occupiedLabels.length > 1
                      ? `${occupiedLabels.length} ${translate("componentSlotPicker.itemsAssigned", "items assigned")}`
                      : occupiedLabels[0]}
                  </span>
                ) : (
                  <span style={availableTextStyle}>
                    {isSelected
                      ? translate("componentSlotPicker.selected", "Selected")
                      : translate("componentSlotPicker.available", "Available")}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}

function SlotIcon({ componentKey }) {
  const key = String(componentKey || "").toLowerCase();

  if (key.includes("refrigerator")) return <TallUnitIcon />;
  if (key.includes("extractor") || key.includes("hood")) return <HoodIcon />;
  if (key.includes("sink-faucet") || key.includes("faucet")) return <FaucetIcon />;
  if (key.includes("worktop")) return <WorktopIcon />;
  if (key.includes("light")) return <LightIcon />;
  if (key.includes("wall-cabinet")) return <WallCabinetIcon />;
  if (key.includes("dishwasher")) return <DishwasherIcon />;
  if (key.includes("wm") || key.includes("washing-machine")) return <WashingMachineIcon />;
  if (key.includes("oven")) return <OvenIcon />;
  if (key.includes("drawer")) return <DrawerBaseIcon />;
  if (key.includes("sink-base")) return <SinkBaseIcon />;
  if (key.includes("cook-base") || key.includes("base-module")) return <BaseCabinetIcon />;

  return <GenericCabinetIcon />;
}

function IconFrame({ children }) {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function NoneIcon() {
  return (
    <IconFrame>
      <circle cx="17" cy="17" r="11" stroke="currentColor" strokeWidth="1.8" opacity="0.45" />
      <path d="M10 24L24 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconFrame>
  );
}

function TallUnitIcon() {
  return (
    <IconFrame>
      <rect x="11" y="4.5" width="12" height="25" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11 17H23" stroke="currentColor" strokeWidth="1.7" />
    </IconFrame>
  );
}

function HoodIcon() {
  return (
    <IconFrame>
      <rect x="14" y="5" width="6" height="10" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 18H25V23H9V18Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 25L10 28" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17 25V29" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M22 25L24 28" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}

function WallCabinetIcon() {
  return (
    <IconFrame>
      <rect x="7" y="7" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M17 7V23" stroke="currentColor" strokeWidth="1.7" />
    </IconFrame>
  );
}

function LightIcon() {
  return (
    <IconFrame>
      <path d="M17 9C13.7 9 11 11.7 11 15C11 17.1 12.1 19 13.8 20.1V22.2H20.2V20.1C21.9 19 23 17.1 23 15C23 11.7 20.3 9 17 9Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14.5 25H19.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17 5V7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 15H7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M27 15H25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}

function BaseCabinetIcon() {
  return (
    <IconFrame>
      <rect x="7" y="7" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 13H27" stroke="currentColor" strokeWidth="1.7" />
    </IconFrame>
  );
}

function OvenIcon() {
  return (
    <IconFrame>
      <rect x="7" y="7" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 12H27" stroke="currentColor" strokeWidth="1.7" />
      <rect x="11" y="15" width="12" height="8" stroke="currentColor" strokeWidth="1.5" />
    </IconFrame>
  );
}

function DrawerBaseIcon() {
  return (
    <IconFrame>
      <rect x="7" y="7" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 13H27" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 19H27" stroke="currentColor" strokeWidth="1.7" />
    </IconFrame>
  );
}

function SinkBaseIcon() {
  return (
    <IconFrame>
      <rect x="7" y="7" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 13H22" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </IconFrame>
  );
}

function DishwasherIcon() {
  return (
    <IconFrame>
      <rect x="7" y="7" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11 12H23" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 17H23" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 22H23" stroke="currentColor" strokeWidth="1.5" />
    </IconFrame>
  );
}

function WashingMachineIcon() {
  return (
    <IconFrame>
      <rect x="7" y="7" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="18" r="5.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.5 11H17" stroke="currentColor" strokeWidth="1.5" />
    </IconFrame>
  );
}

function FaucetIcon() {
  return (
    <IconFrame>
      <path d="M17 26V18C17 14 20 13 22 13C24 13 26 14 26 17V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 22L12 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 26H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconFrame>
  );
}

function WorktopIcon() {
  return (
    <IconFrame>
      <path d="M7 14H27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 20H27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconFrame>
  );
}

function GenericCabinetIcon() {
  return (
    <IconFrame>
      <rect x="8" y="8" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
    </IconFrame>
  );
}

const rootStyle = {
  gridColumn: "1 / -1",
  display: "grid",
  gap: 6,
};

const headerStyle = {
  display: "grid",
  gap: 2,
  color: "var(--app-text)",
};

const helperStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.35,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 10,
};

const compactControlStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 320px)",
  alignItems: "center",
  border: "1px solid rgba(172, 111, 70, 0.18)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.8)",
  padding: "8px 10px",
};

const cardStyle = {
  border: "1px solid rgba(172, 111, 70, 0.18)",
  borderRadius: 14,
  background: "rgba(255,255,255,0.8)",
  color: "var(--app-text)",
  padding: "12px 14px",
  display: "flex",
  gap: 12,
  alignItems: "center",
  textAlign: "left",
  cursor: "pointer",
  minHeight: 74,
};

const compactSelectStyle = {
  width: "100%",
  minHeight: 38,
  borderRadius: 12,
  border: "1px solid var(--app-border-strong)",
  background: "rgba(255,255,255,0.82)",
  padding: "6px 10px",
  color: "var(--app-text)",
  fontSize: "0.9rem",
};

const compactSelectionStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
};

const selectedCardStyle = {
  border: "1px solid rgba(143, 62, 44, 0.28)",
  background: "linear-gradient(135deg, rgba(255,240,230,0.96), rgba(255,250,246,0.96))",
  boxShadow: "0 12px 24px rgba(143, 62, 44, 0.08)",
};

const occupiedCardStyle = {
  opacity: 0.58,
  cursor: "not-allowed",
  background: "rgba(245, 241, 237, 0.9)",
};

const iconWrapStyle = {
  width: 34,
  height: 34,
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  background: "rgba(143, 62, 44, 0.08)",
  color: "var(--app-accent)",
};

const textWrapStyle = {
  display: "grid",
  gap: 1,
  minWidth: 0,
};

const metaStyle = {
  color: "var(--app-text-muted)",
  fontSize: 11,
};

const availableTextStyle = {
  color: "#2f7c68",
  fontSize: 12,
  fontWeight: 700,
};

const occupiedTextStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.4,
};

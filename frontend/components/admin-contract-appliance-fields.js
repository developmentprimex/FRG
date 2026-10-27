"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONTRACT_APPLIANCE_BRANDS,
  CONTRACT_APPLIANCE_TYPES,
} from "../lib/contract-appliances";
import { AdminText, useAdminI18n } from "./admin-i18n";
import { inputStyle } from "./admin-ui";

export default function AdminContractApplianceFields({ initialInventory = null, kitchenId = "", contractId = "", contractType = "FRG" }) {
  const fieldsetRef = useRef(null);
  const { translate } = useAdminI18n();
  const [selectedKitchenId, setSelectedKitchenId] = useState(kitchenId);
  const [inventory, setInventory] = useState(initialInventory);
  const [loadedKitchenId, setLoadedKitchenId] = useState(initialInventory ? kitchenId : null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const initial = useRef({ kitchenId, inventory: initialInventory });
  useEffect(() => setSelectedKitchenId(kitchenId), [kitchenId]);
  useEffect(() => {
    const form = fieldsetRef.current?.form;
    const onChange = (event) => {
      if (event.target.name === "kitchenId") setSelectedKitchenId(event.target.value);
    };
    form?.addEventListener("change", onChange);
    return () => form?.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    if (initial.current.inventory && selectedKitchenId === initial.current.kitchenId && !retry) {
      setLoadError(false);
      setInventory(initial.current.inventory);
      setLoadedKitchenId(selectedKitchenId);
      return;
    }
    const controller = new AbortController();
    setLoadedKitchenId(null);
    setLoadError(false);
    const params = new URLSearchParams({ kitchenId: selectedKitchenId, contractId, contractType });
    fetch(`/api/admin/contracts/appliances?${params}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("inventory"); return response.json(); })
      .then((data) => { setInventory(data); setLoadedKitchenId(selectedKitchenId); })
      .catch((error) => { if (error.name !== "AbortError") setLoadError(true); });
    return () => controller.abort();
  }, [selectedKitchenId, contractId, contractType, retry]);
  const ready = !loadError && loadedKitchenId === selectedKitchenId;
  useEffect(() => {
    const form = fieldsetRef.current?.form;
    const onSubmit = (event) => { if (!ready) { event.preventDefault(); setLoadError(true); } };
    form?.addEventListener("submit", onSubmit);
    return () => form?.removeEventListener("submit", onSubmit);
  }, [ready]);
  const toggle = (type) => setInventory((current) => ({ ...current, entries: current.entries.map((entry) =>
    entry.applianceType === type ? { ...entry, isPresent: !entry.isPresent } : entry) }));

  return (
    <fieldset ref={fieldsetRef} style={fieldsetStyle}>
      <input type="hidden" name="applianceInventorySubmitted" value={ready ? "true" : "loading"} />
      <input type="hidden" name="applianceInventoryKitchenId" value={loadedKitchenId || ""} />
      <legend style={legendStyle}>
        <AdminText i18nKey="contractDetailAdmin.appliances" fallback="Electrical appliances" />
      </legend>
      <p style={hintStyle}>
        <AdminText
          i18nKey={inventory?.manual ? "contractDetailAdmin.manualAppliancesHelp" : "contractDetailAdmin.linkedAppliancesHelp"}
          fallback={inventory?.manual ? "Keep only the installed appliances. Removed appliances cannot be selected in claims." : "Appliances come from the kitchen and confirmed orders. Set a brand override only when the installed appliance differs."}
        />
      </p>
      {inventory?.manual && !inventory.configured ? <p style={hintStyle}><AdminText i18nKey="contractDetailAdmin.inventoryUnreviewed" fallback="This appliance list has not been checked yet. Remove missing appliances and save to confirm it." /></p> : null}
      {!ready ? <p role="status"><AdminText i18nKey={loadError ? "contractDetailAdmin.inventoryLoadError" : "contractDetailAdmin.inventoryLoading"} fallback={loadError ? "Could not load appliances. Retry before saving." : "Loading appliances…"} />{loadError ? <button type="button" onClick={() => setRetry((value) => value + 1)}><AdminText i18nKey="contractDetailAdmin.inventoryRetry" fallback="Retry" /></button> : null}</p> : null}
      {ready && !inventory?.entries.length ? <p style={hintStyle}><AdminText i18nKey="contractDetailAdmin.noInstalledAppliances" fallback="No electrical appliances are included in this kitchen or its confirmed orders." /></p> : null}
      <div style={gridStyle} key={loadedKitchenId}>
        {ready && inventory?.entries.map((appliance) => {
          const { type, labelKey, label } = CONTRACT_APPLIANCE_TYPES.find((entry) => entry.type === appliance.applianceType);
          return (
            <div key={type} style={rowStyle}>
              <input type="hidden" name={`appliancePresent:${type}`} value={String(appliance.isPresent)} />
              <strong style={labelStyle}>
                <AdminText i18nKey={`contractDetailAdmin.${labelKey}`} fallback={label} />
              </strong>
              {inventory.manual && appliance.isPresent ? (
                <button
                  type="button"
                  onClick={() => toggle(type)}
                  aria-label={translate("contractDetailAdmin.removeAppliance", "Remove appliance")}
                  title={translate("contractDetailAdmin.removeAppliance", "Remove appliance")}
                  style={removeButtonStyle}
                >
                  ×
                </button>
              ) : null}
              {inventory.manual && !appliance.isPresent ? (
                <button type="button" onClick={() => toggle(type)}>
                  <AdminText i18nKey="contractDetailAdmin.restoreAppliance" fallback="Restore appliance" />
                </button>
              ) : null}
              {!inventory.manual ? <span style={hintStyle}>{CONTRACT_APPLIANCE_BRANDS.find((brand) => brand.value === appliance.brand)?.label || translate("contractDetailAdmin.notSpecified", "Not specified")}</span> : null}
              {appliance.conflictingBrand ? <span style={hintStyle}><AdminText i18nKey="contractDetailAdmin.applianceBrandConflict" fallback="The saved brand differs from the linked product. Verify the installed appliance." /></span> : null}
              <label style={{ ...controlStyle, display: appliance.isPresent ? "grid" : "none" }}>
                <span style={controlLabelStyle}><AdminText i18nKey="contractDetailAdmin.brand" fallback="Brand" /></span>
                <select name={`applianceBrand:${type}`} defaultValue={(inventory.manual ? appliance.brand : appliance.overrideBrand) || ""} style={inputStyle}>
                  <option value=""><AdminText i18nKey={inventory.manual ? "contractDetailAdmin.notSpecified" : "contractDetailAdmin.automaticAppliance"} fallback={inventory.manual ? "Not specified" : "Use linked product"} /></option>
                  {CONTRACT_APPLIANCE_BRANDS.map((brand) => (
                    <option key={brand.value} value={brand.value}>{brand.label}</option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

const fieldsetStyle = {
  alignSelf: "stretch",
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  boxSizing: "border-box",
  display: "grid",
  gap: 14,
  gridColumn: "1 / -1",
  margin: "4px 0",
  minWidth: 0,
  padding: 16,
  width: "100%",
};

const legendStyle = { color: "var(--app-text)", fontSize: 16, fontWeight: 800, padding: "0 6px" };
const hintStyle = { color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.5, margin: 0 };
const gridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
};
const rowStyle = {
  alignContent: "start",
  background: "rgba(255,255,255,0.72)",
  border: "1px solid var(--app-border)",
  borderRadius: 12,
  display: "grid",
  gap: 12,
  minWidth: 0,
  padding: 14,
  paddingRight: 48,
  position: "relative",
};
const labelStyle = { color: "var(--app-text)", fontSize: 14 };
const controlStyle = { display: "grid", gap: 5 };
const controlLabelStyle = { color: "var(--app-text-muted)", fontSize: 11, fontWeight: 800, textTransform: "uppercase" };
const removeButtonStyle = {
  alignItems: "center",
  background: "transparent",
  border: 0,
  borderRadius: 8,
  color: "var(--app-text-muted)",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 24,
  height: 32,
  justifyContent: "center",
  lineHeight: 1,
  padding: 0,
  position: "absolute",
  right: 8,
  top: 6,
  width: 32,
};

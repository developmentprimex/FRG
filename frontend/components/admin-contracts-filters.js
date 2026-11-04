"use client";

import AdminFilterForm from "./admin-filter-form";

import Link from "next/link";
import { AdminText, useAdminI18n } from "./admin-i18n";
import { inputStyle, primaryButtonStyle } from "./admin-ui";
import AdminSelect from "./admin-select";

function FilterField({ label, children }) {
  return (
    <label style={filterFieldStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function AdminContractsFilters({
  owners = [],
  filters = {},
}) {
  const { translate } = useAdminI18n();

  return (
    <AdminFilterForm action="/admin/contracts" style={filterPanelStyle}>
        <FilterField label={<AdminText i18nKey="contractsAdmin.search" fallback="Search" />}>
          <input
            name="q"
            defaultValue={filters.query || ""}
            placeholder={translate("contractsAdmin.contractKitchenOwnerCityPlaceholder", "Contract number, kitchen, partner, city...")}
            style={filterInputStyle}
          />
        </FilterField>
        <FilterField label={<AdminText i18nKey="contractsAdmin.contractType" fallback="Contract type" />}>
          <AdminSelect name="contractType" defaultValue={filters.contractType || ""} style={filterInputStyle}>
            <option value=""><AdminText i18nKey="contractsAdmin.allContractTypes" fallback="All contract types" /></option>
            <option value="ARC">ARC</option>
            <option value="FRG">FRG</option>
          </AdminSelect>
        </FilterField>
        <FilterField label={<AdminText i18nKey="contractsAdmin.owner" fallback="Housing company" />}>
          <AdminSelect
            name="housingCompanyId"
            defaultValue={filters.housingCompanyId || ""}
            style={filterInputStyle}
          >
            <option value=""><AdminText i18nKey="contractsAdmin.allOwners" fallback="All owners" /></option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
          </AdminSelect>
        </FilterField>
        <FilterField label={<AdminText i18nKey="dashboard.status" fallback="Status" />}>
          <AdminSelect name="status" defaultValue={filters.status || ""} style={filterInputStyle}>
            <option value=""><AdminText i18nKey="dashboard.allStatuses" fallback="All statuses" /></option>
            <option value="active"><AdminText i18nKey="contractsAdmin.active" fallback="Active" /></option>
            <option value="inactive"><AdminText i18nKey="contractsAdmin.inactive" fallback="Inactive" /></option>
          </AdminSelect>
        </FilterField>
        <FilterField label={<AdminText i18nKey="contractsAdmin.usage" fallback="Usage" />}>
          <AdminSelect name="usage" defaultValue={filters.usage || ""} style={filterInputStyle}>
            <option value=""><AdminText i18nKey="contractsAdmin.allUsage" fallback="All usage" /></option>
            <option value="unused"><AdminText i18nKey="contractsAdmin.unused" fallback="Unused" /></option>
            <option value="used"><AdminText i18nKey="contractsAdmin.used" fallback="Used" /></option>
            <option value="once"><AdminText i18nKey="contractsAdmin.usedOnce" fallback="Used once" /></option>
            <option value="multiple"><AdminText i18nKey="contractsAdmin.usedTwoPlusTimes" fallback="Used 2+ times" /></option>
          </AdminSelect>
        </FilterField>
        <div style={filterActionsStyle}>
          <Link scroll={false} href="/admin/contracts" style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
        </div>
    </AdminFilterForm>
  );
}

const filterPanelStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "end",
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
};

const filterFieldStyle = {
  flex: "1 1 160px",
  minWidth: 0,
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  ...inputStyle,
  width: "100%",
  minWidth: 0,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "var(--admin-text-body)",
  boxShadow: "none",
};

const filterActionsStyle = {
  flex: "0 0 auto",
  display: "flex",
  gap: 8,
  alignItems: "end",
  flexWrap: "wrap",
};

const filterApplyButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "var(--admin-text-body)",
  fontWeight: 600,
  whiteSpace: "nowrap",
  boxShadow: "0 10px 20px rgba(143, 62, 44, 0.16)",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "rgba(255,255,255,0.88)",
  color: "var(--app-accent)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  fontWeight: 600,
  fontSize: "var(--admin-text-body)",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};

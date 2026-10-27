"use client";

import { useState } from "react";
import AdminContractLinkFields from "./admin-contract-link-fields";
import AdminContractApplianceFields from "./admin-contract-appliance-fields";
import AdminFileInput from "./admin-file-input";
import AdminSelect from "./admin-select";
import { AdminText, useAdminI18n } from "./admin-i18n";
import { FormField, inputStyle, primaryButtonStyle } from "./admin-ui";

export default function AdminContractCreateForm({
  kitchens = [],
  owners = [],
  projects = [],
  defaultKitchenId = "",
  defaultHousingCompanyId = "",
  defaultProjectId = "",
  returnTo = "/admin/contracts",
}) {
  const [contractType, setContractType] = useState("");
  const [kitchenId, setKitchenId] = useState(defaultKitchenId || "");
  const { translate } = useAdminI18n();

  return (
    <div style={rootStyle}>
      <div role="group" aria-label={translate("contractsAdmin.contractType", "Contract type")} style={typeGridStyle}>
        <button
          type="button"
          aria-pressed={contractType === "ARC"}
          onClick={() => setContractType("ARC")}
          style={contractType === "ARC" ? selectedTypeButtonStyle : typeButtonStyle}
        >
          <strong style={typeTitleStyle}>ARC</strong>
          <span style={typeDescriptionStyle}>
            <AdminText i18nKey="contractsAdmin.arcDescription" fallback="Contract number and kitchen sketch only" />
          </span>
        </button>
        <button
          type="button"
          aria-pressed={contractType === "FRG"}
          onClick={() => setContractType("FRG")}
          style={contractType === "FRG" ? selectedTypeButtonStyle : typeButtonStyle}
        >
          <strong style={typeTitleStyle}>FRG</strong>
          <span style={typeDescriptionStyle}>
            <AdminText i18nKey="contractsAdmin.frgDescription" fallback="Kitchen, project and housing-company contract" />
          </span>
        </button>
      </div>

      {!contractType ? (
        <p style={choiceHintStyle}>
          <AdminText i18nKey="contractsAdmin.chooseContractType" fallback="Choose ARC or FRG to continue." />
        </p>
      ) : null}

      {contractType === "ARC" ? (
        <form
          key="arc-contract"
          action="/api/admin/contracts"
          method="post"
          encType="multipart/form-data"
          style={arcFormStyle}
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="contractType" value="ARC" />
          <FormField label={<AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" />}>
            <input name="contractNumber" placeholder="222" style={compactInputStyle} required />
          </FormField>
          <FormField label={<AdminText i18nKey="contractsAdmin.kitchenSketch" fallback="Kitchen sketch (JPG, PNG, or WebP)" />}>
            <AdminFileInput
              name="claimPlanPreviewFile"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              chooseFileKey="contractsAdmin.chooseFile"
              noFileChosenKey="contractsAdmin.noFileChosen"
              style={compactInputStyle}
              required
            />
          </FormField>
          <AdminContractApplianceFields contractType="ARC" />
          <div style={actionStyle}>
            <button type="submit" style={primaryButtonStyle}>
              <AdminText i18nKey="contractsAdmin.createArcContract" fallback="Create ARC contract" />
            </button>
          </div>
        </form>
      ) : null}

      {contractType === "FRG" ? (
        <form
          key="frg-contract"
          action="/api/admin/contracts"
          method="post"
          encType="multipart/form-data"
          style={frgFormStyle}
        >
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="contractType" value="FRG" />
          <FormField label={<AdminText i18nKey="kitchensAdmin.kitchen" fallback="Kitchen" />}>
            <AdminSelect name="kitchenId" value={kitchenId} onChange={(event) => setKitchenId(event.target.value)} style={compactInputStyle}>
              <option value=""><AdminText i18nKey="contractsAdmin.selectKitchen" fallback="Select kitchen" /></option>
              {kitchens.map((kitchen) => (
                <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>
              ))}
            </AdminSelect>
          </FormField>
          <FormField label={<AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" />}>
            <input name="contractNumber" placeholder="670123456" style={compactInputStyle} required />
          </FormField>
          <FormField label={<AdminText i18nKey="contractsAdmin.kitchenSketch" fallback="Kitchen sketch (JPG, PNG, or WebP)" />}>
            <AdminFileInput
              name="claimPlanPreviewFile"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              chooseFileKey="contractsAdmin.chooseFile"
              noFileChosenKey="contractsAdmin.noFileChosen"
              style={compactInputStyle}
            />
          </FormField>
          <FormField label={<AdminText i18nKey="contractsAdmin.originalKitchenPlanOptional" fallback="Original kitchen plan (PDF, optional)" />}>
            <AdminFileInput
              name="claimPlanPdfFile"
              accept="application/pdf,.pdf"
              chooseFileKey="contractsAdmin.chooseFile"
              noFileChosenKey="contractsAdmin.noFileChosen"
              style={compactInputStyle}
            />
          </FormField>
          <AdminContractLinkFields
            owners={owners}
            projects={projects}
            defaultHousingCompanyId={defaultHousingCompanyId}
            defaultProjectId={defaultProjectId}
            allowInlineObjectCreate
            compact
            contract={{}}
          />
          <AdminContractApplianceFields kitchenId={kitchenId} />
          <div style={actionStyle}>
            <button type="submit" style={primaryButtonStyle}>
              <AdminText i18nKey="contractsAdmin.createFrgContract" fallback="Create FRG contract" />
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

const rootStyle = {
  display: "grid",
  gap: 18,
  paddingTop: 6,
};

const typeGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 280px))",
  gap: 12,
};

const typeButtonStyle = {
  display: "grid",
  gap: 5,
  minHeight: 88,
  padding: "16px 18px",
  borderRadius: 12,
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.86)",
  color: "var(--app-text)",
  textAlign: "left",
  cursor: "pointer",
};

const selectedTypeButtonStyle = {
  ...typeButtonStyle,
  border: "2px solid var(--app-accent)",
  background: "var(--app-accent-soft)",
  boxShadow: "0 8px 20px rgba(99, 67, 47, 0.10)",
};

const typeTitleStyle = {
  fontSize: 20,
  lineHeight: 1.1,
};

const typeDescriptionStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.35,
};

const choiceHintStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 14,
};

const arcFormStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(180px, 260px) minmax(280px, 440px)",
  gap: 14,
  alignItems: "end",
  maxWidth: 760,
};

const frgFormStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  alignItems: "start",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 42,
  padding: "7px 10px",
  fontSize: "0.92rem",
};

const actionStyle = {
  gridColumn: "1 / -1",
  paddingTop: 2,
};

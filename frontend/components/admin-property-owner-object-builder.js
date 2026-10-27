"use client";

import { useState } from "react";
import AdminContractAddressFields from "./admin-contract-address-fields";
import AdminSelect from "./admin-select";
import { useAdminI18n } from "./admin-i18n";
import {
  FormField,
  actionRowStyle,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
  textareaStyle,
} from "./admin-ui";

function createObjectDraft(id) {
  return { id };
}

function objectFieldNames(id) {
  return {
    name: `objectName__${id}`,
    projectName: `projectName__${id}`,
    projectCode: `projectCode__${id}`,
    projectStatus: `projectStatus__${id}`,
    projectDescription: `projectDescription__${id}`,
    projectManagerName: `projectManagerName__${id}`,
    contactPhone: `objectContactPhone__${id}`,
    country: `objectCountry__${id}`,
    city: `objectCity__${id}`,
    postalCode: `objectPostalCode__${id}`,
    address1: `objectAddress1__${id}`,
    address2: `objectAddress2__${id}`,
    addressVerification: `objectAddressVerification__${id}`,
  };
}

export default function AdminPropertyOwnerObjectBuilder() {
  const { translate } = useAdminI18n();
  const [nextId, setNextId] = useState(0);
  const [drafts, setDrafts] = useState([]);

  function handleAddObject() {
    setDrafts((current) => [...current, createObjectDraft(nextId)]);
    setNextId((current) => current + 1);
  }

  function handleRemoveObject(id) {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }

  return (
    <div style={builderStyle}>
      <div style={builderHeaderStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <strong style={builderTitleStyle}>
            {translate("propertyOwnersAdmin.objectsToCreate", "Objects/buildings to create")}
          </strong>
          <p style={mutedTextStyle}>
            {translate("propertyOwnersAdmin.objectsOptionalHelp", "Add one or more objects now, or leave this section empty.")}
          </p>
        </div>
        <button type="button" onClick={handleAddObject} style={secondaryButtonStyle}>
          {translate("propertyOwnersAdmin.addAnotherObject", "Add another object")}
        </button>
      </div>

      {!drafts.length ? (
        <p style={mutedTextStyle}>
          {translate("propertyOwnersAdmin.noPendingObjects", "No objects queued for creation yet.")}
        </p>
      ) : null}

      <div style={draftListStyle}>
        {drafts.map((draft, index) => {
          const fieldNames = objectFieldNames(draft.id);

          return (
            <section key={draft.id} style={draftCardStyle}>
              <div style={draftCardHeaderStyle}>
                <strong style={draftLabelStyle}>
                  {translate("propertyOwnersAdmin.objectDraftLabel", "Object")} {index + 1}
                </strong>
                <button type="button" onClick={() => handleRemoveObject(draft.id)} style={removeButtonStyle}>
                  {translate("propertyOwnersAdmin.removeObject", "Remove object")}
                </button>
              </div>

              <div style={draftGridStyle}>
                <FormField label={translate("propertyOwnersAdmin.objectName", "Object/building name")}>
                  <input
                    name={fieldNames.name}
                    placeholder={translate("propertyOwnersAdmin.objectNamePlaceholder", "Building A")}
                    style={compactInputStyle}
                    required
                  />
                </FormField>
                <FormField label={translate("propertyOwnersAdmin.projectName", "Project name")}>
                  <input
                    name={fieldNames.projectName}
                    placeholder={translate("propertyOwnersAdmin.projectNamePlaceholder", "Project A")}
                    style={compactInputStyle}
                    required
                  />
                </FormField>
                <FormField label={translate("propertyOwnersAdmin.projectCode", "Project code")}>
                  <input
                    name={fieldNames.projectCode}
                    placeholder={translate("propertyOwnersAdmin.projectCodePlaceholder", "PRJ-204")}
                    style={compactInputStyle}
                  />
                </FormField>
                <FormField label={translate("propertyOwnersAdmin.projectStatus", "Project status")}>
                  <AdminSelect name={fieldNames.projectStatus} defaultValue="active" style={compactInputStyle}>
                    <option value="planning">{translate("propertyOwnersAdmin.projectStatusPlanning", "Planning")}</option>
                    <option value="active">{translate("propertyOwnersAdmin.projectStatusActive", "Active")}</option>
                    <option value="on_hold">{translate("propertyOwnersAdmin.projectStatusOnHold", "On hold")}</option>
                    <option value="completed">{translate("propertyOwnersAdmin.projectStatusCompleted", "Completed")}</option>
                    <option value="archived">{translate("propertyOwnersAdmin.projectStatusArchived", "Archived")}</option>
                  </AdminSelect>
                </FormField>
                <FormField label={translate("propertyOwnersAdmin.projectManagerName", "Project manager")}>
                  <input
                    name={fieldNames.projectManagerName}
                    placeholder={translate("propertyOwnersAdmin.projectManagerNamePlaceholder", "Alex Meyer")}
                    style={compactInputStyle}
                  />
                </FormField>
                <FormField label={translate("propertyOwnersAdmin.objectContactPhone", "Contact phone")}>
                  <input
                    name={fieldNames.contactPhone}
                    placeholder={translate("propertyOwnersAdmin.objectContactPhonePlaceholder", "+49 170 1234567")}
                    style={compactInputStyle}
                  />
                </FormField>
                <FormField label={translate("propertyOwnersAdmin.projectDescription", "Project description")} wide>
                  <textarea
                    name={fieldNames.projectDescription}
                    placeholder={translate("propertyOwnersAdmin.projectDescriptionPlaceholder", "Internal notes about this project")}
                    rows={3}
                    style={compactTextareaStyle}
                  />
                </FormField>
                <AdminContractAddressFields
                  mode="object"
                  compact
                  includeUnitFields={false}
                  includeNotes={false}
                  referenceFieldName={fieldNames.name}
                  fieldNames={fieldNames}
                  allowEmpty
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const builderStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid rgba(143, 62, 44, 0.12)",
  borderRadius: 10,
  background: "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,247,240,0.62))",
};

const compactInputStyle = {
  ...inputStyle,
  minHeight: 40,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: "0.92rem",
};

const compactTextareaStyle = {
  ...textareaStyle,
  minHeight: 64,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: "0.92rem",
};

const builderHeaderStyle = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
};

const builderTitleStyle = {
  color: "var(--app-text)",
  fontSize: 15,
};

const draftListStyle = {
  display: "grid",
  gap: 10,
};

const draftCardStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(45, 108, 121, 0.12)",
  background: "rgba(255,255,255,0.78)",
};

const draftCardHeaderStyle = {
  ...actionRowStyle,
  justifyContent: "space-between",
};

const draftLabelStyle = {
  color: "var(--app-text)",
  fontSize: 14,
};

const draftGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  alignItems: "start",
};

const removeButtonStyle = {
  border: "1px solid rgba(180, 71, 57, 0.16)",
  borderRadius: 8,
  minHeight: 38,
  padding: "8px 10px",
  background: "rgba(255, 247, 245, 0.9)",
  color: "var(--app-danger-text)",
  font: "inherit",
  fontWeight: 700,
  fontSize: "0.9rem",
  cursor: "pointer",
};

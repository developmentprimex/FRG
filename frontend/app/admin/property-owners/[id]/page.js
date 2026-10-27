import {
  ActionLink,
  AdminSection,
  FlashMessage,
  FormField,
  actionRowStyle,
  dangerButtonStyle,
  inputStyle,
  itemCardStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  splitGridStyle,
  textareaStyle,
} from "../../../../components/admin-ui";
import Link from "next/link";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminDateTime, AdminPluralText, AdminText, AdminTranslatedInput } from "../../../../components/admin-i18n";
import AdminConfirmSubmitButton from "../../../../components/admin-confirm-submit-button";
import AdminContractAddressFields from "../../../../components/admin-contract-address-fields";
import AdminSelect from "../../../../components/admin-select";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getPropertyOwnerForAdmin, listKitchensForAdmin } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

function normalizeRouteId(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function propertyObjectAddress(object) {
  const streetLine = [object.address1, object.address2].filter(Boolean).join(", ");
  const cityLine = [object.postalCode, object.city].filter(Boolean).join(" ");
  return [streetLine, cityLine, object.country].filter(Boolean).join(" | ");
}

function buildOwnerDetailPath(ownerId, searchValues = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(searchValues).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return `/admin/property-owners/${ownerId}${query ? `?${query}` : ""}`;
}

export default async function AdminPropertyOwnerDetailPage({ params, searchParams }) {
  const admin = await requireAdminPage();
  const { id: rawId } = await params;
  const id = normalizeRouteId(rawId);
  const resolvedSearchParams = (await searchParams) || {};
  const [owner, kitchens] = await Promise.all([
    getPropertyOwnerForAdmin(id),
    listKitchensForAdmin(),
  ]);
  const createObjectOpen = normalizeParam(resolvedSearchParams.createObject) === "1";
  const createContractOpen = normalizeParam(resolvedSearchParams.createContract) === "1";
  const openObjectId = normalizeParam(resolvedSearchParams.openObject);

  if (!owner) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="propertyOwnersAdmin.ownerNotFound" fallback="Housing company not found" />}
            description={<AdminText i18nKey="propertyOwnersAdmin.ownerRecordDoesNotExist" fallback="The requested partner record does not exist." />}
            actions={<ActionLink href="/admin/property-owners"><AdminText i18nKey="propertyOwnersAdmin.backToOwners" fallback="Back to housing companies" /></ActionLink>}
          />
        </div>
      </AdminShell>
    );
  }

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div className="housing-company-admin" style={pageGridStyle}>
        <AdminSection
          title={owner.name}
          actions={<ActionLink href="/admin/property-owners"><AdminText i18nKey="propertyOwnersAdmin.backToOwners" fallback="Back to housing companies" /></ActionLink>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <div style={detailHeaderStatsStyle}>
            <span style={detailStatPillStyle}>
              <AdminPluralText
                count={owner._count.propertyObjects}
                singularKey="propertyOwnersAdmin.objectCountSingular"
                pluralKey="propertyOwnersAdmin.objectCountPlural"
                singularFallback="{count} object"
                pluralFallback="{count} objects"
              />
            </span>
            <span style={detailStatPillStyle}>
              <AdminPluralText
                count={owner._count.contracts}
                singularKey="propertyOwnersAdmin.contractNumberCountSingular"
                pluralKey="propertyOwnersAdmin.contractNumberCountPlural"
                singularFallback="{count} contract number"
                pluralFallback="{count} contract numbers"
              />
            </span>
            <span style={detailStatPillStyle}><AdminText i18nKey="propertyOwnersAdmin.created" fallback="Created at" />: <AdminDateTime value={owner.createdAt} /></span>
          </div>
        </AdminSection>

        <div style={splitGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="propertyOwnersAdmin.editOwner" fallback="Edit partner" />}
          >
            <form action={`/api/admin/property-owners/${owner.id}`} method="post" style={formGridStyle}>
              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.companyName" fallback="Company name" />} wide>
                <input name="name" defaultValue={owner.name} style={compactInputStyle} required />
              </FormField>
              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.email" fallback="Email" />}>
                <input name="email" type="email" defaultValue={owner.email || ""} style={compactInputStyle} />
              </FormField>
              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.phone" fallback="Phone" />}>
                <input name="phone" defaultValue={owner.phone || ""} style={compactInputStyle} />
              </FormField>
              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.address" fallback="Address" />} wide>
                <input name="address" defaultValue={owner.address || ""} style={compactInputStyle} />
              </FormField>
              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.notes" fallback="Notes" />} wide>
                <textarea name="notes" defaultValue={owner.notes || ""} rows={3} style={compactTextareaStyle} />
              </FormField>
              <div style={formActionRowStyle}>
                <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.saveOwner" fallback="Save" /></button>
                <AdminConfirmSubmitButton
                  name="_intent"
                  value="delete"
                  style={dangerButtonStyle}
                  confirmKey="propertyOwnersAdmin.confirmDeleteOwner"
                  confirmFallback="Delete this partner?"
                >
                  <AdminText i18nKey="propertyOwnersAdmin.deleteOwner" fallback="Delete partner" />
                </AdminConfirmSubmitButton>
              </div>
            </form>
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="contractsAdmin.addContractNumber" fallback="Add contract number" />}
            description={<AdminText i18nKey="propertyOwnersAdmin.createContractDescription" fallback="Create a contract number for this partner. Optionally assign it to a project." />}
          >
            <details open={createContractOpen} style={createCompanyContractDetailsStyle}>
              <summary className="create-company-contract-summary" style={createCompanyContractSummaryStyle}>
                <AdminText i18nKey="contractsAdmin.createContractForCompany" fallback="Create contract number" />
              </summary>
              <div style={createCompanyContractBodyStyle}>
                <form action="/api/admin/contracts" method="post" style={contractCreateFormStyle}>
                    <input type="hidden" name="returnTo" value={`/admin/property-owners/${owner.id}`} />
                    <input type="hidden" name="housingCompanyId" value={owner.id} />
                    <FormField label={<AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" />}>
                      <AdminSelect name="kitchenId" style={compactInputStyle} required>
                        <option value=""><AdminText i18nKey="contractsAdmin.selectKitchen" fallback="Select kitchen" /></option>
                        {kitchens.map((kitchen) => (
                          <option key={kitchen.id} value={kitchen.id}>
                            {kitchen.name}
                          </option>
                        ))}
                      </AdminSelect>
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" />}>
                      <input name="contractNumber" placeholder="670123456" style={compactInputStyle} required />
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractsAdmin.project" fallback="Project" />}>
                      <AdminSelect name="projectId" style={compactInputStyle}>
                        <option value=""><AdminText i18nKey="contractsAdmin.selectProject" fallback="Select project" /></option>
                        {(owner.propertyObjects || []).map((object) => (
                          <option key={object.id} value={object.projectId || ""} disabled={!object.projectId}>
                            {object.projectCode ? `${object.projectCode} - ` : ""}{object.projectName || object.name || object.id} - {object.name || object.id}
                          </option>
                        ))}
                      </AdminSelect>
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractAddressFields.floor" fallback="Floor" />}>
                      <input name="floor" style={compactInputStyle} />
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractAddressFields.unitNumber" fallback="Unit number" />}>
                      <input name="unitNumber" style={compactInputStyle} />
                    </FormField>
                    <FormField label={<AdminText i18nKey="contractAddressFields.notes" fallback="Notes" />} wide>
                      <textarea name="notes" rows={2} style={compactTextareaStyle} />
                    </FormField>
                    <div style={formActionRowStyle}>
                      <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="contractsAdmin.createContract" fallback="Create contract number" /></button>
                    </div>
                  </form>
              </div>
            </details>
          </AdminSection>
        </div>

        <AdminSection
          title={<AdminText i18nKey="propertyOwnersAdmin.objects" fallback="Objects" />}
          description={<AdminText i18nKey="propertyOwnersAdmin.createObjectDescription" fallback="Add and manage objects." />}
          actions={createObjectOpen ? (
            <ActionLink href={buildOwnerDetailPath(owner.id, openObjectId ? { openObject: openObjectId } : {})} scroll={false}>
              <AdminText i18nKey="propertyOwnersAdmin.close" fallback="Close" />
            </ActionLink>
          ) : (
            <ActionLink href={buildOwnerDetailPath(owner.id, { createObject: "1", ...(openObjectId ? { openObject: openObjectId } : {}) })} scroll={false}>
              <AdminText i18nKey="propertyOwnersAdmin.addObject" fallback="Add object" />
            </ActionLink>
          )}
        >
          <div style={objectWorkspaceStyle}>
            {createObjectOpen ? (
              <section style={compactCreateObjectCardStyle}>
                <form action={`/api/admin/property-owners/${owner.id}/objects`} method="post" style={denseObjectFormStyle}>
                  <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object / building name" />} wide>
                    <AdminTranslatedInput name="name" placeholderKey="propertyOwnersAdmin.objectNamePlaceholder" placeholderFallback="Building A" style={compactInputStyle} required />
                  </FormField>
                  <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectName" fallback="Project name" />}>
                    <AdminTranslatedInput name="projectName" placeholderKey="propertyOwnersAdmin.projectNamePlaceholder" placeholderFallback="Project A" style={compactInputStyle} required />
                  </FormField>
                  <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectCode" fallback="Project code" />}>
                    <input name="projectCode" placeholder="PRJ-204" style={compactInputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectStatus" fallback="Project status" />}>
                    <AdminSelect name="projectStatus" defaultValue="active" style={compactInputStyle}>
                      <option value="planning"><AdminText i18nKey="propertyOwnersAdmin.projectStatusPlanning" fallback="Planning" /></option>
                      <option value="active"><AdminText i18nKey="propertyOwnersAdmin.projectStatusActive" fallback="Active" /></option>
                      <option value="on_hold"><AdminText i18nKey="propertyOwnersAdmin.projectStatusOnHold" fallback="On hold" /></option>
                      <option value="completed"><AdminText i18nKey="propertyOwnersAdmin.projectStatusCompleted" fallback="Completed" /></option>
                      <option value="archived"><AdminText i18nKey="propertyOwnersAdmin.projectStatusArchived" fallback="Archived" /></option>
                    </AdminSelect>
                  </FormField>
                  <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectManagerName" fallback="Project manager" />}>
                    <input name="projectManagerName" placeholder="Alex Meyer" style={compactInputStyle} />
                  </FormField>
                    <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectContactPhone" fallback="Contact phone" />}>
                    <input name="contactPhone" placeholder="+49 170 1234567" style={compactInputStyle} />
                  </FormField>
                  <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectDescription" fallback="Project description" />} wide>
                    <textarea name="projectDescription" rows={2} style={compactTextareaStyle} />
                  </FormField>
                  <AdminContractAddressFields mode="object" compact includeUnitFields={false} includeNotes={false} referenceFieldName="name" />
                  <div style={compactInlineActionsStyle}>
                    <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.createObject" fallback="Create object" /></button>
                  </div>
                </form>
              </section>
            ) : null}

            <section style={itemCardStyle}>
              <div style={{ display: "grid", gap: 2 }}>
                <strong style={objectSectionTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.existingObjects" fallback="Existing objects" /></strong>
              </div>

              {!owner.propertyObjects?.length ? (
                <p style={mutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.noObjectsConfigured" fallback="No objects configured for this company." /></p>
              ) : null}

              <div style={objectEditorListStyle}>
                {(owner.propertyObjects || []).map((object) => (
                  <div key={object.id} style={objectListItemStyle}>
                    <div className="housing-object-summary" style={objectDetailsStyle}>
                      <div style={objectSummaryContentStyle}>
                        <span style={objectProjectTagStyle}>
                          {object.projectCode ? `${object.projectCode} - ` : ""}{object.projectName || object.name}
                        </span>
                        <strong>{object.name}</strong>
                        {propertyObjectAddress(object) ? <span style={objectSummaryMetaStyle}>{propertyObjectAddress(object)}</span> : null}
                      </div>
                      <div style={objectSummaryAsideStyle}>
                        <div style={objectActionRowStyle}>
                          <ObjectProjectStatusBadge status={object.projectStatus} />
                          <span style={objectPreviewCountStyle}>
                            <AdminPluralText
                              count={object._count.contracts}
                              singularKey="propertyOwnersAdmin.contractNumberCountSingular"
                              pluralKey="propertyOwnersAdmin.contractNumberCountPlural"
                              singularFallback="{count} contract number"
                              pluralFallback="{count} contract numbers"
                            />
                          </span>
                          <Link
                            href={buildOwnerDetailPath(owner.id, { openObject: object.id, ...(createObjectOpen ? { createObject: "1" } : {}) })}
                            scroll={false}
                            style={objectManageLinkStyle}
                          >
                            <AdminText i18nKey="propertyOwnersAdmin.manage" fallback="Manage" />
                          </Link>
                        </div>
                      </div>
                    </div>
                    {openObjectId === object.id ? (
                      <div style={objectEditorCardStyle}>
                        <div style={objectEditorHeaderStyle}>
                          <strong style={objectSectionTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.manageObject" fallback="Manage object" /></strong>
                          <ActionLink href={buildOwnerDetailPath(owner.id, createObjectOpen ? { createObject: "1" } : {})} scroll={false}>
                            <AdminText i18nKey="propertyOwnersAdmin.close" fallback="Close" />
                          </ActionLink>
                        </div>
                        <form action={`/api/admin/property-objects/${object.id}`} method="post" style={editorPanelsLayoutStyle}>
                          <input
                            type="hidden"
                            name="returnTo"
                            value={buildOwnerDetailPath(owner.id, { openObject: object.id, ...(createObjectOpen ? { createObject: "1" } : {}) })}
                          />
                          <section style={editorSubsectionStyle}>
                            <div style={editorSubsectionHeaderStyle}>
                              <span style={editorSubsectionTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.project" fallback="Project" /></span>
                            </div>
                            <div style={denseObjectFormStyle}>
                              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectName" fallback="Project name" />} wide>
                                <input name="projectName" defaultValue={object.projectName || ""} style={compactInputStyle} required />
                              </FormField>
                              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectCode" fallback="Project code" />}>
                                <input name="projectCode" defaultValue={object.projectCode || ""} style={compactInputStyle} />
                              </FormField>
                              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectStatus" fallback="Project status" />}>
                                <AdminSelect name="projectStatus" defaultValue={object.projectStatus || "active"} style={compactInputStyle}>
                                  <option value="planning"><AdminText i18nKey="propertyOwnersAdmin.projectStatusPlanning" fallback="Planning" /></option>
                                  <option value="active"><AdminText i18nKey="propertyOwnersAdmin.projectStatusActive" fallback="Active" /></option>
                                  <option value="on_hold"><AdminText i18nKey="propertyOwnersAdmin.projectStatusOnHold" fallback="On hold" /></option>
                                  <option value="completed"><AdminText i18nKey="propertyOwnersAdmin.projectStatusCompleted" fallback="Completed" /></option>
                                  <option value="archived"><AdminText i18nKey="propertyOwnersAdmin.projectStatusArchived" fallback="Archived" /></option>
                                </AdminSelect>
                              </FormField>
                              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectManagerName" fallback="Project manager" />}>
                                <input
                                  name="projectManagerName"
                                  defaultValue={object.projectManagerName || ""}
                                  placeholder="Alex Meyer"
                                  style={compactInputStyle}
                                />
                              </FormField>
                              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.projectDescription" fallback="Project description" />} wide>
                                <textarea name="projectDescription" defaultValue={object.projectDescription || ""} rows={2} style={compactTextareaStyle} />
                              </FormField>
                            </div>
                          </section>

                          <div style={editorSectionDividerStyle} />

                          <section style={editorSubsectionStyle}>
                            <div style={editorSubsectionHeaderStyle}>
                              <span style={editorSubsectionTitleStyle}><AdminText i18nKey="propertyOwnersAdmin.propertyObject" fallback="Object / Building" /></span>
                            </div>
                            <div style={denseObjectFormStyle}>
                              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectName" fallback="Object / building name" />} wide>
                                <input name="name" defaultValue={object.name} style={compactInputStyle} required />
                              </FormField>
                              <FormField label={<AdminText i18nKey="propertyOwnersAdmin.objectContactPhone" fallback="Contact phone" />}>
                                <input
                                  name="contactPhone"
                                  defaultValue={object.contactPhone || ""}
                                  placeholder="+49 170 1234567"
                                  style={compactInputStyle}
                                />
                              </FormField>
                              <AdminContractAddressFields
                                contract={object}
                                mode="object"
                                compact
                                includeUnitFields={false}
                                includeNotes={false}
                                referenceFieldName="name"
                                hideIdleMessage
                                footerActions={(
                                  <>
                                    <button type="submit" style={primaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.saveObject" fallback="Save object" /></button>
                                    <AdminConfirmSubmitButton
                                      name="_intent"
                                      value="delete"
                                      style={dangerObjectButtonStyle}
                                      confirmKey="propertyOwnersAdmin.confirmDeleteObject"
                                      confirmFallback="Delete this object?"
                                    >
                                      <AdminText i18nKey="propertyOwnersAdmin.deleteObject" fallback="Delete object" />
                                    </AdminConfirmSubmitButton>
                                  </>
                                )}
                              />
                            </div>
                          </section>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </AdminSection>

        <style>{`
          .create-object-summary::-webkit-details-marker {
            display: none;
          }

          .create-company-contract-summary::-webkit-details-marker {
            display: none;
          }

          .housing-company-admin :is(input, textarea, select, button, a, summary):focus-visible {
            outline: 3px solid rgba(143, 62, 44, 0.26);
            outline-offset: 2px;
          }

          @media (max-width: 760px) {
            .housing-object-summary {
              align-items: flex-start !important;
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </AdminShell>
  );
}

function ObjectProjectStatusBadge({ status }) {
  const statusKey = String(status || "active").toLowerCase();
  const labels = {
    planning: { i18nKey: "propertyOwnersAdmin.projectStatusPlanning", fallback: "Planning" },
    active: { i18nKey: "propertyOwnersAdmin.projectStatusActive", fallback: "Active" },
    on_hold: { i18nKey: "propertyOwnersAdmin.projectStatusOnHold", fallback: "On hold" },
    completed: { i18nKey: "propertyOwnersAdmin.projectStatusCompleted", fallback: "Completed" },
    archived: { i18nKey: "propertyOwnersAdmin.projectStatusArchived", fallback: "Archived" },
  };
  const label = labels[statusKey] || labels.active;

  return (
    <span style={objectStatusPillStyle}>
      <AdminText i18nKey={label.i18nKey} fallback={label.fallback} />
    </span>
  );
}

const formGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
  lineHeight: 1.35,
};

const formActionRowStyle = {
  ...actionRowStyle,
  gridColumn: "1 / -1",
  paddingTop: 2,
};

const detailHeaderStatsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const detailStatPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 34,
  borderRadius: 999,
  padding: "7px 10px",
  background: "rgba(143, 62, 44, 0.08)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  color: "var(--app-accent)",
  fontSize: 13,
  fontWeight: 800,
};

const objectWorkspaceStyle = {
  display: "grid",
  gap: 12,
};

const objectSectionTitleStyle = {
  color: "var(--app-text)",
  fontSize: "1rem",
  lineHeight: 1.3,
};

const denseObjectFormStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  alignItems: "start",
};

const objectEditorListStyle = {
  display: "grid",
  gap: 10,
};

const objectListItemStyle = {
  display: "grid",
  gap: 8,
};

const objectDetailsStyle = {
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid rgba(45, 108, 121, 0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.82)",
  padding: "12px 14px",
};

const objectSummaryContentStyle = {
  display: "grid",
  gap: 3,
  minWidth: 0,
};

const objectSummaryAsideStyle = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  minWidth: "fit-content",
};

const objectSummaryMetaStyle = {
  color: "var(--app-text-muted)",
  fontSize: 13,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const objectProjectTagStyle = {
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const objectPreviewCountStyle = {
  display: "inline-flex",
  width: "fit-content",
  color: "var(--app-text-muted)",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const objectStatusPillStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "4px 9px",
  background: "rgba(63, 166, 107, 0.08)",
  border: "1px solid rgba(63, 166, 107, 0.16)",
  color: "var(--app-success-text)",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const objectManageLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 36,
  padding: "8px 12px",
  background: "rgba(255,255,255,0.9)",
  color: "var(--app-accent)",
  border: "1px solid var(--app-border)",
  fontSize: 14,
  fontWeight: 800,
  display: "inline-flex",
  alignItems: "center",
  boxShadow: "none",
};

const objectEditorCardStyle = {
  ...itemCardStyle,
  display: "grid",
  gap: 14,
  padding: 16,
};

const editorPanelsLayoutStyle = {
  display: "grid",
  gap: 14,
};

const editorSubsectionStyle = {
  display: "grid",
  gap: 10,
};

const editorSubsectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const editorSubsectionTitleStyle = {
  color: "var(--app-accent)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const editorSectionDividerStyle = {
  height: 1,
  background: "rgba(45, 108, 121, 0.12)",
};

const objectEditorHeaderStyle = {
  display: "flex",
  gap: 10,
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
};

const contractCreateFormStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  alignItems: "start",
};

const createCompanyContractDetailsStyle = {
  display: "grid",
  gap: 16,
};

const createCompanyContractSummaryStyle = {
  ...secondaryButtonStyle,
  width: "fit-content",
  minHeight: 46,
  borderRadius: 8,
  padding: "12px 18px",
  listStyle: "none",
  cursor: "pointer",
};

const createCompanyContractBodyStyle = {
  display: "grid",
  gap: 14,
  paddingTop: 8,
};

const compactCreateObjectCardStyle = {
  ...itemCardStyle,
  display: "grid",
  gap: 10,
  padding: 14,
};

const compactInlineActionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  gridColumn: "1 / -1",
};

const objectActionRowStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const dangerObjectButtonStyle = {
  ...dangerButtonStyle,
  minHeight: 38,
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: "0.9rem",
};

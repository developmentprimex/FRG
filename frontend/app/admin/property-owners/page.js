import AdminFilterForm from "../../../components/admin-filter-form";
import {
  AdminSection,
  FlashMessage,
  FormField,
  secondaryButtonStyle,
  inputStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
  thStyle, tdStyle,
  tableStyle,
  tableWrapStyle,
  textareaStyle,
} from "../../../components/admin-ui";
import Link from "next/link";
import { AdminShell } from "../../../components/admin-shell";
import { AdminDateTime, AdminPluralText, AdminText, AdminTranslatedInput } from "../../../components/admin-i18n";
import AdminPropertyOwnerObjectBuilder from "../../../components/admin-property-owner-object-builder";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listPropertyOwnersForAdmin } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function ownerName(owner) {
  return owner.name || "";
}

function ownerContact(owner) {
  return [owner.address, owner.email].filter(Boolean);
}

function ownerLocation(owner) {
  const firstObject = (owner.propertyObjects || []).find((object) => object.city || object.country || object.address1);
  if (!firstObject) return owner.address || "-";

  return [firstObject.city, firstObject.country].filter(Boolean).join(", ") || firstObject.address1 || owner.address || "-";
}

function matchingObjects(owner, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return [];

  return (owner.propertyObjects || []).filter((object) => [
    object.projectName,
    object.projectCode,
    object.projectStatus,
    object.projectDescription,
    object.projectManagerName,
    object.name,
    object.contactPhone,
    object.country,
    object.city,
    object.postalCode,
    object.address1,
    object.address2,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(needle));
}

function buildSearchSummary(owner, query) {
  const needle = String(query || "").trim();
  if (!needle) return "";

  const matches = matchingObjects(owner, needle);
  if (!matches.length) return "";

  const firstMatch = matches[0];
  const location = [firstMatch.city, firstMatch.country].filter(Boolean).join(", ");
  const locationLabel = location || firstMatch.address1 || firstMatch.name;
  return `${needle} - ${matches.length} object${matches.length === 1 ? "" : "s"} matched in ${locationLabel} for ${owner.name}.`;
}

function buildOwnerSearchIndex(owner) {
  const ownerFields = [
    owner.name,
    owner.address,
    owner.email,
    owner.phone,
    owner.notes,
  ];

  const objectFields = (owner.propertyObjects || []).flatMap((object) => ([
    object.projectName,
    object.projectCode,
    object.projectStatus,
    object.projectDescription,
    object.projectManagerName,
    object.name,
    object.contactPhone,
    object.country,
    object.city,
    object.postalCode,
    object.address1,
    object.address2,
  ]));

  return [...ownerFields, ...objectFields]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterOwners(owners, filters) {
  return owners.filter((owner) => {
    const searchIndex = buildOwnerSearchIndex(owner);
    const matchesQuery = !filters.query || searchIndex.includes(filters.query.toLowerCase());
    return matchesQuery;
  });
}

function getExportHref(filters) {
  const query = new URLSearchParams();
  if (filters.query) query.set("q", filters.query);
  const search = query.toString();
  return search ? `/api/admin/property-owners/export?${search}` : "/api/admin/property-owners/export";
}

export default async function AdminPropertyOwnersPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    query: normalizeParam(resolvedSearchParams.q).trim(),
    create: normalizeParam(resolvedSearchParams.create).trim(),
  };
  const owners = await listPropertyOwnersForAdmin();
  const filteredOwners = filterOwners(owners, filters);
  const exportHref = getExportHref(filters);
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const createOpen = filters.create === "1";

  return (
    <AdminShell adminEmail={admin.email}>
      <div className="housing-company-admin" style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="propertyOwnersAdmin.propertyOwners" fallback="Housing Companies" />}
          actions={!createOpen ? (
            <Link href="/admin/property-owners?create=1" scroll={false} style={createOwnerCtaStyle}>
              <AdminText i18nKey="propertyOwnersAdmin.addHousingCompany" fallback="Add Housing Company" />
            </Link>
          ) : null}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          {createOpen ? (
          <details open style={createOwnerDetailsStyle}>
            <summary className="create-owner-summary" style={createOwnerSummaryStyle}>
              <AdminText i18nKey="propertyOwnersAdmin.addHousingCompany" fallback="Add Housing Company" />
            </summary>
            <div style={createOwnerBodyStyle}>
              <p style={compactMutedTextStyle}><AdminText i18nKey="propertyOwnersAdmin.createOwnerPanelDescription" fallback="Add a new housing company and optionally create objects." /></p>
              <form action="/api/admin/property-owners" method="post" style={compactFormGridStyle}>
                <FormField label={<AdminText i18nKey="propertyOwnersAdmin.companyName" fallback="Company name" />}>
                  <input name="name" style={compactInputStyle} required />
                </FormField>
                <FormField label={<AdminText i18nKey="propertyOwnersAdmin.email" fallback="Email" />}>
                  <input name="email" type="email" style={compactInputStyle} />
                </FormField>
                <FormField label={<AdminText i18nKey="propertyOwnersAdmin.phone" fallback="Phone" />}>
                  <input name="phone" style={compactInputStyle} />
                </FormField>
                <FormField label={<AdminText i18nKey="propertyOwnersAdmin.address" fallback="Address" />} wide>
                  <input name="address" style={compactInputStyle} />
                </FormField>
                <FormField label={<AdminText i18nKey="propertyOwnersAdmin.notes" fallback="Notes" />} wide>
                  <textarea name="notes" rows={2} style={compactTextareaStyle} />
                </FormField>
                <div style={{ gridColumn: "1 / -1" }}>
                  <AdminPropertyOwnerObjectBuilder />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <button type="submit" style={compactPrimaryButtonStyle}><AdminText i18nKey="propertyOwnersAdmin.createOwner" fallback="Create housing company" /></button>
                </div>
              </form>
            </div>
          </details>
          ) : null}
        </AdminSection>

        <AdminSection
          title={<span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <AdminText i18nKey="propertyOwnersAdmin.configuredCompanies" fallback="Housing Companies" />
            <span style={{ color: "var(--app-text-muted)", fontSize: "var(--admin-text-body)", fontWeight: 400 }}>
              <AdminPluralText count={filteredOwners.length} singularKey="propertyOwnersAdmin.resultCountOne" pluralKey="propertyOwnersAdmin.resultCountMany" singularFallback="{count} company" pluralFallback="{count} companies" />
            </span>
          </span>}
          actions={(
            <Link href={exportHref} prefetch={false} style={exportButtonStyle}>
              <AdminText i18nKey="propertyOwnersAdmin.exportExcel" fallback="Export Excel" />
            </Link>
          )}
        >
          <AdminFilterForm action="/admin/property-owners" style={filterPanelStyle}>
            <div className="housing-filter-grid" style={filterGridStyle}>
              <FilterField label={<AdminText i18nKey="contractsAdmin.search" fallback="Search" />}>
                <AdminTranslatedInput
                  name="q"
                  defaultValue={filters.query}
                  placeholderKey="propertyOwnersAdmin.searchPlaceholder"
                  placeholderFallback="Company, address, city, postal code, object..."
                  style={filterInputStyle}
                />
              </FilterField>
              <div style={filterActionsStyle}>
                <Link scroll={false} href="/admin/property-owners" style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
              </div>
            </div>
          </AdminFilterForm>

          <div style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={{ ...tableStyle, tableLayout: "auto", minWidth: 1000 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ ...compactThStyle, width: 48, textAlign: "center" }}><AdminText i18nKey="reportsAdmin.rowNumber" fallback="No." /></th>
                  <th style={compactThStyle}><AdminText i18nKey="propertyOwnersAdmin.owner" fallback="Housing Company" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="propertyOwnersAdmin.contact" fallback="Contact" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="propertyOwnersAdmin.location" fallback="Location" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="propertyOwnersAdmin.objectsCount" fallback="Objects" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="propertyOwnersAdmin.contracts" fallback="Contract numbers" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="propertyOwnersAdmin.created" fallback="Created at" /></th>
                  <th style={compactThStyle}><AdminText i18nKey="propertyOwnersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!filteredOwners.length ? (
                  <tr>
                    <td style={compactTdStyle} colSpan={8}><AdminText i18nKey="propertyOwnersAdmin.noPropertyOwnersMatchFilters" fallback="No housing companies match the current filters." /></td>
                  </tr>
                ) : null}
                {filteredOwners.map((owner, index) => (
                  <tr key={owner.id}>
                    <td style={{ ...compactTdStyle, textAlign: "center", color: "var(--app-text-muted)" }}>{index + 1}</td>
                    <td style={compactTdStyle}>
                      <strong>{ownerName(owner)}</strong>
                      {filters.query ? <div style={matchSummaryStyle}>{buildSearchSummary(owner, filters.query)}</div> : null}
                    </td>
                    <td style={compactTdStyle}><ContactValue owner={owner} /></td>
                    <td style={compactTdStyle}>{ownerLocation(owner)}</td>
                    <td style={compactTdStyle}>
                      {owner._count.propertyObjects}
                    </td>
                    <td style={compactTdStyle}>
                      {owner._count.contracts}
                    </td>
                    <td style={compactTdStyle}><AdminDateTime value={owner.createdAt} /></td>
                    <td style={compactTdStyle}>
                      <Link href={`/admin/property-owners/${owner.id}`} style={manageLinkStyle}>
                        <AdminText i18nKey="propertyOwnersAdmin.manage" fallback="Manage" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <style>{`
            @media (max-width: 760px) {
              .housing-filter-grid { grid-template-columns: 1fr !important; }
            }

            .create-owner-summary::-webkit-details-marker {
              display: none;
            }

            .housing-company-admin :is(input, textarea, select, button, a, summary):focus-visible {
              outline: 3px solid rgba(143, 62, 44, 0.26);
              outline-offset: 2px;
            }
          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

function FilterField({ label, children }) {
  return (
    <label style={filterFieldStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function ContactValue({ owner }) {
  const lines = ownerContact(owner);
  if (!lines.length) {
    return <AdminText i18nKey="propertyOwnersAdmin.noContactDetails" fallback="No contact details" />;
  }

  return (
    <span style={contactStackStyle}>
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </span>
  );
}

const contactStackStyle = {
  display: "grid",
  gap: 2,
};

const filterGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "end",
};

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
};

const filterFieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  minWidth: 0,
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  ...inputStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "var(--admin-text-body)",
  boxShadow: "none",
};

const filterActionsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "end",
  flexWrap: "nowrap",
};

const filterApplyButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "var(--admin-text-body)",
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

const createOwnerDetailsStyle = {
  display: "grid",
  gap: 12,
  border: "1px solid rgba(143, 62, 44, 0.14)",
  borderRadius: 12,
  background: "rgba(255, 247, 241, 0.54)",
  padding: 14,
};

const createOwnerSummaryStyle = {
  ...secondaryButtonStyle,
  width: "fit-content",
  minHeight: 46,
  borderRadius: 8,
  padding: "12px 18px",
  listStyle: "none",
  cursor: "pointer",
};

const createOwnerBodyStyle = {
  display: "grid",
  gap: 12,
  paddingTop: 4,
};

const matchSummaryStyle = {
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.45,
  marginTop: 4,
};

const createOwnerCtaStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "0.92rem",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const exportButtonStyle = {
  ...secondaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "0.92rem",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};

const compactMutedTextStyle = {
  ...mutedTextStyle,
  fontSize: 13,
  lineHeight: 1.45,
};

const compactFormGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
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
  minHeight: 68,
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: "0.92rem",
};

const compactPrimaryButtonStyle = {
  ...primaryButtonStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: "0.92rem",
};

const compactThStyle = { ...thStyle, padding: "16px 12px", whiteSpace: "nowrap" };
const compactTdStyle = { ...tdStyle, padding: "16px 12px", verticalAlign: "middle" };
const manageLinkStyle = {
  ...secondaryButtonStyle,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "9px 12px",
  borderRadius: 8,
  fontSize: "var(--admin-text-meta)",
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

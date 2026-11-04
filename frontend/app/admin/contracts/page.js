import {
  ActionLink,
  AdminSection,
  FlashMessage,
  dangerButtonStyle,
  pageGridStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  tableStyle, tableWrapStyle, thStyle, tdStyle,
} from "../../../components/admin-ui";
import Link from "next/link";
import { AdminShell } from "../../../components/admin-shell";
import { AdminPagination } from "../../../components/admin-pagination";
import AdminContractsFilters from "../../../components/admin-contracts-filters";
import AdminContractCreateForm from "../../../components/admin-contract-create-form";
import AdminArcPdfImport from "../../../components/admin-arc-pdf-import";
import AdminConfirmSubmitButton from "../../../components/admin-confirm-submit-button";
import { AdminKitchenDisplayName, AdminPluralText, AdminStatusBadge, AdminText } from "../../../components/admin-i18n";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminPage } from "../../../lib/auth";
import { listKitchenContractsForAdmin, listKitchensForAdmin, listProjectsForAdmin, listPropertyOwnersForAdmin } from "../../../lib/catalog";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeContractTypeFilter(value) {
  const normalized = String(normalizeParam(value)).trim().toUpperCase();
  return normalized === "ARC" || normalized === "FRG" ? normalized : "";
}

function usageLabel(orderCount) {
  const count = Number(orderCount || 0);
  if (count === 0) return <AdminText i18nKey="contractsAdmin.unused" fallback="Unused" />;
  if (count === 1) return <AdminText i18nKey="contractsAdmin.usedOnce" fallback="Used once" />;
  return <AdminText i18nKey="contractsAdmin.usedTimes" fallback="Used {count} times" values={{ count: String(count) }} />;
}


export default async function AdminContractsPage({ searchParams = {} }) {
  const admin = await requireAdminPage("FRG_VIEW");
  const resolvedSearchParams = (await searchParams) || {};
  const filters = {
    contractType: normalizeContractTypeFilter(resolvedSearchParams.contractType),
    kitchenId: normalizeParam(resolvedSearchParams.kitchenId),
    housingCompanyId: normalizeParam(resolvedSearchParams.housingCompanyId || resolvedSearchParams.ownerId),
    projectId: normalizeParam(resolvedSearchParams.projectId),
    status: normalizeParam(resolvedSearchParams.status),
    usage: normalizeParam(resolvedSearchParams.usage),
    query: normalizeParam(resolvedSearchParams.q),
  };
  const returnQuery = new URLSearchParams(Object.entries(filters)
    .filter(([, value]) => value)
    .map(([key, value]) => [key === "query" ? "q" : key, value]));
  if (resolvedSearchParams.page) returnQuery.set("page", normalizeParam(resolvedSearchParams.page));
  const returnTo = `/admin/contracts${returnQuery.size ? `?${returnQuery}` : ""}`;

  const [kitchens, owners, projects, pagination] = await Promise.all([
    listKitchensForAdmin(),
    listPropertyOwnersForAdmin(),
    listProjectsForAdmin(),
    listKitchenContractsForAdmin(filters, resolvedSearchParams.page || 1, admin),
  ]);
  const contracts = pagination.items;
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="contractsAdmin.contractNumbers" fallback="Contract Numbers" />}
          actions={<ActionLink href="/admin/property-owners"><AdminText i18nKey="dashboard.manageOwners" fallback="Manage owners" /></ActionLink>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        </AdminSection>

        <AdminSection>
          <details style={createContractDetailsStyle}>
            <summary className="create-contract-summary" style={createContractSummaryStyle}>
              <AdminText i18nKey="contractsAdmin.addContractNumber" fallback="Add Contract Number" />
            </summary>
            <div style={createContractBodyStyle}>
              <AdminContractCreateForm
                kitchens={kitchens}
                owners={owners}
                projects={projects}
                defaultKitchenId={filters.kitchenId}
                defaultHousingCompanyId={filters.housingCompanyId}
                defaultProjectId={filters.projectId}
                returnTo={returnTo}
              />
            </div>
          </details>
        </AdminSection>

        <AdminSection>
          <details style={createContractDetailsStyle}>
            <summary className="create-contract-summary" style={createContractSummaryStyle}>
              <AdminText i18nKey="contractsAdmin.arcImport.title" fallback="Import ARC from PDF folder" />
            </summary>
            <div style={createContractBodyStyle}>
              <AdminArcPdfImport />
            </div>
          </details>
        </AdminSection>

        <AdminSection
          title={<span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <AdminText i18nKey="contractsAdmin.configuredContracts" fallback="Contract Numbers" />
            <span style={{ color: "var(--app-text-muted)", fontSize: "var(--admin-text-body)", fontWeight: 400 }}>
              <AdminPluralText count={pagination.totalItems} singularKey="contractsAdmin.resultCountOne" pluralKey="contractsAdmin.resultCountMany" singularFallback="{count} contract" pluralFallback="{count} contracts" />
            </span>
          </span>}
        >
          <AdminContractsFilters owners={owners} filters={filters} />
          <div style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={{ ...tableStyle, tableLayout: "auto", minWidth: 1000 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ ...contractThStyle, ...contractRowNumberStyle }}><AdminText i18nKey="reportsAdmin.rowNumber" fallback="No." /></th>
                  <th scope="col" style={contractThStyle}><AdminText i18nKey="contractsAdmin.contractNumber" fallback="Contract number" /></th>
                  <th scope="col" style={contractThStyle}><AdminText i18nKey="contractsAdmin.contractType" fallback="Contract type" /></th>
                  <th scope="col" style={contractThStyle}><AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" /></th>
                  <th scope="col" style={contractThStyle}><AdminText i18nKey="contractsAdmin.owner" fallback="Housing company" /></th>
                  <th scope="col" style={contractThStyle}><AdminText i18nKey="dashboard.status" fallback="Status" /></th>
                  <th scope="col" style={contractThStyle}><AdminText i18nKey="contractsAdmin.usage" fallback="Usage" /></th>
                  <th scope="col" style={contractThStyle}><AdminText i18nKey="dashboard.actions" fallback="Actions" /></th>
                </tr>
              </thead>
              <tbody>
                {!contracts.length ? <tr><td colSpan={8} style={contractTdStyle}><AdminText i18nKey="contractsAdmin.noContractNumbersMatchCurrentFilters" fallback="No contract numbers match the current filters." /></td></tr> : null}
                {contracts.map((contract, index) => (
                  <tr key={contract.id}>
                    <td style={{ ...contractTdStyle, ...contractRowNumberStyle, color: "var(--app-text-muted)" }}>{(pagination.page - 1) * pagination.pageSize + index + 1}</td>
                    <td style={contractTdStyle}><Link href={`/admin/contracts/${contract.id}`} style={contractNumberLinkStyle}>{contract.contractNumber}</Link></td>
                    <td style={contractTdStyle}>{contract.contractType}</td>
                    <td style={contractTdStyle}><AdminKitchenDisplayName slug={contract.kitchen.slug} name={contract.kitchen.name} /></td>
                    <td style={contractTdStyle}>{contract.owner?.name || "—"}</td>
                    <td style={contractTdStyle}><AdminStatusBadge status={contract.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                    <td style={{ ...contractTdStyle, whiteSpace: "nowrap" }}>{usageLabel(contract._count.orders)}</td>
                    <td style={contractTdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Link href={`/admin/contracts/${contract.id}`} style={contractDetailsLinkStyle}><AdminText i18nKey="contractsAdmin.viewDetails" fallback="View details" /></Link>
                        <form action={`/api/admin/contracts/${contract.id}`} method="post" style={{ margin: 0 }}>
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <AdminConfirmSubmitButton
                            name="_intent"
                            value="delete"
                            confirmKey="contractsAdmin.deleteConfirmMessage"
                            confirmFallback={"Delete contract number {contractNumber}?\nThis action cannot be undone."}
                            confirmValues={{ contractNumber: contract.contractNumber }}
                            style={contractDeleteButtonStyle}
                          >
                            <AdminText i18nKey="contractsAdmin.delete" fallback="Delete" />
                          </AdminConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination basePath="/admin/contracts" searchParams={resolvedSearchParams} {...pagination} />

          <style>{`
            .create-contract-summary::-webkit-details-marker {
              display: none;
            }

          `}</style>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const createContractDetailsStyle = {
  display: "grid",
  gap: 16,
};

const createContractSummaryStyle = {
  ...primaryButtonStyle,
  width: "fit-content",
  minHeight: 46,
  borderRadius: 8,
  padding: "12px 18px",
  listStyle: "none",
  cursor: "pointer",
};

const createContractBodyStyle = {
  display: "grid",
  gap: 12,
  paddingTop: 6,
};

const contractThStyle = { ...thStyle, padding: "16px 12px", whiteSpace: "nowrap" };
const contractTdStyle = { ...tdStyle, padding: "16px 12px", verticalAlign: "middle" };
const contractRowNumberStyle = {
  width: 64,
  minWidth: 64,
  boxSizing: "border-box",
  textAlign: "center",
  whiteSpace: "nowrap",
  overflowWrap: "normal",
  wordBreak: "normal",
  fontVariantNumeric: "tabular-nums",
};
const contractNumberLinkStyle = { color: "var(--app-text)", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" };
const contractDetailsLinkStyle = {
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

const contractDeleteButtonStyle = {
  ...dangerButtonStyle,
  minHeight: 38,
  padding: "9px 12px",
  borderRadius: 8,
  fontSize: "var(--admin-text-meta)",
  fontWeight: 600,
  whiteSpace: "nowrap",
  boxShadow: "none",
};

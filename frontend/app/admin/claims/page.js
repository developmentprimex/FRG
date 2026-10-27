import { formatServiceClaimReference } from "../../../lib/service-claim-email-subject";
import { attachWorkProcessing } from "../../../lib/work-processing";
import { filterAndSortWork, summarizeWork, workUiItem, workRowStyle } from "../../../lib/work-processing-rules";
import { WorkCell, WorkActions, WorkFilter, WorkSummary } from "../../../components/admin-work-processing";
import Link from "next/link";
import {
  AdminSection,
  ActionLink,
  FlashMessage,
  inputStyle,
  itemCardStyle,
  pageGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminEmailDeliveryStatus } from "../../../components/admin-order-email-delivery";
import { attachClaimEmailDelivery } from "../../../lib/email/claim-email-store";
import { AdminPagination } from "../../../components/admin-pagination";
import { AdminDateTime, AdminText, AdminTranslatedInput } from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import AdminConfirmSubmitButton from "../../../components/admin-confirm-submit-button";
import { AdminClaimLocalizedText } from "../../../components/admin-claim-localized-text";
import { getFormMessage } from "../../../lib/admin-forms";
import { requireAdminClaimsPage } from "../../../lib/admin-claims-access";
import { requirePxAdminPage } from "../../../lib/admin-role-guards";
import { prisma } from "../../../lib/prisma";
import { listKitchensForAdmin } from "../../../lib/catalog";
import { queryServiceClaimsList } from "../../../lib/service-claim-admin-query";
import { paginateAdminItems } from "../../../lib/admin-pagination";
import { normalizeContractTypeFilter } from "../../../lib/contract-type-filter";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function formatClaimCustomerName(value) {
  return String(value || "").replace(/\s*\((female|male|diverse|other)\)\s*$/i, "").trim();
}

function truncate(value, max = 140) {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

export default async function AdminClaimsPage({ searchParams = {}, pxOnly = false }) {
  const admin = await (pxOnly ? requirePxAdminPage() : requireAdminClaimsPage());
  const resolvedSearchParams = (await searchParams) || {};
  const basePath = pxOnly ? "/admin/px-claims" : "/admin/claims";
  const filters = {
    q: normalizeParam(resolvedSearchParams.q).trim(),
    city: normalizeParam(resolvedSearchParams.city).trim(),
    kitchenId: normalizeParam(resolvedSearchParams.kitchenId).trim(),
    contactKey: normalizeParam(resolvedSearchParams.contactKey).trim(),
    contractNumber: normalizeParam(resolvedSearchParams.contractNumber).trim(),
    contractType: normalizeContractTypeFilter(resolvedSearchParams.contractType),
    claimType: pxOnly ? "px" : "live",
    dateFrom: normalizeParam(resolvedSearchParams.dateFrom).trim(),
    dateTo: normalizeParam(resolvedSearchParams.dateTo).trim(),
  };
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");

  const [rawClaims, cityOptions, kitchens] = await Promise.all([
    queryServiceClaimsList(prisma, filters),
    listClaimCities(),
    pxOnly ? Promise.resolve([]) : listKitchensForAdmin(),
  ]);
  const trackedClaims = await attachWorkProcessing(prisma, rawClaims, "CLAIM");
  const processingFilter = normalizeParam(resolvedSearchParams.processing);
  const clearExactHref = `${basePath}?${new URLSearchParams({
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.contractType ? { contractType: filters.contractType } : {}),
    ...(filters.kitchenId ? { kitchenId: filters.kitchenId } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    ...(processingFilter ? { processing: processingFilter } : {}),
  }).toString()}`;
  const processingCounts = summarizeWork(trackedClaims);
  const allClaims = filterAndSortWork(trackedClaims, processingFilter);
  const pagination = paginateAdminItems(allClaims, resolvedSearchParams.page);
  const claims = await attachClaimEmailDelivery(pagination.items);
  const rowNumber = (index) => pagination.totalItems - (pagination.page - 1) * pagination.pageSize - index;

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={pxOnly
            ? <AdminText i18nKey="pxClaimsAdmin.title" fallback="PX claims" />
            : <AdminText i18nKey="claimsAdmin.claims" fallback="Claims" />}
          actions={pxOnly
            ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><ActionLink href="/admin/px-claims/feedback"><AdminText i18nKey="claimFeedbackList.viewFeedback" fallback="View customer feedback" /></ActionLink>{allClaims.length ? <DeleteAllPxClaimsAction /> : null}</div>
            : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><ActionLink href="/admin/claims/feedback"><AdminText i18nKey="claimFeedbackList.viewFeedback" fallback="View customer feedback" /></ActionLink><ActionLink href="/admin/claims-overview"><AdminText i18nKey="claimOverview.title" fallback="Claims overview" /></ActionLink></div>}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

          <WorkSummary counts={processingCounts} />
          <form action={basePath} method="get" style={filterPanelStyle}>
            {filters.contactKey ? <input type="hidden" name="contactKey" value={filters.contactKey} /> : null}
            {filters.contractNumber ? <input type="hidden" name="contractNumber" value={filters.contractNumber} /> : null}
            {filters.contactKey || filters.contractNumber ? <div style={rowMetaStyle}>
              <AdminText i18nKey={filters.contactKey ? "claimOverview.contactScope" : "claimOverview.contractScope"} fallback={filters.contactKey ? "Showing claims for contact" : "Showing claims for contract"} />: <strong>{filters.contactKey ? filters.contactKey.slice(filters.contactKey.indexOf(":") + 1) : filters.contractNumber}</strong>{" "}
              <Link href={clearExactHref}><AdminText i18nKey="claimOverview.clearExactFilter" fallback="Clear this filter" /></Link>
            </div> : null}
            <div style={filterGridStyle}>
              <WorkFilter value={processingFilter} />
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="contractsAdmin.search" fallback="Search" /></span>
                <AdminTranslatedInput
                  name="q"
                  defaultValue={filters.q}
                  placeholderKey="claimsAdmin.searchPlaceholder"
                  placeholderFallback="Search by contract, name, phone, email, issue..."
                  style={filterInputStyle}
                />
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="contractsAdmin.contractType" fallback="Contract type" /></span>
                <AdminSelect name="contractType" defaultValue={filters.contractType} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="contractsAdmin.allContractTypes" fallback="All contract types" /></option>
                  <option value="ARC">ARC</option>
                  <option value="FRG">FRG</option>
                </AdminSelect>
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="claimsAdmin.city" fallback="City" /></span>
                <AdminSelect name="city" defaultValue={filters.city} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="claimsAdmin.allCities" fallback="All cities" /></option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </AdminSelect>
              </label>
              {!pxOnly ? <label style={filterFieldStyle}>
                <span><AdminText i18nKey="dashboard.kitchen" fallback="Kitchen" /></span>
                <AdminSelect name="kitchenId" defaultValue={filters.kitchenId} style={filterInputStyle}>
                  <option value=""><AdminText i18nKey="dashboard.allKitchens" fallback="All kitchens" /></option>
                  {kitchens.map((kitchen) => <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>)}
                </AdminSelect>
              </label> : null}
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
                <input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={filterInputStyle} />
              </label>
              <label style={filterFieldStyle}>
                <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
                <input name="dateTo" type="date" defaultValue={filters.dateTo} style={filterInputStyle} />
              </label>
              <div style={filterActionsStyle}>
                <button type="submit" style={filterApplyButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
                <Link href={basePath} style={filterClearLinkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
              </div>
            </div>
          </form>

          <div className="admin-claims-table" style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 64, boxSizing: "border-box", textAlign: "center", letterSpacing: "0.04em", whiteSpace: "nowrap", overflowWrap: "normal", wordBreak: "normal" }}><AdminText i18nKey="usersAdmin.orderNr" fallback="No." /></th>
                  <th style={{ ...thStyle, width: 210 }}><AdminText i18nKey="claimsAdmin.claim" fallback="Claim" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.customer" fallback="Customer" /></th>
                  <th style={{ ...thStyle, width: 150 }}><AdminText i18nKey="workProcessing.processing" fallback="Processing" /></th>
                  <th style={thStyle}><AdminText i18nKey="claimsAdmin.issue" fallback="Issue" /></th>
                  <th className="claims-table-date" style={thStyle}><AdminText i18nKey="claimsAdmin.createdAt" fallback="Created" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderEmailDelivery.column" fallback="Email status" /></th>
                  <th style={{ ...thStyle, width: 290 }}><AdminText i18nKey="ordersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!claims.length ? (
                  <tr>
                    <td style={tdStyle} colSpan={7}>
                      <AdminText i18nKey="claimsAdmin.noClaimsFound" fallback="No claims found." />
                    </td>
                  </tr>
                ) : null}
                {claims.map((claim, index) => (
                  <tr key={claim.id} className="claims-table-row" style={workRowStyle(claim)}>
                    <td style={{ ...tdStyle, width: 64, boxSizing: "border-box", textAlign: "center", whiteSpace: "nowrap", overflowWrap: "normal", wordBreak: "normal", color: "var(--app-text-muted)", fontVariantNumeric: "tabular-nums", fontSize: "var(--admin-text-label)", fontWeight: 500 }}>{rowNumber(index)}</td>
                    <td style={tdStyle}>
                      <strong style={{ whiteSpace: "nowrap" }}>{formatServiceClaimReference(claim.contractNumber, claim.claimSequence, claim.ticketNumber)}</strong>
                      <div style={rowMetaStyle}><ClaimRequestTypeText requestType={claim.requestType} /></div>
                      {claim.submissionCount > 1 ? <div style={rowMetaStyle}><AdminText i18nKey="claimsAdmin.submissionCount" fallback="{count} submissions" values={{ count: claim.submissionCount }} /></div> : null}
                    </td>
                    <td style={tdStyle}>
                      <div style={customerNameStyle}>{formatClaimCustomerName(claim.fullName)}</div>
                    </td>
                    <td style={tdStyle}><WorkCell item={workUiItem(claim)} /></td>
                    <td style={tdStyle}>
                      <AdminClaimLocalizedText text={truncate(claim.problemDescription, 220)} style={issueClampStyle} />
                    </td>
                    <td className="claims-table-date" style={tdStyle}><AdminDateTime value={claim.createdAt} numeric /></td>
                    <td style={tdStyle}><AdminEmailDeliveryStatus delivery={claim.emailDelivery} showExplanation={false} /></td>
                    <td style={{ ...tdStyle, width: 1 }}>
                      <div className="claims-actions" style={actionCellStyle}>
                        <Link href={`/admin/claims/${claim.id}`} style={detailsLinkStyle}>
                          <AdminText i18nKey="claimsAdmin.openAction" fallback="View" />
                        </Link>

                        <WorkActions item={workUiItem(claim)} compact />
                        <DeleteClaimAction claimId={claim.id} returnPath={basePath} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-claims-cards" style={{ display: "none", gap: 12 }}>
            {!claims.length ? <p style={{ margin: 0, color: "var(--app-text-muted)" }}><AdminText i18nKey="claimsAdmin.noClaimsFound" fallback="No claims found." /></p> : null}
            {claims.map((claim, index) => (
              <article key={claim.id} style={{ ...itemCardStyle, ...workRowStyle(claim) }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={rowMetaStyle}><AdminText i18nKey="usersAdmin.orderNr" fallback="No." /> {rowNumber(index)}</div>
                    <strong>
                      <AdminText i18nKey="claimsAdmin.claim" fallback="Claim" /> {formatServiceClaimReference(claim.contractNumber, claim.claimSequence, claim.ticketNumber)}
                    </strong>
                    <div style={rowMetaStyle}>
                      <ClaimRequestTypeText requestType={claim.requestType} /> · <AdminText i18nKey="claimsAdmin.createdAt" fallback="Created" /> <AdminDateTime value={claim.createdAt} numeric />
                    </div>
                  </div>
                  <div>
                    <div style={customerNameStyle}>{formatClaimCustomerName(claim.fullName)}</div>
                    <div style={rowMetaStyle}><AdminText i18nKey="claimsAdmin.contractNumber" fallback="Contract" /> {claim.contractNumber}</div>
                  </div>
                  <div style={{ borderBlock: "1px solid var(--app-border)", paddingBlock: 10 }}><AdminText i18nKey="workProcessing.processing" fallback="Processing" /><WorkCell item={workUiItem(claim)} /></div>
                  <AdminClaimLocalizedText text={truncate(claim.problemDescription, 160)} style={issueClampStyle} />
                  <div style={{ display: "grid", gap: 6 }}>
                    <span style={rowMetaStyle}><AdminText i18nKey="orderEmailDelivery.column" fallback="Email status" /></span>
                    <AdminEmailDeliveryStatus delivery={claim.emailDelivery} showExplanation={false} />
                  </div>
                  <div className="claims-actions" style={actionCellStyle}>
                    <Link href={`/admin/claims/${claim.id}`} style={detailsLinkStyle}>
                      <AdminText i18nKey="claimsAdmin.openAction" fallback="View" />
                    </Link>

                        <WorkActions item={workUiItem(claim)} compact />
                        <DeleteClaimAction claimId={claim.id} returnPath={basePath} compact />
                  </div>
                </div>
              </article>
            ))}
          </div>

          <AdminPagination basePath={basePath} searchParams={resolvedSearchParams} {...pagination} />

          <style>{`
            .admin-claims-cards {
              display: none;
            }

            .admin-claims-table th,
            .admin-claims-table td {
              padding: 10px 12px !important;
              vertical-align: middle !important;
              font-size: var(--admin-text-body);
              line-height: 1.4;
            }

            .admin-claims-table th {
              padding: 16px 20px !important;
              font-size: var(--admin-text-label);
              line-height: 1.5;
              white-space: nowrap;
              overflow-wrap: normal;
              word-break: normal;
            }

            .admin-claims-table th:first-child {
              padding-left: 10px !important;
              padding-right: 10px !important;
            }

            .claims-actions > * {
              flex: 0 0 auto;
              width: auto !important;
            }

            .claims-actions a,
            .claims-actions button {
              min-height: 34px !important;
              padding: 7px 10px !important;
              font-size: var(--admin-text-meta) !important;
              line-height: 1.3 !important;
              box-sizing: border-box;
            }

            .claims-actions [role="alert"] {
              max-width: 180px;
            }

            .claims-table-row {
              transition: background 160ms ease;
            }

            .claims-table-row:hover {
              background: rgba(143, 62, 44, 0.045);
            }

            .admin-claims-table a:focus-visible,
            .admin-claims-cards a:focus-visible,
            .admin-claims-table button:focus-visible,
            .admin-claims-cards button:focus-visible {
              outline: 3px solid rgba(143, 62, 44, 0.24);
              outline-offset: 2px;
            }

            @media (max-width: 980px) {
              .claims-table-date {
                display: none;
              }
            }

            @media (max-width: 760px) {
              .admin-claims-table {
                display: none;
              }

              .admin-claims-cards {
                display: grid !important;
              }
            }
          `}</style>

        </AdminSection>
      </div>
    </AdminShell>
  );
}

async function listClaimCities() {
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT NULLIF(BTRIM("clientCity"), '') AS "city"
    FROM "ServiceClaim"
    WHERE NULLIF(BTRIM("clientCity"), '') IS NOT NULL
    ORDER BY "city" ASC
  `;

  return rows.map((row) => row.city).filter(Boolean);
}

function ClaimRequestTypeText({ requestType }) {
  if (requestType === "complaint") {
    return <AdminText i18nKey="claimsAdmin.complaint" fallback="Complaint" />;
  }

  return requestType || "-";
}

function DeleteClaimAction({ claimId, returnPath = "/admin/claims", compact = false }) {
  return (
    <form action={`/api/admin/claims/${claimId}`} method="post" style={deleteFormStyle}>
      <input type="hidden" name="_returnPath" value={returnPath} />
      <AdminConfirmSubmitButton
        name="_intent"
        value="delete"
        style={compact ? compactDeleteButtonStyle : deleteButtonStyle}
        confirmKey="claimsAdmin.deleteConfirmMessage"
        confirmFallback={"Delete this claim?\nThis action cannot be undone."}
      >
        <AdminText i18nKey="ordersAdmin.delete" fallback="Delete" />
      </AdminConfirmSubmitButton>
    </form>
  );
}

function DeleteAllPxClaimsAction() {
  return (
    <form action="/api/admin/px-claims" method="post" style={deleteFormStyle}>
      <AdminConfirmSubmitButton
        name="_intent"
        value="delete-all"
        style={deleteAllButtonStyle}
        confirmKey="pxClaimsAdmin.deleteAllConfirm"
        confirmFallback={"Delete all PX claims?\nThis removes every 111 test claim and cannot be undone."}
      >
        <AdminText i18nKey="pxClaimsAdmin.deleteAll" fallback="Delete all PX claims" />
      </AdminConfirmSubmitButton>
    </form>
  );
}

const rowMetaStyle = {
  marginTop: 3,
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-meta)",
  lineHeight: 1.4,
};

const detailsLinkStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface)",
  color: "var(--app-accent)",
  textDecoration: "none",
  fontWeight: 600,
  minHeight: 38,
  padding: "9px 12px",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  fontSize: "var(--admin-text-meta)",
};

const actionCellStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "nowrap",
};

const deleteFormStyle = {
  margin: 0,
};

const deleteButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  minHeight: 38,
  padding: "9px 12px",
  fontSize: "var(--admin-text-meta)",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "none",
  whiteSpace: "nowrap",
};

const compactDeleteButtonStyle = {
  ...deleteButtonStyle,
};

const deleteAllButtonStyle = {
  ...deleteButtonStyle,
  minHeight: 42,
  padding: "10px 14px",
  background: "rgba(217, 92, 92, 0.1)",
};

const customerNameStyle = {
  fontWeight: 600,
};

const issueClampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: 1.5,
};

const filterGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
};

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
  marginBottom: 16,
};

const filterHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const filterEyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(143, 62, 44, 0.1)",
  border: "1px solid rgba(143, 62, 44, 0.14)",
  color: "var(--app-accent)",
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const filterHintStyle = {
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-meta)",
  fontWeight: 700,
};

const filterFieldStyle = {
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
  border: "1px solid var(--color-primary)",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 14px",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontWeight: 600,
  fontSize: "var(--admin-text-body)",
  cursor: "pointer",
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

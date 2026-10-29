import { AdminClaimLocalizedText } from "../../../components/admin-claim-localized-text";
import { REPORT_TIME_ZONE } from "../../../lib/admin-date-time";
import Link from "next/link";
import {
  AdminSection,
  inputStyle,
  pageGridStyle,
  primaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import { AdminShell } from "../../../components/admin-shell";
import { AdminDatePicker } from "../../../components/admin-date-picker";
import {
  AdminDateTime,
  AdminStatusBadge,
  AdminText,
} from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import { AdminReportScopeLink } from "../../../components/admin-report-scope-link";
import { AdminReportTable } from "../../../components/admin-report-table";
import {
  ACTIVITY_REPORT_STATUSES,
  loadActivityReportData,
  normalizeActivityReportFilters,
} from "../../../lib/admin-activity-reports";
import { requireAdminPage } from "../../../lib/auth";
import { normalizeBusinessReportFilters, buildBusinessReportQuery, BUSINESS_REPORT_PERIODS } from "../../../lib/business-report-filters";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getExportHref(filters, businessFilters) {
  const query = buildBusinessReportQuery(businessFilters, filters);
  return query
    ? `/api/admin/reports/orders/export?${query}`
    : "/api/admin/reports/orders/export";
}

export default async function AdminReportsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const businessFilters = normalizeBusinessReportFilters(resolvedSearchParams);
  const filters = normalizeActivityReportFilters({ ...resolvedSearchParams, ...businessFilters });
  const { rows, summary } = await loadActivityReportData(filters);
  const exportHref = getExportHref(filters, businessFilters);
  const claimsOnly = filters.type === "CLAIM";
  const showIssue = filters.type !== "ORDER";
  const columnCount = 6 + (claimsOnly ? 0 : 2) + (showIssue ? 1 : 0);
  const reportQuery = buildBusinessReportQuery(businessFilters, filters);
  const returnToReports = "/admin/reports" + (reportQuery ? "?" + reportQuery : "");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="reportsAdmin.reports" fallback="Reports" />}
          actions={(
            <>
            <AdminReportScopeLink href={"/admin/reports/frg?" + reportQuery}>FRG</AdminReportScopeLink>
            <AdminReportScopeLink href={"/admin/reports/asc?" + reportQuery}>ASC</AdminReportScopeLink>
            <Link href={exportHref} prefetch={false} style={exportButtonStyle}>
              <AdminText i18nKey="reportsAdmin.exportExcel" fallback="Export Excel" />
            </Link>
            </>
          )}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {BUSINESS_REPORT_PERIODS.map(period => <Link key={period} prefetch={false} style={{ ...filterClearLinkStyle, ...(businessFilters.period === period ? { background: "var(--app-accent)", color: "white" } : {}) }} href={"/admin/reports?" + buildBusinessReportQuery(normalizeBusinessReportFilters({ ...filters, groupBy: businessFilters.groupBy, period }), filters)}>
              <AdminText i18nKey={`businessReports.${period}`} fallback={period.replaceAll("_", " ")} />
            </Link>)}
          </div>
          <form key={reportQuery} action="/admin/reports" method="get" style={filterPanelStyle}>
            <input type="hidden" name="period" value="CUSTOM" />
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
              <AdminDatePicker name="dateFrom" defaultValue={filters.dateFrom} style={filterInputStyle} labelKey="ordersAdmin.dateFrom" label="Date from" />
            </label>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
              <AdminDatePicker name="dateTo" defaultValue={filters.dateTo} style={filterInputStyle} labelKey="ordersAdmin.dateTo" label="Date to" />
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
              <span><AdminText i18nKey="businessReports.groupBy" fallback="Group by" /></span>
              <AdminSelect name="groupBy" defaultValue={businessFilters.groupBy} style={filterInputStyle}>
                {["DAY", "WEEK", "MONTH"].map(group => <option key={group} value={group}><AdminText i18nKey={`businessReports.${group}`} fallback={group} /></option>)}
              </AdminSelect>
            </label>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="reportsAdmin.type" fallback="Type" /></span>
              <AdminSelect name="type" defaultValue={filters.type} style={filterInputStyle}>
                <option value=""><AdminText i18nKey="reportsAdmin.allTypes" fallback="Orders and claims" /></option>
                <option value="ORDER"><AdminText i18nKey="ordersAdmin.order" fallback="Order" /></option>
                <option value="CLAIM"><AdminText i18nKey="reportsAdmin.claimType" fallback="Claim" /></option>
              </AdminSelect>
            </label>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="dashboard.status" fallback="Status" /></span>
              <AdminSelect name="status" defaultValue={filters.status} style={filterInputStyle}>
                <option value=""><AdminText i18nKey="dashboard.allStatuses" fallback="All statuses" /></option>
                {ACTIVITY_REPORT_STATUSES.map((status) => (
                  <option key={status} value={status}><AdminText i18nKey={status === "RECEIVED" ? "reportsAdmin.claimReceived" : `status.${status.toLowerCase()}`} fallback={status === "RECEIVED" ? "Received (claim)" : status} /></option>
                ))}
              </AdminSelect>
            </label>
            <div style={filterActionsStyle}>
              <button type="submit" style={filterApplyButtonStyle}>
                <AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" />
              </button>
              <Link href="/admin/reports" scroll={false} style={filterClearLinkStyle}>
                <AdminText i18nKey="contractsAdmin.clear" fallback="Clear" />
              </Link>
            </div>
          </form>
          <dl style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: 0 }}>
            {[
              ["reportsAdmin.totalOrders", "Total orders", summary.totalOrders],
              ["reportsAdmin.totalClaims", "Total claims", summary.totalClaims],
            ].map(([key, label, value]) => <div key={key} style={reportTotalCardStyle}>
              <dt style={summaryLabelStyle}><AdminText i18nKey={key} fallback={label} /></dt>
              <dd style={{ ...summaryValueStyle, fontSize: 28, fontVariantNumeric: "tabular-nums" }}>{new Intl.NumberFormat("de-DE").format(value)}</dd>
            </div>)}
          </dl>
          {filters.type === "ORDER" && <div style={orderSummaryStyle}>
            <dl style={orderSummaryGridStyle}>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.doneOrders" fallback="Done orders" /></dt><dd style={summaryValueStyle}>{summary.doneOrders}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.notDone" fallback="Not done" /></dt><dd style={summaryValueStyle}>{summary.notDoneUnpaidOrders}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.netWithoutVat" fallback="Net without VAT" /></dt><dd style={summaryValueStyle}>{formatCurrency(summary.confirmedNet)}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.vatTotal" fallback="VAT total (19%)" /></dt><dd style={summaryValueStyle}>{formatCurrency(summary.confirmedVat)}</dd></div>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.totalWithVat" fallback="Total with VAT" /></dt><dd style={{ ...summaryValueStyle, fontWeight: 700 }}>{formatCurrency(summary.confirmedGross)}</dd></div>
            </dl>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--app-text-muted)" }}><AdminText i18nKey="reportsAdmin.amountsConfirmedOnly" fallback="Amounts for confirmed orders only" /></p>
          </div>}
        </AdminSection>

        <AdminSection
          title={<AdminText i18nKey="reportsAdmin.activityRows" fallback="Orders and claims" />}
        >
          <AdminReportTable style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={{ ...tableStyle, tableLayout: "auto", minWidth: 1000 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ ...reportThStyle, width: 48, textAlign: "center" }}><AdminText i18nKey="reportsAdmin.rowNumber" fallback="No." /></th>
                  <th style={reportThStyle}><AdminText i18nKey="reportsAdmin.type" fallback="Type" /></th>
                  <th style={reportThStyle}><AdminText i18nKey="reportsAdmin.reference" fallback="Reference" /></th>
                  <th style={reportThStyle}><AdminText i18nKey="ordersAdmin.customer" fallback="Customer" /></th>
                  <th style={reportThStyle}><AdminText i18nKey="claimsAdmin.createdAt" fallback="Created" /></th>
                  {!claimsOnly && <th style={reportThStyle}><AdminText i18nKey="ordersAdmin.status" fallback="Status" /></th>}
                  {showIssue && <th style={reportThStyle}><AdminText i18nKey="claimsAdmin.issue" fallback="Issue" /></th>}
                  {!claimsOnly && <th style={{ ...reportThStyle, textAlign: "right" }}><AdminText i18nKey="reportsAdmin.totalWithVat" fallback="Total with VAT" /></th>}
                  <th style={reportThStyle}><AdminText i18nKey="ordersAdmin.action" fallback="Action" /></th>
                </tr>
              </thead>
              <tbody>
                {!rows.length && <tr><td style={reportTdStyle} colSpan={columnCount}><AdminText i18nKey="reportsAdmin.noRecords" fallback="No orders or claims found." /></td></tr>}
                {rows.map((row, index) => {
                  const detailHref = row.href + "?returnTo=" + encodeURIComponent(returnToReports);
                  const reference = row.reference;
                  return <tr key={row.type + ":" + row.id}>
                    <td style={{ ...reportTdStyle, textAlign: "center", color: "var(--app-text-muted)", fontSize: "var(--admin-text-label)", fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{index + 1}</td>
                    <td style={reportTdStyle}>
                      <span style={{ ...reportTypeBadgeStyle, ...(row.type === "ORDER" ? reportOrderBadgeStyle : reportClaimBadgeStyle) }}>
                        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                        {row.type === "ORDER" ? <AdminText i18nKey="reportsAdmin.orderType" fallback="Order" /> : <AdminText i18nKey="reportsAdmin.claimType" fallback="Claim" />}
                      </span>
                    </td>
                    <td style={reportTdStyle}><Link href={detailHref} style={orderLinkStyle}>{reference}</Link></td>
                    <td style={reportTdStyle}><span title={row.customer} style={{ display: "block", maxWidth: 240, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>{row.customer || "—"}</span></td>
                    <td style={reportTdStyle}><AdminDateTime value={row.createdAt} timeZone={REPORT_TIME_ZONE} stacked /></td>
                    {!claimsOnly && <td style={reportTdStyle}>{row.type === "ORDER" ? <AdminStatusBadge status={row.status} /> : "—"}</td>}
                    {showIssue && <td style={{ ...reportTdStyle, whiteSpace: "normal", minWidth: 200, maxWidth: 300 }} title={row.type === "CLAIM" ? row.issue : undefined}>
                      {row.type === "CLAIM"
                        ? <AdminClaimLocalizedText text={row.issueSummary || row.issue || "—"} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere", lineHeight: 1.5, fontSize: "var(--admin-text-body)" }} />
                        : "—"}
                    </td>}
                    {!claimsOnly && <td style={{ ...reportTdStyle, textAlign: "right", fontWeight: 700 }}>{row.gross === null ? "—" : formatCurrency(row.gross)}</td>}
                    <td style={reportTdStyle}><Link href={detailHref} style={viewButtonStyle}><AdminText i18nKey="ordersAdmin.view" fallback="View" /></Link></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </AdminReportTable>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  alignItems: "end",
  borderRadius: 8,
  border: "1px solid rgba(143, 62, 44, 0.16)",
  background: "linear-gradient(180deg, rgba(255,247,241,0.82), rgba(255,255,255,0.72))",
  padding: 14,
};

const filterFieldStyle = {
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

const exportButtonStyle = {
  ...primaryButtonStyle,
  fontSize: "var(--admin-text-body)",
  fontWeight: 600,
  minHeight: 42,
  borderRadius: 8,
  padding: "10px 14px",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const orderSummaryStyle = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid var(--app-border)",
};

const reportTotalCardStyle = {
  padding: "12px 16px",
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface-soft, #faf8f5)",
};

const orderSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px 20px",
  margin: 0,
};

const summaryLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-label)",
  marginBottom: 4,
};

const summaryValueStyle = {
  margin: 0,
  fontSize: "var(--admin-text-metric)",
  fontWeight: 700,
  lineHeight: 1.2,
};

const orderLinkStyle = {
  color: "var(--app-text)",
  textDecoration: "none",
  fontWeight: 600,
};

const reportThStyle = { ...thStyle, padding: "16px 20px", whiteSpace: "nowrap" };
const reportTdStyle = { ...tdStyle, padding: "16px 12px", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: "var(--admin-text-body)" };

const viewButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 38,
  padding: "9px 12px",
  border: "1px solid var(--app-border)",
  borderRadius: 8,
  background: "var(--app-surface)",
  color: "var(--app-accent)",
  fontSize: "var(--admin-text-meta)",
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const reportTypeBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  minWidth: 78,
  padding: "5px 10px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
};

const reportOrderBadgeStyle = {
  color: "#24568a",
  background: "#edf4fc",
  borderColor: "#c4d8ee",
};

const reportClaimBadgeStyle = {
  color: "#925019",
  background: "#fff3e6",
  borderColor: "#efd2af",
};

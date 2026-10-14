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
import {
  AdminDateTime,
  AdminStatusBadge,
  AdminText,
} from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import {
  ACTIVITY_REPORT_STATUSES,
  buildActivityReportQuery,
  loadActivityReportData,
  normalizeActivityReportFilters,
} from "../../../lib/admin-activity-reports";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getExportHref(filters) {
  const query = buildActivityReportQuery(filters);
  return query
    ? `/api/admin/reports/orders/export?${query}`
    : "/api/admin/reports/orders/export";
}

export default async function AdminReportsPage({ searchParams = {} }) {
  const admin = await requireAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const filters = normalizeActivityReportFilters(resolvedSearchParams);
  const { rows, summary } = await loadActivityReportData(filters);
  const exportHref = getExportHref(filters);
  const claimsOnly = filters.type === "CLAIM";
  const showIssue = filters.type !== "ORDER";
  const columnCount = 6 + (claimsOnly ? 0 : 2) + (showIssue ? 1 : 0);
  const reportQuery = buildActivityReportQuery(filters);
  const returnToReports = "/admin/reports" + (reportQuery ? "?" + reportQuery : "");

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="reportsAdmin.reports" fallback="Reports" />}
          description={<AdminText i18nKey="reportsAdmin.description" fallback="Orders and claims in one table, with filters and Excel export." />}
          actions={(
            <Link href={exportHref} prefetch={false} style={exportButtonStyle}>
              <AdminText i18nKey="reportsAdmin.exportExcel" fallback="Export Excel" />
            </Link>
          )}
        >
          <form action="/admin/reports" method="get" style={filterPanelStyle}>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span>
              <input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={filterInputStyle} />
            </label>
            <label style={filterFieldStyle}>
              <span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span>
              <input name="dateTo" type="date" defaultValue={filters.dateTo} style={filterInputStyle} />
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
                <AdminText i18nKey="dashboard.apply" fallback="Apply" />
              </button>
              <Link href="/admin/reports" scroll={false} style={filterClearLinkStyle}>
                <AdminText i18nKey="dashboard.clearFilters" fallback="Clear filters" />
              </Link>
            </div>
          </form>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12, color: "var(--app-text-muted)", fontSize: 14 }}>
            <span><AdminText i18nKey="reportsAdmin.totalRecords" fallback="Total records" />: <strong>{summary.totalRecords}</strong></span>
            <span><AdminText i18nKey="reportsAdmin.totalClaims" fallback="Total claims" />: <strong>{summary.totalClaims}</strong></span>
          </div>
          {filters.type === "ORDER" && <div style={orderSummaryStyle}>
            <dl style={orderSummaryGridStyle}>
              <div><dt style={summaryLabelStyle}><AdminText i18nKey="reportsAdmin.totalOrders" fallback="Total orders" /></dt><dd style={summaryValueStyle}>{summary.totalOrders}</dd></div>
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
          <div className="admin-reports-table" style={tableWrapStyle}>
            <table style={{ ...tableStyle, tableLayout: "auto", minWidth: 1000 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ ...reportThStyle, width: 48, textAlign: "center" }}><AdminText i18nKey="reportsAdmin.rowNumber" fallback="Nr." /></th>
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
                  const reference = row.type === "ORDER" ? row.reference : row.contractNumber || row.reference;
                  return <tr key={row.type + ":" + row.id}>
                    <td style={{ ...reportTdStyle, textAlign: "center", color: "var(--app-text-muted)", fontVariantNumeric: "tabular-nums" }}>{index + 1}</td>
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
                        ? <AdminClaimLocalizedText text={row.issueSummary || row.issue || "—"} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere", lineHeight: 1.5, fontSize: 13 }} />
                        : "—"}
                    </td>}
                    {!claimsOnly && <td style={{ ...reportTdStyle, textAlign: "right", fontWeight: 700 }}>{row.gross === null ? "—" : formatCurrency(row.gross)}</td>}
                    <td style={reportTdStyle}><Link href={detailHref} style={{ color: "var(--app-accent)", textDecoration: "none", fontWeight: 600, fontSize: 13 }}><AdminText i18nKey="reportsAdmin.viewDetails" fallback="View details" /> →</Link></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
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
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  ...inputStyle,
  minHeight: 42,
  borderRadius: 8,
  padding: "9px 11px",
  background: "rgba(255,255,255,0.94)",
  fontSize: "0.92rem",
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
  fontSize: "0.92rem",
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
  fontWeight: 800,
  fontSize: "0.92rem",
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
};

const exportButtonStyle = {
  ...primaryButtonStyle,
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

const orderSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px 20px",
  margin: 0,
};

const summaryLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  marginBottom: 4,
};

const summaryValueStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  lineHeight: 1.2,
};

const orderLinkStyle = {
  color: "var(--app-text)",
  textDecoration: "none",
  fontWeight: 900,
};

const reportThStyle = { ...thStyle, padding: "11px 14px", whiteSpace: "nowrap" };
const reportTdStyle = { ...tdStyle, padding: "10px 14px", verticalAlign: "middle", whiteSpace: "nowrap", fontSize: 14 };

const reportTypeBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  minWidth: 78,
  padding: "5px 10px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
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

import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "./admin-shell";
import { AdminSection, inputStyle, pageGridStyle, primaryButtonStyle } from "./admin-ui";
import { AdminText } from "./admin-i18n";
import AdminSelect from "./admin-select";
import { AdminBusinessReport } from "./admin-business-report";
import { AdminBusinessReportPeriods } from "./admin-business-report-periods";
import { AdminReportScopeLink } from "./admin-report-scope-link";
import { requireAdminPage } from "../lib/auth";
import { normalizeActivityReportFilters } from "../lib/admin-activity-reports";
import { loadBusinessReportData } from "../lib/admin-business-reports";
import { normalizeBusinessReportFilters, buildBusinessReportQuery, getActiveBusinessReportPeriod, BUSINESS_REPORT_PERIODS } from "../lib/business-report-filters";

export async function AdminBusinessReportPage({ scope, searchParams }) {
  const admin = await requireAdminPage();
  const params = (await searchParams) || {};
  const filters = normalizeBusinessReportFilters(params);
  const activityFilters = normalizeActivityReportFilters(params);
  const path = scope === "FRG" ? "/admin/reports/frg" : "/admin/reports/asc";
  const activePeriod = getActiveBusinessReportPeriod(filters, params.preset);
  const query = buildBusinessReportQuery({ ...filters, preset: activePeriod }, activityFilters);
  const periods = BUSINESS_REPORT_PERIODS.map(period => ({
    period,
    href: path + "?" + buildBusinessReportQuery(normalizeBusinessReportFilters({ ...filters, period }), activityFilters),
  }));
  return <AdminShell adminEmail={admin.email}>
    <div style={{ ...pageGridStyle, gap: 12 }}>
      <AdminSection compact title={scope === "FRG" ? "Fragmento" : "ASC"}
        actions={<>
          <AdminReportScopeLink compact href={"/admin/reports?" + query}><AdminText i18nKey="reportsAdmin.backToReports" fallback="Back to reports" /></AdminReportScopeLink>
          <AdminReportScopeLink compact href={(scope === "FRG" ? "/admin/reports/asc?" : "/admin/reports/frg?") + query}>{scope === "FRG" ? "ASC" : "FRG"}</AdminReportScopeLink>
          <Link href={"/api/admin/reports/orders/export?scope=" + scope + "&" + query} prefetch={false} style={{ ...compactButtonStyle, textDecoration: "none" }}><AdminText i18nKey="reportsAdmin.exportExcel" fallback="Export Excel" /></Link>
        </>}>
        <AdminBusinessReportPeriods periods={periods} activePeriod={activePeriod} />
        <form key={query} action={path} method="get" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, alignItems: "end" }}>
          <input type="hidden" name="period" value="CUSTOM" />
          <input type="hidden" name="type" value={activityFilters.type} />
          <input type="hidden" name="status" value={activityFilters.status} />
          <label style={fieldStyle}><span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span><input name="dateFrom" type="date" defaultValue={filters.dateFrom} style={compactInputStyle} /></label>
          <label style={fieldStyle}><span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span><input name="dateTo" type="date" defaultValue={filters.dateTo} style={compactInputStyle} /></label>
          <label style={fieldStyle}><span><AdminText i18nKey="contractsAdmin.contractType" fallback="Contract type" /></span>
            <AdminSelect name="contractType" defaultValue={filters.contractType} style={compactInputStyle}>
              <option value=""><AdminText i18nKey="contractsAdmin.allContractTypes" fallback="All contract types" /></option>
              <option value="FRG">FRG</option><option value="ARC">ARC</option>
            </AdminSelect>
          </label>
          <label style={fieldStyle}><span><AdminText i18nKey="businessReports.groupBy" fallback="Group by" /></span>
            <AdminSelect name="groupBy" defaultValue={filters.groupBy} style={compactInputStyle}>
              {["DAY", "WEEK", "MONTH"].map(group => <option key={group} value={group}><AdminText i18nKey={`businessReports.${group}`} fallback={group} /></option>)}
            </AdminSelect>
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="submit" style={compactButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
            <Link href={path} style={linkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
          </div>
        </form>
      </AdminSection>
      <Suspense key={query} fallback={<AdminSection compact><p role="status" style={{ margin: 0, color: "var(--app-text-muted)", padding: "24px 0" }}><AdminText i18nKey="businessReports.updating" fallback="Updating report…" /></p></AdminSection>}>
        <BusinessReportContent filters={filters} scope={scope} />
      </Suspense>
    </div>
  </AdminShell>;
}

async function BusinessReportContent({ filters, scope }) {
  const report = await loadBusinessReportData(filters);
  return <AdminBusinessReport report={report} scope={scope === "FRG" ? "Fragmento" : "ASC"} />;
}

const linkStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", minHeight: 34, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--app-border)", color: "var(--app-accent)", background: "var(--app-surface)", fontSize: 13 };
const compactButtonStyle = { ...primaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 34, padding: "6px 10px", borderRadius: 6, fontSize: 13, boxShadow: "none" };
const compactInputStyle = { ...inputStyle, minHeight: 34, padding: "6px 10px", borderRadius: 6, fontSize: 13 };
const fieldStyle = { display: "grid", gap: 3, minWidth: 0, fontSize: 12, color: "var(--app-text-muted)" };

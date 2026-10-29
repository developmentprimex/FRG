import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "./admin-shell";
import { AdminSection, inputStyle, pageGridStyle, primaryButtonStyle } from "./admin-ui";
import { AdminText } from "./admin-i18n";
import AdminSelect from "./admin-select";
import { AdminFrgMonthlyReportPage } from "./admin-frg-monthly-report";
import { AdminAscKitchenReport } from "./admin-asc-kitchen-report";
import { loadAscKitchenReport, normalizeAscKitchenFilters } from "../lib/asc-kitchen-report.js";
import { AdminAscClaimReport } from "./admin-asc-claim-report";
import { loadAscClaimReport } from "../lib/asc-claim-report.js";
import { AdminBusinessReportPeriods } from "./admin-business-report-periods";
import { AdminDatePicker } from "./admin-date-picker";
import { AdminReportScopeLink } from "./admin-report-scope-link";
import { requireAdminPage } from "../lib/auth";
import { normalizeActivityReportFilters } from "../lib/admin-activity-reports";
import { normalizeBusinessReportFilters, buildBusinessReportQuery, getActiveBusinessReportPeriod, BUSINESS_REPORT_PERIODS } from "../lib/business-report-filters";

export async function AdminBusinessReportPage({ scope, searchParams }) {
  if (scope === "FRG") return AdminFrgMonthlyReportPage({ searchParams });
  const admin = await requireAdminPage();
  const params = (await searchParams) || {};
  const now = new Date();
  const filters = normalizeAscKitchenFilters(params, now);
  const latestReportDate = normalizeAscKitchenFilters({}, now).asOfDate;
  const activityFilters = normalizeActivityReportFilters(params);
  const path = scope === "FRG" ? "/admin/reports/frg" : "/admin/reports/asc";
  const activePeriod = getActiveBusinessReportPeriod(filters, params.preset);
  const query = buildBusinessReportQuery({ ...filters, preset: activePeriod }, activityFilters);
  const periods = BUSINESS_REPORT_PERIODS.map(period => ({
    period,
    href: path + "?" + buildBusinessReportQuery(normalizeBusinessReportFilters({ ...filters, period }), activityFilters),
  }));
  return <AdminShell adminEmail={admin.email}>
    <div style={{ ...pageGridStyle, gap: 12, minWidth: 0, gridTemplateColumns: "minmax(0, 1fr)" }}>
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
          <label style={fieldStyle}><span><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" /></span><AdminDatePicker name="dateFrom" defaultValue={filters.dateFrom} max={latestReportDate} style={compactInputStyle} labelKey="ordersAdmin.dateFrom" label="Date from" /></label>
          <label style={fieldStyle}><span><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" /></span><AdminDatePicker name="dateTo" defaultValue={filters.dateTo} max={latestReportDate} style={compactInputStyle} labelKey="ordersAdmin.dateTo" label="Date to" /></label>
          <label style={fieldStyle}><span><AdminText i18nKey="ascKitchenReport.source" fallback="Kitchen source" /></span>
            <AdminSelect name="contractType" defaultValue={filters.contractType} style={compactInputStyle}>
              <option value=""><AdminText i18nKey="ascKitchenReport.allSources" fallback="All sources" /></option>
              <option value="FRG"><AdminText i18nKey="ascKitchenReport.fromFragmento" fallback="Kitchens from Fragmento" /></option>
              <option value="ARC"><AdminText i18nKey="ascKitchenReport.otherSource" fallback="Other kitchens" /></option>
            </AdminSelect>
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="submit" style={compactButtonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
            <Link href={path} style={linkStyle}><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></Link>
          </div>
        </form>
      </AdminSection>
      <Suspense key={query} fallback={<AdminSection compact><p role="status" style={{ margin: 0, color: "var(--app-text-muted)", padding: "24px 0" }}><AdminText i18nKey="businessReports.updating" fallback="Updating report…" /></p></AdminSection>}>
        <BusinessReportContent filters={filters} now={now} />
      </Suspense>
    </div>
  </AdminShell>;
}

async function BusinessReportContent({ filters, now }) {
  const [claims, kitchens] = await Promise.all([loadAscClaimReport(filters, undefined, now), loadAscKitchenReport(filters, undefined, now)]);
  return <>
    <AdminAscKitchenReport report={kitchens} />
    <AdminAscClaimReport report={claims} />
  </>;
}

const linkStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", minHeight: 34, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--app-border)", color: "var(--app-accent)", background: "var(--app-surface)", fontSize: 13 };
const compactButtonStyle = { ...primaryButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 34, padding: "6px 10px", borderRadius: 6, fontSize: 13, boxShadow: "none" };
const compactInputStyle = { ...inputStyle, minHeight: 34, padding: "6px 10px", borderRadius: 6, fontSize: 13 };
const fieldStyle = { display: "grid", gap: 3, minWidth: 0, fontSize: 12, color: "var(--app-text-muted)" };

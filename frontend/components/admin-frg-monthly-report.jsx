import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "./admin-shell";
import { AdminSection, inputStyle, pageGridStyle, primaryButtonStyle, tableWrapStyle, tableStyle, thStyle, tdStyle } from "./admin-ui";
import { AdminText, AdminMonth } from "./admin-i18n";
import { AdminReportScopeLink } from "./admin-report-scope-link";
import { AdminReportTable } from "./admin-report-table";
import { AdminBusinessReportPeriods } from "./admin-business-report-periods";
import { AdminDatePicker } from "./admin-date-picker";
import { BUSINESS_REPORT_PERIODS } from "../lib/business-report-filters.js";
import { requireAdminPage } from "../lib/auth";
import { normalizeFrgMonthlyFilters, buildFrgMonthlyQuery, loadFrgMonthlyReport, reportDisplayDate } from "../lib/frg-monthly-report.js";

const text = (key, fallback, values) => <AdminText i18nKey={`frgMonthlyReport.${key}`} fallback={fallback} values={values} />;
const count = value => new Intl.NumberFormat("de-DE").format(value);
const money = value => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
const buttonStyle = { ...primaryButtonStyle, minHeight: 34, padding: "6px 12px", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center" };
const cellStyle = { padding: "16px 12px", verticalAlign: "middle" };
const headerStyle = { ...thStyle, whiteSpace: "nowrap" };

export async function AdminFrgMonthlyReportPage({ searchParams }) {
  const admin = await requireAdminPage();
  const params = (await searchParams) || {};
  const now = new Date();
  const filters = normalizeFrgMonthlyFilters(params, now);
  const current = normalizeFrgMonthlyFilters({}, now);
  const query = buildFrgMonthlyQuery(filters);
  const periods = BUSINESS_REPORT_PERIODS.map(period => ({ period,
    href: "/admin/reports/frg?" + buildFrgMonthlyQuery(normalizeFrgMonthlyFilters({ period }, now)),
  }));
  const ascQuery = new URLSearchParams(query);
  ascQuery.delete("month");
  ascQuery.delete("contractType");
  return <AdminShell adminEmail={admin.email}>
    <div style={{ ...pageGridStyle, gap: 12 }}>
      <AdminSection compact title={text("title", "Fragmento — report")} actions={<>
        <AdminReportScopeLink compact href={"/admin/reports?" + query}><AdminText i18nKey="reportsAdmin.backToReports" fallback="Back to reports" /></AdminReportScopeLink>
        <AdminReportScopeLink compact href={"/admin/reports/asc?" + ascQuery}>ASC</AdminReportScopeLink>
        <Link href={"/api/admin/reports/orders/export?scope=FRG&" + query} prefetch={false} style={buttonStyle}><AdminText i18nKey="reportsAdmin.exportExcel" fallback="Export Excel" /></Link>
      </>}>
        <AdminBusinessReportPeriods periods={periods} activePeriod={filters.preset} />
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: 18, marginTop: 12 }}>
          <form action="/admin/reports/frg" method="get" key={query} style={filterFormStyle}>
            <input type="hidden" name="period" value="CUSTOM" />
            <label style={fieldStyle}><AdminText i18nKey="ordersAdmin.dateFrom" fallback="Date from" />
              <AdminDatePicker name="dateFrom" defaultValue={filters.dateFrom} max={current.asOfDate} style={filterInputStyle} labelKey="ordersAdmin.dateFrom" label="Date from" />
            </label>
            <label style={fieldStyle}><AdminText i18nKey="ordersAdmin.dateTo" fallback="Date to" />
              <AdminDatePicker name="dateTo" defaultValue={filters.dateTo} max={current.asOfDate} style={filterInputStyle} labelKey="ordersAdmin.dateTo" label="Date to" />
            </label>
            <button type="submit" style={buttonStyle}><AdminText i18nKey="contractsAdmin.applyFilters" fallback="Apply filters" /></button>
            <AdminReportScopeLink compact href="/admin/reports/frg"><AdminText i18nKey="contractsAdmin.clear" fallback="Clear" /></AdminReportScopeLink>
          </form>
          <form action="/admin/reports/frg" method="get" key={filters.month} style={filterFormStyle}>
            <label style={fieldStyle}>
              {text("month", "Report month")}
              <AdminDatePicker type="month" name="month" defaultValue={filters.month} max={current.month} required style={filterInputStyle} labelKey="frgMonthlyReport.month" label="Report month" />
            </label>
            <button type="submit" style={buttonStyle}>{text("viewMonth", "View month")}</button>
          </form>
        </div>
      </AdminSection>
      <Suspense key={query} fallback={<AdminSection compact><p role="status">{text("loading", "Loading monthly report…")}</p></AdminSection>}>
        <MonthlyContent filters={filters} now={now} />
      </Suspense>
    </div>
  </AdminShell>;
}

async function MonthlyContent({ filters, now }) {
  const report = await loadFrgMonthlyReport(filters, undefined, now);
  return <AdminFrgMonthlyReport report={report} />;
}

export function AdminFrgMonthlyReport({ report }) {
  const { filters } = report;
  return <AdminSection compact title={<ReportPeriod filters={filters} />}>
    <AdminReportTable style={{ ...tableWrapStyle, borderRadius: 4 }}>
      <table dir="ltr" style={{ ...tableStyle, minWidth: 740 }}>
        <thead><tr>
          <th scope="col" style={headerStyle}>{text("description", "Description")}</th>
          <th scope="col" style={headerStyle}>{filters.previousDate
            ? text("previous", "Through {date}", { date: reportDisplayDate(filters.previousDate) })
            : text("beforePeriod", "Before selected period")}</th>
          <th scope="col" style={headerStyle}><ReportPeriod filters={filters} /></th>
          <th scope="col" style={headerStyle}>{text("cumulative", "Total")}</th>
        </tr></thead>
        <tbody>{report.metrics.map(([key, label, format]) => <tr key={key}>
          <th scope="row" style={{ ...tdStyle, ...cellStyle, textAlign: "left", fontWeight: 500 }}>{text(key, label)}</th>
          {["previous", "current", "total"].map(bucket => <td key={bucket} style={{ ...tdStyle, ...cellStyle, textAlign: "right", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums",
            ...(bucket === "total" ? { fontWeight: 700 } : {}) }}>
            {format === "currency" ? money(report[bucket][key]) : count(report[bucket][key])}
          </td>)}
        </tr>)}</tbody>
      </table>
    </AdminReportTable>
  </AdminSection>;
}

function ReportPeriod({ filters }) {
  if (filters.isMonth) return <AdminMonth value={filters.month} />;
  if (!filters.dateFrom && !filters.dateTo) return <AdminText i18nKey="businessReports.ALL" fallback="All time" />;
  if (!filters.dateFrom) return text("previous", "Through {date}", { date: reportDisplayDate(filters.dateTo) });
  if (filters.dateFrom === filters.dateTo) return reportDisplayDate(filters.dateFrom);
  return `${reportDisplayDate(filters.dateFrom)} – ${reportDisplayDate(filters.dateTo)}`;
}

const fieldStyle = { display: "grid", gap: 5, minWidth: 170, fontSize: 13 };
const filterFormStyle = { display: "flex", alignItems: "end", flexWrap: "wrap", gap: 10 };
const filterInputStyle = { ...inputStyle, minHeight: 36, padding: "6px 10px" };

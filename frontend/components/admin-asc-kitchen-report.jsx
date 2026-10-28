import { AdminSection, tableWrapStyle, tableStyle, thStyle, tdStyle } from "./admin-ui";
import { AdminText, AdminMonth } from "./admin-i18n";
import { AdminReportTable } from "./admin-report-table";
import { reportDisplayDate } from "../lib/frg-monthly-report.js";

const text = (key, fallback, values) => <AdminText i18nKey={`ascKitchenReport.${key}`} fallback={fallback} values={values} />;
const count = value => new Intl.NumberFormat("de-DE").format(value);
const cellStyle = { padding: "16px 14px", border: "1px solid var(--app-border)", verticalAlign: "middle" };
const totalStyle = { background: "var(--app-surface-soft)", fontWeight: 700 };

export function AdminAscKitchenReport({ report }) {
  return <AdminAscComparisonReport report={report} rows={report.categories} title={text("title", "ASC — kitchens by source")} showCombined />;
}

export function AdminAscComparisonReport({ report, rows, title, showCombined = false, label }) {
  const { filters } = report;
  return <AdminSection compact title={title}>
    <AdminReportTable style={tableWrapStyle}>
      <table dir="ltr" style={{ ...tableStyle, minWidth: 740 }}>
        <thead><tr>
          <th scope="col" style={{ ...thStyle, ...cellStyle }}>{label || text("category", "Category")}</th>
          <th scope="col" style={{ ...thStyle, ...cellStyle }}>{filters.previousDate
            ? text("previous", "Through {date}", { date: reportDisplayDate(filters.previousDate) })
            : text("beforePeriod", "Before selected period")}</th>
          <th scope="col" style={{ ...thStyle, ...cellStyle }}><ReportPeriod filters={filters} /></th>
          <th scope="col" style={{ ...thStyle, ...cellStyle, ...totalStyle }}>{text("total", "Total")}</th>
        </tr></thead>
        <tbody>{rows.map(([key, label]) => <tr key={key}>
          <th scope="row" style={{ ...tdStyle, ...cellStyle, textAlign: "left", fontWeight: 500 }}>{text(key, label)}</th>
          {["previous", "current", "total"].map(bucket => <td key={bucket} style={{ ...tdStyle, ...cellStyle, textAlign: "right", fontVariantNumeric: "tabular-nums", ...(bucket === "total" ? totalStyle : {}) }}>{count(report[bucket][key])}</td>)}
        </tr>)}</tbody>
        {showCombined && <tfoot><tr>
          <th scope="row" style={{ ...tdStyle, ...cellStyle, ...totalStyle, textAlign: "left" }}>{text("total", "Total")}</th>
          {["previous", "current", "total"].map(bucket => <td key={bucket} style={{ ...tdStyle, ...cellStyle, ...totalStyle, textAlign: "right" }}>{count(report.combined[bucket])}</td>)}
        </tr></tfoot>}
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

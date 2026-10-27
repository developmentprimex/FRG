import { AdminSection, tableWrapStyle, tableStyle, thStyle, tdStyle } from "./admin-ui";
import { AdminText } from "./admin-i18n";
import { AdminReportTable } from "./admin-report-table";

const text = (key, fallback) => <AdminText i18nKey={`businessReports.${key}`} fallback={fallback} />;
const count = value => new Intl.NumberFormat("de-DE").format(value);
const amount = value => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
const reportCellStyle = {
  textAlign: "left",
  verticalAlign: "bottom",
  padding: "16px 12px",
  border: "1px solid var(--app-border-strong, var(--app-border))",
};
const reportHeaderStyle = {
  ...thStyle,
  ...reportCellStyle,
  lineHeight: 1.5,
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  overflowWrap: "normal",
};
const reportValueStyle = { ...tdStyle, ...reportCellStyle };

export function AdminBusinessReport({ report, scope }) {
  const { columns, rows, total } = report[scope];
  const metrics = scope === "Fragmento"
    ? [["orders", "Orders"], ["cancellationRequests", "Cancellation requests"], ["contracts", "Kitchen contracts added"], ["emails", "Emails sent (recipients)"]]
    : [["claims", "Claims"], ["frgKitchens", "FRG kitchen models added"], ["arcKitchens", "ARC kitchen models added"], ["emailsKd", "Emails to kd@myarchitecto.de"], ["emailsHbi", "Emails to verwaltung@hbi-wohnen.de"]];
  return <AdminSection compact>
    <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, margin: 0 }}>
      {metrics.map(([key, label]) => <div key={key} style={{ padding: "8px 12px", border: "1px solid var(--app-border)", borderRadius: 8, background: "var(--app-surface-soft, #faf8f5)" }}>
        <dt style={{ color: "var(--app-text-muted)", fontSize: 12 }}>{text(key, label)}</dt>
        <dd style={{ margin: "2px 0 0", fontSize: 22, lineHeight: 1.2, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{count(total[key])}</dd>
      </div>)}
    </dl>
    <AdminReportTable style={{ ...tableWrapStyle, minWidth: 0, maxWidth: "100%" }}>
      <table dir="ltr" style={{ ...tableStyle, tableLayout: "auto", minWidth: 850 }}>
        <thead><tr>
          <th scope="col" style={reportHeaderStyle}>{text("periodStarting", "Period starting")}</th>
          {columns.map(([key, label]) => <th key={key} scope="col" style={reportHeaderStyle}>{text(key, label)}</th>)}
        </tr></thead>
        <tbody>
          {!rows.length && <tr><td colSpan={columns.length + 1} style={reportValueStyle}>{text("noActivity", "No activity in this period.")}</td></tr>}
          {rows.map(row => <tr key={row.period}>
            <th scope="row" style={{ ...reportValueStyle, whiteSpace: "nowrap", fontWeight: 500 }}>{`${row.period.slice(8, 10)}/${row.period.slice(5, 7)}/${row.period.slice(0, 4)}`}</th>
            {columns.map(([key, , format]) => <td key={key} style={reportValueStyle}>{format === "currency" ? amount(row[key]) : count(row[key])}</td>)}
          </tr>)}
        </tbody>
        <tfoot><tr style={{ background: "var(--app-surface-soft, #faf8f5)" }}>
          <th scope="row" style={{ ...reportValueStyle, fontWeight: 700 }}>{text("total", "Total")}</th>
          {columns.map(([key, , format]) => <td key={key} style={{ ...reportValueStyle, fontWeight: 700 }}>{format === "currency" ? amount(total[key]) : count(total[key])}</td>)}
        </tr></tfoot>
      </table>
    </AdminReportTable>
  </AdminSection>;
}

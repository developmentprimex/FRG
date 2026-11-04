"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AdminDateTime, useAdminI18n } from "./admin-i18n";
import AdminFilterForm from "./admin-filter-form";
import AdminSelect from "./admin-select";

export function AdminAscDashboard({ claimElementData, claimCityData, summary, selectedPeriod, periodOptions, selectedKitchenId, kitchens }) {
  const { translate } = useAdminI18n();
  const t = (key, fallback) => translate(`ascDashboard.${key}`, fallback);
  const cards = [
    ["total", "Total claims", summary.total, "received", "Received in the selected period"],
    ["contracts", "Affected contracts", summary.contracts, "unique", "Distinct contract numbers"],
    ["files", "With attachments", summary.withAttachments, "documents", "Claims with uploaded files"],
    ["cities", "Cities", summary.cities, "locations", "Distinct submitted cities"],
  ];
  function ranking(rows, empty) {
    const top = rows.slice(0, 6);
    const max = Math.max(1, ...top.map(row => row.claims));
    return top.length ? <div className="rankings">{top.map((row, i) => <div className="ranking" key={row.name}>
      <span className="rank">{i + 1}</span><div><div className="ranking-label"><span>{row.name}</span><strong>{row.claims}</strong></div><div className="track"><div style={{ width: `${row.claims / max * 100}%` }} /></div></div>
    </div>)}</div> : <p className="empty">{empty}</p>;
  }
  return <div className="asc-dashboard">
    <section className="panel header">
      <div><span className="eyebrow">ASC</span><h1>{t("title", "Service overview")}</h1><p>{t("subtitle", "Claims, affected contracts and reported items at a glance.")}</p></div>
      <Link className="button primary" href="/admin/claims">{t("all", "View all claims")} <span aria-hidden="true">→</span></Link>
      <AdminFilterForm action="/admin" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end", width: "100%", marginTop: 6 }}>
        <label>{translate("dashboard.dateRange", "Date range")}<AdminSelect name="period" defaultValue={selectedPeriod} style={selectStyle}>{periodOptions.map(option => <option key={option.value} value={option.value}>{translate(option.labelKey, option.fallbackLabel)}</option>)}</AdminSelect></label>
        <label>{translate("dashboard.kitchen", "Kitchen")}<AdminSelect name="kitchenId" defaultValue={selectedKitchenId || ""} style={selectStyle}><option value="">{translate("dashboard.allKitchens", "All kitchens")}</option>{kitchens.map(kitchen => <option key={kitchen.id} value={kitchen.id}>{kitchen.name}</option>)}</AdminSelect></label>
        <Link className="button" href="/admin">{translate("dashboard.clearFilters", "Clear filters")}</Link>
      </AdminFilterForm>
    </section>
    <div className="metrics">{cards.map(([key, label, value, detailKey, detail]) => <section className="panel metric" key={key}><span>{t(key, label)}</span><strong>{value}</strong><small>{t(detailKey, detail)}</small></section>)}</div>
    <div className="split">
      <section className="panel"><h2>{t("items", "Most reported items")}</h2><p>{t("itemNote", "One claim can include several items.")}</p>{ranking(claimElementData, t("emptyItems", "No reported items for these filters."))}</section>
      <section className="panel"><h2>{t("cityTitle", "Claims by city")}</h2><p>{t("cityNote", "Based on the address submitted with each claim.")}</p>{ranking(claimCityData, t("emptyCities", "No city data for these filters."))}</section>
    </div>
    <section className="panel"><h2>{t("activity", "Claim activity")}</h2><p>{t("activityNote", "Number received on each day with activity.")}</p>
      {summary.daily.length ? <div style={{ height: 210, marginTop: 14 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.daily} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--app-border)" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={date => `${date.slice(8)}.${date.slice(5, 7)}`} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="claims" name={t("total", "Total claims")} fill="var(--app-accent)" radius={[5,5,0,0]} maxBarSize={44} /></BarChart></ResponsiveContainer></div> : <p className="empty">{t("empty", "No claims for these filters.")}</p>}
    </section>
    <section className="panel"><div className="table-heading"><h2>{t("recent", "Latest claims")}</h2><span>{t("recentNote", "Up to 8 latest claims in the selected period")}</span></div>
      <div className="table-scroll"><table><thead><tr>{[["contract","Contract"],["customer","Customer"],["city","City"],["created","Received"],["action","Action"]].map(([key,label])=><th key={key}>{t(key,label)}</th>)}</tr></thead><tbody>{summary.recent.map(row=><tr key={row.id}><td><strong>{row.contractNumber}</strong></td><td>{row.fullName}</td><td>{row.city || "—"}</td><td>{row.createdAt ? <AdminDateTime value={row.createdAt} /> : "—"}</td><td><Link className="button" href={`/admin/claims/${encodeURIComponent(row.id)}`}>{t("view","View")}</Link></td></tr>)}{!summary.recent.length && <tr><td colSpan={5} className="empty">{t("empty","No claims for these filters.")}</td></tr>}</tbody></table></div>
    </section>
    <style jsx>{`
      .asc-dashboard { display:grid;gap:18px;min-width:0;color:var(--app-text) }
      .panel { background:var(--app-surface);border:1px solid var(--app-border);border-radius:14px;padding:20px;min-width:0 }
      .header { display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px }
      .eyebrow { font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--app-accent) }
      h1 { font-size:26px;line-height:1.2;margin:5px 0 8px;font-weight:650 } h2 { font-size:16px;margin:0 0 8px;font-weight:650 }
      p { font-size:13px;color:var(--app-text-muted);margin:0;line-height:1.5 }
      label { display:grid;gap:6px;font-size:12px;color:var(--app-text-muted);min-width:180px }
      .asc-dashboard :global(a.button) { display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:38px;padding:8px 13px;border:1px solid var(--app-border);border-radius:7px;color:var(--app-text);text-decoration:none;font-size:13px;white-space:nowrap }
      .asc-dashboard :global(a.primary) { background:var(--app-accent);color:white;border-color:var(--app-accent) }
      .metrics { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px }
      .metric { display:grid;gap:9px } .metric>span { font-size:12px;color:var(--app-text-muted) } .metric>strong { font-size:30px;line-height:1.1;font-variant-numeric:tabular-nums } .metric>small { font-size:11px;color:var(--app-text-muted) }
      .split { display:grid;grid-template-columns:1fr 1fr;gap:18px }
      .rankings { display:grid;gap:18px;margin-top:24px } .ranking { display:grid;grid-template-columns:22px 1fr;gap:10px;align-items:center } .rank { font-size:11px;color:var(--app-text-muted) } .ranking-label { display:flex;justify-content:space-between;gap:16px;font-size:13px;margin-bottom:8px } .ranking-label span { overflow-wrap:anywhere } .track { height:7px;background:var(--app-bg);border-radius:5px;overflow:hidden } .track>div { height:100%;background:var(--app-accent);border-radius:5px }
      .table-heading { display:flex;gap:12px;flex-wrap:wrap;justify-content:space-between;align-items:baseline;margin-bottom:12px } .table-heading>span { font-size:12px;color:var(--app-text-muted) } .table-scroll { overflow-x:auto } table { width:100%;border-collapse:collapse;text-align:left;font-size:13px } th { color:var(--app-text-muted);font-size:11px;font-weight:600;background:var(--app-bg) } th,td { padding:13px 12px;border-bottom:1px solid var(--app-border) } .empty { padding:25px 0;color:var(--app-text-muted) }
      @media(max-width:1000px) { .metrics { grid-template-columns:repeat(2,minmax(0,1fr)) } }
      @media(max-width:700px) { .split { grid-template-columns:1fr } .panel { padding:16px } h1 { font-size:22px } label { flex:1;min-width:140px } }
    `}</style>
  </div>;
}
const selectStyle = { minHeight: 38, background: "var(--app-surface)", color: "var(--app-text)", border: "1px solid var(--app-border)", borderRadius: 7, padding: "8px 12px", minWidth: 180, fontSize: 13 };

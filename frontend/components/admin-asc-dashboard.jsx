"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AdminDateTime, useAdminI18n } from "./admin-i18n";
import AdminFilterForm from "./admin-filter-form";
import AdminSelect from "./admin-select";
import s from "./admin-asc-dashboard.module.css";

const categoryKeys = ["cabinets", "electrical", "other", "unknown"];
const categoryFallbacks = { cabinets: "Cabinets", electrical: "Electrical appliances", other: "Other components", unknown: "Not recorded" };
const selectStyle = { width: "100%", minHeight: 38, background: "var(--app-surface)", color: "var(--app-text)", border: "1px solid var(--app-border)", borderRadius: 7, padding: "8px 11px", fontSize: 12 };

function Icon({ kind }) {
  const paths = {
    total: <><path d="M8 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 11h6M9 15h4"/></>,
    cabinets: <><rect x="4" y="3" width="16" height="17" rx="1"/><path d="M12 3v17M9 10v3m6-3v3M6 20v2m12-2v2"/></>,
    electrical: <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 8h14m-11 3v3m0-10v2"/></>,
    repeat: <><path d="M20 7h-5V2M4 17h5v5"/><path d="M20 7a9 9 0 0 0-15-2M4 17a9 9 0 0 0 15 2"/></>,
  };
  return <span className={s.icon} aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[kind]}</svg></span>;
}

export function AdminAscDashboard({ summary, selectedPeriod, periodOptions, filters }) {
  const { translate, language } = useAdminI18n();
  const [onlyRepeats, setOnlyRepeats] = useState(false);
  const [showAllKitchens, setShowAllKitchens] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const t = (key, fallback) => translate(`ascDashboard.${key}`, fallback);
  const categoryLabel = key => t(`category_${key}`, categoryFallbacks[key]);
  const number = value => new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB").format(value);
  const percent = value => `${new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: 1 }).format(summary.total ? value / summary.total * 100 : 0)}%`;
  const sourceLabel = key => key === "unknown" ? t("unlinked", "Not linked") : key;
  const periodLabel = periodOptions.find(option => option.value === selectedPeriod);
  function href(overrides = {}) {
    const values = { period: selectedPeriod, contractType: filters.contractType, category: filters.category, claimKitchen: filters.kitchenKey, kitchenId: filters.kitchenId, ...overrides };
    const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value));
    return `/admin${params.size ? `?${params}` : ""}`;
  }
  const kitchenRows = summary.kitchenRows.filter(row => !onlyRepeats || row.totalClaims > 1);
  const visibleKitchens = showAllKitchens ? kitchenRows : kitchenRows.slice(0, 8);
  const itemRows = summary.items.map(item => ({ ...item, name: language === "de" ? item.nameDe : item.name }));
  const categoryRows = categoryKeys.map(key => ({ key, name: categoryLabel(key), claims: summary.categories[key], href: href({ category: filters.category === key ? "" : key }) }));
  const cards = [
    { key: "total", label: t("total", "Total claims"), value: summary.total, detail: t("received", "Cases received in the selected period"), icon: "total", href: href({ category: "" }) },
    { key: "cabinets", label: categoryLabel("cabinets"), value: summary.categories.cabinets, detail: `${percent(summary.categories.cabinets)} ${t("ofClaims", "of selected claims")}`, icon: "cabinets", href: href({ category: filters.category === "cabinets" ? "" : "cabinets" }) },
    { key: "electrical", label: categoryLabel("electrical"), value: summary.categories.electrical, detail: `${percent(summary.categories.electrical)} ${t("ofClaims", "of selected claims")}`, icon: "electrical", href: href({ category: filters.category === "electrical" ? "" : "electrical" }) },
    { key: "repeat", label: t("repeatKitchens", "Kitchens with repeat claims"), value: summary.repeatKitchens, detail: t("repeatDetail", "Affected kitchens with 2+ cases in their history"), icon: "repeat", href: "#claims-kitchens" },
  ];
  function ranking(rows, empty, percentages = false) {
    const max = Math.max(1, ...rows.map(row => row.claims));
    return rows.length ? <div className={s.rankings}>{rows.map((row, index) => <div className={s.ranking} key={row.key || row.name}>
      <span className={s.rank}>{String(index + 1).padStart(2, "0")}</span>
      <div className={s.rankingContent}><div className={s.rankingLabel}>{row.href ? <Link href={row.href} scroll={false}>{row.name}</Link> : <span title={row.originalNames?.join(" · ")}>{row.name}</span>}<strong>{number(row.claims)}{percentages && <span className={s.percent}>{percent(row.claims)}</span>}</strong></div>
        <div className={s.track}><span className={`${s.fill} ${row.key === "electrical" ? s.fillElectrical : row.key === "other" ? s.fillOther : row.key === "unknown" ? s.fillUnknown : ""}`} style={{ width: `${row.claims / (percentages ? Math.max(summary.total, 1) : max) * 100}%` }} /></div>
      </div>
    </div>)}</div> : <p className={s.empty}>{empty}</p>;
  }
  return <div className={s.dashboard}>
    <section className={`${s.panel} ${s.header}`}>
      <div><span className={s.eyebrow}>ASC · {t("eyebrow", "Claims intelligence")}</span><h1>{t("title", "Claims overview")}</h1><p>{t("subtitle", "Every claim, affected product and repeat kitchen — in one place.")}</p></div>
      <div className={s.actions}><Link className={s.button} href="/admin/reports/asc">{t("reports", "Reports")}</Link><Link className={`${s.button} ${s.primary}`} href="/admin/claims">{t("all", "Claims list")} <span aria-hidden="true">→</span></Link></div>
      <AdminFilterForm action="/admin" className={s.filters}>
        <label className={s.field}>{translate("dashboard.dateRange", "Date range")}<AdminSelect name="period" defaultValue={selectedPeriod} style={selectStyle}>{periodOptions.map(option => <option key={option.value} value={option.value}>{translate(option.labelKey, option.fallbackLabel)}</option>)}</AdminSelect></label>
        <label className={s.field}>{t("source", "Kitchen source")}<AdminSelect name="contractType" defaultValue={filters.contractType} style={selectStyle}><option value="">{t("allSources", "All sources")}</option><option value="FRG">FRG</option><option value="ARC">ARC</option><option value="unknown">{sourceLabel("unknown")}</option></AdminSelect></label>
        <label className={s.field}>{t("category", "Claim category")}<AdminSelect name="category" defaultValue={filters.category} style={selectStyle}><option value="">{t("allCategories", "All categories")}</option>{categoryKeys.map(key => <option key={key} value={key}>{categoryLabel(key)}</option>)}</AdminSelect></label>
        <label className={`${s.field} ${s.fieldWide}`}>{translate("dashboard.kitchen", "Kitchen")}<AdminSelect name="claimKitchen" defaultValue={filters.kitchenKey} style={selectStyle}><option value="">{translate("dashboard.allKitchens", "All kitchens")}</option>{summary.kitchenOptions.map(kitchen => <option key={kitchen.key} value={kitchen.key}>{sourceLabel(kitchen.contractType)} · {kitchen.name || t("unnamed", "Unidentified kitchen")}</option>)}</AdminSelect></label>
        {filters.kitchenId && <input type="hidden" name="kitchenId" value={filters.kitchenId} />}
        <Link className={s.button} href="/admin" scroll={false}>{translate("dashboard.clearFilters", "Clear filters")}</Link>
      </AdminFilterForm>
      <div className={s.scope}><span className={s.scopeDot} />{periodLabel && translate(periodLabel.labelKey, periodLabel.fallbackLabel)} · {t("liveOnly", "Live claims only; test cases excluded")}</div>
    </section>

    <div className={s.metrics}>{cards.map(card => <Link key={card.key} href={card.href} scroll={card.key === "repeat"} className={`${s.panel} ${s.metric} ${filters.category === card.key ? s.metricActive : ""}`}><div className={s.metricTop}><span>{card.label}</span><Icon kind={card.icon}/></div><strong className={s.metricValue}>{number(card.value)}</strong><span className={s.metricDetail}>{card.detail}</span></Link>)}</div>
    <div className={`${s.panel} ${s.secondary}`}>
      {[[summary.kitchens, t("affectedKitchens", "Affected kitchens")], [summary.contracts, t("contracts", "Affected contracts")], [summary.repeatClaims, t("repeatClaims", "Cases after the first claim")], [summary.withAttachments, t("files", "Claims with attachments")]].map(([value, label]) => <div className={s.secondaryStat} key={label}><strong className={s.secondaryValue}>{number(value)}</strong><span className={s.secondaryLabel}>{label}</span></div>)}
    </div>

    <div className={s.split}>
      <section className={s.panel}><div className={s.sectionHeading}><div><h2>{t("sourcesTitle", "FRG & ARC claims")}</h2><p>{t("sourcesNote", "Cases and product categories by kitchen source.")}</p></div><span className={s.sectionNumber}>{number(summary.total)}</span></div>
        <div className={s.sourceGrid}>{summary.sources.filter(source => source.key !== "unknown").map(source => <Link key={source.key} href={href({ contractType: filters.contractType === source.key ? "" : source.key, claimKitchen: "", kitchenId: "" })} scroll={false} className={s.source}>
          <div className={s.sourceTitle}>{source.key}<span className={s.muted}>{percent(source.claims)}</span></div><div className={s.sourceValue}><strong>{number(source.claims)}</strong><span>{t("claims", "claims")}</span></div>
          <div className={s.track}><span className={`${s.fill} ${source.key === "ARC" ? s.fillElectrical : ""}`} style={{ width: `${summary.total ? source.claims / summary.total * 100 : 0}%` }} /></div>
          <div className={s.sourceDetails}>{[[t("affectedKitchens", "Affected kitchens"), source.kitchens], [categoryLabel("cabinets"), source.categories.cabinets], [categoryLabel("electrical"), source.categories.electrical], [categoryLabel("other"), source.categories.other], [categoryLabel("unknown"), source.categories.unknown]].map(([label, value]) => <div className={s.sourceDetail} key={label}><span>{label}</span><strong>{number(value)}</strong></div>)}</div>
        </Link>)}</div>
        {summary.sources.find(source => source.key === "unknown").claims > 0 && <p className={s.note}><Link className={s.textLink} href={href({ contractType: "unknown", claimKitchen: "" })} scroll={false}>{number(summary.sources.find(source => source.key === "unknown").claims)} {t("unlinkedClaims", "claims without a linked FRG/ARC contract")}</Link></p>}
      </section>
      <section className={s.panel}><div className={s.sectionHeading}><div><h2>{t("categoriesTitle", "What is being reported?")}</h2><p>{t("categoriesNote", "Each case counts once in every affected category.")}</p></div></div>
        {ranking(categoryRows, t("empty", "No claims for these filters."), true)}
        <p className={s.note}>{number(summary.multiCategory)} {t("multiCategory", "claims affect multiple categories. Category totals can exceed total claims.")}</p>
      </section>
    </div>

    <section className={s.panel} id="claims-kitchens"><div className={s.sectionHeading}><div><h2>{t("kitchensTitle", "Claims per kitchen")}</h2><p>{t("kitchensNote", "Compare selected claims with each kitchen’s full case history.")}</p></div><label className={s.toggle}><input type="checkbox" checked={onlyRepeats} onChange={event => { setOnlyRepeats(event.target.checked); setShowAllKitchens(false); }} />{t("onlyRepeats", "Only kitchens with repeat claims")}</label></div>
      <div className={s.tableScroll}><table className={s.table}><thead><tr><th scope="col" className={s.rowNumber}>{t("rowNumber", "No.")}</th><th>{t("kitchen", "Kitchen / contracts")}</th><th>{t("source", "Kitchen source")}</th><th className={s.number}>{t("selected", "Selected")}</th><th className={s.number}>{t("history", "All time")}</th><th className={s.number}>{categoryLabel("cabinets")}</th><th className={s.number}>{categoryLabel("electrical")}</th><th>{t("lastClaim", "Latest claim · all time")}</th><th>{t("action", "Action")}</th></tr></thead><tbody>
        {visibleKitchens.map((row, index) => <tr key={row.key}><td className={s.rowNumber}>{number(index + 1)}</td><td><strong>{row.name || t("unnamed", "Unidentified kitchen")}</strong>{row.totalClaims > 1 && <span className={`${s.badge} ${s.repeatBadge}`}>{t("repeat", "Repeat")}</span>}<span className={s.meta}>{row.contracts.join(" · ") || "—"}</span></td><td><span className={s.badge}>{sourceLabel(row.contractType)}</span></td><td className={s.number}><strong>{number(row.claims)}</strong></td><td className={s.number}><strong>{number(row.totalClaims)}</strong></td><td className={s.number}>{number(row.categories.cabinets)}</td><td className={s.number}>{number(row.categories.electrical)}</td><td>{row.lastAt ? <AdminDateTime value={row.lastAt} /> : "—"}</td><td><Link className={s.textLink} href={href({ period: "all", category: "", claimKitchen: row.key, kitchenId: "" })} scroll={false}>{t("historyLink", "View history")} →</Link></td></tr>)}
        {!visibleKitchens.length && <tr><td colSpan={9} className={s.empty}>{onlyRepeats ? t("noRepeats", "No kitchens with repeat claims for these filters.") : t("empty", "No claims for these filters.")}</td></tr>}
      </tbody></table></div>
      <div className={s.footer}><p>{t("kitchenCountsNote", "Selected and category counts follow the filters. All time includes every case for that kitchen.")}</p>{kitchenRows.length > 8 && <button className={s.button} onClick={() => setShowAllKitchens(!showAllKitchens)}>{showAllKitchens ? t("showLess", "Show less") : `${t("showAll", "Show all")} (${number(kitchenRows.length)})`}</button>}</div>
    </section>

    <div className={s.split}>
      <section className={s.panel}><div className={s.sectionHeading}><div><h2>{t("items", "Most reported items")}</h2><p>{t("itemNote", "Distinct cases per product; repeated selections count once.")}</p></div><span className={s.sectionNumber}>{number(summary.items.length)}</span></div>{ranking(showAllItems ? itemRows : itemRows.slice(0, 6), t("emptyItems", "No reported items for these filters."))}{summary.items.length > 6 && <div className={s.footer}><button className={s.button} onClick={() => setShowAllItems(!showAllItems)}>{showAllItems ? t("showLess", "Show less") : `${t("showAll", "Show all")} (${number(summary.items.length)})`}</button></div>}</section>
      <section className={s.panel}><div className={s.sectionHeading}><div><h2>{t("cityTitle", "Claims by city")}</h2><p>{t("cityNote", "Based on the customer’s submitted address.")}</p></div><span className={s.sectionNumber}>{number(summary.cities)}</span></div>{ranking(summary.cityRows.slice(0, 6), t("emptyCities", "No city data for these filters."))}{summary.missingCity > 0 && <p className={s.note}>{number(summary.missingCity)} {t("missingCityNote", "claims have no recorded city.")}</p>}</section>
    </div>

    <section className={s.panel}><div className={s.sectionHeading}><div><h2>{t("activity", "Claim activity")}</h2><p>{t("activityNote", "Cases by original creation day · Europe/Berlin. Follow-ups do not create new cases.")}</p></div></div>
      {summary.daily.length ? <div className={s.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.daily} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><CartesianGrid stroke="var(--app-border)" vertical={false}/><XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={date => `${date.slice(8)}.${date.slice(5, 7)}`} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip labelFormatter={date => new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))} contentStyle={{ border: "1px solid var(--app-border)", borderRadius: 8, fontSize: 12 }}/><Bar dataKey="claims" name={t("claims", "Claims")} fill="var(--app-accent)" radius={[4,4,0,0]} maxBarSize={40}/></BarChart></ResponsiveContainer></div> : <p className={s.empty}>{t("empty", "No claims for these filters.")}</p>}
    </section>

    <section className={s.panel}><div className={s.sectionHeading}><div><h2>{t("recent", "Latest claims")}</h2><p>{t("recentNote", "The 8 latest cases matching the filters.")}</p></div><Link className={s.textLink} href="/admin/claims">{t("all", "Claims list")} →</Link></div><div className={s.tableScroll}><table className={s.table}><thead><tr><th scope="col" className={s.rowNumber}>{t("rowNumber", "No.")}</th>{[t("contract", "Contract"), t("source", "Kitchen source"), t("customer", "Customer"), t("category", "Claim category"), t("city", "City"), t("created", "Received"), t("action", "Action")].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{summary.recent.map((row, index) => <tr key={row.id}><td className={s.rowNumber}>{number(index + 1)}</td><td><strong>{row.contractNumber || "—"}</strong><span className={s.meta}>{row.kitchenName}</span>{row.ordinal > 1 && <span className={`${s.badge} ${s.repeatBadge}`}>{t("case", "Case")} #{row.ordinal}</span>}</td><td><span className={s.badge}>{sourceLabel(row.contractType)}</span></td><td>{row.fullName || "—"}</td><td><div className={s.badges}>{row.categories.map(key => <span className={s.badge} key={key}>{categoryLabel(key)}</span>)}</div></td><td>{row.city || "—"}</td><td>{row.createdAt ? <AdminDateTime value={row.createdAt}/> : "—"}</td><td><Link className={s.button} href={`/admin/claims/${encodeURIComponent(row.id)}`}>{t("view", "View")}</Link></td></tr>)}{!summary.recent.length && <tr><td colSpan={8} className={s.empty}>{t("empty", "No claims for these filters.")}</td></tr>}</tbody></table></div></section>

    <section className={s.panel}><h2>{t("completeness", "Claim data completeness")}</h2><p>{t("completenessNote", "Missing information stays visible so it can be reviewed.")}</p><div className={s.quality}>{[[summary.total - summary.withAttachments, t("missingFiles", "Without attachments")], [summary.categories.unknown, t("missingCategory", "With unclassified products / no category")], [summary.sources.find(source => source.key === "unknown").claims, t("unlinked", "Not linked to FRG / ARC")], [summary.missingCity, t("missingCity", "Without a recorded city")]].map(([value, label]) => <div className={s.qualityStat} key={label}><strong>{number(value)}</strong><span>{label}</span></div>)}</div><details className={s.definitions}><summary>{t("definitions", "How these figures are counted")}</summary><p>{t("caseDefinition", "One claim is one retained case. Follow-ups enrich the original case and do not increase the total. Test contracts starting with 111 and test ticket series are excluded.")}</p><p>{t("kitchenDefinition", "FRG contracts sharing one Kitchen record are grouped together. Each ARC contract is a separate kitchen; shared upload records are never merged. Unlinked claims use their contract number.")}</p><p>{t("repeatDefinition", "Repeat kitchens have at least two cases in their full history and at least one matching the current filters. Cases after the first claim count selected cases whose chronological kitchen case number is 2 or higher.")}</p></details></section>
  </div>;
}

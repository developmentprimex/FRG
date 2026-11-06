"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminI18n } from "./admin-i18n";
import s from "./admin-asc-dashboard.module.css";

function useLabels() {
  const { translate, language } = useAdminI18n();
  return { language, t: (key, fallback) => translate(`ascDashboard.${key}`, fallback),
    number: value => new Intl.NumberFormat(language === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: 1 }).format(value),
    date: value => new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(value)),
  };
}

export function AdminAscComparison({ comparison, monthHref }) {
  const { t, number, date } = useLabels();
  const range = (start, end) => `${date(start)} – ${date(new Date(new Date(end).getTime() - 1))}`;
  return <section className={s.panel}>
    <div className={s.sectionHeading}><div><h2>{t("comparisonTitle", "Compared with the previous period")}</h2><p>{comparison ? t("comparisonNote", "Same filters in both periods. The current period includes today; the previous period is complete.") : t("comparisonAll", "Choose a date range to compare claims with the previous period.")}</p></div>{!comparison && <Link className={s.button} href={monthHref} scroll={false}>{t("compareMonth", "Compare this month")}</Link>}</div>
    {comparison && <div className={s.insightMetrics}>
      <div className={s.insightStat}><span>{t("currentPeriod", "Current period")}</span><strong>{number(comparison.current)}</strong><small>{range(comparison.start, comparison.end)}</small></div>
      <div className={s.insightStat}><span>{t("previousPeriod", "Previous period")}</span><strong>{number(comparison.previous)}</strong><small>{range(comparison.previousStart, comparison.previousEnd)}</small></div>
      <div className={s.insightStat}><span>{t("changeCases", "Change in claims")}</span><strong>{comparison.delta > 0 ? "+" : ""}{number(comparison.delta)}</strong><small>{t("claims", "claims")}</small></div>
      <div className={s.insightStat}><span>{t("changePercent", "Percentage change")}</span><strong>{comparison.changePercent === null ? t("newActivity", "New activity") : `${comparison.changePercent > 0 ? "+" : ""}${number(comparison.changePercent)}%`}</strong><small>{comparison.changePercent === null ? t("zeroBaseline", "No claims in the previous period") : t("vsPrevious", "Compared with the previous period")}</small></div>
    </div>}
  </section>;
}

export function AdminAscProductInsights({ recurrence, breakdown }) {
  const { t, number, language } = useLabels();
  const [allRepeats, setAllRepeats] = useState(false);
  const [allModels, setAllModels] = useState(false);
  const [allManufacturers, setAllManufacturers] = useState(false);
  const label = row => language === "de" ? row.nameDe : row.name;
  const sourceLabel = source => ({ claim: t("recordedClaim", "Recorded in claim"), inventory: t("savedInventory", "Saved contract inventory"), inventoryType: t("inventoryTypeMatch", "Current contract inventory · appliance type"), catalog: t("matchingCatalog", "Matching kitchen article") })[source] || t("category_unknown", "Not recorded");
  const evidenceLabel = evidence => ({ serial: t("matchSerial", "Same serial number"), article: t("matchArticle", "Same article / model"), type: t("matchType", "Same product type") })[evidence];
  const toggle = (count, open, setOpen) => count > 8 && <button className={s.button} onClick={() => setOpen(!open)}>{open ? t("showLess", "Show less") : `${t("showAll", "Show all")} (${number(count)})`}</button>;
  const repeats = allRepeats ? recurrence.rows : recurrence.rows.slice(0, 8);
  const manufacturers = allManufacturers ? breakdown.manufacturers : breakdown.manufacturers.slice(0, 8);
  const models = allModels ? breakdown.models : breakdown.models.slice(0, 8);
  return <>
    <section className={s.panel}>
      <div className={s.sectionHeading}><div><h2>{t("recurrenceTitle", "Repeated products within the same kitchen")}</h2><p>{t("recurrenceNote", "Compare selected cases with earlier cases in that kitchen. Matching a product does not confirm the same fault.")}</p></div></div>
      <div className={`${s.insightMetrics} ${s.recurrenceMetrics}`}>{[
        [recurrence.sameAppliance, t("confirmedRepeat", "Same appliance · serial match")],
        [recurrence.sameModel, t("modelRepeat", "Same model / article")],
        [recurrence.sameType, t("typeRepeat", "Same product type only")],
        [recurrence.differentProduct, t("differentProduct", "Different products / replacements")],
        [recurrence.unknown, t("unclearRepeat", "Not enough product information")],
      ].map(([value, title]) => <div className={s.insightStat} key={title}><strong>{number(value)}</strong><span>{title}</span></div>)}</div>
      <div className={s.tableScroll}><table className={s.table}><thead><tr>
        {[t("rowNumber", "No."), t("kitchen", "Kitchen / contracts"), t("product", "Product"), t("matchBasis", "Match evidence"), t("productReference", "Serial / article"), t("selected", "Selected"), t("history", "All time"), t("action", "Action")].map(title => <th scope="col" key={title}>{title}</th>)}
      </tr></thead><tbody>{repeats.map((row, index) => <tr key={row.key}>
        <td className={s.rowNumber}>{number(index + 1)}</td><td><strong>{row.kitchenName || t("unnamed", "Unidentified kitchen")}</strong><span className={s.meta}>{row.contractType === "unknown" ? t("unlinked", "Not linked") : row.contractType}</span></td>
        <td>{label(row)}</td><td><span className={s.badge}>{evidenceLabel(row.evidence)}</span></td><td>{row.reference || "—"}</td><td>{number(row.selectedClaims)}</td><td>{number(row.totalClaims)}</td>
        <td><Link className={s.textLink} href={`/admin/claims/${encodeURIComponent(row.latestClaimId)}`}>{t("view", "View")} →</Link></td>
      </tr>)}{!repeats.length && <tr><td colSpan={8} className={s.empty}>{t("noProductRepeats", "No repeated products identified for these filters.")}</td></tr>}</tbody></table></div>
      <div className={s.footer}><p>{t("recurrenceCounts", "Each selected follow-on case counts once in the strongest available match group. The table includes earlier cases for context.")}</p>{toggle(recurrence.rows.length, allRepeats, setAllRepeats)}</div>
    </section>
    <div className={s.split}>
      <section className={s.panel}>
        <div className={s.sectionHeading}><div><h2>{t("manufacturersTitle", "Claims by manufacturer")}</h2><p>{t("manufacturersNote", "Distinct cases per manufacturer from recorded data or an exact article match.")}</p></div><span className={s.sectionNumber}>{number(breakdown.manufacturers.length)}</span></div>
        <div className={s.tableScroll}><table className={s.table}><thead><tr>{[t("rowNumber", "No."), t("manufacturer", "Manufacturer"), t("claims", "Claims"), t("dataSource", "Data source")].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{manufacturers.map((row, index) => <tr key={row.key}><td className={s.rowNumber}>{number(index + 1)}</td><td><strong>{row.name}</strong></td><td>{number(row.claims)}</td><td>{row.sources.map(sourceLabel).join(" · ")}</td></tr>)}{!manufacturers.length && <tr><td colSpan={4} className={s.empty}>{t("noManufacturers", "No manufacturer data recorded for these filters.")}</td></tr>}</tbody></table></div>
        <div className={s.footer}><p>{number(breakdown.missingManufacturer)} {t("missingManufacturer", "claims have at least one product without a recorded manufacturer.")}</p>{toggle(breakdown.manufacturers.length, allManufacturers, setAllManufacturers)}</div>
      </section>
      <section className={s.panel}>
        <div className={s.sectionHeading}><div><h2>{t("modelsTitle", "Claims by model / article")}</h2><p>{t("modelsNote", "Model names and article codes are shown as recorded. Serial numbers are not model names.")}</p></div><span className={s.sectionNumber}>{number(breakdown.models.length)}</span></div>
        <div className={s.tableScroll}><table className={s.table}><thead><tr>{[t("rowNumber", "No."), t("modelArticle", "Model / article"), t("manufacturer", "Manufacturer"), t("product", "Product"), t("claims", "Claims")].map(title => <th scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{models.map((row, index) => <tr key={row.key}><td className={s.rowNumber}>{number(index + 1)}</td><td><strong>{row.model}</strong><span className={s.meta}>{row.sources.map(sourceLabel).join(" · ")}</span></td><td>{row.manufacturer || t("category_unknown", "Not recorded")}</td><td>{label(row)}</td><td>{number(row.claims)}</td></tr>)}{!models.length && <tr><td colSpan={5} className={s.empty}>{t("noModels", "No model or article data recorded for these filters.")}</td></tr>}</tbody></table></div>
        <div className={s.footer}><p>{number(breakdown.missingModel)} {t("missingModel", "claims have at least one product without a recorded model / article.")}</p>{toggle(breakdown.models.length, allModels, setAllModels)}</div>
      </section>
    </div>
  </>;
}

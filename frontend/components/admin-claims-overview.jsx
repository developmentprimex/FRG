"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminDateTime, useAdminI18n } from "./admin-i18n";

const PAGE_SIZE = 10;

export function AdminClaimsOverview({ analytics, filters, dateFrom, dateTo, kitchenId }) {
  const { translate } = useAdminI18n();
  const t = (key, fallback) => translate(`claimOverview.${key}`, fallback);
  const [query, setQuery] = useState("");
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [location, setLocation] = useState("cities");
  const users = useMemo(() => (analytics?.users || []).filter((user) => (!repeatOnly || user.lifetimeClaims > 1) && `${user.name} ${user.contact}`.toLowerCase().includes(query.trim().toLowerCase())), [analytics, query, repeatOnly]);
  if (!analytics) return null;
  const { summary: s, categories } = analytics;
  const categoryLabel = (key) => t(key, { cabinets: "Cabinets & fronts", electrical: "Electrical appliances", other: "Other kitchen parts", unknown: "Not classified" }[key]);
  const percent = (count) => s.total ? `${Math.round(count / s.total * 100)}%` : "0%";
  const days = (value) => value == null ? "—" : `${value.toFixed(1)} ${t("days", "days")}`;
  const pages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const periodDelta = s.previousPeriod == null ? null : s.total - s.previousPeriod;
  const claimHref = ({ contactKey, contractNumber, processing } = {}) => `/admin/claims?${new URLSearchParams({
    ...(dateFrom ? { dateFrom } : {}), dateTo,
    ...(kitchenId ? { kitchenId } : {}),
    ...(contactKey ? { contactKey } : {}),
    ...(contractNumber ? { contractNumber } : {}),
    ...(processing ? { processing } : {}),
  }).toString()}`;
  const currentPage = Math.min(page, pages);
  const categoryCount = (key) => categories.find((category) => category.key === key)?.claims || 0;
  const primaryMetrics = [
    ["total", "Claims submitted", s.total, s.previousPeriod == null ? t("selectedPeriod", "In the selected period") : `${t("previousPeriod", "Previous period")}: ${s.previousPeriod}; ${periodDelta > 0 ? "+" : ""}${periodDelta} ${t("change", "change")}`],
    ["open", "Open claims", s.open, `${t("oldestOpen", "Oldest open claim")}: ${s.oldestOpenDays} ${t("days", "days")}`],
    ["overdue", "Open over 25 days", s.overdue, t("overdueDetail", "Open for more than 25 calendar days")],
    ["completionTime", "Average completion time", days(s.averageCompletionDays), `${t("median", "Median")}: ${days(s.medianCompletionDays)}; ${t("p90", "90th percentile")}: ${days(s.p90CompletionDays)}; ${t("completedWithDate", "Recorded completions")}: ${s.completionSamples}`],
  ];
  const secondaryMetrics = [
    ["completedInPeriod", "Completed during period", s.completedInPeriod, `${s.done} ${t("submittedNowDone", "submitted claims are currently completed")}`],
    ["repeatUsers", "Repeat contacts in period", s.repeatUsers, `${t("uniqueUsers", "Unique contacts")}: ${s.uniqueUsers}`],
    ["cabinets", "Cabinets & fronts", categoryCount("cabinets"), `${percent(categoryCount("cabinets"))} ${t("ofClaims", "of claims")}`],
    ["electrical", "Electrical appliances", categoryCount("electrical"), `${percent(categoryCount("electrical"))} ${t("ofClaims", "of claims")}`],
  ];
  const empty = t("empty", "No claims for the selected date range and kitchen.");
  const dominantCategory = [...categories].sort((a, b) => b.claims - a.claims)[0];
  const topContact = analytics.users[0];
  const attentionCount = analytics.aging.find((row) => row.key === "attention")?.claims || 0;
  const maxRepeatedClaims = Math.max(1, ...analytics.contracts.map((row) => row.claims));
  const visibleItems = analytics.items.slice(0, 8);
  const maxItemClaims = Math.max(1, ...visibleItems.map((row) => row.claims));
  const visibleLocations = analytics[location].slice(0, 8);
  return (
    <section className="claims-overview" aria-label={t("title", "Claims overview")}>
      <header className="overview-header">
        <div className="overview-intro"><span className="eyebrow">{t("eyebrow", "Service analytics")}</span><h1>{t("title", "Claims overview")}</h1><p>{t("scope", "Claims, affected items, customers, and response workload. PX test claims are excluded.")}</p><p className="scope-note">{t("submissionScope", "The date filter selects claims by submission date. Open, completed, and age counts show their current status.")}</p></div>
        <div className="overview-toolbar">{filters}</div>
      </header>
      <div className="section-heading"><h2>{t("snapshot", "At a glance")}</h2><span>{t("snapshotNote", "The key numbers for the selected period")}</span></div>
      <div className="metrics">
        {primaryMetrics.map(([key, label, value, detail]) => <article className={`metric${key === "overdue" && s.overdue ? " metric-danger" : ""}`} key={key}><span>{t(key, label)}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </div>
      {s.total ? <div className="insight-strip" aria-label={t("highlights", "Highlights")}>
        <div className="insight"><span>{t("mostAffected", "Most affected")}</span><strong>{categoryLabel(dominantCategory.key)}</strong><small>{dominantCategory.claims} / {s.total} {t("claimsInPeriod", "claims in this period")}</small></div>
        <div className="insight"><span>{t("repeatSignal", "Repeat activity")}</span><strong>{s.repeatUsers} {t("repeatContacts", "repeat contacts")}</strong><small>{topContact ? `${topContact.claims} ${t("claimsFromTopContact", "claims from the top contact")}` : t("noUsers", "No matching contacts.")}</small></div>
        <div className="insight insight-alert"><span>{t("followUpPriority", "Follow-up priority")}</span><strong>{s.overdue ? `${s.overdue} ${t("overdue", "Overdue claims")}` : `${attentionCount} ${t("needsAttention", "need attention")}`}</strong><small>{s.overdue ? t("overdueDetail", "Open for more than 25 days") : t("attentionDetail", "Open for 11–25 days")}</small></div>
      </div> : null}
      {!s.total ? <p className="empty" role="status">{empty}</p> : null}
      <div className="section-heading"><h2>{t("additionalMetrics", "More detail")}</h2><span>{t("additionalMetricsNote", "Status, repeat contacts, and affected categories")}</span></div>
      <div className="metrics metrics-secondary">
        {secondaryMetrics.map(([key, label, value, detail]) => <article className="metric" key={key}><span>{t(key, label)}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </div>
      <div className="section-heading"><h2>{t("patterns", "Claim patterns")}</h2><span>{t("patternsNote", "What is affected, when claims arrive, and where")}</span></div>
      <div className="panels">
        <article className="panel">
          <h3>{t("categoryTitle", "What are customers claiming?")}</h3>
          <p>{t("categoryNote", "Each claim is counted once per category. A claim involving several categories appears in each, so percentages can add up to more than 100%.")}</p>
          <div className="bars">{categories.map((row) => <div className="bar-row" key={row.key}><div><span>{categoryLabel(row.key)}</span><strong>{row.claims} <small>({percent(row.claims)})</small></strong></div><div className="bar-track"><span style={{ width: percent(row.claims), background: { electrical: "#537a86", other: "#c49b5d", unknown: "#9a928b" }[row.key] || "#8c6d4f" }} /></div></div>)}</div>
          <div className="facts"><span>{t("mixed", "Cabinets + appliances")}: <b>{s.mixed}</b></span><span>{t("multiItem", "Multiple selected items")}: <b>{s.multiItem}</b></span></div>
        </article>
        <article className="panel">
          <h3>{t("trend", "Claims over time")}</h3><p>{analytics.monthly ? t("monthly", "Monthly submissions and completions") : t("daily", "Daily submissions and completions")}</p>
          {s.total || s.completedInPeriod ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.timeline} margin={{ top: 12, right: 24, bottom: 8, left: -12 }}><CartesianGrid stroke="var(--app-border)" strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(value) => analytics.monthly ? value : value.slice(5)} minTickGap={28} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip contentStyle={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 10, color: "var(--app-text)" }} /><Legend /><Line type="linear" dataKey="claims" name={t("submitted", "Submitted")} stroke="#8c6d4f" strokeWidth={3} dot={analytics.timeline.length < 20} /><Line type="linear" dataKey="completed" name={t("completed", "Completed")} stroke="#537a86" strokeWidth={3} dot={analytics.timeline.length < 20} /></LineChart></ResponsiveContainer></div> : <p className="empty">{empty}</p>}
          <p className="trend-note">{t("completionScope", "Completions are counted by completion date, including claims submitted before the selected period.")}</p>
        </article>
        <article className="panel items-panel">
          <div className="panel-heading"><div><h3>{t("topItems", "Most claimed items")}</h3><p>{t("topItemsNote", "Number of distinct claims per selected item. Repeated selections in one claim count once.")}</p></div><span className="pill">{analytics.items.length} {t("itemTypes", "item types")}</span></div>
          <ol className="item-grid">{visibleItems.map((row, index) => <li className="item-card" key={row.key}>
            <div className="item-top"><span className="item-rank">{String(index + 1).padStart(2, "0")}</span><strong>{row.claims}</strong></div>
            <div className="item-name">{row.name}</div><small>{categoryLabel(row.category)}{row.code && !row.code.startsWith("REFERENCE-") ? ` · ${row.code}` : ""}</small>
            <div className="item-track" aria-hidden="true"><span style={{ width: `${row.claims / maxItemClaims * 100}%` }} /></div>
          </li>)}</ol>
          {!analytics.items.length ? <p className="empty">{t("noItems", "No selected-item data is available.")}</p> : null}
        </article>
        <article className="panel locations-panel">
          <div className="panel-heading"><h3>{t("locations", "Claims by location & portfolio")}</h3><select aria-label={t("groupBy", "Group claims by")} value={location} onChange={(event) => setLocation(event.target.value)}>{["cities", "kitchens", "projects", "companies"].map((key) => <option value={key} key={key}>{t(key, { cities: "Cities", kitchens: "Kitchens", projects: "Projects", companies: "Housing companies" }[key])}</option>)}</select></div>
          <p>{t("locationNote", "Top groups by claim count, including their current open and overdue workload.")}</p>
          <div className="location-list">{visibleLocations.map((row) => <div className="location-row" key={row.key}>
            <div className="location-main"><strong>{row.name || t("notCaptured", "Not captured")}</strong><span><b>{row.claims}</b> {t("claims", "Claims")} <small>({percent(row.claims)})</small></span></div>
            <div className="location-track" aria-hidden="true"><span style={{ width: percent(row.claims) }} /></div>
            <div className="location-meta"><span>{t("open", "Open claims")}: <b>{row.open}</b></span><span className={row.overdue ? "location-overdue" : ""}>{t("overdue", "Overdue claims")}: <b>{row.overdue}</b></span></div>
          </div>)}</div>
          {!analytics[location].length ? <p className="empty">{empty}</p> : null}
        </article>
      </div>
      <div className="section-heading"><h2>{t("customers", "Customers & follow-up")}</h2><span>{t("customersNote", "Repeat contacts, workload, and supporting files")}</span></div>
      <article className="panel users-panel">
        <div className="panel-heading"><div><h3>{t("users", "Claims by user")}</h3><p>{t("usersIntro", "See who reports issues repeatedly and what each contact reported.")}</p></div><span className="pill">{s.returningUsers} {t(s.returningUsers === 1 ? "repeatContactAllTime" : "repeatContactsAllTime", s.returningUsers === 1 ? "repeat contact across all time" : "repeat contacts across all time")}</span></div>
        <div className="user-tools"><input aria-label={t("searchUsers", "Search users by name, email or phone")} placeholder={t("searchUsers", "Search users by name, email or phone")} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /><label><input type="checkbox" checked={repeatOnly} onChange={(event) => { setRepeatOnly(event.target.checked); setPage(1); }} />{t("repeatOnly", "Only repeat users (all time)")}</label></div>
        <div className="contact-grid">
          {users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((user) => <article className="contact-card" key={user.key}>
            <div className="contact-head"><span className="avatar" aria-hidden="true">{(user.name || user.contact).trim().slice(0, 1).toUpperCase()}</span><div className="contact-identity"><strong>{user.name || t("notCaptured", "Not captured")}</strong><small>{user.contact}</small></div>{user.lifetimeClaims > 1 ? <span className="repeat-tag">{t("returning", "Returning")}</span> : null}</div>
            <div className="contact-stats">
              <div><span>{t("periodClaims", "Claims in period")}</span><strong>{user.claims}</strong></div>
              <div><span>{t("lifetime", "All-time claims")}</span><strong>{user.lifetimeClaims}</strong></div>
              <div><span>{t("contracts", "Contracts in period")}</span><strong>{user.contracts}</strong></div>
            </div>
            <div className="share-label"><span>{t("shareOfClaims", "Share of selected claims")}</span><strong>{s.total ? Math.round(user.claims / s.total * 100) : 0}%</strong></div>
            <div className="share-track"><span style={{ width: percent(user.claims) }} /></div>
            <div className="contact-tags"><span>{t("cabinets", "Cabinets & fronts")}: <b>{user.cabinets}</b></span><span>{t("electrical", "Electrical appliances")}: <b>{user.electrical}</b></span></div>
            <div className="contact-footer"><small>{t("lastClaim", "Last claim in period")}: <AdminDateTime value={user.lastClaimAt} /></small><Link href={claimHref({ contactKey: user.key })} prefetch={false}>{t("viewContactClaims", "View claims")} →</Link></div>
          </article>)}
          {users.length === 1 ? <aside className="contact-insight"><span className="eyebrow">{t("contactConcentration", "Contact concentration")}</span><strong>{s.total ? Math.round(users[0].claims / s.total * 100) : 0}%</strong><p>{t("contactConcentrationDetail", "of claims in this period came from this contact.")}</p><div><span>{t("lifetime", "All-time claims")}</span><b>{users[0].lifetimeClaims}</b></div><div><span>{t("contracts", "Contracts in period")}</span><b>{users[0].contracts}</b></div></aside> : null}
        </div>
        {!users.length ? <p className="empty">{t("noUsers", "No matching contacts.")}</p> : null}
        <div className="pagination"><small>{users.length} {t(users.length === 1 ? "contactFound" : "contactsFound", users.length === 1 ? "contact found" : "contacts found")} · {currentPage} / {pages}</small><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{t("previous", "Previous")}</button><button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>{t("next", "Next")}</button></div></div>
        <p className="identity-note">{t("identityNote", "Matched by normalized email, or phone when email is missing. Contacts are estimates of users; different contacts may belong to the same person. Period counts follow the filters; lifetime counts cover all kitchens and dates.")}</p>
      </article>
      <div className="follow-up-grid">
        <article className="panel workload-panel">
          <div className="panel-heading"><div><h3>{t("workload", "Workload & evidence")}</h3><p>{t("workloadIntro", "How long open claims have waited and whether supporting material was provided.")}</p></div><Link href={claimHref({ processing: "OPEN" })} prefetch={false}>{t("viewOpenClaims", "View open claims")} →</Link></div>
          <div className="workload-hero"><div><span>{t("averageOpen", "Average age of open claims")}</span><strong>{days(s.averageOpenDays)}</strong></div><div><span>{t("needsAttention", "Need attention")}</span><strong>{attentionCount}</strong><small>{t("attentionDetail", "Open for 11–25 days")}</small></div></div>
          <h4>{t("aging", "Age of open claims")}</h4>
          <div className="age-track" role="img" aria-label={`${t("aging", "Age of open claims")}: ${analytics.aging.map((row) => row.claims).join(" / ")}`}>{analytics.aging.map((row) => <span key={row.key} className={`age-${row.key}`} style={{ width: `${s.open ? row.claims / s.open * 100 : 0}%` }} />)}</div>
          <div className="age-legend">{analytics.aging.map((row, index) => <span key={row.key}><i className={`age-${row.key}`} />{["0–10", "11–25", "26+"][index]} {t("days", "days")} <strong>{row.claims}</strong></span>)}</div>
          <div className="evidence-section"><h4>{t("evidence", "Submitted evidence")}</h4><div className="evidence-stats"><div><span>{t("withPhotos", "Claims with photos")}</span><strong>{s.withPhotos} <small>/ {s.total}</small></strong></div><div><span>{t("withFiles", "Claims with uploaded files")}</span><strong>{s.withFiles} <small>/ {s.total}</small></strong></div></div><div className="evidence-meta"><span>{t("missingContact", "Claims without email or phone")}: <b>{s.missingContact}</b></span><span>{t("unknown", "Not classified")}: <b>{categoryCount("unknown")}</b></span></div><p>{t("fileNote", "Generated kitchen previews do not count as uploaded evidence. Unclassified claims lack enough selected-item information.")}</p></div>
        </article>
        <article className="panel contracts-panel">
          <div className="panel-heading"><div><h3>{t("repeatContracts", "Contracts with repeated claims")}</h3><p>{t("repeatContractsIntro", "Where several claims were filed for the same contract.")}</p></div></div>
          <div className="contract-summary"><strong>{s.repeatContracts}</strong><span>{t("repeatContractsOf", "of")} {s.uniqueContracts} {t("uniqueContracts", "unique contracts")}<small>{t("selectedPeriod", "In the selected period")}</small></span></div>
          <div className="contract-list">{analytics.contracts.filter((row) => row.claims > 1).slice(0, 8).map((row) => <div className="contract-row" key={row.key}><div><Link href={claimHref({ contractNumber: row.key })} prefetch={false}>{row.name}</Link><strong>{row.claims} {t("claims", "claims")}</strong></div><div className="contract-track"><span style={{ width: `${row.claims / maxRepeatedClaims * 100}%` }} /></div></div>)}</div>
          {!s.repeatContracts ? <p className="empty">{t("noRepeatContracts", "No repeated claims for a contract in this period.")}</p> : null}
        </article>
      </div>
      <style jsx>{`
        .claims-overview { display: grid; gap: 14px; min-width: 0; color: var(--app-text); }
        .overview-header { display: grid; grid-template-columns: minmax(260px, 1fr) auto; gap: 20px; align-items: center; min-width: 0; padding: 20px 22px; border: 1px solid var(--app-border); border-radius: 18px; background: var(--app-surface); }
        .overview-intro { min-width: 0; }.overview-toolbar { min-width: 0; }
        .panel-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }.panel-heading > div { flex: 1; min-width: 220px; }
        .eyebrow { color: var(--app-accent); text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: .1em; }
        h1 { margin: 5px 0 8px; font-size: 1.8rem; letter-spacing: -.02em; line-height: 1.15; }
        .section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 8px 2px 2px; border-bottom: 1px solid var(--app-border); }
        .section-heading h2 { margin: 0 0 6px; font-size: 1rem; letter-spacing: -.01em; }.section-heading span { color: var(--app-text-muted); font-size: 12px; }
        h3 { margin: 0; font-size: 1rem; } h4 { margin: 20px 0 10px; font-size: .9rem; }
        p { margin: 8px 0 16px; color: var(--app-text-muted); font-size: 13px; line-height: 1.6; }
        .overview-header p { margin-bottom: 0; }
        .overview-header .scope-note { margin-top: 12px; padding-left: 10px; border-left: 3px solid var(--app-accent); font-size: 12px; }
        button, select { border: 1px solid var(--app-border); background: var(--app-surface); color: var(--app-accent); padding: 10px 14px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; }
        .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .metric, .panel { border: 1px solid var(--app-border); border-radius: 18px; background: var(--app-surface); padding: 20px; min-width: 0; }
        .metric { display: grid; gap: 8px; align-content: start; }.metrics:not(.metrics-secondary) .metric:first-child { border-color: var(--app-border-strong); background: linear-gradient(135deg, var(--app-accent-soft), var(--app-surface) 75%); }
        .metrics-secondary .metric { padding: 15px 18px; }.metrics-secondary .metric > strong { font-size: 1.4rem; }
        .metric > span { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--app-text-muted); }
        .metric > strong { font-size: 1.7rem; letter-spacing: -.03em; }
        small { color: var(--app-text-muted); font-size: 12px; line-height: 1.5; }
        .metric-danger > strong { color: var(--app-danger-text); }
        .insight-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .insight { display: grid; gap: 6px; align-content: start; padding: 16px 18px; min-width: 0; border-left: 4px solid var(--app-accent); border-radius: 12px; background: var(--app-surface); box-shadow: 0 1px 8px rgba(35, 22, 12, .035); }
        .insight:nth-child(2) { border-left-color: #537a86; }.insight-alert { border-left-color: #c49b5d; }
        .insight > span { color: var(--app-text-muted); font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }.insight > strong { font-size: 17px; line-height: 1.2; overflow-wrap: anywhere; }.insight > small { font-size: 12px; }
        .panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .bars { display: grid; gap: 16px; }.bar-row > div:first-child { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; margin-bottom: 7px; }
        .bar-track { height: 9px; background: var(--app-surface-muted); border-radius: 9px; overflow: hidden; }.bar-track span { display: block; height: 100%; border-radius: inherit; }
        .facts { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 18px; font-size: 12px; color: var(--app-text-muted); }.facts b { color: var(--app-text); }
        .chart { width: 100%; height: 240px; min-width: 0; }
        .items-panel, .locations-panel { grid-column: 1 / -1; }
        .item-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
        .item-card { display: grid; grid-template-rows: auto 1fr auto auto; gap: 8px; min-width: 0; padding: 14px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface-muted); }
        .item-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.item-rank { color: var(--app-accent); font-size: 11px; font-weight: 800; letter-spacing: .06em; }.item-top strong { font-size: 22px; line-height: 1; }.item-name { align-self: end; font-size: 13px; font-weight: 700; line-height: 1.35; overflow-wrap: anywhere; }.item-card small { overflow-wrap: anywhere; }.item-track, .location-track { height: 7px; border-radius: 9px; background: var(--app-border); overflow: hidden; }.item-track span, .location-track span { display: block; height: 100%; border-radius: inherit; background: var(--app-accent); }
        .location-list { display: grid; gap: 12px; }.location-row { display: grid; gap: 10px; padding: 14px 16px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface-muted); }.location-main { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; font-size: 13px; }.location-main > strong { min-width: 0; overflow-wrap: anywhere; font-size: 15px; }.location-main > span { white-space: nowrap; }.location-main b { font-size: 20px; }.location-main small { font-size: 11px; }.location-meta { display: flex; flex-wrap: wrap; gap: 8px 20px; color: var(--app-text-muted); font-size: 11px; }.location-meta b { color: var(--app-text); }.location-overdue b { color: var(--app-danger-text); }
        .pill { background: var(--app-accent-soft); color: var(--app-accent); border-radius: 8px; padding: 7px 10px; font-size: 12px; font-weight: 700; }
        .user-tools { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin: 12px 0 18px; }.user-tools > input { flex: 1; min-width: 200px; border: 1px solid var(--app-border); background: var(--app-surface); color: var(--app-text); padding: 12px; border-radius: 10px; }.user-tools label { display: flex; align-items: center; gap: 8px; font-size: 13px; }.user-tools input[type=checkbox] { accent-color: var(--app-accent); }
        .contact-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: stretch; }
        .contact-card { display: grid; gap: 16px; padding: 18px; border: 1px solid var(--app-border); border-radius: 15px; min-width: 0; }
        .contact-head { display: flex; align-items: center; gap: 12px; min-width: 0; }.avatar { display: grid; place-items: center; width: 42px; height: 42px; flex: 0 0 42px; border-radius: 50%; background: var(--app-accent-soft); color: var(--app-accent); font-weight: 800; }.contact-identity { display: grid; gap: 2px; min-width: 0; flex: 1; }.contact-identity strong, .contact-identity small { overflow-wrap: anywhere; }.repeat-tag { padding: 5px 8px; border-radius: 30px; background: #eaf3ed; color: #267349; font-size: 11px; font-weight: 800; }
        .contact-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }.contact-stats > div { display: grid; align-content: start; gap: 6px; padding: 11px; border-radius: 10px; background: var(--app-surface-muted); }.contact-stats span, .share-label span { color: var(--app-text-muted); font-size: 11px; }.contact-stats strong { font-size: 20px; line-height: 1; }
        .share-label { display: flex; justify-content: space-between; gap: 10px; }.share-label strong { font-size: 12px; }.share-track, .contract-track { height: 8px; border-radius: 10px; background: var(--app-surface-muted); overflow: hidden; }.share-track span, .contract-track span { display: block; height: 100%; border-radius: inherit; background: var(--app-accent); }.share-track { margin-top: -12px; }
        .contact-tags { display: flex; flex-wrap: wrap; gap: 8px; }.contact-tags span { padding: 5px 9px; border-radius: 8px; background: var(--app-accent-soft); color: var(--app-accent); font-size: 11px; }.contact-footer { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding-top: 12px; border-top: 1px solid var(--app-border); }.contact-footer :global(a), .workload-panel .panel-heading :global(a), .contract-row :global(a) { color: var(--app-accent); font-size: 12px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
        .contact-insight { display: grid; align-content: center; gap: 8px; padding: 24px; border-radius: 15px; background: linear-gradient(135deg, var(--app-accent-soft), var(--app-surface-muted)); }.contact-insight > strong { font-size: 3rem; line-height: 1; letter-spacing: -.05em; }.contact-insight p { margin: 0 0 10px; }.contact-insight > div { display: flex; justify-content: space-between; gap: 12px; padding-top: 10px; border-top: 1px solid var(--app-border); font-size: 12px; }
        .pagination { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 16px; }.pagination > div { display: flex; gap: 8px; }.identity-note { margin: 16px 0 0; padding-top: 12px; border-top: 1px solid var(--app-border); font-size: 11px; }button:disabled { opacity: .45; cursor: default; }.empty { margin: 14px 0; }
        .follow-up-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 16px; }.workload-hero { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }.workload-hero > div { display: grid; gap: 6px; align-content: start; padding: 16px; border-radius: 12px; background: var(--app-surface-muted); }.workload-hero span { color: var(--app-text-muted); font-size: 12px; }.workload-hero strong { font-size: 1.6rem; }.workload-hero small { font-size: 11px; }
        .age-track { display: flex; width: 100%; height: 13px; overflow: hidden; border-radius: 12px; background: var(--app-surface-muted); }.age-track span { display: block; height: 100%; }.age-onTrack { background: #6b9a7b; }.age-attention { background: #d9a548; }.age-overdue { background: #c96c59; }.age-legend { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 12px; font-size: 11px; }.age-legend span { display: flex; align-items: center; gap: 5px; }.age-legend i { width: 9px; height: 9px; border-radius: 50%; }.age-legend strong { margin-left: 3px; }
        .evidence-section { margin-top: 20px; padding-top: 2px; border-top: 1px solid var(--app-border); }.evidence-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }.evidence-stats > div { display: grid; gap: 6px; padding: 14px; border-radius: 10px; background: var(--app-surface-muted); }.evidence-stats span { color: var(--app-text-muted); font-size: 11px; }.evidence-stats strong { font-size: 20px; }.evidence-stats small { font-weight: 400; }.evidence-meta { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 14px; font-size: 11px; }.evidence-section p { margin: 14px 0 0; font-size: 11px; }
        .contract-summary { display: flex; align-items: center; gap: 16px; margin: 18px 0 12px; padding: 18px; border-radius: 12px; background: var(--app-accent-soft); }.contract-summary > strong { font-size: 2.6rem; line-height: 1; }.contract-summary > span { display: grid; gap: 3px; font-size: 15px; font-weight: 700; }.contract-summary small { font-weight: 400; }.contract-list { display: grid; }.contract-row { display: grid; gap: 9px; padding: 14px 0; border-bottom: 1px solid var(--app-border); }.contract-row:last-child { border-bottom: 0; }.contract-row > div:first-child { display: flex; justify-content: space-between; gap: 12px; }.contract-row strong { font-size: 12px; }.contract-track span { background: #537a86; }
        @media(max-width: 1220px) { .overview-header { grid-template-columns: minmax(0, 1fr); }.overview-toolbar { width: 100%; } }
        @media(max-width: 1100px) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }.insight-strip { grid-template-columns: minmax(0, 1fr); }.follow-up-grid { grid-template-columns: minmax(0, 1fr); }.item-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media(max-width: 800px) { .contact-grid { grid-template-columns: minmax(0, 1fr); } }
        @media(max-width: 700px) { .overview-header { padding: 16px; }.panels { grid-template-columns: minmax(0, 1fr); }.metric, .panel { padding: 16px; }.metric > strong { font-size: 1.4rem; }.claims-overview { gap: 12px; }.user-tools > input { width: 100%; min-width: 0; flex-basis: 100%; }.panel-heading > div { min-width: 0; flex-basis: 100%; }.chart { height: 200px; } }
        @media(max-width: 450px) { .metrics, .workload-hero, .evidence-stats, .item-grid { grid-template-columns: minmax(0, 1fr); }.contact-stats { gap: 5px; }.contact-stats > div { padding: 9px 6px; }.contact-stats strong { font-size: 17px; } }
      `}</style>
    </section>
  );
}

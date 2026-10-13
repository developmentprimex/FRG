import Link from "next/link";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminDateTime, AdminText, AdminTranslatedInput } from "../../../../components/admin-i18n";
import { requirePxAdminPage } from "../../../../lib/admin-role-guards";
import { loadPxClaimFeedback } from "../../../../lib/claim-feedback-dashboard";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

const basePath = "/admin/px-claims/feedback";

function href(filters, changes = {}) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  if (next.view === "invitations") params.set("view", "invitations");
  if (next.attention && next.view !== "invitations") params.set("attention", "1");
  if (next.status && next.view === "invitations") params.set("status", next.status);
  if (next.q) params.set("q", next.q);
  if (next.dateFrom) params.set("dateFrom", next.dateFrom);
  if (next.dateTo) params.set("dateTo", next.dateTo);
  if (next.page > 1) params.set("page", String(next.page));
  return `${basePath}${params.size ? `?${params}` : ""}`;
}

const statusKeys = {
  PENDING: "pending", SENDING: "sending", SENT: "sent", FAILED: "failed",
  UNKNOWN: "unknown", NO_EMAIL: "noEmail", CANCELLED: "cancelled", ANSWERED: "answered",
};
const statusFallbacks = {
  PENDING: "Waiting to send", SENDING: "Sending invitation", SENT: "Invitation sent", FAILED: "Email failed",
  UNKNOWN: "Delivery uncertain", NO_EMAIL: "No customer email", CANCELLED: "Invitation cancelled", ANSWERED: "Customer responded",
};

function Status({ status }) {
  return <span className={`feedback-status feedback-status-${status.toLowerCase()}`}>
    <AdminText i18nKey={`claimFeedbackAdmin.${statusKeys[status] || "pending"}`} fallback={statusFallbacks[status] || status} />
  </span>;
}

function Resolution({ value }) {
  if (!value) return "—";
  return <AdminText i18nKey={`claimFeedbackAdmin.resolution${value}`} fallback={{ YES: "Yes", PARTLY: "Partly", NO: "No" }[value] || value} />;
}

function Rating({ value }) {
  return Number.isInteger(value) ? `${value}/5` : "—";
}

export default async function PxClaimFeedbackPage({ searchParams = {} }) {
  const admin = await requirePxAdminPage();
  const { filters, summary, rows, total, page, pages } = await loadPxClaimFeedback(prisma, await searchParams);
  const responses = filters.view === "responses";
  return <AdminShell adminEmail={admin.email}>
    <main className="px-feedback-page">
      <header className="px-feedback-header">
        <div>
          <span className="px-feedback-eyebrow">PX claims · 111</span>
          <h1><AdminText i18nKey="claimFeedbackList.title" fallback="Customer feedback" /></h1>
          <p><AdminText i18nKey="claimFeedbackList.description" fallback="See customer responses and track feedback invitations for PX claims." /></p>
        </div>
        <Link className="px-feedback-back" href="/admin/px-claims"><AdminText i18nKey="claimFeedbackList.backToClaims" fallback="Back to PX claims" /></Link>
      </header>

      <div className="px-feedback-metrics">
        <article><span><AdminText i18nKey="claimFeedbackList.responses" fallback="Responses" /></span><strong>{summary.answered}</strong><small><AdminText i18nKey="claimFeedbackList.sentInvitations" fallback="Sent invitations" />: {summary.invited}</small></article>
        <article><span><AdminText i18nKey="claimFeedbackList.responseRate" fallback="Response rate" /></span><strong>{summary.responseRate}%</strong><small><AdminText i18nKey="claimFeedbackList.ofSent" fallback="Of sent invitations" /></small></article>
        <article><span><AdminText i18nKey="claimFeedbackList.averageOverall" fallback="Average overall rating" /></span><strong>{summary.averageOverall == null ? "—" : `${summary.averageOverall.toFixed(1)}/5`}</strong><small><AdminText i18nKey="claimFeedbackList.ofResponses" fallback="Of responses" /></small></article>
        <article className={summary.attention ? "px-feedback-alert" : ""}><span><AdminText i18nKey="claimFeedbackList.needsAttention" fallback="Needs attention" /></span><strong>{summary.attention}</strong><small><AdminText i18nKey="claimFeedbackList.attentionHint" fallback="Not resolved, partly resolved, or 1–2 overall" /></small></article>
      </div>

      <section className="px-feedback-panel">
        <nav className="px-feedback-tabs" aria-label="Feedback views">
          <Link aria-current={responses ? "page" : undefined} href={href(filters, { view: "responses", attention: false, status: "", page: 1 })}><AdminText i18nKey="claimFeedbackList.responses" fallback="Responses" /></Link>
          <Link aria-current={!responses ? "page" : undefined} href={href(filters, { view: "invitations", attention: false, status: "", page: 1 })}><AdminText i18nKey="claimFeedbackList.invitations" fallback="Invitations" /></Link>
        </nav>
        <div className="px-feedback-heading">
          <div><h2><AdminText i18nKey={responses ? "claimFeedbackList.responses" : "claimFeedbackList.invitations"} fallback={responses ? "Responses" : "Invitations"} /></h2><p>{total} <AdminText i18nKey="claimFeedbackList.matching" fallback="matching records" /></p></div>
          {responses ? <div className="px-feedback-segments">
            <Link className={!filters.attention ? "selected" : ""} href={href(filters, { attention: false, page: 1 })}><AdminText i18nKey="claimFeedbackList.allResponses" fallback="All responses" /></Link>
            <Link className={filters.attention ? "selected" : ""} href={href(filters, { attention: true, page: 1 })}><AdminText i18nKey="claimFeedbackList.needsAttention" fallback="Needs attention" /> ({summary.attention})</Link>
          </div> : null}
        </div>

        <form action={basePath} method="get" className="px-feedback-filters">
          {filters.view === "invitations" ? <input type="hidden" name="view" value="invitations" /> : null}
          {filters.attention ? <input type="hidden" name="attention" value="1" /> : null}
          <label><span><AdminText i18nKey="claimFeedbackList.search" fallback="Search" /></span><AdminTranslatedInput name="q" defaultValue={filters.q} placeholderKey="claimFeedbackList.searchPlaceholder" placeholderFallback="Claim, contract, customer, email" /></label>
          {!responses ? <label><span><AdminText i18nKey="claimFeedbackList.status" fallback="Status" /></span><select name="status" defaultValue={filters.status}>
            <option value=""><AdminText i18nKey="claimFeedbackList.allStatuses" fallback="All statuses" /></option>
            {Object.keys(statusKeys).map((status) => <option key={status} value={status}><AdminText i18nKey={`claimFeedbackAdmin.${statusKeys[status]}`} fallback={statusFallbacks[status]} /></option>)}
          </select></label> : null}
          <label><span><AdminText i18nKey="claimFeedbackList.dateFrom" fallback="Date from" /></span><input type="date" name="dateFrom" defaultValue={filters.dateFrom} /></label>
          <label><span><AdminText i18nKey="claimFeedbackList.dateTo" fallback="Date to" /></span><input type="date" name="dateTo" defaultValue={filters.dateTo} /></label>
          <div className="px-feedback-filter-actions"><button type="submit"><AdminText i18nKey="claimFeedbackList.applyFilters" fallback="Apply filters" /></button><Link href={href({ view: filters.view })}><AdminText i18nKey="claimFeedbackList.clear" fallback="Clear" /></Link></div>
        </form>

        {rows.length ? <div className="px-feedback-table-wrap"><table className="px-feedback-table">
          <thead><tr>
            <th><AdminText i18nKey="claimFeedbackList.date" fallback="Date" /></th>
            <th><AdminText i18nKey="claimFeedbackList.claim" fallback="Claim" /></th>
            <th><AdminText i18nKey="claimFeedbackList.customer" fallback="Customer" /></th>
            {responses ? <><th><AdminText i18nKey="claimFeedbackList.resolved" fallback="Issue resolved" /></th><th><AdminText i18nKey="claimFeedbackList.ratings" fallback="Ratings" /></th><th><AdminText i18nKey="claimFeedbackList.comment" fallback="Comment" /></th></> : <><th><AdminText i18nKey="claimFeedbackList.status" fallback="Status" /></th><th><AdminText i18nKey="claimFeedbackList.email" fallback="Email" /></th></>}
            <th><AdminText i18nKey="claimFeedbackList.action" fallback="Action" /></th>
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className={responses && (row.resolved !== "YES" || (Number.isInteger(row.overallRating) && row.overallRating <= 2)) ? "px-feedback-row-alert" : ""}>
            <td><AdminDateTime value={responses ? row.submittedAt : (row.sentAt || row.createdAt)} numeric /></td>
            <td><strong>{row.reference}</strong><small>{row.contractNumber}</small></td>
            <td>{row.fullName || "—"}</td>
            {responses ? <><td><Resolution value={row.resolved} /></td><td className="px-feedback-ratings"><span><AdminText i18nKey="claimFeedbackAdmin.overall" fallback="Overall" /> <b><Rating value={row.overallRating} /></b></span><span><AdminText i18nKey="claimFeedbackAdmin.speed" fallback="Speed" /> <b><Rating value={row.speedRating} /></b></span><span><AdminText i18nKey="claimFeedbackAdmin.communication" fallback="Communication" /> <b><Rating value={row.communicationRating} /></b></span></td><td className="px-feedback-comment"><span title={row.comment || ""}>{row.comment || "—"}</span></td></> : <><td><Status status={row.status} /></td><td>{row.recipientEmail || "—"}</td></>}
            <td><Link className="px-feedback-open" href={`/admin/claims/${row.claimId}`}><AdminText i18nKey="claimFeedbackList.openClaim" fallback="Open claim" /></Link></td>
          </tr>)}</tbody>
        </table></div> : <p className="px-feedback-empty"><AdminText i18nKey="claimFeedbackList.empty" fallback="No feedback matches these filters." /></p>}

        {pages > 1 ? <nav className="px-feedback-pagination" aria-label="Pages"><span>{page} / {pages}</span><div>
          {page > 1 ? <Link href={href(filters, { page: page - 1 })}><AdminText i18nKey="claimFeedbackList.previous" fallback="Previous" /></Link> : null}
          {page < pages ? <Link href={href(filters, { page: page + 1 })}><AdminText i18nKey="claimFeedbackList.next" fallback="Next" /></Link> : null}
        </div></nav> : null}
      </section>
    </main>
    <style>{`
      .px-feedback-page { display: grid; gap: 18px; padding: 24px; max-width: 1600px; margin: 0 auto; color: var(--app-text); }
      .px-feedback-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
      .px-feedback-header h1 { margin: 4px 0; font-size: 26px; } .px-feedback-header p { margin: 0; color: var(--app-text-muted); }
      .px-feedback-eyebrow { color: var(--app-accent); font-weight: 800; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
      .px-feedback-back, .px-feedback-open, .px-feedback-pagination a { display: inline-flex; align-items: center; min-height: 38px; padding: 8px 12px; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-surface); color: var(--app-accent); text-decoration: none; font-size: 13px; font-weight: 800; white-space: nowrap; }
      .px-feedback-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .px-feedback-metrics article { display: grid; align-content: start; gap: 6px; padding: 18px; border: 1px solid var(--app-border); border-radius: 14px; background: var(--app-surface); }
      .px-feedback-metrics span { color: var(--app-text-muted); font-size: 12px; font-weight: 700; }.px-feedback-metrics strong { font-size: 27px; line-height: 1.2; }.px-feedback-metrics small { color: var(--app-text-muted); font-size: 11px; }
      .px-feedback-metrics .px-feedback-alert { border-color: var(--app-danger-text); }.px-feedback-alert strong { color: var(--app-danger-text); }
      .px-feedback-panel { overflow: hidden; border: 1px solid var(--app-border); border-radius: 16px; background: var(--app-surface); }
      .px-feedback-tabs { display: flex; gap: 4px; padding: 16px 20px 0; border-bottom: 1px solid var(--app-border); }
      .px-feedback-tabs a { padding: 10px 16px; color: var(--app-text-muted); text-decoration: none; font-weight: 800; font-size: 13px; border-bottom: 3px solid transparent; }
      .px-feedback-tabs a[aria-current=page] { color: var(--app-accent); border-color: var(--app-accent); }
      .px-feedback-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 20px; }.px-feedback-heading h2 { margin: 0; font-size: 20px; }.px-feedback-heading p { margin: 3px 0 0; color: var(--app-text-muted); font-size: 13px; }
      .px-feedback-segments { display: flex; flex-wrap: wrap; gap: 6px; }.px-feedback-segments a { padding: 8px 12px; border: 1px solid var(--app-border); border-radius: 8px; color: var(--app-text); text-decoration: none; font-size: 12px; font-weight: 800; }.px-feedback-segments a.selected { border-color: var(--app-accent); background: var(--app-accent-soft); color: var(--app-accent); }
      .px-feedback-filters { display: flex; align-items: end; flex-wrap: wrap; gap: 10px; margin: 0 20px 20px; padding: 14px; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-surface-muted); }
      .px-feedback-filters label { display: grid; gap: 5px; flex: 1 1 150px; color: var(--app-text-muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }.px-feedback-filters label:first-of-type { flex-basis: 250px; }
      .px-feedback-filters input, .px-feedback-filters select { box-sizing: border-box; width: 100%; min-height: 40px; padding: 8px 10px; border: 1px solid var(--app-border-strong); border-radius: 8px; background: var(--app-surface); color: var(--app-text); font: inherit; font-size: 13px; text-transform: none; letter-spacing: normal; }
      .px-feedback-filter-actions { display: flex; gap: 8px; align-items: center; }.px-feedback-filter-actions button, .px-feedback-filter-actions a { display: inline-flex; align-items: center; min-height: 40px; box-sizing: border-box; padding: 8px 12px; border: 1px solid var(--app-border); border-radius: 8px; font: inherit; font-size: 12px; font-weight: 800; text-decoration: none; cursor: pointer; white-space: nowrap; }.px-feedback-filter-actions button { background: var(--app-accent); color: var(--app-accent-contrast); }.px-feedback-filter-actions a { background: var(--app-surface); color: var(--app-accent); }
      .px-feedback-table-wrap { overflow-x: auto; }.px-feedback-table { width: 100%; border-collapse: collapse; min-width: 950px; font-size: 13px; }.px-feedback-table th { text-align: left; color: var(--app-text-muted); background: var(--app-surface-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }.px-feedback-table th, .px-feedback-table td { padding: 13px 14px; border-top: 1px solid var(--app-border); vertical-align: top; }.px-feedback-table td small { display: block; margin-top: 3px; color: var(--app-text-muted); }.px-feedback-table tr:hover td { background: var(--app-surface-muted); }.px-feedback-row-alert td:first-child { border-left: 3px solid var(--app-danger-text); }
      .px-feedback-ratings { min-width: 135px; }.px-feedback-ratings span { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--app-text-muted); }.px-feedback-ratings b { color: var(--app-text); }.px-feedback-comment { max-width: 270px; overflow-wrap: anywhere; line-height: 1.4; }.px-feedback-comment span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }.feedback-status { display: inline-flex; padding: 5px 8px; border-radius: 7px; background: var(--app-surface-muted); font-size: 11px; font-weight: 800; white-space: nowrap; }.feedback-status-failed, .feedback-status-unknown, .feedback-status-no_email { color: var(--app-danger-text); }
      .px-feedback-empty { margin: 0; padding: 28px 20px; color: var(--app-text-muted); }.px-feedback-pagination { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 18px 20px; border-top: 1px solid var(--app-border); font-size: 13px; }.px-feedback-pagination div { display: flex; gap: 8px; }
      .px-feedback-page a:focus-visible, .px-feedback-page button:focus-visible, .px-feedback-page input:focus-visible, .px-feedback-page select:focus-visible { outline: 3px solid var(--app-accent); outline-offset: 2px; }
      @media(max-width: 900px) { .px-feedback-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media(max-width: 600px) { .px-feedback-page { padding: 14px; }.px-feedback-metrics { grid-template-columns: 1fr; }.px-feedback-filters { margin-inline: 12px; }.px-feedback-heading { padding-inline: 12px; } }
    `}</style>
  </AdminShell>;
}

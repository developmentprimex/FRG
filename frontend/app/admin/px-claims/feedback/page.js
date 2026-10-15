import Link from "next/link";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminDateTime, AdminText, AdminTranslatedInput } from "../../../../components/admin-i18n";
import { requirePxAdminPage } from "../../../../lib/admin-role-guards";
import { FEEDBACK_PAGE_SIZE, loadClaimFeedback, needsFeedbackAttention } from "../../../../lib/claim-feedback-dashboard";
import { requireAdminClaimsPage } from "../../../../lib/admin-claims-access";
import { canAccessPx } from "../../../../lib/admin-roles";
import { prisma } from "../../../../lib/prisma";
import "./feedback-dashboard.css";

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
  return `${filters.basePath || basePath}${params.size ? `?${params}` : ""}`;
}

function Text({ name, children, values }) {
  return <AdminText i18nKey={`claimFeedbackList.${name}`} fallback={children} values={values} />;
}

function Icon({ name, size = 18 }) {
  const paths = {
    responses: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6A8.4 8.4 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z",
    send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13",
    chart: "M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
    attention: "M12 9v4m0 4h.01M10.3 3.8 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z",
    filters: "M4 7h16M7 12h10m-7 5h4",
    arrowLeft: "m12 5-7 7 7 7M5 12h14",
    arrowRight: "m12 5 7 7-7 7M19 12H5",
    down: "m6 9 6 6 6-6",
    check: "m5 12 4 4L19 6",
    search: "m21 21-4.3-4.3M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.responses} /></svg>;
}

const statusKeys = { PENDING: "pending", SENDING: "sending", SENT: "sent", FAILED: "failed", UNKNOWN: "unknown", NO_EMAIL: "noEmail", CANCELLED: "cancelled", ANSWERED: "answered" };
const statusFallbacks = { PENDING: "Waiting to send", SENDING: "Sending invitation", SENT: "Invitation sent", FAILED: "Email failed", UNKNOWN: "Delivery uncertain", NO_EMAIL: "No customer email", CANCELLED: "Invitation cancelled", ANSWERED: "Customer responded" };

function Status({ status }) {
  return <span className={`feedback-status feedback-status-${String(status || "pending").toLowerCase()}`}><AdminText i18nKey={`claimFeedbackAdmin.${statusKeys[status] || "pending"}`} fallback={statusFallbacks[status] || "Waiting to send"} /></span>;
}

function Resolution({ value }) {
  const names = { YES: ["resolvedYes", "Resolved"], PARTLY: ["resolvedPartly", "Partly resolved"], NO: ["resolvedNo", "Not resolved"] };
  const [name, fallback] = names[value] || ["notSpecified", "Not specified"];
  return <span className={`feedback-resolution feedback-resolution-${String(value || "unknown").toLowerCase()}`}>{value === "YES" ? <Icon name="check" size={13} /> : null}<Text name={name}>{fallback}</Text></span>;
}

function Rating({ value }) {
  return Number.isInteger(value) && value >= 1 && value <= 5 ? <>{value}<span className="rating-scale">/5</span></> : "—";
}

function CellLabel({ name, children }) {
  return <span className="px-feedback-cell-label"><Text name={name}>{children}</Text></span>;
}

function Comments({ row }) {
  const count = Number(Boolean(row.comment)) + Number(Boolean(row.unresolvedComment));
  if (!count) return <span className="px-feedback-muted"><Text name="noComment">No comment</Text></span>;
  return <details className="px-feedback-comments">
    <summary><span className="px-feedback-comment-preview">{row.unresolvedComment || row.comment}</span><span className="px-feedback-comment-toggle"><span className="when-closed"><Text name="readComments">Read comments</Text></span><span className="when-open"><Text name="closeComments">Close comments</Text></span><Icon name="down" size={13} /></span></summary>
    <div className="px-feedback-comment-body">
      {row.unresolvedComment ? <div><strong><AdminText i18nKey="claimFeedbackAdmin.unresolvedComment" fallback="Still unresolved" /></strong><p>{row.unresolvedComment}</p></div> : null}
      {row.comment ? <div><strong><AdminText i18nKey="claimFeedbackAdmin.comment" fallback="Customer comment" /></strong><p>{row.comment}</p></div> : null}
    </div>
  </details>;
}

function EmptyState({ filters, summary, hasFilters, responses }) {
  let title = "noResponsesTitle", detail = "noResponsesDetail", action = "viewInvitations", actionText = "View invitations", target = href({ view: "invitations", basePath: filters.basePath }), icon = "responses";
  if (hasFilters) {
    title = "noMatchesTitle"; detail = "noMatchesDetail"; action = "resetFilters"; actionText = "Reset filters"; target = href({ view: filters.view, basePath: filters.basePath }); icon = "search";
  } else if (responses && filters.attention) {
    title = "noAttentionTitle"; detail = "noAttentionDetail"; action = "allResponses"; actionText = "All responses"; target = filters.basePath || basePath; icon = "check";
  } else if (!responses || !summary.invitationCount) {
    title = responses ? "noResponsesTitle" : "noInvitationsTitle"; detail = "noInvitationsDetail"; action = "backToClaims"; actionText = "Back to PX claims"; target = filters.basePath === basePath ? "/admin/px-claims" : "/admin/claims"; icon = "send";
  }
  const titles = { noResponsesTitle: "No customer responses yet", noMatchesTitle: "No matching results", noAttentionTitle: "No feedback needs attention", noInvitationsTitle: "No feedback invitations yet" };
  const details = { noResponsesDetail: "Customer ratings and comments will appear here once feedback is submitted. You can check invitation delivery in the Invitations view.", noMatchesDetail: "Try another search or reset the filters to see the available records.", noAttentionDetail: "Unresolved issues, partial resolutions and overall ratings of 1–2 will appear in this view.", noInvitationsDetail: "Feedback invitations are created automatically when eligible claims are marked Done." };
  return <div className="px-feedback-empty">
    <span className="px-feedback-empty-icon"><Icon name={icon} size={25} /></span>
    <h3><Text name={title}>{titles[title]}</Text></h3>
    <p><Text name={detail}>{details[detail]}</Text></p>
    {responses && !hasFilters && !filters.attention && summary.invited > 0 ? <span className="px-feedback-empty-note"><Text name="invitationsSentCount" values={{ count: summary.invited }}>{"{count} feedback invitations sent"}</Text></span> : null}
    <Link className="px-feedback-button px-feedback-button-primary" href={target}>{action === "backToClaims" && filters.basePath !== basePath ? <AdminText i18nKey="claimsAdmin.backToClaims" fallback="Back to claims" /> : <Text name={action}>{actionText}</Text>}<Icon name="arrowRight" size={15} /></Link>
  </div>;
}

export default async function PxClaimFeedbackPage({ searchParams = {}, pxOnly = true }) {
  const admin = await (pxOnly ? requirePxAdminPage() : requireAdminClaimsPage());
  const pageBasePath = pxOnly ? basePath : "/admin/claims/feedback";
  const result = await loadClaimFeedback(prisma, await searchParams, { pxOnly, includePx: !pxOnly && canAccessPx(admin) });
  const { summary, rows, total, page, pages } = result;
  const filters = { ...result.filters, basePath: pageBasePath };
  const responses = filters.view === "responses";
  const hasFilters = Boolean(filters.q || filters.dateFrom || filters.dateTo || filters.status);
  const first = total ? (page - 1) * FEEDBACK_PAGE_SIZE + 1 : 0;
  const last = total ? first + rows.length - 1 : 0;
  return <AdminShell adminEmail={admin.email}>
    <main className="px-feedback-page">
      <header className="px-feedback-header">
        <div><span className="px-feedback-eyebrow"><AdminText i18nKey={pxOnly ? "pxClaimsAdmin.title" : "claimsAdmin.claims"} fallback={pxOnly ? "PX claims" : "Claims"} /></span><h1><Text name="title">Customer feedback</Text></h1><p><Text name="description">Understand customer satisfaction, review open issues and track feedback invitations.</Text></p></div>
        <Link className="px-feedback-button" href={pxOnly ? "/admin/px-claims" : "/admin/claims"}><Icon name="arrowLeft" size={16} /><AdminText i18nKey={pxOnly ? "claimFeedbackList.backToClaims" : "claimsAdmin.backToClaims"} fallback={pxOnly ? "Back to PX claims" : "Back to claims"} /></Link>
      </header>

      <section aria-labelledby="feedback-overview-title" className="px-feedback-overview">
        <div className="px-feedback-overview-label"><h2 id="feedback-overview-title"><Text name="overview">Service overview</Text></h2><span><Text name="allFeedbackHint">Across all customer feedback</Text></span></div>
        <div className="px-feedback-metrics">
          <article><div className="px-feedback-metric-label"><span><Text name="responsesReceived">Responses received</Text></span><Icon name="responses" /></div><strong>{summary.answered}</strong><small><Text name="sentCount" values={{ count: summary.invited }}>{"{count} invitations sent"}</Text></small></article>
          <article><div className="px-feedback-metric-label"><span><Text name="responseRate">Response rate</Text></span><Icon name="chart" /></div><strong>{summary.responseRate}<span className="metric-unit">%</span></strong><small><Text name="responseRatio" values={{ answered: summary.answered, invited: summary.invited }}>{"{answered} responses from {invited} sent invitations"}</Text></small></article>
          <article><div className="px-feedback-metric-label"><span><Text name="averageOverall">Overall satisfaction</Text></span><Icon name="star" /></div><strong>{summary.averageOverall == null ? "—" : <>{summary.averageOverall.toFixed(1)}<span className="metric-unit">/5</span></>}</strong><small><Text name={summary.averageOverall == null ? "noRatingsYet" : "averageHint"}>{summary.averageOverall == null ? "Available after the first response" : "Average of all overall service ratings"}</Text></small></article>
          <article className={summary.attention ? "px-feedback-metric-alert" : ""}><div className="px-feedback-metric-label"><span><Text name="needsAttention">Needs attention</Text></span><Icon name="attention" /></div><strong>{summary.attention}</strong><small><Text name="attentionHint">Unresolved issues or overall ratings of 1–2/5</Text></small></article>
        </div>
      </section>

      <section className="px-feedback-panel" aria-labelledby="feedback-panel-title">
        <h2 id="feedback-view-title" className="px-feedback-sr-only"><Text name="views">Feedback views</Text></h2>
        <nav className="px-feedback-tabs" aria-labelledby="feedback-view-title">
          <Link aria-current={responses ? "page" : undefined} href={href(filters, { view: "responses", attention: false, status: "", page: 1 })}><Icon name="responses" size={17} /><Text name="responses">Customer responses</Text><span className="px-feedback-tab-count">{summary.answered}</span></Link>
          <Link aria-current={!responses ? "page" : undefined} href={href(filters, { view: "invitations", attention: false, status: "", page: 1 })}><Icon name="send" size={17} /><Text name="invitations">Feedback invitations</Text><span className="px-feedback-tab-count">{summary.invitationCount}</span></Link>
        </nav>
        <div className="px-feedback-heading">
          <div><h2 id="feedback-panel-title"><Text name={responses ? "responseTitle" : "invitationTitle"}>{responses ? "Service ratings & comments" : "Invitation delivery"}</Text></h2><p><Text name={responses ? "responseDescription" : "invitationDescription"}>{responses ? "Review customer satisfaction and identify what still needs to be resolved." : "Latest invitation for each complaint. Open the claim to review delivery or retry a failed email."}</Text></p></div>
          {responses ? <div className="px-feedback-segments"><Link aria-current={!filters.attention ? "page" : undefined} href={href(filters, { attention: false, page: 1 })}><Text name="allResponses">All responses</Text></Link><Link aria-current={filters.attention ? "page" : undefined} href={href(filters, { attention: true, page: 1 })}><Text name="needsAttention">Needs attention</Text><span>{summary.attention}</span></Link></div> : null}
        </div>

        <form action={pageBasePath} method="get" className={`px-feedback-filters${responses ? "" : " px-feedback-filters-invitations"}`}>
          <div className="px-feedback-filter-heading"><span><Icon name="filters" size={17} /><Text name="filters">Filters</Text></span>{hasFilters ? <span className="px-feedback-filter-active"><Text name="filtersActive">Filters applied</Text></span> : null}</div>
          {filters.view === "invitations" ? <input type="hidden" name="view" value="invitations" /> : null}
          {filters.attention ? <input type="hidden" name="attention" value="1" /> : null}
          <label className="px-feedback-search"><span><Text name="search">Search</Text></span><AdminTranslatedInput name="q" defaultValue={filters.q} placeholderKey="claimFeedbackList.searchPlaceholder" placeholderFallback="Claim reference, customer or email" /></label>
          {!responses ? <label><span><Text name="deliveryStatus">Delivery status</Text></span><select name="status" defaultValue={filters.status}><option value=""><Text name="allStatuses">All statuses</Text></option>{Object.keys(statusKeys).map((status) => <option key={status} value={status}><AdminText i18nKey={`claimFeedbackAdmin.${statusKeys[status]}`} fallback={statusFallbacks[status]} /></option>)}</select></label> : null}
          <label><span><Text name={responses ? "receivedFrom" : "dateFrom"}>{responses ? "Received from" : "Date from"}</Text></span><input type="date" name="dateFrom" defaultValue={filters.dateFrom} /></label>
          <label><span><Text name={responses ? "receivedTo" : "dateTo"}>{responses ? "Received to" : "Date to"}</Text></span><input type="date" name="dateTo" defaultValue={filters.dateTo} /></label>
          <div className="px-feedback-filter-actions"><button className="px-feedback-button px-feedback-button-primary" type="submit"><Text name="applyFilters">Apply filters</Text></button><Link className="px-feedback-button" href={href({ view: filters.view, basePath: filters.basePath })}><Text name="resetFilters">Reset filters</Text></Link></div>
        </form>

        <div className="px-feedback-result-count"><Text name={responses ? (total === 1 ? "oneResponse" : "responseCount") : (total === 1 ? "oneInvitation" : "invitationCount")} values={{ count: total }}>{responses ? "{count} customer responses" : "{count} feedback invitations"}</Text></div>
        {rows.length ? <div className="px-feedback-table-wrap"><table className="px-feedback-table" role="table">
          <caption className="px-feedback-sr-only"><Text name={responses ? "responses" : "invitations"}>{responses ? "Customer responses" : "Feedback invitations"}</Text></caption>
          <thead role="rowgroup"><tr role="row"><th scope="col"><Text name="customerClaim">Customer & claim</Text></th>{responses ? <><th scope="col"><Text name="resolutionStatus">Resolution</Text></th><th scope="col"><Text name="ratings">Service ratings</Text></th><th scope="col"><Text name="comment">Comments</Text></th></> : <><th scope="col"><Text name="deliveryStatus">Delivery status</Text></th><th scope="col"><Text name="recipient">Recipient</Text></th></>}<th scope="col"><Text name={responses ? "received" : "invitationDate"}>{responses ? "Received" : "Invitation date"}</Text></th><th scope="col"><span className="px-feedback-sr-only"><Text name="action">Action</Text></span></th></tr></thead>
          <tbody role="rowgroup">{rows.map((row) => <tr role="row" key={row.id} className={responses && needsFeedbackAttention(row) ? "px-feedback-row-alert" : ""}>
            <td className="px-feedback-customer" role="cell"><CellLabel name="customerClaim">Customer & claim</CellLabel><strong>{row.fullName || <Text name="unknownCustomer">Customer</Text>}</strong><span className="px-feedback-reference">{row.reference}</span></td>
            {responses ? <><td role="cell"><CellLabel name="resolutionStatus">Resolution</CellLabel><Resolution value={row.resolved} />{row.resolved === "NO" ? <span className="px-feedback-review"><Text name="reviewRequired">Review required</Text></span> : null}</td><td className="px-feedback-ratings" role="cell"><CellLabel name="ratings">Service ratings</CellLabel><strong className="px-feedback-overall"><Icon name="star" size={14} /><Rating value={row.overallRating} /></strong><span className="px-feedback-subrating"><Text name="processingTime">Processing time</Text><b><Rating value={row.speedRating} /></b></span><span className="px-feedback-subrating"><AdminText i18nKey="claimFeedbackAdmin.communication" fallback="Communication" /><b><Rating value={row.communicationRating} /></b></span></td><td className="px-feedback-comment-cell" role="cell"><CellLabel name="comment">Comments</CellLabel><Comments row={row} /></td></> : <><td role="cell"><CellLabel name="deliveryStatus">Delivery status</CellLabel><Status status={row.status} /></td><td className="px-feedback-email" role="cell"><CellLabel name="recipient">Recipient</CellLabel>{row.recipientEmail || <span className="px-feedback-muted"><Text name="noRecipient">No email address</Text></span>}</td></>}
            <td className="px-feedback-date" role="cell"><CellLabel name={responses ? "received" : "invitationDate"}>{responses ? "Received" : "Invitation date"}</CellLabel><AdminDateTime value={responses ? row.submittedAt : (row.sentAt || row.createdAt)} numeric /></td>
            <td className="px-feedback-action" role="cell"><Link className="px-feedback-button" href={`/admin/claims/${row.claimId}`}><Text name="openClaim">Open claim</Text><Icon name="arrowRight" size={14} /></Link></td>
          </tr>)}</tbody>
        </table></div> : <EmptyState filters={filters} summary={summary} hasFilters={hasFilters} responses={responses} />}

        {rows.length ? <nav className="px-feedback-pagination" aria-label="Pagination"><span><Text name="showingRange" values={{ first, last, total }}>{"Showing {first}–{last} of {total}"}</Text></span><div><span><Text name="pageCount" values={{ page, pages }}>{"Page {page} of {pages}"}</Text></span>{page > 1 ? <Link className="px-feedback-button" href={href(filters, { page: page - 1 })}><Icon name="arrowLeft" size={14} /><Text name="previous">Previous</Text></Link> : null}{page < pages ? <Link className="px-feedback-button" href={href(filters, { page: page + 1 })}><Text name="next">Next</Text><Icon name="arrowRight" size={14} /></Link> : null}</div></nav> : null}
      </section>
    </main>
  </AdminShell>;
}

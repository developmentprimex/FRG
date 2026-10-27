import { Prisma } from "@prisma/client";
import { formatServiceClaimReference } from "./service-claim-email-subject.js";
import { workDateKey } from "./work-processing-rules.js";

export const FEEDBACK_PAGE_SIZE = 20;

export function needsFeedbackAttention(row) {
  return row.status === "ANSWERED" && (row.resolved !== "YES" || (Number.isInteger(row.overallRating) && row.overallRating <= 2));
}

function validDate(value) {
  const date = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ? date : "";
}

export function normalizeFeedbackFilters(params = {}) {
  const first = (value) => String(Array.isArray(value) ? value[0] || "" : value || "").trim();
  const view = first(params.view) === "invitations" ? "invitations" : "responses";
  const status = ["SENT", "FAILED", "UNKNOWN", "PENDING", "SENDING", "NO_EMAIL", "CANCELLED", "ANSWERED"].includes(first(params.status)) ? first(params.status) : "";
  return {
    view,
    attention: view === "responses" && first(params.attention) === "1",
    status: view === "invitations" ? status : "",
    q: first(params.q).slice(0, 120),
    dateFrom: validDate(first(params.dateFrom)),
    dateTo: validDate(first(params.dateTo)),
    page: Math.max(1, Number.parseInt(first(params.page), 10) || 1),
  };
}

function dateKey(value) {
  return value ? workDateKey(value) : "";
}

export function buildFeedbackDashboard(rows, filters) {
  const invitations = rows.map((row) => ({
    ...row,
    reference: formatServiceClaimReference(row.contractNumber, row.claimSequence, row.ticketNumber),
  }));
  const latestByClaim = new Map();
  for (const invitation of invitations) if (!latestByClaim.has(invitation.claimId)) latestByClaim.set(invitation.claimId, invitation);
  const answered = invitations.filter((row) => row.status === "ANSWERED");
  const latestAnsweredByClaim = new Map();
  for (const response of answered) if (!latestAnsweredByClaim.has(response.claimId)) latestAnsweredByClaim.set(response.claimId, response);
  const attentionIds = new Set([...latestAnsweredByClaim.values()].filter(needsFeedbackAttention).map((row) => row.id));
  const invited = invitations.filter((row) => row.status === "SENT" || row.status === "ANSWERED");
  const ratings = answered.map((row) => row.overallRating).filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5);
  const summary = {
    answered: answered.length,
    invitationCount: latestByClaim.size,
    invited: invited.length,
    responseRate: invited.length ? Math.round(answered.length / invited.length * 100) : 0,
    averageOverall: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null,
    attention: attentionIds.size,
  };
  const q = filters.q.toLocaleLowerCase();
  const source = filters.view === "responses" ? answered : [...latestByClaim.values()];
  const filtered = source.filter((row) => {
    if (filters.view === "responses" && row.status !== "ANSWERED") return false;
    if (filters.view === "invitations" && filters.status && row.status !== filters.status) return false;
    if (filters.attention && !attentionIds.has(row.id)) return false;
    if (q && ![row.reference, row.contractNumber, row.fullName, row.email, row.recipientEmail].some((value) => String(value || "").toLocaleLowerCase().includes(q))) return false;
    const date = dateKey(filters.view === "responses" ? row.submittedAt : (row.sentAt || row.createdAt));
    if (filters.dateFrom && date < filters.dateFrom) return false;
    if (filters.dateTo && date > filters.dateTo) return false;
    return true;
  });
  filtered.sort((a, b) => {
    const dateA = filters.view === "responses" ? a.submittedAt : (a.sentAt || a.createdAt);
    const dateB = filters.view === "responses" ? b.submittedAt : (b.sentAt || b.createdAt);
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  const pages = Math.max(1, Math.ceil(filtered.length / FEEDBACK_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  return { summary, rows: filtered.slice((page - 1) * FEEDBACK_PAGE_SIZE, page * FEEDBACK_PAGE_SIZE), total: filtered.length, page, pages };
}

export async function loadPxClaimFeedback(db, params) {
  return loadClaimFeedback(db, params, { pxOnly: true });
}

export async function loadClaimFeedback(db, params, { pxOnly = false, includePx = false } = {}) {
  const filters = normalizeFeedbackFilters(params);
  const rows = await db.$queryRaw(Prisma.sql`
    SELECT
      fi."id", fi."claimId", fi."status", fi."createdAt", fi."sentAt", fi."submittedAt", fi."recipientEmail",
      fi."overallRating", fi."speedRating", fi."communicationRating", fi."resolved", fi."comment", fi."unresolvedComment",
      sc."contractNumber", sc."claimSequence", sc."ticketNumber", sc."fullName", sc."email"
    FROM "ClaimFeedbackInvitation" fi
    INNER JOIN "ServiceClaim" sc ON sc."id" = fi."claimId"
    WHERE ${pxOnly
      ? Prisma.sql`REGEXP_REPLACE(COALESCE(sc."contractNumber", ''), '[[:space:]]+', '', 'g') LIKE '111%'`
      : includePx ? Prisma.sql`TRUE` : Prisma.sql`REGEXP_REPLACE(COALESCE(sc."contractNumber", ''), '[[:space:]]+', '', 'g') NOT LIKE '111%'`}
    ORDER BY fi."claimId", fi."completionVersion" DESC, fi."createdAt" DESC
  `);
  return { filters, ...buildFeedbackDashboard(rows, filters) };
}

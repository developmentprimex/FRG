import { createHash, randomBytes } from "node:crypto";
import { createSmtpTransport, resolveDefaultSmtpConfig, resolveInternalSmtpConfig } from "./email/contract-smtp.js";
import { isLocalEmailEnvironment, resolveLocalEmailRecipient } from "./email/local-email-safety.js";
import { isTestContractNumber } from "./order-kind.js";
import { lockWorkProcessing } from "./work-processing.js";

export const CLAIM_FEEDBACK_SENDER = "315primex.eu@gmail.com";
const TOKEN_DAYS = 30;

export function createClaimFeedbackToken() {
  return randomBytes(32).toString("base64url");
}

export function hashClaimFeedbackToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function feedbackExpiry(now = new Date()) {
  return new Date(now.getTime() + TOKEN_DAYS * 86400000);
}

export function feedbackBaseUrl(requestUrl, env = process.env) {
  const url = new URL(env.CLAIM_FEEDBACK_BASE_URL || (isLocalEmailEnvironment(env) ? requestUrl : env.WORK_DASHBOARD_URL || requestUrl));
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid feedback URL.");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Feedback URL must use HTTPS.");
  return url.origin;
}

export function resolveClaimFeedbackSmtp(env = process.env) {
  // Existing installations may configure the same 315 mailbox as SMTP_*.
  // Accept that profile only when both the authenticated user and sender are
  // exactly 315; never fall back to a different mailbox.
  const config = resolveInternalSmtpConfig(env) || resolveDefaultSmtpConfig(env);
  const from = String(config?.from || "").match(/<([^>]+)>/)?.[1] || config?.from;
  if (!config || config.user.toLowerCase() !== CLAIM_FEEDBACK_SENDER || String(from).toLowerCase() !== CLAIM_FEEDBACK_SENDER) {
    throw new Error(`Claim feedback requires SMTP_111_* or SMTP_* credentials authenticated as ${CLAIM_FEEDBACK_SENDER}, with the same sender address.`);
  }
  return { ...config, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

export function buildClaimFeedbackMessage({ recipientEmail, token, baseUrl }) {
  const link = `${baseUrl}/claim-feedback/${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);
  return {
    from: `"Fragmento" <${CLAIM_FEEDBACK_SENDER}>`,
    to: recipientEmail,
    subject: "Wie zufrieden waren Sie mit unserem Service?",
    text: `Guten Tag,\n\nIhre Reklamation wurde abgeschlossen. Bitte nehmen Sie sich etwa eine Minute Zeit, um unseren Service zu bewerten:\n\n${link}\n\nDer Link ist 30 Tage gültig. Vielen Dank für Ihr Feedback.\n\nMit freundlichen Grüßen\nIhr Kundenservice`,
    html: `<div lang="de" style="font-family:Arial,sans-serif;line-height:1.6;color:#222"><p>Guten Tag,</p><p>Ihre Reklamation wurde abgeschlossen. Bitte nehmen Sie sich etwa eine Minute Zeit, um unseren Service zu bewerten.</p><p><a href="${safeLink}" style="display:inline-block;padding:12px 18px;background:#76543c;color:#fff;text-decoration:none;border-radius:8px">Service bewerten</a></p><p>Der Link ist 30 Tage gültig. Vielen Dank für Ihr Feedback.</p><p>Mit freundlichen Grüßen<br>Ihr Kundenservice</p></div>`,
  };
}

function definitelyNotDelivered(error) {
  return ["EAUTH", "ECONNECTION", "EDNS", "EENVELOPE"].includes(error?.code)
    || (Number(error?.responseCode) >= 400 && Number(error?.responseCode) < 600);
}

export async function dispatchClaimFeedbackInvitation({ db, deliveryDb = db, invitationId, token, baseUrl, env = process.env, createTransport = createSmtpTransport }) {
  let started = false;
  let accepted = false;
  try {
    return await db.$transaction(async (tx) => {
    await lockWorkProcessing(tx);
    const invitation = await tx.claimFeedbackInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.tokenHash !== hashClaimFeedbackToken(token) || !["PENDING", "FAILED"].includes(invitation.status)) return "skipped";
    const claim = await tx.serviceClaim.findUnique({ where: { id: invitation.claimId }, select: { contractNumber: true } });
    if (!claim || !isTestContractNumber(claim.contractNumber)) {
      await tx.claimFeedbackInvitation.update({ where: { id: invitationId }, data: { status: "CANCELLED" } });
      return "cancelled";
    }
    const processing = await tx.workProcessing.findUnique({ where: { workType_workId: { workType: "CLAIM", workId: invitation.claimId } } });
    if (processing?.status !== "DONE" || processing.version !== invitation.completionVersion) {
      await tx.claimFeedbackInvitation.update({ where: { id: invitationId }, data: { status: "CANCELLED" } });
      return "cancelled";
    }
    const config = resolveClaimFeedbackSmtp(env);
    const message = buildClaimFeedbackMessage({ recipientEmail: invitation.recipientEmail, token, baseUrl });
    // Persist the attempt on a separate connection before SMTP submission. A
    // process crash leaves SENDING for an administrator to review, never a
    // silently retryable PENDING invitation.
    await deliveryDb.claimFeedbackInvitation.update({ where: { id: invitationId }, data: { status: "SENDING", attemptedAt: new Date(), error: null } });
    started = true;
    await tx.$queryRaw`SELECT 1 AS alive`;
    const transport = createTransport({ ...config, localFeedbackRecipient: invitation.recipientEmail }, env);
    let receipt;
    let deadline;
    try {
      receipt = await Promise.race([
        transport.sendMail(message),
        new Promise((_, reject) => { deadline = setTimeout(() => reject(Object.assign(new Error("Feedback SMTP deadline exceeded."), { code: "ETIMEDOUT" })), 30000); }),
      ]);
    } finally { clearTimeout(deadline); transport.close?.(); }
    const expectedRecipient = resolveLocalEmailRecipient({ to: invitation.recipientEmail, from: message.from, user: config.user, localFeedbackRecipient: invitation.recipientEmail }, env);
    accepted = (receipt?.accepted || []).some((address) => String(address).toLowerCase() === expectedRecipient.toLowerCase());
    if (!accepted) throw Object.assign(new Error("Feedback recipient was not accepted by SMTP."), { code: "EENVELOPE" });
    await tx.claimFeedbackInvitation.update({ where: { id: invitationId }, data: { status: "SENT", sentAt: new Date(), error: null } });
    return "sent";
    }, { maxWait: 10000, timeout: 45000 });
  } catch (error) {
    // A database error after SMTP acceptance is ambiguous. Do not retry it.
    const status = accepted || !definitelyNotDelivered(error) && started ? "UNKNOWN" : "FAILED";
    await deliveryDb.claimFeedbackInvitation.update({ where: { id: invitationId }, data: { status, error: String(error?.message || error).slice(0, 1000) } });
    return status.toLowerCase();
  }
}

export async function reviewClaimFeedbackDelivery({ db, invitationId, outcome }) {
  if (!["DELIVERED", "NOT_DELIVERED"].includes(outcome)) throw new Error("Invalid delivery review.");
  return db.$transaction(async (tx) => {
    await lockWorkProcessing(tx);
    const invitation = await tx.claimFeedbackInvitation.findUnique({ where: { id: invitationId } });
    const stale = invitation?.status === "SENDING" && Date.now() - new Date(invitation.attemptedAt).getTime() > 120000;
    if (!invitation || invitation.status !== "UNKNOWN" && !stale) throw new Error("This delivery is not ready for review.");
    const processing = await tx.workProcessing.findUnique({ where: { workType_workId: { workType: "CLAIM", workId: invitation.claimId } } });
    const stillDone = processing?.status === "DONE" && processing.version === invitation.completionVersion;
    const status = stillDone ? outcome === "DELIVERED" ? "SENT" : "FAILED" : "CANCELLED";
    return tx.claimFeedbackInvitation.update({ where: { id: invitationId }, data: { status, sentAt: status === "SENT" ? new Date() : null } });
  });
}

export async function prepareClaimFeedbackRetry({ db, invitationId }) {
  return db.$transaction(async (tx) => {
    await lockWorkProcessing(tx);
    const invitation = await tx.claimFeedbackInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation || !["PENDING", "FAILED"].includes(invitation.status) || !invitation.recipientEmail) throw new Error("This feedback invitation cannot be retried.");
    const claim = await tx.serviceClaim.findUnique({ where: { id: invitation.claimId }, select: { contractNumber: true } });
    if (!claim || !isTestContractNumber(claim.contractNumber)) throw new Error("Feedback email is only available for 111 contracts.");
    const processing = await tx.workProcessing.findUnique({ where: { workType_workId: { workType: "CLAIM", workId: invitation.claimId } } });
    if (processing?.status !== "DONE" || processing.version !== invitation.completionVersion) throw new Error("The claim is no longer completed.");
    const token = createClaimFeedbackToken();
    await tx.claimFeedbackInvitation.update({ where: { id: invitationId }, data: { tokenHash: hashClaimFeedbackToken(token), expiresAt: feedbackExpiry(), status: "PENDING", error: null } });
    return { invitationId, token };
  });
}

export function validateClaimFeedback(data) {
  const ratings = [data?.speedRating, data?.communicationRating, data?.overallRating];
  if (!ratings.every((value) => Number.isInteger(value) && value >= 1 && value <= 5)) throw new Error("Please answer each rating question.");
  if (!["YES", "PARTLY", "NO"].includes(data?.resolved)) throw new Error("Please say whether the issue was resolved.");
  const comment = String(data?.comment || "").trim();
  if (comment.length > 1000) throw new Error("The comment must be under 1000 characters.");
  return { speedRating: data.speedRating, communicationRating: data.communicationRating, overallRating: data.overallRating, resolved: data.resolved, comment: comment || null };
}

export async function submitClaimFeedback({ db, token, data, now = new Date() }) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const answers = validateClaimFeedback(data);
  return db.$transaction(async (tx) => {
    const invitation = await tx.claimFeedbackInvitation.findUnique({ where: { tokenHash: hashClaimFeedbackToken(token) } });
    if (!invitation || !["SENT", "UNKNOWN", "SENDING"].includes(invitation.status) || !invitation.expiresAt || invitation.expiresAt <= now) return false;
    const processing = await tx.workProcessing.findUnique({ where: { workType_workId: { workType: "CLAIM", workId: invitation.claimId } } });
    if (processing?.status !== "DONE" || processing.version !== invitation.completionVersion) return false;
    const result = await tx.claimFeedbackInvitation.updateMany({
      where: { id: invitation.id, status: { in: ["SENT", "UNKNOWN", "SENDING"] }, submittedAt: null },
      data: { ...answers, status: "ANSWERED", submittedAt: now },
    });
    return result.count === 1;
  });
}

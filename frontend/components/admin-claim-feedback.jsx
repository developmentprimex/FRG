"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDateTime, useAdminI18n } from "./admin-i18n";

export function AdminClaimFeedback({ feedback }) {
  const router = useRouter();
  const { translate } = useAdminI18n();
  const t = (key, fallback) => translate(`claimFeedbackAdmin.${key}`, fallback);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!feedback) return null;
  const canRetry = feedback.status === "FAILED" || (feedback.status === "PENDING" && Date.now() - new Date(feedback.createdAt).getTime() > 120000);
  const canReview = feedback.status === "UNKNOWN" || (feedback.status === "SENDING" && Date.now() - new Date(feedback.attemptedAt).getTime() > 120000);
  const statusText = { PENDING: t("pending", "Waiting to send"), SENDING: t("sending", "Sending invitation"), SENT: t("sent", "Invitation sent"), FAILED: t("failed", "Email failed"), UNKNOWN: t("unknown", "Delivery uncertain"), NO_EMAIL: t("noEmail", "No customer email"), CANCELLED: t("cancelled", "Invitation cancelled"), ANSWERED: t("answered", "Customer responded") }[feedback.status] || feedback.status;
  async function retry() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/claim-feedback/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationId: feedback.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to retry.");
      router.refresh();
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }
  async function review(outcome) {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/claim-feedback/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invitationId: feedback.id, outcome }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to review delivery.");
      router.refresh();
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }
  return <section className="claim-feedback-panel" aria-label={t("title", "Customer feedback")}>
    <div className="feedback-top"><div><h2>{t("title", "Customer feedback")}</h2><p>{statusText}{feedback.sentAt ? <> · <AdminDateTime value={feedback.sentAt} /></> : null}</p></div>{canRetry ? <button type="button" disabled={pending} onClick={retry}>{pending ? t("retrying", "Sending…") : t("retry", "Retry email")}</button> : null}</div>
    {feedback.status === "ANSWERED" ? <>
      <div className="score-grid"><div><span>{t("resolved", "Issue resolved")}</span><strong>{t(`resolution${feedback.resolved}`, { YES: "Yes", PARTLY: "Partly", NO: "No" }[feedback.resolved])}</strong></div><div><span>{t("speed", "Speed")}</span><strong>{feedback.speedRating}/5</strong></div><div><span>{t("communication", "Communication")}</span><strong>{feedback.communicationRating}/5</strong></div><div><span>{t("overall", "Overall")}</span><strong>{feedback.overallRating}/5</strong></div></div>
      {feedback.comment ? <p className="comment"><b>{t("comment", "Customer comment")}:</b> {feedback.comment}</p> : null}
      <small>{t("received", "Received")}: <AdminDateTime value={feedback.submittedAt} /></small>
    </> : null}
    {canReview ? <div className="delivery-review"><p>{t("unknownDetail", "Check the sending mailbox and decide whether the email was delivered.")}</p><button type="button" disabled={pending} onClick={() => review("DELIVERED")}>{t("markDelivered", "Email was delivered")}</button><button type="button" disabled={pending} onClick={() => review("NOT_DELIVERED")}>{t("markNotDelivered", "Email was not delivered")}</button></div> : null}
    {error ? <p role="alert" className="error">{error}</p> : null}
    <style jsx>{`
      .claim-feedback-panel { border: 1px solid var(--app-border); border-radius: 12px; padding: 18px; background: var(--app-surface); }
      .feedback-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
      h2 { margin: 0; font-size: 16px; } p { margin: 6px 0 0; color: var(--app-text-muted); font-size: 13px; line-height: 1.5; }
      button { border: 1px solid var(--app-border-strong); border-radius: 8px; padding: 9px 12px; background: var(--app-surface); color: var(--app-accent); font-weight: 700; cursor: pointer; } button:disabled { opacity: .6; }
      .score-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; margin-top: 16px; }.score-grid > div { display: grid; gap: 5px; padding: 12px; border-radius: 8px; background: var(--app-surface-muted); }.score-grid span { font-size: 11px; color: var(--app-text-muted); }.score-grid strong { font-size: 17px; }
      .comment { margin-top: 16px; color: var(--app-text); white-space: pre-wrap; overflow-wrap: anywhere; } small { display: block; margin-top: 12px; color: var(--app-text-muted); }.error { color: var(--app-danger-text); }
      .delivery-review { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }.delivery-review p { flex-basis: 100%; }
      @media(max-width:650px) { .score-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
    `}</style>
  </section>;
}

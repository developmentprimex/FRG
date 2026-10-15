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
  const answered = feedback.status === "ANSWERED";
  const statusDate = answered ? feedback.submittedAt : feedback.sentAt;
  const needsAttention = answered && (feedback.resolved !== "YES" || feedback.overallRating <= 2);
  const ratingTone = (value) => value >= 4 ? "positive" : value === 3 ? "neutral" : "negative";
  const scores = [
    { label: t("speed", "Speed"), value: feedback.speedRating },
    { label: t("communication", "Communication"), value: feedback.communicationRating },
    { label: t("overall", "Overall"), value: feedback.overallRating },
  ];
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
  return <section className="claim-feedback-panel" data-tone={answered ? needsAttention ? "attention" : "positive" : "pending"} aria-label={t("title", "Customer feedback")}>
    <div className="feedback-top"><div><h2>{t("title", "Customer feedback")}</h2><p>{statusText}{statusDate ? <> · <AdminDateTime value={statusDate} /></> : null}</p></div>{canRetry ? <button type="button" disabled={pending} onClick={retry}>{pending ? t("retrying", "Sending…") : t("retry", "Retry email")}</button> : null}</div>
    {feedback.status === "ANSWERED" ? <>
      <div className="score-grid">
        <div data-tone={feedback.resolved === "YES" ? "positive" : feedback.resolved === "PARTLY" ? "neutral" : "negative"}>
          <span>{t("resolved", "Issue resolved")}</span>
          <strong><span className="resolution-icon" aria-hidden="true">{feedback.resolved === "YES" ? "✓" : feedback.resolved === "PARTLY" ? "◐" : "!"}</span>{t(`resolution${feedback.resolved}`, { YES: "Yes", PARTLY: "Partly", NO: "No" }[feedback.resolved])}</strong>
        </div>
        {scores.map((score) => <div key={score.label} data-tone={ratingTone(score.value)}>
          <span>{score.label}</span>
          <strong>{score.value}<span className="score-max">/5</span></strong>
          <div className="rating-marks" aria-hidden="true">{[1, 2, 3, 4, 5].map((number) => <i key={number} data-filled={number <= score.value} />)}</div>
        </div>)}
      </div>
      {feedback.comment ? <p className="comment"><b>{t("comment", "Customer comment")}:</b> {feedback.comment}</p> : null}
    </> : null}
    {canReview ? <div className="delivery-review"><p>{t("unknownDetail", "Check the sending mailbox and decide whether the email was delivered.")}</p><button type="button" disabled={pending} onClick={() => review("DELIVERED")}>{t("markDelivered", "Email was delivered")}</button><button type="button" disabled={pending} onClick={() => review("NOT_DELIVERED")}>{t("markNotDelivered", "Email was not delivered")}</button></div> : null}
    {error ? <p role="alert" className="error">{error}</p> : null}
    <style jsx>{`
      .claim-feedback-panel { border: 1px solid var(--app-border); border-radius: 8px; padding: 18px; background: var(--app-surface); }
      .claim-feedback-panel[data-tone=positive] { border-color: #cfe5d9; border-left: 3px solid #43946b; }
      .claim-feedback-panel[data-tone=attention] { border-color: #eddbbb; border-left: 3px solid #bc8835; }
      .feedback-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
      h2 { margin: 0; font-size: 16px; } p { margin: 6px 0 0; color: var(--app-text-muted); font-size: 13px; line-height: 1.5; }
      button { border: 1px solid var(--app-border-strong); border-radius: 8px; padding: 9px 12px; background: var(--app-surface); color: var(--app-accent); font-weight: 700; cursor: pointer; } button:disabled { opacity: .6; }
      .score-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; margin-top: 16px; }
      .score-grid > div { display: grid; align-content: start; gap: 8px; padding: 14px 16px; border: 1px solid var(--score-border); border-radius: 8px; background: var(--score-bg); color: var(--score-color); }
      .score-grid [data-tone=positive] { --score-bg: #eef7f1; --score-border: #d0e7d9; --score-color: #276c47; }
      .score-grid [data-tone=neutral] { --score-bg: #fff8e9; --score-border: #f0dfb8; --score-color: #8a621e; }
      .score-grid [data-tone=negative] { --score-bg: #fff1ef; --score-border: #f1d3cf; --score-color: #a73c32; }
      .score-grid > div > span { font-size: var(--admin-text-label); }
      .score-grid strong { display: flex; align-items: center; gap: 4px; font-size: 22px; line-height: 1.2; font-weight: 600; }
      .score-max { font-size: 14px; font-weight: 400; opacity: .7; }
      .resolution-icon { margin-right: 5px; font-size: 20px; }
      .rating-marks { display: flex; gap: 4px; margin-top: 2px; }
      .rating-marks i { flex: 1; max-width: 30px; height: 4px; border-radius: 2px; background: var(--score-border); }
      .rating-marks i[data-filled=true] { background: currentColor; opacity: .7; }
      .comment { margin-top: 16px; padding: 12px 14px; border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-surface-muted); color: var(--app-text); white-space: pre-wrap; overflow-wrap: anywhere; }
      .comment b { display: block; margin-bottom: 4px; font-weight: 600; }
      small { display: block; margin-top: 12px; color: var(--app-text-muted); }.error { color: var(--app-danger-text); }
      .delivery-review { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }.delivery-review p { flex-basis: 100%; }
      @media(max-width:650px) { .score-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
    `}</style>
  </section>;
}

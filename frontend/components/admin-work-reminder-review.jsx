"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminText, useAdminI18n } from "./admin-i18n";

export function WorkReminderReview({ batchId }) {
  const router = useRouter();
  const { translate } = useAdminI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function review(outcome) {
    const confirmation = outcome === "DELIVERED"
      ? translate("workProcessing.confirmDelivered", "Have you verified that this email was delivered to 140primex.eu@gmail.com? This prevents automatic retries.")
      : translate("workProcessing.confirmNotDelivered", "Have you verified that this email was not delivered? This allows it to be retried on the next scheduled run.");
    if (!window.confirm(confirmation)) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/work-processing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent: "review-reminder", batchId, outcome }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }
  return <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
    <button type="button" disabled={pending} onClick={() => review("DELIVERED")}><AdminText i18nKey="workProcessing.verifiedDelivered" fallback="Verified delivered" /></button>
    <button type="button" disabled={pending} onClick={() => review("NOT_DELIVERED")}><AdminText i18nKey="workProcessing.verifiedNotDelivered" fallback="Verified not delivered" /></button>
    {error ? <small role="alert">{error}</small> : null}
  </div>;
}

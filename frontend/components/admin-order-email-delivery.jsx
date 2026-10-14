import { AdminDateTime, AdminText } from "./admin-i18n";

const statuses = {
  SENT: ["Sent", "#1f6f43"],
  FAILED: ["Failed", "var(--app-danger-text)"],
  PENDING: ["Sending / awaiting result", "#8a5a13"],
  UNKNOWN: ["Unknown", "var(--app-text-muted)"],
  NOT_REQUIRED: ["No separate copy", "var(--app-text-muted)"],
  SKIPPED: ["Not sent (email not configured)", "var(--app-text-muted)"],
};

export function AdminEmailDeliveryStatus({ delivery, showExplanation = true }) {
  const recipients = Array.isArray(delivery?.recipients) ? delivery.recipients : [];
  const required = recipients.filter((recipient) => recipient.status !== "NOT_REQUIRED");
  const sent = required.length > 0 && required.every((recipient) => recipient.status === "SENT");
  const unverified = !required.length || required.some((recipient) => !["SENT", "FAILED", "SKIPPED"].includes(recipient.status));
  const partial = !sent && required.some((recipient) => recipient.status === "SENT");
  return (
    <div style={{ display: "grid", gap: 4, justifyItems: "start" }}>
      <span style={{ padding: "4px 9px", borderRadius: 6, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", color: sent ? "#1f6f43" : "#b42318", background: sent ? "rgba(31, 111, 67, 0.09)" : "rgba(180, 35, 24, 0.09)" }}>
        <AdminText i18nKey={sent ? "orderEmailDelivery.status.SENT" : "orderEmailDelivery.notSent"} fallback={sent ? "Sent" : "Not sent"} />
      </span>
      {showExplanation && (unverified || partial) ? <span style={{ fontSize: 11, color: "var(--app-text-muted)" }}>
        <AdminText i18nKey={partial ? "orderEmailDelivery.partial" : "orderEmailDelivery.unverified"} fallback={partial ? "Not all recipients confirmed" : "Sending not verified"} />
      </span> : null}
    </div>
  );
}

export function AdminOrderEmailDelivery({ delivery, compact = false, titleKey = "orderEmailDelivery.title", titleFallback = "Confirmation email" }) {
  const recipients = Array.isArray(delivery?.recipients) ? delivery.recipients : [];
  const required = recipients.filter((recipient) => recipient.status !== "NOT_REQUIRED");
  const sent = required.filter((recipient) => recipient.status === "SENT").length;
  const failed = required.some((recipient) => recipient.status === "FAILED");
  const summary = (
    <span style={{ color: failed ? "var(--app-danger-text)" : required.length && sent === required.length ? "#1f6f43" : "var(--app-text-muted)" }}>
      <AdminText i18nKey={titleKey} fallback={titleFallback} />
      {recipients.length ? <> · <AdminText i18nKey="orderEmailDelivery.count" fallback="{sent}/{total} sent" values={{ sent, total: required.length }} /></> : null}
      {!recipients.length ? <> · <AdminText i18nKey="orderEmailDelivery.noData" fallback="No sending record" /></> : null}
    </span>
  );
  const content = (
    <div style={{ display: "grid", gap: 8, marginTop: 8, overflowWrap: "anywhere" }}>
      {recipients.map((recipient, index) => {
        const [label, color] = statuses[recipient.status] || statuses.UNKNOWN;
        return (
          <div key={`${recipient.role}-${index}`}>
            <strong><AdminText i18nKey={`orderEmailDelivery.${recipient.role}`} fallback={recipient.role === "customer" ? "Customer" : recipient.role === "service" ? "Service recipient" : "Sender copy"} /></strong>
            {recipient.email ? <div>{recipient.email}</div> : null}
            <span style={{ color }}><AdminText i18nKey={`orderEmailDelivery.status.${recipient.status}`} fallback={label} /></span>
          </div>
        );
      })}
      {delivery?.attemptedAt ? <div><AdminText i18nKey="orderEmailDelivery.lastAttempt" fallback="Last recorded attempt" />: <AdminDateTime value={delivery.attemptedAt} /></div> : null}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, color: "var(--app-text-muted)", fontSize: 12, lineHeight: 1.5 }}>
        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 15, height: 15, flexShrink: 0, border: "1px solid currentColor", borderRadius: "50%", fontSize: 10, fontWeight: 700, fontStyle: "normal", lineHeight: 1 }}>i</span>
        <span><AdminText i18nKey="orderEmailDelivery.hint" fallback="Sent means accepted by the mail server; inbox delivery is not confirmed." /></span>
      </div>
    </div>
  );

  if (compact) return (
    <details style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>{summary}</summary>
      {content}
    </details>
  );
  return <section style={{ padding: 14, border: "1px solid var(--app-border)", borderRadius: 8, fontSize: 13 }}><strong>{summary}</strong>{content}</section>;
}

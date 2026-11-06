import { AdminText } from "./admin-i18n";

export default function AdminPaymentEventDetails({ details }) {
  if (!details?.reason) return null;
  return <div style={{ marginTop: 6, color: "var(--app-text-muted)", fontSize: 13, lineHeight: 1.6 }}>
    <div><AdminText i18nKey={`paymentDiagnostics.reasons.${details.reason}`} fallback="Stripe did not provide a specific reason." /></div>
    {details.orderNumber && <div><AdminText i18nKey="paymentDiagnostics.order" fallback="Order" />: {details.orderNumber}</div>}
    {(details.declineCode || details.errorCode) && <div>
      <AdminText i18nKey="paymentDiagnostics.stripeCode" fallback="Stripe code" />: {[details.declineCode, details.errorCode].filter(Boolean).join(" / ")}
    </div>}
  </div>;
}

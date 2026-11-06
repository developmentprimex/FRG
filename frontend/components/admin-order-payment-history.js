import { prisma } from "../lib/prisma.js";
import { AdminSection } from "./admin-ui";
import { AdminDateTime, AdminText } from "./admin-i18n";
import AdminPaymentEventDetails from "./admin-payment-event-details";

export default async function AdminOrderPaymentHistory({ orderId, orderKind = "live" }) {
  const events = await prisma.stripePaymentEvent.findMany({
    where: { orderId, orderKind }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 100,
  });
  return <AdminSection title={<AdminText i18nKey="paymentDiagnostics.title" fallback="Payment history" />}>
    {!events.length ? <p><AdminText i18nKey="paymentDiagnostics.empty" fallback="No Stripe payment events recorded yet." /></p> :
      <ol style={{ paddingLeft: 24, margin: 0 }}>
        {events.map(event => <li key={event.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--app-border)" }}>
          <AdminDateTime value={event.occurredAt} numeric timeZone="Europe/Berlin" /> · <AdminText i18nKey={`visitJourney.steps.${event.step}`} fallback={event.step} />
          <AdminPaymentEventDetails details={event} />
        </li>)}
      </ol>}
  </AdminSection>;
}

import Link from "next/link";
import { prisma } from "../lib/prisma";
import { latestOrderTickets } from "../lib/order-ticket-admin";
import { formatOrderTicketReference } from "../lib/order-ticket-reference";
import { attachWorkProcessing } from "../lib/work-processing";
import { AdminWorkPanel } from "./admin-work-panel";
import { AdminText } from "./admin-i18n";

export async function AdminOrderTicketPanel({ orderId, orderKind = "live" }) {
  const ticket = (await latestOrderTickets(prisma, [{ id: orderId }], orderKind)).get(orderId);
  if (!ticket) return null;
  const [tracked] = await attachWorkProcessing(prisma, [ticket], "ORDER");
  return <section style={{ display: "grid", gap: 10, marginBottom: 16 }}>
    <Link href={`${orderKind === "test" ? "/admin/px-order-tickets" : "/admin/order-tickets"}/${ticket.id}`}>
      <AdminText i18nKey="orderTickets.ticket" fallback="Ticket" /> {formatOrderTicketReference(ticket)}
    </Link>
    <AdminWorkPanel item={tracked} compact />
  </section>;
}

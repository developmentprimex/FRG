import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { requireAdminPage } from "../../../../lib/auth";
import { attachWorkProcessing } from "../../../../lib/work-processing";
import { getAdminPagination } from "../../../../lib/admin-pagination";
import { formatOrderTicketReference } from "../../../../lib/order-ticket-reference";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminWorkPanel } from "../../../../components/admin-work-panel";
import { AdminDateTime, AdminText, AdminLocalizedName } from "../../../../components/admin-i18n";
import { AdminPagination } from "../../../../components/admin-pagination";
import { AdminSection, ActionLink, pageGridStyle, tableStyle, tableWrapStyle, thStyle, tdStyle, itemCardStyle } from "../../../../components/admin-ui";

export const dynamic = "force-dynamic";
const money = value => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(value || 0));

export default async function OrderTicketDetailPage({ params, searchParams = {}, pxOnly = false }) {
  const admin = await requireAdminPage(pxOnly ? "PX_FRG_VIEW" : "FRG_VIEW");
  const { id } = await params;
  const query = await searchParams;
  const basePath = pxOnly ? "/admin/px-order-tickets" : "/admin/order-tickets";
  const ticket = await prisma.orderTicket.findFirst({ where: { id, ticketSeries: pxOnly ? "px" : "live" }, include: { _count: { select: { submissions: true } } } });
  if (!ticket) notFound();
  const [tracked] = await attachWorkProcessing(prisma, [ticket], "ORDER");
  const pagination = getAdminPagination(ticket._count.submissions, query.page);
  const selectedId = Array.isArray(query.submission) ? query.submission[0] : query.submission;
  const [history, selected] = await Promise.all([
    prisma.orderTicketSubmission.findMany({ where: { ticketId: id }, select: { id: true, orderId: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pagination.pageSize, skip: (pagination.page - 1) * pagination.pageSize }),
    prisma.orderTicketSubmission.findFirst({ where: { ticketId: id, ...(selectedId ? { id: selectedId } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
  ]);
  if (!selected) notFound();
  const snapshot = selected.payload;
  const customer = [snapshot.firstName, snapshot.lastName].filter(Boolean).join(" ");
  return <AdminShell adminEmail={admin.email}><div style={pageGridStyle}>
    <AdminSection title={formatOrderTicketReference(ticket)} actions={<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <ActionLink href={pxOnly ? "/admin/px-orders" : "/admin/orders"}><AdminText i18nKey="ordersAdmin.backToOrders" fallback="Back to orders" /></ActionLink>
      <ActionLink href={`${pxOnly ? "/admin/px-orders" : "/admin/orders"}/${selected.orderId}`}><AdminText i18nKey="orderTickets.openOrder" fallback="Open order" /></ActionLink>
    </div>}>
      <AdminWorkPanel item={tracked} compact />
      <h2 style={{ fontSize: 16 }}><AdminText i18nKey="orderTickets.submissionHistory" fallback="Submission history" /> ({ticket._count.submissions})</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBlock: 16 }}>
        {history.map((entry, index) => <Link key={entry.id} aria-current={entry.id === selected.id ? "page" : undefined}
          style={{ padding: "8px 12px", border: "1px solid var(--app-border)", borderRadius: 8, background: entry.id === selected.id ? "var(--app-surface-muted)" : "var(--app-surface)", color: "var(--app-text)" }}
          href={`${basePath}/${id}?${new URLSearchParams({ submission: entry.id, page: String(pagination.page) })}`}><AdminText i18nKey="orderTickets.submissionNumber" fallback="Submission {number}" values={{ number: ticket._count.submissions - (pagination.page - 1) * pagination.pageSize - index }} /> · <AdminDateTime value={entry.createdAt} /></Link>)}
      </div>
      <AdminPagination basePath={`${basePath}/${id}`} searchParams={{ submission: selected.id }} {...pagination} />
    </AdminSection>
    <AdminSection title={<AdminText i18nKey="orderTickets.submittedOrder" fallback="Submitted order" />} description={<AdminDateTime value={selected.createdAt} />}>
      <div style={{ ...itemCardStyle, display: "grid", gap: 8, marginBottom: 18 }}>
        <strong>{snapshot.orderNumber}</strong><strong>{customer}</strong><span>{snapshot.email} · {snapshot.phone}</span>
        <span>{[snapshot.address1, snapshot.address2, snapshot.postalCode, snapshot.city, snapshot.country].filter(Boolean).join(", ")}</span>
        {snapshot.notes && <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{snapshot.notes}</p>}
      </div>
      <div style={tableWrapStyle}><table style={tableStyle}><thead><tr>
        {[['ordersAdmin.items', 'Items'], ['orderTickets.quantity', 'Quantity'], ['orderTickets.unitPrice', 'Unit price'], ['ordersAdmin.total', 'Total']].map(([key, label]) => <th key={key} style={thStyle}><AdminText i18nKey={key} fallback={label} /></th>)}
      </tr></thead><tbody>{(Array.isArray(snapshot.items) ? snapshot.items : []).map((item, index) => <tr key={index}>
        <td style={tdStyle}><strong><AdminLocalizedName name={item.nameSnapshot || item.code} nameDe={item.nameDeSnapshot} /></strong><div>{item.articleNumberSnapshot || item.code}</div></td>
        <td style={tdStyle}>{item.quantity}</td><td style={tdStyle}>{money(item.priceSnapshot)}</td><td style={tdStyle}>{money(Number(item.priceSnapshot) * Number(item.quantity))}</td>
      </tr>)}</tbody><tfoot><tr><th colSpan={3} style={thStyle}><AdminText i18nKey="ordersAdmin.total" fallback="Total" /></th><td style={tdStyle}><strong>{money(snapshot.totalPrice)}</strong></td></tr></tfoot></table></div>
    </AdminSection>
  </div></AdminShell>;
}

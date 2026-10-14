import { AdminDateTime, AdminText } from "./admin-i18n";

export function AdminOrderSummaryTable({ order }) {
  const rows = [
    ["orderDetailAdmin.customer", "Customer", `${order.firstName} ${order.lastName}`, "orderDetailAdmin.contractNumber", "Contract number", order.contractNumber],
    ["adminShellLogin.email", "Email", <a href={`mailto:${order.email}`}>{order.email}</a>, "ordersAdmin.kitchen", "Kitchen", order.kitchen?.name],
    ["propertyOwnersAdmin.phone", "Phone", order.phone, "orderItemsAdmin.program", "Kitchen program (current configuration)", order.kitchen?.programmId],
    ["orderDetailAdmin.address", "Address", [order.address1, order.address2, `${order.postalCode} ${order.city}`, order.country].filter(Boolean).join(", "), "orderDetailAdmin.preferredDeliveryDate", "Preferred delivery week", order.preferredDeliveryDate ? new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(new Date(order.preferredDeliveryDate)) : null],
  ];
  const extraRows = [
    ["ordersAdmin.created", "Created", <AdminDateTime value={order.createdAt} />],
    ["orderDetailAdmin.contractOrder", "Contract order", order.contractOrderSequence],
    ["orderDetailAdmin.contractAccess", "Contract access", order.kitchenContract
      ? <AdminText i18nKey={order.kitchenContract.isActive ? "orderDetailAdmin.linkedReusableActiveContract" : "orderDetailAdmin.linkedReusableInactiveContract"} fallback={order.kitchenContract.isActive ? "Linked reusable active contract" : "Linked reusable inactive contract"} />
      : <AdminText i18nKey="orderDetailAdmin.noLinkedContractRecord" fallback="No linked contract record" />],
    ["orderDetailAdmin.propertyOwner", "Housing company", order.kitchenContract?.owner?.name],
    ["contractsAdmin.project", "Project", order.kitchenContract?.project?.name],
    ["contractsAdmin.propertyObject", "Object / building", order.kitchenContract?.project?.propertyObject?.name],
    ["orderDetailAdmin.notes", "Notes", order.notes],
    ["orderDetailAdmin.stripeSession", "Stripe session", order.stripeCheckoutSessionId],
  ];
  return <div className="order-overview">
    <table><tbody>{rows.map(([key, label, value, key2, label2, value2]) => <tr key={key}>
      <th scope="row"><AdminText i18nKey={key} fallback={label} /></th><td>{value || "—"}</td>
      <th scope="row"><AdminText i18nKey={key2} fallback={label2} /></th><td>{value2 || "—"}</td>
    </tr>)}</tbody></table>
    <details><summary><AdminText i18nKey="orderItemsAdmin.moreDetails" fallback="More order details" /></summary>
      <table><tbody>{extraRows.map(([key, label, value]) => <tr key={key}><th scope="row"><AdminText i18nKey={key} fallback={label} /></th><td>{value || "—"}</td></tr>)}</tbody></table>
    </details>
    <style>{`
      .order-overview table { width:100%; border-collapse:collapse; font-size:14px; }
      .order-overview th,.order-overview td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--app-border); vertical-align:top; overflow-wrap:anywhere; }
      .order-overview th { color:#66513e; background:#f4eee7; font-weight:600; width:17%; }
      .order-overview td { width:33%; color:#302a25; }
      .order-overview tr:nth-child(even) td { background:#faf7f3; }
      .order-overview > table td:nth-child(2) { border-right:3px solid #fff; }
      .order-overview > table tr:first-child td { font-weight:650; }
      .order-overview tr:hover td { background:#f1e9df; }
      .order-overview a { color:#694b34; text-underline-offset:3px; }
      .order-overview details { margin-top:14px; }
      .order-overview summary { cursor:pointer; font-size:13px; font-weight:600; color:#66513e; background:#f4eee7; padding:10px 12px; border-radius:8px; }
      .order-overview summary:focus-visible { outline:2px solid #806044; outline-offset:3px; }
      .order-overview details table { margin-top:8px; table-layout:fixed; }
      @media(max-width:700px) {
        .order-overview > table tr { display:grid; grid-template-columns:110px minmax(0,1fr); }
        .order-overview > table th,.order-overview > table td { width:auto; padding:8px; }
      }
    `}</style>
  </div>;
}

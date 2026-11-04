import { AdminDateTime, AdminText } from "./admin-i18n";
import styles from "./admin-detail-table.module.css";

export function AdminOrderSummaryTable({ order }) {
  const rows = [
    ["orderDetailAdmin.customer", "Customer", `${order.firstName} ${order.lastName}`],
    ["adminShellLogin.email", "Email", <a href={`mailto:${order.email}`}>{order.email}</a>],
    ["propertyOwnersAdmin.phone", "Phone", order.phone],
    ["orderDetailAdmin.address", "Address", [order.address1, order.address2, `${order.postalCode} ${order.city}`, order.country].filter(Boolean).join(", ")],
    ["orderDetailAdmin.contractNumber", "Contract number", order.contractNumber],
    ["orderItemsAdmin.program", "Kitchen program (current configuration)", order.kitchen?.programmId],
    ["orderDetailAdmin.preferredDeliveryDate", "Preferred delivery week", order.preferredDeliveryDate ? new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(new Date(order.preferredDeliveryDate)) : null],
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
  return <div className={styles.overview}>
    <table><tbody>{rows.map(([key, label, value]) => <tr key={key}>
      <th scope="row"><AdminText i18nKey={key} fallback={label} /></th><td>{value || "—"}</td>
    </tr>)}</tbody></table>
    <details><summary><AdminText i18nKey="orderItemsAdmin.moreDetails" fallback="More order details" /></summary>
      <table><tbody>{extraRows.map(([key, label, value]) => <tr key={key}><th scope="row"><AdminText i18nKey={key} fallback={label} /></th><td>{value || "—"}</td></tr>)}</tbody></table>
    </details>
  </div>;
}

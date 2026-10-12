import { AdminDateTime, AdminKitchenDisplayName, AdminPluralText, AdminStatusBadge, AdminText } from "./admin-i18n";
import { AdminOrderAs400Form } from "./admin-order-as400-form";
import { getPriceBreakdown } from "../lib/price-utils";

function DetailCard({ titleKey, title, rows }) {
  return <article className="order-information-card">
    <h3><AdminText i18nKey={titleKey} fallback={title} /></h3>
    <dl>{rows.filter(Boolean).map(([key, label, value]) => <div className="order-information-row" key={key}>
      <dt><AdminText i18nKey={key} fallback={label} /></dt>
      <dd>{value}</dd>
    </div>)}</dl>
  </article>;
}

const notProvided = <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />;

function currency(value) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

function deliveryDate(value) {
  if (!value) return notProvided;
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? notProvided : new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function ContractSequence({ sequence }) {
  if (!sequence) return notProvided;
  const number = Number(sequence);
  const suffix = number % 100 >= 11 && number % 100 <= 13 ? "th" : number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th";
  const key = number === 1 ? "firstOrderForThisContract" : number === 2 ? "secondOrderForThisContract" : number === 3 ? "thirdOrderForThisContract" : "nthOrderForThisContract";
  return <AdminText i18nKey={`orderDetailAdmin.${key}`} fallback={`${number}${suffix} order for this contract`} values={{ number: String(number), ordinal: `${number}${suffix}` }} />;
}

function PaymentMethod({ value }) {
  if (!value) return notProvided;
  if (["card", "visa", "mastercard"].includes(String(value).toLowerCase())) return <AdminText i18nKey="orderDetailAdmin.card" fallback="Card" />;
  return value;
}

export function AdminOrderInformation({ order, itemCount, as400Saved = false, showAs400 = true }) {
  const owner = order.kitchenContract?.owner;
  const breakdown = getPriceBreakdown(order.totalPrice);
  const paymentStatus = String(order.paymentStatus || "UNPAID").toUpperCase();
  return <div className="order-information-grid">
    <DetailCard titleKey="orderDetailAdmin.customer" title="Customer" rows={[
      ["kitchenDetailAdmin.name", "Name", `${order.firstName} ${order.lastName}`],
      ["adminShellLogin.email", "Email", <a href={`mailto:${order.email}`}>{order.email}</a>],
      ["propertyOwnersAdmin.phone", "Phone", order.phone ? <a href={`tel:${order.phone}`}>{order.phone}</a> : notProvided],
      ["orderDetailAdmin.address", "Address", [order.address1, order.address2, `${order.postalCode} ${order.city}`, order.country].filter(Boolean).join(", ")],
      ["orderDetailAdmin.preferredDeliveryDate", "Preferred delivery week", deliveryDate(order.preferredDeliveryDate)],
      ["orderDetailAdmin.notes", "Notes", order.notes || notProvided],
    ]} />
    <DetailCard titleKey="orderDetailAdmin.orderDetails" title="Order details" rows={[
      ["ordersAdmin.status", "Status", <AdminStatusBadge status={order.status} />],
      ["ordersAdmin.created", "Created", <AdminDateTime value={order.createdAt} />],
      ["orderDetailAdmin.contractNumber", "Contract number", order.contractNumber || notProvided],
      ["ordersAdmin.kitchen", "Kitchen", <AdminKitchenDisplayName slug={order.kitchen.slug} name={order.kitchen.name} />],
      ["ordersAdmin.items", "Items", <AdminPluralText count={itemCount} singularKey="ordersAdmin.itemCountSingular" pluralKey="ordersAdmin.itemCountPlural" singularFallback="{count} item" pluralFallback="{count} items" />],
      ["orderDetailAdmin.contractOrder", "Contract order", <ContractSequence sequence={order.contractOrderSequence} />],
      showAs400 && ["orderDetailAdmin.as400Number", "AS 400", <AdminOrderAs400Form orderId={order.id} initialValue={order.as400Number || ""} initialSaved={as400Saved} compact />],
    ]} />
    <DetailCard titleKey="orderDetailAdmin.propertyDetails" title="Property details" rows={[
      ["orderDetailAdmin.propertyOwner", "Housing company", owner ? [owner.name, owner.email, owner.phone].filter(Boolean).join(" · ") : <AdminText i18nKey="orderDetailAdmin.noHousingCompanySelected" fallback="No housing company selected" />],
      ["contractsAdmin.project", "Project", order.kitchenContract?.project?.name || <AdminText i18nKey="orderDetailAdmin.noProjectSelected" fallback="No project selected" />],
      ["contractsAdmin.propertyObject", "Object/building", order.kitchenContract?.project?.propertyObject?.name || <AdminText i18nKey="orderDetailAdmin.noObjectSelected" fallback="No object selected" />],
      ["orderDetailAdmin.contractAccess", "Contract access", order.kitchenContract
        ? <AdminText i18nKey={order.kitchenContract.isActive ? "orderDetailAdmin.linkedReusableActiveContract" : "orderDetailAdmin.linkedReusableInactiveContract"} fallback={order.kitchenContract.isActive ? "Linked reusable active contract" : "Linked reusable inactive contract"} />
        : <AdminText i18nKey="orderDetailAdmin.noLinkedContractRecord" fallback="No linked contract record" />],
    ]} />
    <DetailCard titleKey="orderDetailAdmin.payment" title="Payment" rows={[
      ["orderDetailAdmin.paymentMethod", "Payment method", <PaymentMethod value={order.paymentMethod} />],
      ["reportsAdmin.payment", "Payment status", <span className="order-payment-status" style={{ color: paymentStatus === "PAID" ? "#1f6f43" : paymentStatus === "PENDING" ? "#8a5a13" : ["FAILED", "CANCELLED"].includes(paymentStatus) ? "var(--app-danger-text)" : "var(--app-text-muted)" }}><AdminText i18nKey={`reportsAdmin.paymentStatus.${paymentStatus.toLowerCase()}`} fallback={paymentStatus} /></span>],
      ["orderDetailAdmin.priceExclVat", "Price", currency(breakdown.net)],
      ["orderDetailAdmin.vatAmount", "VAT (19%)", currency(breakdown.vat)],
      ["orderDetailAdmin.total", "Total", <strong style={{ fontSize: 18, whiteSpace: "nowrap" }}>{currency(order.totalPrice)}</strong>],
      order.stripeCheckoutSessionId && ["orderDetailAdmin.stripeSession", "Stripe session", <details><summary><AdminText i18nKey="ordersAdmin.view" fallback="View" /></summary><small style={{ overflowWrap: "anywhere" }}>{order.stripeCheckoutSessionId}</small></details>],
    ]} />
    <style>{`
      .order-information-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; align-items:start; }
      .order-information-card { min-width:0; border:1px solid var(--app-border); border-radius:18px; padding:20px; background:var(--app-surface); }
      .order-information-card h3 { margin:0 0 14px; font-size:1.1rem; font-weight:800; }
      .order-information-card dl { margin:0; }
      .order-information-row { display:grid; grid-template-columns:minmax(110px,28%) minmax(0,1fr); gap:14px; align-items:start; padding:11px 0; border-bottom:1px solid var(--app-border); }
      .order-information-row:last-child { border-bottom:0; padding-bottom:0; }
      .order-information-row dt { font-size:13px; font-weight:800; line-height:1.5; }
      .order-information-row dd { margin:0; min-width:0; line-height:1.5; overflow-wrap:anywhere; }
      .order-information-row a { color:var(--app-accent); text-decoration:none; }
      .order-payment-status { display:inline-flex; border:1px solid var(--app-border); border-radius:999px; padding:4px 9px; font-size:12px; font-weight:800; }
      @media (max-width:1000px) { .order-information-grid { grid-template-columns:minmax(0,1fr); } }
      @media (max-width:480px) { .order-information-row { grid-template-columns:minmax(0,1fr); gap:5px; } }
    `}</style>
  </div>;
}

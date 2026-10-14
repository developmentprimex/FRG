import { OrderStatus } from "@prisma/client";
import {
  ActionLink,
  AdminSection,
  FlashMessage,
  actionRowStyle,
  itemCardStyle,
  pageGridStyle,
  splitGridStyle,
  subMetaStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import {
  AdminDateTime,
  AdminKitchenDisplayName,
  AdminPluralText,
  AdminStatusBadge,
  AdminText,
} from "../../../../components/admin-i18n";
import { OrderActionButton, OrderActionFeedback } from "../../../../components/admin-order-action-buttons";
import { CancellationRequestPanel } from "../../../../components/admin-order-cancellation-panel";
import { AdminOrderAs400Form } from "../../../../components/admin-order-as400-form";
import { OrderEmailReviewModal } from "../../../../components/order-email-review-modal";
import { AdminOrderEmailDelivery } from "../../../../components/admin-order-email-delivery";
import { attachOrderEmailDelivery } from "../../../../lib/email/order-email-store";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getCancellationRequestsForOrder } from "../../../../lib/order-cancellations";
import { getOrderById } from "../../../../lib/catalog";
import { getPriceBreakdown } from "../../../../lib/price-utils";
import { buildOrderConfirmationAttachmentLabels, buildOrderConfirmationEmailDraft, buildOrderConfirmationEmailStaticHtml } from "../../../../lib/email/order-notifications";
import { AdminOrderItems } from "../../../../components/admin-order-items";
import { buildOrderForNotifications } from "../../../../lib/orders";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatOrdinal(value) {
  const number = Number(value || 0);
  if (!number) return "";
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  const suffix = number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th";
  return `${number}${suffix}`;
}

function getContractOrderKey(sequence) {
  const number = Number(sequence || 0);
  if (number === 1) return "orderDetailAdmin.firstOrderForThisContract";
  if (number === 2) return "orderDetailAdmin.secondOrderForThisContract";
  if (number === 3) return "orderDetailAdmin.thirdOrderForThisContract";
  return "orderDetailAdmin.nthOrderForThisContract";
}

function getStatusHintKey(status) {
  const statusKey = String(status || "").toLowerCase();
  if (statusKey === "emailed") return "orderDetailAdmin.statusHintEmailed";
  if (statusKey === "confirmed") return "orderDetailAdmin.statusHintConfirmed";
  if (statusKey === "cancelled") return "orderDetailAdmin.statusHintCancelled";
  return "orderDetailAdmin.statusHintNew";
}

function getStatusHintFallback(status) {
  if (status === "EMAILED") return "Customer email has been sent. Waiting for the next update.";
  if (status === "CONFIRMED") return "This order has been confirmed.";
  if (status === "CANCELLED") return "This order has been cancelled.";
  return "Next step: confirm the order and send the customer email.";
}

function PaymentMethodText({ value }) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "card" || normalized === "visa" || normalized === "mastercard") {
    return <AdminText i18nKey="orderDetailAdmin.card" fallback="Card" />;
  }
  if (normalized === "paypal") return "PayPal";
  if (normalized === "klarna") return "Klarna";
  return value;
}

function formatPreferredDeliveryDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function OwnerSummary({ owner }) {
  if (!owner) {
    return <AdminText i18nKey="orderDetailAdmin.noHousingCompanySelected" fallback="No housing company selected" />;
  }
  const name = owner.name || "";
  const contact = [owner.email, owner.phone].filter(Boolean).join(" | ");
  return contact ? `${name} | ${contact}` : name;
}

function ContractOrderLabel({ sequence }) {
  if (!sequence) return <AdminText i18nKey="orderDetailAdmin.notAvailable" fallback="Not available" />;

  return (
    <AdminText
      i18nKey={getContractOrderKey(sequence)}
      fallback={`${formatOrdinal(sequence)} order for this contract`}
      values={{
        number: String(sequence),
        ordinal: formatOrdinal(sequence),
      }}
    />
  );
}

function ItemTypeLabel({ type }) {
  if (type === "COMPONENT") {
    return <AdminText i18nKey="orderDetailAdmin.itemTypeComponent" fallback="Component" />;
  }
  if (type === "ACCESSORY") {
    return <AdminText i18nKey="orderDetailAdmin.itemTypeAccessory" fallback="Accessory" />;
  }
  if (type === "SERVICE") {
    return <AdminText i18nKey="orderDetailAdmin.itemTypeService" fallback="Service" />;
  }
  return type || "-";
}

function PaymentStatusBadge({ status }) {
  const value = String(status || "UNPAID").toUpperCase();
  const label = value === "PAID" ? "Paid" : value === "PENDING" ? "Pending" : value === "FAILED" ? "Failed" : value === "CANCELLED" ? "Cancelled" : "Unpaid";
  const style = value === "PAID"
    ? paymentStatusPaidStyle
    : value === "PENDING"
      ? paymentStatusPendingStyle
      : value === "FAILED"
        ? paymentStatusFailedStyle
        : value === "CANCELLED"
          ? paymentStatusFailedStyle
        : paymentStatusUnpaidStyle;

  return <span style={style}>{label}</span>;
}

export default async function AdminOrderDetailPage({ params, searchParams }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const [order] = await attachOrderEmailDelivery([await getOrderById(id)]);

  if (!order) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection title={<AdminText i18nKey="orderDetailAdmin.orderNotFound" fallback="Order not found" />} description={<AdminText i18nKey="orderDetailAdmin.requestedOrderDoesNotExist" fallback="The requested order does not exist." />}>
            <ActionLink href="/admin/orders"><AdminText i18nKey="orderDetailAdmin.backToOrders" fallback="Back to orders" /></ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const paymentLink = getFormMessage(resolvedSearchParams, "paymentLink");
  const as400Saved = resolvedSearchParams.as400Saved === "1";
  const canConfirm = order.status === OrderStatus.NEW;
  const canResendEmail = order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.EMAILED;
  const canCancel = order.status !== OrderStatus.CANCELLED;
  const canCreatePaymentLink =
    order.status !== OrderStatus.CANCELLED &&
    String(order.paymentStatus || "UNPAID").toUpperCase() !== "PAID";
  const notificationOrder = buildOrderForNotifications(order);
  const displayItems = order.items || [];
  const emailDraft = buildOrderConfirmationEmailDraft(notificationOrder);
  const emailStatic = await buildOrderConfirmationEmailStaticHtml(notificationOrder);
  const emailAttachmentLabels = await buildOrderConfirmationAttachmentLabels(notificationOrder, emailStatic.attachmentLinks);
  const cancellationRequests = await getCancellationRequestsForOrder(order.id);

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="orderDetailAdmin.orderTitle" fallback="Order {orderNumber}" values={{ orderNumber: order.orderNumber }} />}
          actions={
            <div style={actionRowStyle}>
              <ActionLink href="/admin/orders"><AdminText i18nKey="orderDetailAdmin.backToOrders" fallback="Back to orders" /></ActionLink>
              <ActionLink href={`/kitchens/${order.kitchen.slug}`}><AdminText i18nKey="orderDetailAdmin.viewKitchen" fallback="View kitchen" /></ActionLink>
            </div>
          }
        >
          <AdminOrderAs400Form
            orderId={order.id}
            initialValue={order.as400Number || ""}
            initialSaved={as400Saved}
          />

          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}
          {paymentLink ? (
            <div style={paymentLinkPanelStyle}>
              <strong><AdminText i18nKey="orderDetailAdmin.paymentLink" fallback="Payment link" /></strong>
              <a href={paymentLink} target="_blank" rel="noreferrer" style={paymentLinkAnchorStyle}>
                {paymentLink}
              </a>
            </div>
          ) : null}

          <form action={`/api/admin/orders/${order.id}`} method="post" style={actionPanelStyle}>
            <div style={statusRowStyle}>
              <div style={statusItemStyle}>
                <span style={compactLabelStyle}><AdminText i18nKey="ordersAdmin.status" fallback="Status" /></span>
                <AdminStatusBadge status={order.status} />
              </div>
              <div style={statusItemStyle}>
                <span style={compactLabelStyle}><AdminText i18nKey="reportsAdmin.payment" fallback="Payment" /></span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
            <div style={actionSummaryStyle}>
              <div style={actionMetricStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.total" fallback="Total" /></span>
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontSize: 12, color: "var(--app-text-muted)" }}>
                    <AdminText i18nKey="orderDetailAdmin.priceExclVat" fallback="Price" />: {formatCurrency(getPriceBreakdown(order.totalPrice).net)}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--app-text-muted)" }}>
                    <AdminText i18nKey="orderDetailAdmin.vatAmount" fallback="VAT (19%)" />: {formatCurrency(getPriceBreakdown(order.totalPrice).vat)}
                  </span>
                  <strong>{formatCurrency(order.totalPrice)}</strong>
                </div>
              </div>
              <div style={actionMetricStyle}>
                <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.contractNumber" fallback="Contract number" /></span>
                <strong>{order.contractNumber || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</strong>
              </div>
            </div>
            <p style={statusHintStyle}>
              <AdminText i18nKey={getStatusHintKey(order.status)} fallback={getStatusHintFallback(order.status)} />
            </p>
            <div style={actionButtonsStyle}>
              <OrderEmailReviewModal
                to={order.email}
                defaultSubject={emailDraft.subject}
                defaultBody={emailDraft.bodyText}
                staticHtml={emailStatic.html}
                attachmentLabels={emailAttachmentLabels}
                canConfirm={canConfirm}
                canResendEmail={canResendEmail}
              />
              {canCancel ? (
                <OrderActionButton
                  intent="cancel"
                  style={quietDangerButtonStyle}
                  confirmKey="orderDetailAdmin.cancelConfirmMessage"
                  confirmFallback={"Mark this order as cancelled?\nThis action cannot be undone."}
                >
                  <AdminText i18nKey="orderDetailAdmin.markCancelled" fallback="Mark as cancelled" />
                </OrderActionButton>
              ) : null}
              <OrderActionButton
                intent="retry-webhook"
                style={technicalButtonStyle}
                pendingKey="orderDetailAdmin.retryingWebhook"
                pendingFallback="Retrying webhook..."
              >
                <AdminText i18nKey="orderDetailAdmin.retryWebhook" fallback="Retry webhook" />
              </OrderActionButton>
              {canCreatePaymentLink ? (
                <OrderActionButton
                  intent="create-payment-link"
                  style={paymentLinkButtonStyle}
                  pendingKey="orderDetailAdmin.creatingPaymentLink"
                  pendingFallback="Creating payment link..."
                >
                  <AdminText i18nKey="orderDetailAdmin.createPaymentLink" fallback="Create payment link" />
                </OrderActionButton>
              ) : null}
            </div>
            <AdminOrderEmailDelivery delivery={order.confirmationEmailDelivery} />
            <OrderActionFeedback />
          </form>

          <div style={splitGridStyle}>
            <article style={itemCardStyle}>
              <div style={{ display: "grid", gap: 10 }}>
                <strong style={{ fontSize: "1.1rem" }}><AdminText i18nKey="orderDetailAdmin.orderSummary" fallback="Order summary" /></strong>
                <div style={subMetaStyle}>
                  <span><AdminKitchenDisplayName slug={order.kitchen.slug} name={order.kitchen.name} /></span>
                  <span><AdminDateTime value={order.createdAt} /></span>
                  <span>
                    <AdminPluralText
                      count={displayItems.length}
                      singularKey="ordersAdmin.itemCountSingular"
                      pluralKey="ordersAdmin.itemCountPlural"
                      singularFallback="{count} item"
                      pluralFallback="{count} items"
                    />
                  </span>
                  {order.contractOrderSequence ? (
                    <span><ContractOrderLabel sequence={order.contractOrderSequence} /></span>
                  ) : null}
                </div>
              </div>

              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.contractOrder" fallback="Contract order" /></span>
                  <span><ContractOrderLabel sequence={order.contractOrderSequence} /></span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.contractAccess" fallback="Contract access" /></span>
                  <span>
                    {order.kitchenContract
                      ? order.kitchenContract.isActive
                        ? <AdminText i18nKey="orderDetailAdmin.linkedReusableActiveContract" fallback="Linked reusable active contract" />
                        : <AdminText i18nKey="orderDetailAdmin.linkedReusableInactiveContract" fallback="Linked reusable inactive contract" />
                      : <AdminText i18nKey="orderDetailAdmin.noLinkedContractRecord" fallback="No linked contract record" />}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.propertyOwner" fallback="Property owner" /></span>
                  <span><OwnerSummary owner={order.kitchenContract?.owner} /></span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="contractsAdmin.project" fallback="Project" /></span>
                  <span>
                    {order.kitchenContract?.project
                      ? order.kitchenContract.project.name
                      : <AdminText i18nKey="orderDetailAdmin.noProjectSelected" fallback="No project selected" />}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="contractsAdmin.propertyObject" fallback="Object/building" /></span>
                  <span>
                    {order.kitchenContract?.project?.propertyObject?.name
                      ? order.kitchenContract.project.propertyObject.name
                      : <AdminText i18nKey="orderDetailAdmin.noObjectSelected" fallback="No object selected" />}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.payment" fallback="Payment" /></span>
                  <span>
                    {order.paymentMethod
                      ? <PaymentMethodText value={order.paymentMethod} />
                      : <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}
                  </span>
                  <div style={{ marginTop: 8 }}><PaymentStatusBadge status={order.paymentStatus} /></div>
                  {order.stripeCheckoutSessionId ? (
                    <span style={stripeMetaStyle}><AdminText i18nKey="orderDetailAdmin.stripeSession" fallback="Stripe session" />: {order.stripeCheckoutSessionId}</span>
                  ) : null}
                </div>
              </div>
            </article>

            <article style={itemCardStyle}>
              <strong style={{ fontSize: "1.1rem" }}><AdminText i18nKey="orderDetailAdmin.customer" fallback="Customer" /></strong>
              <div style={detailGridStyle}>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="kitchenDetailAdmin.name" fallback="Name" /></span>
                  <span>{order.firstName} {order.lastName}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="adminShellLogin.email" fallback="Email" /></span>
                  <a href={`mailto:${order.email}`} style={inlineLinkStyle}>{order.email}</a>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="propertyOwnersAdmin.phone" fallback="Phone" /></span>
                  <a href={`tel:${order.phone}`} style={inlineLinkStyle}>{order.phone}</a>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.address" fallback="Address" /></span>
                  <span>
                    {order.address1}
                    {order.address2 ? `, ${order.address2}` : ""}
                    {`, ${order.postalCode} ${order.city}`}
                    {order.country ? `, ${order.country}` : ""}
                  </span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.preferredDeliveryDate" fallback="Preferred delivery week" /></span>
                  <span>{formatPreferredDeliveryDate(order.preferredDeliveryDate) || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                </div>
                <div>
                  <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.notes" fallback="Notes" /></span>
                  <span>{order.notes || <AdminText i18nKey="orderDetailAdmin.notProvided" fallback="Not provided" />}</span>
                </div>
              </div>
            </article>
          </div>
        </AdminSection>

        {cancellationRequests.length ? (
          <AdminSection
            title={<AdminText i18nKey="orderCancellationsAdmin.panelTitle" fallback="Withdrawal requests" />}
            description={<AdminText i18nKey="orderCancellationsAdmin.panelDescription" fallback="Review the withdrawal declaration and approve or reject it." />}
          >
            <CancellationRequestPanel
              requests={cancellationRequests}
              returnPath={`/admin/orders/${order.id}`}
              showOrderLink={false}
            />
          </AdminSection>
        ) : null}

        <AdminSection
          title={<AdminText i18nKey="orderDetailAdmin.orderItems" fallback="Order items" />}
        >
          <AdminOrderItems order={order} />
        </AdminSection>

      </div>
    </AdminShell>
  );
}

const detailGridStyle = {
  display: "grid",
  gap: 14,
};

const paymentStatusBaseStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "7px 10px",
  border: "1px solid transparent",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};

const paymentStatusPaidStyle = {
  ...paymentStatusBaseStyle,
  color: "#1f6f43",
  background: "rgba(42, 145, 85, 0.12)",
  borderColor: "rgba(42, 145, 85, 0.22)",
};

const paymentStatusPendingStyle = {
  ...paymentStatusBaseStyle,
  color: "#8a5a13",
  background: "rgba(207, 145, 36, 0.12)",
  borderColor: "rgba(207, 145, 36, 0.22)",
};

const paymentStatusFailedStyle = {
  ...paymentStatusBaseStyle,
  color: "var(--app-danger-text)",
  background: "rgba(217, 92, 92, 0.12)",
  borderColor: "rgba(217, 92, 92, 0.22)",
};

const paymentStatusUnpaidStyle = {
  ...paymentStatusBaseStyle,
  color: "var(--app-text-muted)",
  background: "rgba(115, 80, 55, 0.07)",
  borderColor: "rgba(115, 80, 55, 0.12)",
};

const stripeMetaStyle = {
  display: "block",
  marginTop: 8,
  color: "var(--app-text-muted)",
  fontSize: 12,
  overflowWrap: "anywhere",
};

const detailLabelStyle = {
  display: "block",
  marginBottom: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const inlineLinkStyle = {
  color: "var(--app-accent)",
  textDecoration: "none",
};

const actionPanelStyle = {
  display: "grid",
  gap: 14,
  border: "1px solid var(--app-border)",
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,248,242,0.74))",
  padding: 18,
};

const statusRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const statusItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const compactLabelStyle = {
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const actionSummaryStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const actionMetricStyle = {
  display: "grid",
  gap: 6,
  minWidth: 0,
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.78)",
  padding: "12px 14px",
};

const actionButtonsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const statusHintStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.5,
};

const quietDangerButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.22)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
  boxShadow: "none",
};

const technicalButtonStyle = {
  border: "1px solid var(--app-border-strong)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "rgba(255,255,255,0.62)",
  color: "var(--app-text-muted)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
  boxShadow: "none",
};

const paymentLinkButtonStyle = {
  border: "1px solid rgba(42, 145, 85, 0.24)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "rgba(42, 145, 85, 0.1)",
  color: "#1f6f43",
  fontWeight: 800,
  fontSize: "0.98rem",
  cursor: "pointer",
  boxShadow: "none",
};

const paymentLinkPanelStyle = {
  display: "grid",
  gap: 8,
  border: "1px solid rgba(42, 145, 85, 0.24)",
  borderRadius: 12,
  background: "rgba(42, 145, 85, 0.08)",
  color: "var(--app-text)",
  padding: "12px 14px",
};

const paymentLinkAnchorStyle = {
  color: "#1f6f43",
  overflowWrap: "anywhere",
  fontWeight: 800,
};

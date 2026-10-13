import { AdminOrderInformation } from "../../../../components/admin-order-information";
import Link from "next/link";
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
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import {
  AdminDateTime,
  AdminKitchenDisplayName,
  AdminLocalizedName,
  AdminPluralText,
  AdminStatusBadge,
  AdminText,
} from "../../../../components/admin-i18n";
import { OrderActionButton, OrderActionFeedback } from "../../../../components/admin-order-action-buttons";
import { AdminOrderEmailDelivery } from "../../../../components/admin-order-email-delivery";
import { attachOrderEmailDelivery } from "../../../../lib/email/order-email-store";
import { OrderEmailReviewModal } from "../../../../components/order-email-review-modal";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requirePxAdminPage } from "../../../../lib/admin-role-guards";
import { getTestOrderById } from "../../../../lib/catalog";
import { getPriceBreakdown } from "../../../../lib/price-utils";
import { buildOrderConfirmationAttachmentLabels, buildOrderConfirmationEmailDraft, buildOrderConfirmationEmailStaticHtml } from "../../../../lib/email/order-notifications";
import {
  mergeSinkAndWorktopItems,
  SINK_AND_WORKTOP_CODE,
  SINK_AND_WORKTOP_NAME,
  SINK_AND_WORKTOP_NAME_DE,
} from "../../../../lib/order-item-display";
import { buildOrderForNotifications } from "../../../../lib/orders";

export const dynamic = "force-dynamic";

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function PaymentMethodText({ value }) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "-";
  if (normalized === "card" || normalized === "visa" || normalized === "mastercard") {
    return <AdminText i18nKey="pxOrdersAdmin.card" fallback="Card" />;
  }
  return value;
}

function PaymentStatusBadge({ status }) {
  const value = String(status || "UNPAID").toUpperCase();
  const tone = value === "PAID" ? "#1f6f43" : value === "PENDING" ? "#8a5a13" : value === "UNPAID" ? "var(--app-text-muted)" : "var(--app-danger-text)";
  return (
    <span style={{ ...paymentStatusStyle, color: tone }}>
      <AdminText i18nKey={`reportsAdmin.paymentStatus.${value.toLowerCase()}`} fallback={value} />
    </span>
  );
}

function ItemTypeLabel({ type }) {
  if (type === "COMPONENT") return <AdminText i18nKey="orderDetailAdmin.itemTypeComponent" fallback="Component" />;
  if (type === "ACCESSORY") return <AdminText i18nKey="orderDetailAdmin.itemTypeAccessory" fallback="Accessory" />;
  if (type === "SERVICE") return <AdminText i18nKey="orderDetailAdmin.itemTypeService" fallback="Service" />;
  return type || "-";
}

export default async function AdminPxOrderDetailPage({ params, searchParams }) {
  const admin = await requirePxAdminPage();
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const [order] = await attachOrderEmailDelivery([await getTestOrderById(id)], "test");

  if (!order) {
    return (
      <AdminShell adminEmail={admin.email}>
        <div style={pageGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="pxOrdersAdmin.orderNotFound" fallback="PX order not found" />}
            description={<AdminText i18nKey="pxOrdersAdmin.requestedOrderDoesNotExist" fallback="The requested PX order does not exist." />}
          >
            <ActionLink href="/admin/px-orders">
              <AdminText i18nKey="pxOrdersAdmin.backToOrders" fallback="Back to PX orders" />
            </ActionLink>
          </AdminSection>
        </div>
      </AdminShell>
    );
  }

  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const paymentLink = getFormMessage(resolvedSearchParams, "paymentLink");
  const canConfirm = order.status === OrderStatus.NEW;
  const canResendEmail = order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.EMAILED;
  const canCancel = order.status !== OrderStatus.CANCELLED;
  const canCreatePaymentLink =
    order.status !== OrderStatus.CANCELLED &&
    String(order.paymentStatus || "UNPAID").toUpperCase() !== "PAID";
  const notificationOrder = buildOrderForNotifications(order);
  const emailDraft = buildOrderConfirmationEmailDraft(notificationOrder);
  const emailStatic = await buildOrderConfirmationEmailStaticHtml(notificationOrder);
  const emailAttachmentLabels = await buildOrderConfirmationAttachmentLabels(notificationOrder, emailStatic.attachmentLinks, {
    orderApiPath: `/api/admin/px-orders/${encodeURIComponent(order.id)}`,
  });
  const displayItems = mergeSinkAndWorktopItems(order.items || [], (sinkItem, worktopItem) => ({
    ...sinkItem,
    id: `${sinkItem.id}-with-${worktopItem.id}`,
    code: SINK_AND_WORKTOP_CODE,
    nameSnapshot: SINK_AND_WORKTOP_NAME,
    nameDeSnapshot: SINK_AND_WORKTOP_NAME_DE,
    priceSnapshot: Number(sinkItem.priceSnapshot || 0) + Number(worktopItem.priceSnapshot || 0),
    quantity: 1,
  }));

  return (
    <AdminShell adminEmail={admin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="pxOrdersAdmin.orderTitle" fallback="PX order {orderNumber}" values={{ orderNumber: order.orderNumber }} />}
          actions={(
            <div style={actionRowStyle}>
              <ActionLink href="/admin/px-orders">
                <AdminText i18nKey="pxOrdersAdmin.backToOrders" fallback="Back to PX orders" />
              </ActionLink>
              <ActionLink href={`/kitchens/${order.kitchen.slug}`}>
                <AdminText i18nKey="orderDetailAdmin.viewKitchen" fallback="View kitchen" />
              </ActionLink>
            </div>
          )}
        >
          {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
          {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}
          {paymentLink ? (
            <div style={paymentLinkPanelStyle}>
              <strong><AdminText i18nKey="pxOrdersAdmin.testPaymentLink" fallback="PX test payment link" /></strong>
              <a href={paymentLink} target="_blank" rel="noreferrer" style={paymentLinkAnchorStyle}>{paymentLink}</a>
            </div>
          ) : null}

          <form action={`/api/admin/px-orders/${order.id}`} method="post" style={actionPanelStyle}>
            <strong><AdminText i18nKey="orderDetailAdmin.orderActions" fallback="Order actions" /></strong>
            <p style={hintStyle}>
              <AdminText
                i18nKey="pxOrdersAdmin.testModeHint"
                fallback="PX orders use Stripe test mode and send customer confirmation email, but do not call n8n/webhook."
              />
            </p>
            <div style={buttonRowStyle}>
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
                  style={dangerButtonStyle}
                  confirmKey="pxOrdersAdmin.cancelConfirm"
                  confirmFallback={"Mark this PX order as cancelled?\nThis action cannot be undone."}
                >
                  <AdminText i18nKey="orderDetailAdmin.markCancelled" fallback="Mark as cancelled" />
                </OrderActionButton>
              ) : null}
              {canCreatePaymentLink ? (
                <OrderActionButton
                  intent="create-payment-link"
                  style={paymentButtonStyle}
                  pendingKey="pxOrdersAdmin.creatingTestPaymentLink"
                  pendingFallback="Creating test payment link..."
                >
                  <AdminText i18nKey="pxOrdersAdmin.createTestPaymentLink" fallback="Create test payment link" />
                </OrderActionButton>
              ) : null}
              <OrderActionButton
                intent="delete"
                style={dangerButtonStyle}
                confirmKey="pxOrdersAdmin.deleteConfirm"
                confirmFallback={"Delete this PX order?\nThis action cannot be undone."}
              >
                <AdminText i18nKey="ordersAdmin.delete" fallback="Delete" />
              </OrderActionButton>
            </div>
            <details style={{ borderTop: "1px solid var(--app-border)", paddingTop: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}><AdminText i18nKey="orderDetailAdmin.emailDelivery" fallback="Email delivery" /></summary>
              <div style={{ marginTop: 12 }}><AdminOrderEmailDelivery delivery={order.confirmationEmailDelivery} /></div>
            </details>
            <OrderActionFeedback />
          </form>

          <AdminOrderInformation order={order} itemCount={displayItems.length} showAs400={false} />
        </AdminSection>

        <AdminSection title={<AdminText i18nKey="pxOrdersAdmin.orderItems" fallback="PX order items" />}>
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.item" fallback="Item" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.type" fallback="Type" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.itemCode" fallback="Item code" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.quantity" fallback="Quantity" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.unitPrice" fallback="Unit price" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.lineTotal" fallback="Line total" /></th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item) => {
                  const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
                  const unitPrice = Number(item.priceSnapshot || 0);
                  return (
                    <tr key={item.id}>
                      <td style={tdStyle}>
                        <AdminLocalizedName
                          name={item.nameSnapshot || item.name || item.code}
                          nameDe={item.nameDeSnapshot || item.nameDe || item.kitchenItem?.nameDe || ""}
                          as="strong"
                        />
                      </td>
                      <td style={tdStyle}><ItemTypeLabel type={item.itemType} /></td>
                      <td style={tdStyle}>{item.code}</td>
                      <td style={tdStyle}>{quantity}</td>
                      <td style={tdStyle}>{formatCurrency(unitPrice)}</td>
                      <td style={tdStyle}>{formatCurrency(unitPrice * quantity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminShell>
  );
}

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

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const metricStyle = {
  display: "grid",
  gap: 6,
  border: "1px solid var(--app-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.78)",
  padding: "12px 14px",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  color: "var(--app-text-muted)",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const paymentStatusStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "7px 10px",
  border: "1px solid var(--app-border)",
  background: "rgba(255,255,255,0.72)",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const hintStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 14,
  fontWeight: 700,
};

const buttonRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const dangerButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.22)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "rgba(255,255,255,0.72)",
  color: "var(--app-danger-text)",
  fontWeight: 700,
  fontSize: "0.98rem",
  cursor: "pointer",
};

const paymentButtonStyle = {
  border: "1px solid rgba(42, 145, 85, 0.24)",
  borderRadius: 14,
  minHeight: 50,
  padding: "13px 18px",
  background: "rgba(42, 145, 85, 0.1)",
  color: "#1f6f43",
  fontWeight: 800,
  fontSize: "0.98rem",
  cursor: "pointer",
};

const paymentLinkPanelStyle = {
  display: "grid",
  gap: 8,
  border: "1px solid rgba(42, 145, 85, 0.24)",
  borderRadius: 12,
  background: "rgba(42, 145, 85, 0.08)",
  padding: "12px 14px",
};

const paymentLinkAnchorStyle = {
  color: "#1f6f43",
  overflowWrap: "anywhere",
  fontWeight: 800,
};

const detailGridStyle = {
  display: "grid",
  gap: 14,
};

const inlineLinkStyle = {
  color: "var(--app-accent)",
  textDecoration: "none",
};

const wrapStyle = {
  overflowWrap: "anywhere",
};

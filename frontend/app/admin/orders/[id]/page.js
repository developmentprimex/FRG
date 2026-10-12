import { AdminOrderInformation } from "../../../../components/admin-order-information";
import { prisma as processingDb } from "../../../../lib/prisma";
import { attachWorkProcessing } from "../../../../lib/work-processing";
import { AdminWorkPanel } from "../../../../components/admin-work-panel";
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
import { CancellationRequestPanel } from "../../../../components/admin-order-cancellation-panel";
import { OrderEmailReviewModal } from "../../../../components/order-email-review-modal";
import { AdminOrderEmailDelivery } from "../../../../components/admin-order-email-delivery";
import { attachOrderEmailDelivery } from "../../../../lib/email/order-email-store";
import { getFormMessage } from "../../../../lib/admin-forms";
import { requireAdminPage } from "../../../../lib/auth";
import { getCancellationRequestsForOrder } from "../../../../lib/order-cancellations";
import { getOrderById } from "../../../../lib/catalog";
import { getPriceBreakdown } from "../../../../lib/price-utils";
import { buildOrderConfirmationAttachmentLabels, buildOrderConfirmationEmailDraft, buildOrderConfirmationEmailStaticHtml } from "../../../../lib/email/order-notifications";
import { mergeSinkAndWorktopItems, SINK_AND_WORKTOP_CODE, SINK_AND_WORKTOP_NAME, SINK_AND_WORKTOP_NAME_DE } from "../../../../lib/order-item-display";
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

function getOrderItemPriceParts(item) {
  const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
  const totalUnitPrice = Number(item.priceSnapshot || 0);
  const blendeUnitPrice = item.kitchenItem?.blendePrice == null ? 0 : Number(item.kitchenItem.blendePrice || 0);
  const blendeQuantity = item.kitchenItem?.catalogBlendeId
    ? Math.max(1, Math.floor(Number(item.kitchenItem.catalogBlendeQuantity || 1)))
    : 0;
  const blendeUnitTotal = blendeUnitPrice * blendeQuantity;
  const articleUnitPrice = Math.max(totalUnitPrice - blendeUnitTotal, 0);

  return {
    quantity,
    articleUnitPrice,
    blendeCode: item.kitchenItem?.blendeCode || "",
    blendeUnitPrice,
    blendeQuantity,
    blendeUnitTotal,
    totalUnitPrice,
    lineTotal: totalUnitPrice * quantity,
  };
}

function getOrderItemNameFields(item) {
  return {
    name: item.nameSnapshot || item.name || item.kitchenItem?.name || item.code || "",
    nameDe: item.nameDeSnapshot || item.nameDe || item.kitchenItem?.nameDe || "",
  };
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
  const [order] = await attachWorkProcessing(processingDb, await attachOrderEmailDelivery([await getOrderById(id)]), "ORDER");

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
  const displayItems = mergeSinkAndWorktopItems(order.items || [], (sinkItem, worktopItem) => ({
    ...sinkItem,
    id: `${sinkItem.id}-with-${worktopItem.id}`,
    code: SINK_AND_WORKTOP_CODE,
    nameSnapshot: SINK_AND_WORKTOP_NAME,
    nameDeSnapshot: SINK_AND_WORKTOP_NAME_DE,
    priceSnapshot: Number(sinkItem.priceSnapshot || 0) + Number(worktopItem.priceSnapshot || 0),
    quantity: 1,
  }));
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

          <AdminWorkPanel item={order} compact />
          <form action={`/api/admin/orders/${order.id}`} method="post" style={actionPanelStyle}>
            <strong><AdminText i18nKey="orderDetailAdmin.orderActions" fallback="Order actions" /></strong>
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
            <details style={{ borderTop: "1px solid var(--app-border)", paddingTop: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}><AdminText i18nKey="orderDetailAdmin.emailDelivery" fallback="Email delivery" /></summary>
              <div style={{ marginTop: 12 }}><AdminOrderEmailDelivery delivery={order.confirmationEmailDelivery} /></div>
            </details>
            <OrderActionFeedback />
          </form>

          <AdminOrderInformation order={order} itemCount={displayItems.length} as400Saved={as400Saved} />
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
          <div className="admin-order-items-table" style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.item" fallback="Item" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.type" fallback="Type" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.itemCode" fallback="Item code" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.quantity" fallback="Quantity" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.articlePrice" fallback="Article price" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.blende" fallback="Blende" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.unitPrice" fallback="Unit price" /></th>
                  <th style={thStyle}><AdminText i18nKey="orderDetailAdmin.lineTotal" fallback="Line total" /></th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item) => {
                  const priceParts = getOrderItemPriceParts(item);
                  const itemName = getOrderItemNameFields(item);

                  return (
                    <tr key={item.id}>
                      <td style={tdStyle}>
                        <AdminLocalizedName name={itemName.name} nameDe={itemName.nameDe} as="strong" />
                      </td>
                      <td style={tdStyle}><ItemTypeLabel type={item.itemType} /></td>
                      <td style={tdStyle}>{item.code}</td>
                      <td style={tdStyle}>{priceParts.quantity}</td>
                      <td style={tdStyle}>{formatCurrency(priceParts.articleUnitPrice)}</td>
                      <td style={tdStyle}>
                        {priceParts.blendeCode
                          ? `${priceParts.blendeCode}: ${formatCurrency(priceParts.blendeUnitPrice)} x ${priceParts.blendeQuantity} = ${formatCurrency(priceParts.blendeUnitTotal)}`
                          : "-"}
                      </td>
                      <td style={tdStyle}>{formatCurrency(priceParts.totalUnitPrice)}</td>
                      <td style={tdStyle}>{formatCurrency(priceParts.lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="admin-order-items-cards" style={{ display: "none", gap: 12 }}>
            {displayItems.map((item) => {
              const priceParts = getOrderItemPriceParts(item);
              const itemName = getOrderItemNameFields(item);

              return (
                <article key={item.id} style={mobileItemCardStyle}>
                  <AdminLocalizedName name={itemName.name} nameDe={itemName.nameDe} as="strong" />
                  <div style={subMetaStyle}>
                    <span><ItemTypeLabel type={item.itemType} /></span>
                    <span>{item.code}</span>
                  </div>
                  <div style={mobileItemGridStyle}>
                    <div>
                      <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.quantity" fallback="Quantity" /></span>
                      <span>{priceParts.quantity}</span>
                    </div>
                    <div>
                      <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.articlePrice" fallback="Article price" /></span>
                      <span>{formatCurrency(priceParts.articleUnitPrice)}</span>
                    </div>
                    <div>
                      <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.blende" fallback="Blende" /></span>
                      <span>{priceParts.blendeCode ? `${priceParts.blendeCode}: ${formatCurrency(priceParts.blendeUnitTotal)}` : "-"}</span>
                    </div>
                    <div>
                      <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.unitPrice" fallback="Unit price" /></span>
                      <span>{formatCurrency(priceParts.totalUnitPrice)}</span>
                    </div>
                    <div>
                      <span style={detailLabelStyle}><AdminText i18nKey="orderDetailAdmin.lineTotal" fallback="Line total" /></span>
                      <strong>{formatCurrency(priceParts.lineTotal)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <style>{`
            .admin-order-items-cards {
              display: none;
            }

            button:focus-visible,
            a:focus-visible {
              outline: 3px solid rgba(143, 62, 44, 0.24);
              outline-offset: 2px;
            }

            @media (max-width: 760px) {
              .admin-order-items-table {
                display: none;
              }

              .admin-order-items-cards {
                display: grid !important;
              }
            }
          `}</style>
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

const mobileItemCardStyle = {
  ...itemCardStyle,
  padding: 16,
};

const mobileItemGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
};

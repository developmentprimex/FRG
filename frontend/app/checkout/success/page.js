import Link from "next/link";
import JourneyStepTracker from "../../../components/journey-step-tracker";
import { redirect } from "next/navigation";
import { ItemType } from "@prisma/client";
import { getStripeClient } from "../../../lib/stripe";
import { getPaymentStatusLabel, updateOrderFromCheckoutSession } from "../../../lib/stripe-payments";
import { prisma } from "../../../lib/prisma";
import { getOrderDelegate, getOrderKindForContractNumber, isTestOrderKind } from "../../../lib/order-kind";
import { mergeSinkAndWorktopItems, SINK_AND_WORKTOP_CODE, SINK_AND_WORKTOP_NAME } from "../../../lib/order-item-display";
import { getPriceBreakdown } from "../../../lib/price-utils";

export const dynamic = "force-dynamic";

const HIDDEN_RECEIPT_COMPONENT_CODES = new Set([
  "OVEN-B-600-HOB",
  SINK_AND_WORKTOP_CODE,
  "SINKBASE-B-600",
]);

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPaymentMethod(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "card" || normalized === "visa" || normalized === "mastercard") return "Card";
  if (normalized === "paypal") return "PayPal";
  if (normalized === "klarna") return "Klarna";
  return value || "Card";
}

function getStatusCopy(status) {
  const value = String(status || "UNPAID").toUpperCase();
  if (value === "PAID") {
    return {
      title: "Payment confirmed",
      intro: "Thank you. Your payment was confirmed and your order has been received.",
      tone: "success",
      nextStep: "Our team will review the order and send the final confirmation.",
    };
  }
  if (value === "PENDING") {
    return {
      title: "Payment is processing",
      intro: "Thank you. We received your order and the payment is still processing.",
      tone: "pending",
      nextStep: "We will update the order once the payment clears.",
    };
  }
  if (value === "FAILED" || value === "CANCELLED") {
    return {
      title: "Payment was not completed",
      intro: "The order was saved, but the payment was not completed.",
      tone: "failed",
      nextStep: "You can return to the kitchen page and start the payment again.",
    };
  }
  return {
    title: "Order received",
    intro: "Your order has been received. We could not confirm the final payment status yet.",
    tone: "pending",
    nextStep: "Please keep the order number for reference.",
  };
}

function getBadgeStyle(tone) {
  if (tone === "success") return { ...badgeStyle, ...successBadgeStyle };
  if (tone === "failed") return { ...badgeStyle, ...failedBadgeStyle };
  return { ...badgeStyle, ...pendingBadgeStyle };
}

function buildBlendeReceiptItem(item) {
  const blendeLabel = String(item?.kitchenItem?.blendeLabel || item?.blendeLabel || "").trim();
  if (!blendeLabel) return null;

  const blendeCode = String(item?.kitchenItem?.blendeCode || item?.blendeCode || blendeLabel).trim();
  const blendePrice = item?.kitchenItem?.blendePrice != null
    ? Number(item.kitchenItem.blendePrice)
    : Number(item?.blendePrice || 0);

  return {
    ...item,
    id: `${item.id || item.code}-blende`,
    code: blendeCode || "BLENDE",
    nameSnapshot: `Blende ${blendeLabel}`,
    priceSnapshot: blendePrice,
    quantity: 1,
    kitchenItem: null,
  };
}

function expandReceiptItemsWithBlende(items = []) {
  return items.flatMap((item) => {
    const blendeItem = buildBlendeReceiptItem(item);
    if (!blendeItem) return [item];

    const blendePrice = Number(blendeItem.priceSnapshot || 0);
    const itemPrice = Number(item?.priceSnapshot || 0);
    const parentItem = {
      ...item,
      priceSnapshot: Math.max(itemPrice - blendePrice, 0),
    };

    return [parentItem, blendeItem];
  });
}

function isVisibleReceiptItem(item) {
  if (item?.itemType !== ItemType.COMPONENT) return true;
  return !HIDDEN_RECEIPT_COMPONENT_CODES.has(String(item?.code || "").trim().toUpperCase());
}

async function findStripeSession({ sessionId, orderNumber, stripeMode }) {
  const stripe = getStripeClient(stripeMode);
  if (!stripe) return null;

  if (sessionId && sessionId !== "{CHECKOUT_SESSION_ID}") {
    return stripe.checkout.sessions.retrieve(sessionId);
  }

  if (!orderNumber) return null;

  const sessions = await stripe.checkout.sessions.list({ limit: 20 });
  return sessions.data.find((candidate) =>
    candidate.client_reference_id === orderNumber ||
    candidate.metadata?.orderNumber === orderNumber
  ) || null;
}

async function getOrderForReceipt({ orderNumber, sessionId, orderKind }) {
  const filters = [];
  if (orderNumber) filters.push({ orderNumber });
  if (sessionId && sessionId !== "{CHECKOUT_SESSION_ID}") filters.push({ stripeCheckoutSessionId: sessionId });
  if (!filters.length) return null;

  return getOrderDelegate(prisma, orderKind).findFirst({
    where: { OR: filters },
    include: {
      kitchen: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: { kitchenItem: true },
      },
    },
  });
}

function Detail({ label, children }) {
  if (!children) return null;

  return (
    <div style={detailStyle}>
      <dt style={detailLabelStyle}>{label}</dt>
      <dd style={detailValueStyle}>{children}</dd>
    </div>
  );
}

function ItemSection({ title, items }) {
  if (!items.length) return null;

  return (
    <section style={itemSectionStyle}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      <div style={itemListStyle}>
        {items.map((item) => (
          <div key={item.id || `${item.itemType}-${item.code}`} style={itemRowStyle}>
            <div style={{ minWidth: 0 }}>
              <strong style={itemNameStyle}>{item.nameSnapshot}</strong>
              <span style={itemCodeStyle}>{item.code}</span>
            </div>
            <span style={itemPriceStyle}>{formatCurrency(Number(item.priceSnapshot) * Number(item.quantity || 1))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function CheckoutSuccessPage({ searchParams }) {
  const params = (await searchParams) || {};
  const orderNumber = String(params.order || "").trim();
  const sessionId = String(params.session_id || "").trim();
  const orderKind = getOrderKindForContractNumber(orderNumber);
  const stripeMode = isTestOrderKind(orderKind) ? "test" : "live";

  try {
    const session = await findStripeSession({ sessionId, orderNumber, stripeMode });
    if (session) {
      await updateOrderFromCheckoutSession(session, { orderKind });
    }
  } catch (error) {
    console.error("Could not confirm Stripe checkout session:", error);
  }

  if (orderNumber || sessionId) {
    const redirectParams = new URLSearchParams({ orderConfirmed: "1" });
    if (orderNumber) redirectParams.set("order", orderNumber);
    redirect(`/?${redirectParams.toString()}`);
  }

  const order = await getOrderForReceipt({ orderNumber, sessionId, orderKind });
  const effectiveStatus = order?.paymentStatus || "PENDING";
  const statusCopy = getStatusCopy(effectiveStatus);
  const totalLabel = String(effectiveStatus || "").toUpperCase() === "PAID" ? "Total paid" : "Order total";
  const displayItems = mergeSinkAndWorktopItems(order?.items || [], (sinkItem, worktopItem) => ({
    ...sinkItem,
    id: `${sinkItem.id}-with-${worktopItem.id}`,
    code: SINK_AND_WORKTOP_CODE,
    nameSnapshot: SINK_AND_WORKTOP_NAME,
    priceSnapshot: Number(sinkItem.priceSnapshot || 0) + Number(worktopItem.priceSnapshot || 0),
    quantity: 1,
  }));
  const receiptItems = expandReceiptItemsWithBlende(displayItems).filter(isVisibleReceiptItem);
  const componentItems = receiptItems.filter((item) => item.itemType === ItemType.COMPONENT);
  const accessoryItems = receiptItems.filter((item) => item.itemType === ItemType.ACCESSORY);
  const serviceItems = receiptItems.filter((item) => item.itemType === ItemType.SERVICE);
  const kitchenHref = order?.kitchen?.slug
    ? {
        pathname: `/kitchens/${order.kitchen.slug}`,
        query: {
          order: order.orderNumber,
          ...(order.contractNumber ? { contractNumber: order.contractNumber } : {}),
        },
      }
    : "/";
  const address = order
    ? [order.address1, order.address2, `${order.postalCode} ${order.city}`.trim(), order.country].filter(Boolean).join(", ")
    : "";

  return (
    <main style={pageStyle}>
      <JourneyStepTracker step="checkout_return" />
      <section style={shellStyle}>
        <div style={headerStyle}>
          <span style={getBadgeStyle(statusCopy.tone)}>{getPaymentStatusLabel(effectiveStatus)}</span>
          <h1 style={titleStyle}>{statusCopy.title}</h1>
          <p style={introStyle}>{statusCopy.intro}</p>
        </div>

        {order ? (
          <>
            <section style={summaryGridStyle} aria-label="Order summary">
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Order number</span>
                <strong style={summaryValueStyle}>{order.orderNumber}</strong>
              </div>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>{totalLabel}</span>
                <strong style={summaryValueStyle}>{formatCurrency(order.totalPrice)}</strong>
              </div>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Payment method</span>
                <strong style={summaryValueStyle}>{formatPaymentMethod(order.paymentMethod)}</strong>
              </div>
              <div style={summaryCardStyle}>
                <span style={summaryLabelStyle}>Order date</span>
                <strong style={summaryValueStyle}>{formatDateTime(order.createdAt)}</strong>
              </div>
            </section>

            <section style={panelStyle}>
              <h2 style={sectionTitleStyle}>Receipt details</h2>
              <dl style={detailGridStyle}>
                <Detail label="Kitchen">{order.kitchen?.name}</Detail>
                <Detail label="Contract number">{order.contractNumber}</Detail>
                <Detail label="Customer">{`${order.firstName} ${order.lastName}`}</Detail>
                <Detail label="Email">{order.email}</Detail>
                <Detail label="Phone">{order.phone}</Detail>
                <Detail label="Order / billing address">{address}</Detail>
                <Detail label="Next step">{statusCopy.nextStep}</Detail>
              </dl>
            </section>

            <section style={panelStyle}>
              <ItemSection title="Components" items={componentItems} />
              <ItemSection title="Accessories" items={accessoryItems} />
              <ItemSection title="Services" items={serviceItems} />
              <div style={{ ...totalRowStyle, flexDirection: "column", alignItems: "stretch", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 400, fontSize: "0.9rem" }}>
                  <span>Price</span>
                  <span>{formatCurrency(getPriceBreakdown(order.totalPrice).net)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 400, fontSize: "0.9rem" }}>
                  <span>VAT (19%)</span>
                  <span>{formatCurrency(getPriceBreakdown(order.totalPrice).vat)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Total</span>
                  <strong>{formatCurrency(order.totalPrice)}</strong>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section style={panelStyle}>
            <h2 style={sectionTitleStyle}>Order details unavailable</h2>
            <p style={introStyle}>
              We could not load the saved order details. Please keep this reference:
              {" "}
              <strong>{orderNumber || sessionId || "payment checkout"}</strong>.
            </p>
          </section>
        )}

        <div style={actionRowStyle}>
          <Link href={kitchenHref} style={primaryLinkStyle}>Back to kitchen</Link>
          {order ? (
            <Link href={`/widerruf?lang=en${order.contractNumber ? `&contract=${encodeURIComponent(order.contractNumber)}` : ""}`} style={withdrawalLinkStyle}>
              Withdraw from contract
            </Link>
          ) : null}
          <Link href="/" style={secondaryLinkStyle}>Back to Fragmento</Link>
        </div>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f7f2ec",
  padding: "48px 20px",
};

const shellStyle = {
  width: "min(980px, 100%)",
  margin: "0 auto",
  display: "grid",
  gap: 18,
};

const headerStyle = {
  display: "grid",
  gap: 10,
};

const titleStyle = {
  margin: 0,
  color: "#1f1d1a",
  fontSize: "clamp(2rem, 4vw, 3.4rem)",
  lineHeight: 1.05,
  letterSpacing: 0,
};

const introStyle = {
  margin: 0,
  color: "#5d5146",
  fontSize: "1rem",
  lineHeight: 1.6,
};

const badgeStyle = {
  display: "inline-flex",
  width: "fit-content",
  borderRadius: 999,
  padding: "8px 12px",
  border: "1px solid transparent",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const successBadgeStyle = {
  color: "#1f6f43",
  background: "rgba(42, 145, 85, 0.12)",
  borderColor: "rgba(42, 145, 85, 0.22)",
};

const pendingBadgeStyle = {
  color: "#8a5a13",
  background: "rgba(207, 145, 36, 0.12)",
  borderColor: "rgba(207, 145, 36, 0.22)",
};

const failedBadgeStyle = {
  color: "#9d2f28",
  background: "rgba(217, 92, 92, 0.12)",
  borderColor: "rgba(217, 92, 92, 0.22)",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
};

const summaryCardStyle = {
  display: "grid",
  gap: 6,
  border: "1px solid rgba(107, 79, 58, 0.14)",
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.82)",
  padding: "14px 16px",
};

const summaryLabelStyle = {
  color: "#6b6259",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const summaryValueStyle = {
  color: "#2f2a24",
  fontSize: "1rem",
  overflowWrap: "anywhere",
};

const panelStyle = {
  display: "grid",
  gap: 14,
  border: "1px solid rgba(107, 79, 58, 0.14)",
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.78)",
  padding: 18,
};

const sectionTitleStyle = {
  margin: 0,
  color: "#2f2a24",
  fontSize: "1rem",
  lineHeight: 1.3,
};

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 14,
  margin: 0,
};

const detailStyle = {
  minWidth: 0,
};

const detailLabelStyle = {
  margin: "0 0 5px",
  color: "#6b6259",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const detailValueStyle = {
  margin: 0,
  color: "#2f2a24",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
};

const itemSectionStyle = {
  display: "grid",
  gap: 10,
};

const itemListStyle = {
  display: "grid",
  gap: 8,
};

const itemRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
  border: "1px solid rgba(107, 79, 58, 0.1)",
  borderRadius: 8,
  padding: "10px 12px",
  background: "rgba(255, 255, 255, 0.72)",
};

const itemNameStyle = {
  display: "block",
  color: "#2f2a24",
  overflowWrap: "anywhere",
};

const itemCodeStyle = {
  display: "block",
  marginTop: 3,
  color: "#6b6259",
  fontSize: 12,
  fontWeight: 700,
};

const itemPriceStyle = {
  color: "#2f2a24",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const totalRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  borderTop: "1px solid rgba(107, 79, 58, 0.16)",
  paddingTop: 14,
  color: "#2f2a24",
  fontSize: "1.05rem",
  fontWeight: 900,
};

const actionRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const primaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  borderRadius: 8,
  padding: "10px 16px",
  background: "#2f9251",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 900,
};

const secondaryLinkStyle = {
  ...primaryLinkStyle,
  background: "rgba(255, 255, 255, 0.86)",
  color: "#5d5146",
  border: "1px solid rgba(107, 79, 58, 0.14)",
};

const withdrawalLinkStyle = {
  ...secondaryLinkStyle,
  borderColor: "rgba(119, 61, 45, 0.38)",
  color: "#773d2d",
};

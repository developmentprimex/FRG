import { NextResponse } from "next/server";
import { createOrderFromSubmission } from "../../../lib/orders";
import { isTestOrderKind } from "../../../lib/order-kind";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";
import { createCheckoutSessionForOrder } from "../../../lib/stripe-payments";
import { isStripeConfigured } from "../../../lib/stripe";
import { safelySaveJourneyEvent } from "../../../lib/visit-journey-server.js";

function getRequestOrigin(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
}

function buildCheckoutCancelUrl({ request, origin, order, kitchenSlug }) {
  const fallbackUrl = new URL(`/kitchens/${encodeURIComponent(kitchenSlug)}`, origin);
  const referer = request.headers.get("referer");
  let cancelUrl = fallbackUrl;

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (
        refererUrl.origin === origin &&
        refererUrl.pathname === `/kitchens/${kitchenSlug}`
      ) {
        cancelUrl = refererUrl;
      }
    } catch {
      cancelUrl = fallbackUrl;
    }
  }

  cancelUrl.searchParams.set("checkout", "cancelled");
  cancelUrl.searchParams.set("order", order.orderNumber);
  if (!cancelUrl.searchParams.get("contractNumber") && order.customer.contractNumber) {
    cancelUrl.searchParams.set("contractNumber", order.customer.contractNumber);
  }

  return cancelUrl.toString();
}

async function createCheckoutSession({ request, order, kitchenSlug, journeySessionId }) {
  const origin = getRequestOrigin(request);
  const cancelUrl = buildCheckoutCancelUrl({ request, origin, order, kitchenSlug });
  const stripeMode = isTestOrderKind(order.orderKind) ? "test" : "live";

  if (!isStripeConfigured(stripeMode)) {
    return null;
  }

  return createCheckoutSessionForOrder({
    order: {
      ...order,
      totalPrice: order.total,
      email: order.customer.email,
      paymentMethod: order.customer.paymentMethod,
    },
    origin,
    cancelUrl,
    stripeMode,
    orderKind: order.orderKind,
    journeySessionId,
  });
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`orders:${clientIp}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const order = await createOrderFromSubmission({
      kitchenSlug: body.kitchen_slug,
      orderPayload: body.order_payload,
      pdfBase64: body.pdf_base64,
      pdfFilename: body.pdf_filename,
    });
    const journeySessionId = await safelySaveJourneyEvent({ request, step: "order_created", path: "/api/orders",
      id: `order:${order.orderKind}:${order.orderNumber}:created`,
      contractNumber: order.customer.contractNumber, isTest: isTestOrderKind(order.orderKind),
    });
    const checkoutSession = await createCheckoutSession({
      request,
      order,
      kitchenSlug: body.kitchen_slug,
      journeySessionId,
    });

    if (checkoutSession) await safelySaveJourneyEvent({ request, step: "checkout_created", path: "/api/orders",
      id: `checkout:${checkoutSession.id}`,
    });
    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderKind: order.orderKind,
      checkoutUrl: checkoutSession?.url || null,
      notifications: order.notifications || null,
    });
  } catch (error) {
    console.error("Order submission failed:", error);
    return NextResponse.json(
      { error: error.message || "Order submission failed" },
      { status: error.status || 400 },
    );
  }
}

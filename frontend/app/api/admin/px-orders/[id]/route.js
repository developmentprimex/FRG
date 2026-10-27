import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { getTestOrderById } from "../../../../../lib/catalog";
import { confirmOrder, deleteOrder, resendOrderEmail, updateOrderStatus } from "../../../../../lib/orders";
import { cancelOrderPayment, createCheckoutSessionForOrder } from "../../../../../lib/stripe-payments";

const TEST_ORDER_KIND = "test";
const TEST_STRIPE_MODE = "test";

function getRequestOrigin(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

function buildAdminPaymentCancelUrl({ request, order }) {
  const origin = getRequestOrigin(request);
  const cancelUrl = new URL(`/kitchens/${encodeURIComponent(order.kitchen.slug)}`, origin);
  cancelUrl.searchParams.set("checkout", "cancelled");
  cancelUrl.searchParams.set("order", order.orderNumber);
  if (order.contractNumber) {
    cancelUrl.searchParams.set("contractNumber", order.contractNumber);
  }
  return cancelUrl.toString();
}

function parseEmailExcludedAttachments(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const order = await getTestOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "PX order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let returnPath = `/admin/px-orders/${id}`;
  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "status");
    const status = String(formData.get("status") || "");
    const emailSubject = String(formData.get("emailSubject") || "");
    const emailBody = String(formData.get("emailBody") || "");
    const excludedAttachmentKeys = parseEmailExcludedAttachments(formData.get("emailExcludedAttachments"));
    const emailOverrides = { subject: emailSubject, bodyText: emailBody, excludedAttachmentKeys, orderKind: TEST_ORDER_KIND };

    if (intent === "resend-email") {
      await resendOrderEmail(id, emailOverrides);
      return redirectWithFlash(request, `/admin/px-orders/${id}`, "success", "PX confirmation email sent.");
    }

    if (intent === "retry-webhook") {
      throw new Error("PX orders do not call n8n/webhook.");
    }

    if (intent === "create-payment-link") {
      const order = await getTestOrderById(id);
      if (!order) {
        throw new Error("PX order not found.");
      }
      if (order.status === "CANCELLED") {
        throw new Error("Cancelled PX orders cannot receive a new payment link.");
      }
      if (String(order.paymentStatus || "").toUpperCase() === "PAID") {
        throw new Error("This PX order is already paid.");
      }
      const session = await createCheckoutSessionForOrder({
        order,
        origin: getRequestOrigin(request),
        cancelUrl: buildAdminPaymentCancelUrl({ request, order }),
        stripeMode: TEST_STRIPE_MODE,
        orderKind: TEST_ORDER_KIND,
      });
      const returnPathWithLink = `/admin/px-orders/${id}?paymentLink=${encodeURIComponent(session.url || "")}`;
      return redirectWithFlash(request, returnPathWithLink, "success", "PX test payment link created.");
    }

    if (intent === "confirm") {
      await confirmOrder(id, emailOverrides);
      return redirectWithFlash(request, `/admin/px-orders/${id}`, "success", "PX confirmation email sent and order confirmed.");
    }

    if (intent === "cancel") {
      await cancelOrderPayment(id, { orderKind: TEST_ORDER_KIND, stripeMode: TEST_STRIPE_MODE });
      return redirectWithFlash(request, `/admin/px-orders/${id}`, "success", "PX order marked as cancelled.");
    }

    if (intent === "delete") {
      returnPath = "/admin/px-orders";
      await deleteOrder(id, TEST_ORDER_KIND);
      return redirectWithFlash(request, returnPath, "success", "PX order deleted.");
    }

    if (status === "CONFIRMED") {
      await confirmOrder(id, emailOverrides);
      return redirectWithFlash(request, `/admin/px-orders/${id}`, "success", "PX confirmation email sent and order confirmed.");
    }

    await updateOrderStatus(id, status, TEST_ORDER_KIND);
    return redirectWithFlash(request, `/admin/px-orders/${id}`, "success", "PX order status updated.");
  } catch (error) {
    const message = mapAdminMutationError(error, "PX order");
    return redirectWithFlash(request, returnPath, "error", message);
  }
}

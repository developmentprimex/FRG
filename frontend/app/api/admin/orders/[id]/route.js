import { withAdminPermission } from "../../../../../lib/auth";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { getOrderById } from "../../../../../lib/catalog";
import { confirmOrder, deleteOrder, resendOrderEmail, retryOrderWebhook, updateOrderAs400Number, updateOrderStatus } from "../../../../../lib/orders";
import { cancelOrderPayment, createCheckoutSessionForOrder } from "../../../../../lib/stripe-payments";

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

async function handleGET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let returnPath = `/admin/orders/${id}`;
  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "status");
    const status = String(formData.get("status") || "");
    const emailSubject = String(formData.get("emailSubject") || "");
    const emailBody = String(formData.get("emailBody") || "");
    const excludedAttachmentKeys = parseEmailExcludedAttachments(formData.get("emailExcludedAttachments"));
    const emailOverrides = { subject: emailSubject, bodyText: emailBody, excludedAttachmentKeys };

    if (intent === "update-as400") {
      await updateOrderAs400Number(id, formData.get("as400Number"));
      return NextResponse.redirect(new URL(`/admin/orders/${id}?as400Saved=1`, request.url), 303);
    }

    if (intent === "resend-email") {
      await resendOrderEmail(id, emailOverrides);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Confirmation email sent.");
    }

    if (intent === "retry-webhook") {
      await retryOrderWebhook(id);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Webhook forwarded successfully.");
    }

    if (intent === "create-payment-link") {
      const order = await getOrderById(id);
      if (!order) {
        throw new Error("Order not found.");
      }
      if (order.status === "CANCELLED") {
        throw new Error("Cancelled orders cannot receive a new payment link.");
      }
      if (String(order.paymentStatus || "").toUpperCase() === "PAID") {
        throw new Error("This order is already paid.");
      }
      const session = await createCheckoutSessionForOrder({
        order,
        origin: getRequestOrigin(request),
        cancelUrl: buildAdminPaymentCancelUrl({ request, order }),
      });
      const returnPathWithLink = `/admin/orders/${id}?paymentLink=${encodeURIComponent(session.url || "")}`;
      return redirectWithFlash(request, returnPathWithLink, "success", "Payment link created.");
    }

    if (intent === "confirm") {
      await confirmOrder(id, emailOverrides);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Confirmation email sent and order confirmed.");
    }

    if (intent === "cancel") {
      await cancelOrderPayment(id);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Order marked as cancelled.");
    }

    if (intent === "delete") {
      returnPath = "/admin/orders";
      await deleteOrder(id);
      return redirectWithFlash(request, returnPath, "success", "Order deleted.");
    }

    if (status === "CONFIRMED") {
      await confirmOrder(id, emailOverrides);
      return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Confirmation email sent and order confirmed.");
    }

    await updateOrderStatus(id, status);
    return redirectWithFlash(request, `/admin/orders/${id}`, "success", "Order status updated.");
  } catch (error) {
    const message = mapAdminMutationError(error, "Order");
    return redirectWithFlash(request, returnPath, "error", message);
  }
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

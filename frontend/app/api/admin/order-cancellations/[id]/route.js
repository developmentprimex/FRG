import { withAdminPermission } from "../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { processCancellationRequest, retryCancellationEmails } from "../../../../../lib/order-cancellations";

function getRequestOrigin(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

function safeReturnPath(value, fallback) {
  const path = String(value || "");
  return path.startsWith("/admin") ? path : fallback;
}

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let returnPath = "/admin/order-cancellations";
  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "");
    returnPath = safeReturnPath(formData.get("returnPath"), returnPath);
    const adminNote = String(formData.get("adminNote") || "");

    if (intent === "approve") {
      await processCancellationRequest(id, "APPROVED", adminNote);
      return redirectWithFlash(request, returnPath, "success", "Withdrawal approved. The order was cancelled and the customer was notified.");
    }

    if (intent === "reject") {
      await processCancellationRequest(id, "REJECTED", adminNote);
      return redirectWithFlash(request, returnPath, "success", "Withdrawal rejected. The order stays unchanged and the customer was notified.");
    }

    if (intent === "retry-emails") {
      await retryCancellationEmails(id, { origin: getRequestOrigin(request) });
      return redirectWithFlash(request, returnPath, "success", "Notification emails were resent.");
    }

    throw new Error("Unknown cancellation action.");
  } catch (error) {
    const message = mapAdminMutationError(error, "Withdrawal request");
    return redirectWithFlash(request, returnPath, "error", message);
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

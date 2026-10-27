import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../../../lib/auth";
import { getTestOrderById } from "../../../../../../../lib/catalog";
import {
  generateOrderConfirmationPdf,
  generatePurchasedKitchenPdf,
} from "../../../../../../../lib/email/order-notifications";
import { buildOrderForNotificationsWithConfirmedBaseline } from "../../../../../../../lib/orders";

function asciiDispositionFilename(name) {
  const s = String(name || "file.pdf").replace(/[^\x20-\x7E]+/g, "_");
  return s.replace(/"/g, "_") || "file.pdf";
}

function wantsInlineView(request) {
  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  if (view === "1" || view === "true") return true;
  return String(url.searchParams.get("disposition") || "").toLowerCase() === "inline";
}

function pdfResponse(pdf, request) {
  const buffer = Buffer.from(pdf.base64, "base64");
  const filename = pdf.filename || "attachment.pdf";
  const dispositionType = wantsInlineView(request) ? "inline" : "attachment";

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${dispositionType}; filename="${asciiDispositionFilename(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request, { params }) {
  await requireAdminApi();
  const { id, type } = await params;
  const order = await getTestOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "PX order not found." }, { status: 404 });
  }

  const notificationOrder = await buildOrderForNotificationsWithConfirmedBaseline(order, "test");

  if (type === "order-confirmation") {
    return pdfResponse(await generateOrderConfirmationPdf(notificationOrder), request);
  }

  if (type === "purchased-kitchen") {
    const pdf = await generatePurchasedKitchenPdf(notificationOrder);
    if (!pdf?.base64) {
      return NextResponse.json({ error: "Purchased kitchen PDF is not available." }, { status: 404 });
    }
    return pdfResponse(pdf, request);
  }

  return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
}

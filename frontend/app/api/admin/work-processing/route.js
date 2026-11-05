import { after, NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { updateWorkProcessing, reviewWorkReminder } from "../../../../lib/work-processing";
import { WORK_TYPES } from "../../../../lib/work-processing-rules";
import { dispatchClaimFeedbackInvitation, feedbackBaseUrl } from "../../../../lib/claim-feedback";
import { canAccessClaim, canAccessPx } from "../../../../lib/admin-roles";
import { hasPermission } from "../../../../lib/admin-permissions";

export async function POST(request) {
  let admin;
  try { admin = await requireAdminApi(["ASC_MANAGE", "FRG_MANAGE"]); }
  catch (error) { return NextResponse.json({ error: error.status === 403 ? "Forbidden" : "Unauthorized" }, { status: error.status || 401 }); }
  // Reject cross-origin browser mutations; worker identity comes from the session.
  const origin = request.headers.get("origin");
  const allowedOrigin = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedOrigin = forwardedHost ? `${request.headers.get("x-forwarded-proto") || "https"}://${forwardedHost}` : allowedOrigin;
  if (origin && origin !== allowedOrigin && origin !== forwardedOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  try {
    const data = await request.json();
    if (!data || typeof data !== "object") return NextResponse.json({ error: "Invalid work item." }, { status: 400 });
    if (data.intent === "review-reminder") {
      if (!hasPermission(admin, "ASC_MANAGE")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (typeof data.batchId !== "string" || data.batchId.length > 200) throw new Error("Invalid reminder review.");
      const reminder = await prisma.workReminderBatch.findUnique({ where: { id: data.batchId } });
      if (!canAccessPx(admin) && reminder?.items.some((item) => item.workType === "TEST_ORDER" || String(item.reference || "").replace(/\s+/g, "").startsWith("111"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const batch = await reviewWorkReminder({ db: prisma, batchId: data.batchId, outcome: data.outcome, actor: admin.email });
      return NextResponse.json({ status: batch.status });
    }
    if (!WORK_TYPES.includes(data.workType) || typeof data.workId !== "string" || data.workId.length > 200) {
      return NextResponse.json({ error: "Invalid work item." }, { status: 400 });
    }
    const orderTicket = data.workType === "ORDER";
    if (!hasPermission(admin, orderTicket ? "FRG_MANAGE" : "ASC_MANAGE")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const item = await (orderTicket ? prisma.orderTicket : prisma.serviceClaim).findUnique({
      where: { id: data.workId }, select: orderTicket ? { ticketSeries: true } : { contractNumber: true },
    });
    if (item && (orderTicket ? item.ticketSeries === "px" && !hasPermission(admin, "PX_FRG_MANAGE") : !canAccessClaim(admin, item.contractNumber))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const processing = await updateWorkProcessing({
      db: prisma, workType: data.workType, workId: data.workId,
      status: data.status,
      actor: admin.email, expectedVersion: data.expectedVersion,
    });
    const { feedbackInvitation, ...publicProcessing } = processing || {};
    if (feedbackInvitation) {
      const requestUrl = request.url;
      after(async () => {
        try {
          const result = await dispatchClaimFeedbackInvitation({
            db: prisma, invitationId: feedbackInvitation.id, token: feedbackInvitation.token,
            baseUrl: feedbackBaseUrl(requestUrl),
          });
          if (result !== "sent") console.warn("Claim feedback invitation:", result, feedbackInvitation.id);
        } catch (error) { console.error("Claim feedback invitation failed:", error); }
      });
    }
    return NextResponse.json({ processing: publicProcessing });
  } catch (error) {
    const message = error.message || "Unable to update processing.";
    const status = message.includes("another worker") ? 409 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

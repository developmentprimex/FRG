import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { updateWorkProcessing, reviewWorkReminder } from "../../../../lib/work-processing";
import { WORK_TYPES } from "../../../../lib/work-processing-rules";

export async function POST(request) {
  let admin;
  try { admin = await requireAdminApi(); }
  catch (error) { return NextResponse.json({ error: "Unauthorized" }, { status: error.status || 401 }); }
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
    if (data.intent === "review-reminder") {
      if (typeof data.batchId !== "string" || data.batchId.length > 200) throw new Error("Invalid reminder review.");
      const batch = await reviewWorkReminder({ db: prisma, batchId: data.batchId, outcome: data.outcome, actor: admin.email });
      return NextResponse.json({ status: batch.status });
    }
    if (!WORK_TYPES.includes(data.workType) || typeof data.workId !== "string" || data.workId.length > 200) {
      return NextResponse.json({ error: "Invalid work item." }, { status: 400 });
    }
    const processing = await updateWorkProcessing({
      db: prisma, workType: data.workType, workId: data.workId,
      status: data.status,
      actor: admin.email, expectedVersion: data.expectedVersion,
    });
    return NextResponse.json({ processing });
  } catch (error) {
    const message = error.message || "Unable to update processing.";
    const status = message.includes("another worker") ? 409 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

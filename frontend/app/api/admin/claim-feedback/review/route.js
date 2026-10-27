import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { reviewClaimFeedbackDelivery } from "../../../../../lib/claim-feedback";

export async function POST(request) {
  try { await requireAdminApi(); }
  catch (error) { return NextResponse.json({ error: "Unauthorized" }, { status: error.status || 401 }); }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body?.invitationId !== "string" || body.invitationId.length > 200) return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
  try {
    const result = await reviewClaimFeedbackDelivery({ db: prisma, invitationId: body.invitationId, outcome: body.outcome });
    return NextResponse.json({ status: result.status });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to review delivery." }, { status: 400 });
  }
}

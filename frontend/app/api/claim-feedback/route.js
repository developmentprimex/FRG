import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { submitClaimFeedback, validateClaimFeedback } from "../../../lib/claim-feedback";

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid response." }, { status: 400 }); }
  const token = String(body?.token || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({ error: "Invalid or expired link." }, { status: 410 });
  try { validateClaimFeedback(body); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
  try {
    const accepted = await submitClaimFeedback({ db: prisma, token, data: body });
    return accepted ? NextResponse.json({ success: true }) : NextResponse.json({ error: "This link has expired or has already been used." }, { status: 410 });
  } catch (error) {
    console.error("Claim feedback submit failed:", error);
    return NextResponse.json({ error: "Unable to save your response. Please try again." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { submitClaimFeedback, validateClaimFeedback } from "../../../lib/claim-feedback";

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Diese Anfrage ist nicht zulässig. Bitte öffnen Sie den Bewertungslink erneut." }, { status: 403 });
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Die Angaben konnten nicht gelesen werden. Bitte versuchen Sie es erneut." }, { status: 400 }); }
  const token = String(body?.token || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({ error: "Dieser Bewertungslink ist ungültig oder abgelaufen." }, { status: 410 });
  try { validateClaimFeedback(body); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }
  try {
    const accepted = await submitClaimFeedback({ db: prisma, token, data: body });
    return accepted ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Dieser Bewertungslink ist abgelaufen, wurde bereits verwendet oder ist nicht mehr verfügbar." }, { status: 410 });
  } catch (error) {
    console.error("Claim feedback submit failed:", error);
    return NextResponse.json({ error: "Ihre Bewertung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut." }, { status: 500 });
  }
}

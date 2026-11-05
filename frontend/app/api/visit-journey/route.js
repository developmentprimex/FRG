import { NextResponse } from "next/server";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit.js";
import { JOURNEY_STEPS, isJourneyId } from "../../../lib/visit-journey-steps.js";
import { journeyOptedOut, saveJourneyEvent } from "../../../lib/visit-journey-server.js";
import { getKitchenContractForAccess } from "../../../lib/kitchen-contracts";
import { isTestContractNumber } from "../../../lib/order-kind.js";

export async function POST(request) {
  if (journeyOptedOut(request)) return NextResponse.json({ tracked: false });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    enforceRateLimit(`visit-journey:${getRequestClientIp(request)}`, { limit: 300, windowMs: 60000 });
    if (Number(request.headers.get("content-length")) > 32768) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 32768) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const body = JSON.parse(raw);
    if (!Array.isArray(body.events) || !body.events.length || body.events.length > 25) throw new Error("Invalid events");
    const now = Date.now();
    for (const event of body.events) {
      if (!event || typeof event !== "object") return NextResponse.json({ error: "Invalid event" }, { status: 400 });
      const definition = Object.hasOwn(JOURNEY_STEPS, event.step) ? JOURNEY_STEPS[event.step] : null;
      if (!isJourneyId(event.id) || !isJourneyId(event.sessionId) || !definition || definition.server
        || !Number.isInteger(event.sequence) || event.sequence < 0 || event.sequence > 2147483647
        || !Number.isFinite(event.occurredAt) || event.occurredAt < now - 86400000 || event.occurredAt > now + 60000
        || typeof event.path !== "string" || event.path.length > 200
        || !(definition.flow === "FRG" ? /^(\/$|\/kitchens\/[^/?#]+$|\/checkout\/success$)/ : /^\/service$/).test(event.path)) {
        return NextResponse.json({ error: "Invalid event" }, { status: 400 });
      }
    }
    for (const event of body.events) {
      let contractNumber;
      // Direct kitchen links bypass the entry form. Revalidate their contract on the server.
      if (event.step === "kitchen" && typeof event.contractNumber === "string" && event.contractNumber.length <= 200) {
        try {
          const contract = await getKitchenContractForAccess(event.contractNumber);
          if (event.path === `/kitchens/${contract.kitchen.slug}`) contractNumber = contract.contractNumber;
        } catch { /* An invalid contract must never be attached to the visit. */ }
      }
      await saveJourneyEvent({
        request, id: event.id, sessionId: event.sessionId, step: event.step, contractNumber,
        isTest: contractNumber ? isTestContractNumber(contractNumber) : false,
        sequence: event.sequence, path: event.path, occurredAt: new Date(Math.min(event.occurredAt, now)),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error.status || (error instanceof SyntaxError || error.message === "Invalid events" ? 400 : 503);
    return NextResponse.json({ error: status === 503 ? "Tracking temporarily unavailable" : error.message }, { status });
  }
}

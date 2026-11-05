import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import { JOURNEY_STEPS, JOURNEY_VISITOR_COOKIE, isJourneyId, journeySessionCookie } from "./visit-journey-steps.js";

export function journeyCookie(request, name) {
  const value = request?.cookies?.get(name)?.value
    || request?.headers?.get("cookie")?.split(/;\s*/).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
  return isJourneyId(value) ? value : null;
}
export function journeyOptedOut(request) {
  return request?.headers?.get("sec-gpc") === "1" || request?.headers?.get("dnt") === "1";
}

let lastCleanup = 0;
export async function saveJourneyEvent({ request, step, sessionId, id, path = "", occurredAt = new Date(), sequence = 0, contractNumber, isTest = false }) {
  if (journeyOptedOut(request)) return null;
  const definition = JOURNEY_STEPS[step];
  const visitorId = journeyCookie(request, JOURNEY_VISITOR_COOKIE);
  sessionId ||= definition && journeyCookie(request, journeySessionCookie(definition.flow));
  if (!definition || !visitorId || !isJourneyId(sessionId)) return null;
  const verifiedNumber = contractNumber ? String(contractNumber).slice(0, 200) : null;
  const event = { id: id || crypto.randomUUID(), sessionId, step, path: path.slice(0, 200), occurredAt, sequence,
    contractNumber: verifiedNumber,
  };
  const saved = await prisma.$transaction(async tx => {
    const session = await tx.visitJourneySession.upsert({
      where: { id: sessionId }, update: {},
      create: { id: sessionId, visitorId, flow: definition.flow, createdAt: occurredAt, lastSeenAt: occurredAt },
    });
    if (session.visitorId !== visitorId || session.flow !== definition.flow) return false;
    const inserted = await tx.visitJourneyEvent.createMany({ data: [event], skipDuplicates: true });
    if (!inserted.count) return true;
    await tx.visitJourneySession.updateMany({
      where: { id: sessionId, lastSeenAt: { lt: occurredAt } }, data: { lastSeenAt: occurredAt },
    });
    await tx.visitJourneySession.updateMany({
      where: { id: sessionId, createdAt: { gt: occurredAt } }, data: { createdAt: occurredAt },
    });
    if (verifiedNumber) await tx.visitJourneySession.updateMany({
      where: { id: sessionId, OR: [{ contractVerifiedAt: null }, { contractVerifiedAt: { lte: occurredAt } }] },
      data: { contractNumber: verifiedNumber, contractVerifiedAt: occurredAt },
    });
    if (isTest) await tx.visitJourneySession.update({ where: { id: sessionId }, data: { isTest: true } });
    return true;
  });
  if (Date.now() - lastCleanup > 3600000) {
    lastCleanup = Date.now();
    const configured = Number(process.env.VISIT_TRACKING_RETENTION_DAYS || 90);
    const days = Number.isFinite(configured) && configured >= 1 && configured <= 365 ? configured : 90;
    await prisma.visitJourneySession.deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - days * 86400000) } } });
  }
  return saved ? sessionId : null;
}

export async function safelySaveJourneyEvent(args) {
  try { return await saveJourneyEvent(args); }
  catch (error) { console.warn("Visit journey tracking failed:", error?.message); return null; }
}

export async function trackJourneyOutcome({ request, eventType, contractNumber, metadata, path }) {
  const steps = {
    CONTRACT_ACCEPTED: "contract_accepted", CONTRACT_TEST_ACCEPTED: "contract_accepted",
    CONTRACT_REJECTED: "contract_rejected", SERVICE_CONTRACT_FOUND: "service_contract_found",
    SERVICE_CONTRACT_NOT_FOUND: "service_contract_not_found", SERVICE_CLAIM_SUBMITTED: "service_submitted",
  };
  const step = steps[eventType];
  if (!step) return;
  const verified = ["contract_accepted", "service_contract_found", "service_submitted"].includes(step);
  await safelySaveJourneyEvent({ request, step, path,
    contractNumber: verified ? contractNumber : undefined,
    isTest: metadata?.orderKind === "test" || eventType === "CONTRACT_TEST_ACCEPTED",
  });
}

// Stripe callbacks have no browser cookies; only trusted Stripe metadata links payment.
export async function recordJourneyPayment(sessionId, stripeSessionId) {
  if (!isJourneyId(sessionId)) return;
  try {
    const session = await prisma.visitJourneySession.findUnique({ where: { id: sessionId } });
    if (!session || session.flow !== "FRG") return;
    await prisma.$transaction(async tx => {
      const inserted = await tx.visitJourneyEvent.createMany({ data: [{
        id: `stripe:${stripeSessionId}:paid`, sessionId, step: "payment_paid", occurredAt: new Date(),
      }], skipDuplicates: true });
      if (inserted.count) await tx.visitJourneySession.update({ where: { id: sessionId }, data: { lastSeenAt: new Date() } });
    });
  } catch (error) { console.warn("Visit payment tracking failed:", error?.message); }
}

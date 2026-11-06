import { prisma } from "./prisma.js";
import { getOrderDelegate } from "./order-kind.js";
import { isJourneyId } from "./visit-journey-steps.js";
import { describeStripePaymentEvent } from "./stripe-payment-diagnostics.js";

export async function recordStripePaymentEvent(event, { stripe, orderKind }) {
  let outcome = describeStripePaymentEvent(event);
  if (!outcome) return;
  if (typeof event.livemode === "boolean" && event.livemode !== (orderKind === "live")) throw new Error("Stripe event mode mismatch");
  const object = event.data.object;
  const isCheckout = event.type.startsWith("checkout.");
  let checkout = isCheckout ? object : null;
  const paymentIntentId = isCheckout
    ? typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id
    : object.id;
  if (event.type === "checkout.session.async_payment_failed" && paymentIntentId && !object.last_payment_error) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.last_payment_error) outcome = describeStripePaymentEvent({ ...event,
      data: { object: { ...object, last_payment_error: intent.last_payment_error } },
    });
  }
  let metadata = object.metadata || {};
  // Older payment intents did not receive order metadata. Recover it from Checkout.
  if (!isCheckout && !metadata.orderId && !metadata.orderNumber) {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
    checkout = sessions.data[0] || null;
    metadata = checkout?.metadata || {};
  }
  const stripeSessionId = checkout?.id || null;
  const orderNumber = metadata.orderNumber || checkout?.client_reference_id;
  const references = [
    ...(metadata.orderId ? [{ id: metadata.orderId }] : []),
    ...(orderNumber ? [{ orderNumber }] : []),
    ...(stripeSessionId ? [{ stripeCheckoutSessionId: stripeSessionId }] : []),
    ...(paymentIntentId ? [{ stripePaymentIntentId: paymentIntentId }] : []),
  ];
  if (!references.length) return;
  const order = await getOrderDelegate(prisma, orderKind).findFirst({
    where: { OR: references }, select: { id: true, orderNumber: true, contractNumber: true },
  });
  if (!order) return; // Payments from other applications on this Stripe account.
  const requestedJourney = isJourneyId(metadata.journeySessionId) ? metadata.journeySessionId : null;
  const session = requestedJourney ? await prisma.visitJourneySession.findFirst({
    where: { id: requestedJourney, flow: "FRG", isTest: orderKind === "test" },
  }) : null;
  const occurredAt = new Date(event.created * 1000);
  const data = {
    id: event.id, orderId: order.id, orderNumber: order.orderNumber, orderKind,
    eventType: event.type, ...outcome, stripeSessionId,
    paymentIntentId: paymentIntentId || null, journeySessionId: session?.id || null, occurredAt,
  };
  await prisma.$transaction(async tx => {
    const inserted = await tx.stripePaymentEvent.createMany({ data: [data], skipDuplicates: true });
    if (!inserted.count || !session) return;
    const details = { orderNumber: data.orderNumber, reason: outcome.reason,
      errorCode: outcome.errorCode, declineCode: outcome.declineCode };
    const journeyId = outcome.step === "payment_paid" && data.stripeSessionId
      ? `stripe:${data.stripeSessionId}:paid` : `stripe-event:${event.id}`;
    await tx.visitJourneyEvent.upsert({
      where: { id: journeyId },
      create: { id: journeyId, sessionId: session.id, step: outcome.step,
        contractNumber: order.contractNumber, occurredAt, details },
      update: { details },
    });
    await tx.visitJourneySession.updateMany({
      where: { id: session.id, lastSeenAt: { lt: occurredAt } }, data: { lastSeenAt: occurredAt },
    });
  });
}

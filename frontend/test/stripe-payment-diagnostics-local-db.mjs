import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from '../node_modules/dotenv/lib/main.js';
dotenv.config({ path: 'frontend/.env', quiet: true });
if (new URL(process.env.DATABASE_URL).hostname !== 'localhost') throw new Error('Local database required');
const { prisma } = await import('../lib/prisma.js');
const { recordStripePaymentEvent } = await import('../lib/stripe-payment-event-store.js');
const { recordJourneyPayment } = await import('../lib/visit-journey-server.js');
const order = await prisma.testOrder.findFirst({ select: { id: true, orderNumber: true } });
assert.ok(order, 'An existing local test order is required; no payments are made');
const visitorId = randomUUID(), sessionId = randomUUID();
const prefix = `evt_local_${randomUUID()}`;
const checkoutId = `cs_local_${randomUUID()}`;
const metadata = { orderId: order.id, orderNumber: order.orderNumber, journeySessionId: sessionId };
const stripe = { checkout: { sessions: { list: async () => ({ data: [{ id: checkoutId, metadata }] }) } },
  paymentIntents: { retrieve: async () => ({ last_payment_error: { code: 'card_declined', decline_code: 'do_not_honor' } }) },
};
const createEvent = (suffix, type, object = {}) => ({ id: `${prefix}_${suffix}`, type, created: Math.floor(Date.now() / 1000), livemode: false,
  data: { object: { id: 'pi_local_fixture', metadata, ...object } },
});
try {
  await prisma.visitJourneySession.create({ data: { id: sessionId, visitorId, flow: 'FRG', isTest: true } });
  const failed = createEvent('failed', 'payment_intent.payment_failed', {
    last_payment_error: { code: 'card_declined', decline_code: 'insufficient_funds', message: 'Never store me: secret@example.com' },
  });
  await recordStripePaymentEvent(failed, { stripe, orderKind: 'test' });
  await recordStripePaymentEvent(failed, { stripe, orderKind: 'test' });
  assert.equal(await prisma.stripePaymentEvent.count({ where: { id: { startsWith: prefix } } }), 1);
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId } }), 1);
  const diagnostic = await prisma.stripePaymentEvent.findUnique({ where: { id: failed.id } });
  assert.equal(diagnostic.reason, 'insufficient_funds');
  const history = await prisma.visitJourneyEvent.findFirst({ where: { sessionId } });
  assert.equal(history.details.reason, 'insufficient_funds');
  assert.ok(!JSON.stringify(history).includes('secret@example.com'));
  // A second failed attempt on the same PaymentIntent must remain a separate event.
  await recordStripePaymentEvent(createEvent('retry', 'payment_intent.payment_failed', {
    last_payment_error: { code: 'expired_card' },
  }), { stripe, orderKind: 'test' });
  await recordStripePaymentEvent(createEvent('old', 'payment_intent.requires_action', { metadata: {} }), { stripe, orderKind: 'test' });
  const recovered = await prisma.stripePaymentEvent.findUnique({ where: { id: `${prefix}_old` } });
  assert.equal(recovered.journeySessionId, sessionId, 'Legacy PaymentIntents recover order/journey metadata through Checkout');
  await recordStripePaymentEvent(createEvent('async', 'checkout.session.async_payment_failed', { id: checkoutId, payment_intent: 'pi_local_fixture' }), { stripe, orderKind: 'test' });
  const asynchronous = await prisma.stripePaymentEvent.findUnique({ where: { id: `${prefix}_async` } });
  assert.equal(asynchronous.declineCode, 'do_not_honor');
  const paid = createEvent('paid', 'checkout.session.completed', { id: checkoutId, payment_status: 'paid', payment_intent: 'pi_local_fixture' });
  await recordStripePaymentEvent(paid, { stripe, orderKind: 'test' });
  await recordJourneyPayment(sessionId, checkoutId);
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId, step: 'payment_paid' } }), 1);
  const before = (await prisma.visitJourneySession.findUnique({ where: { id: sessionId } })).lastSeenAt;
  await recordStripePaymentEvent({ ...createEvent('late', 'checkout.session.expired', { id: 'cs_old_fixture' }), created: paid.created - 1000 }, { stripe, orderKind: 'test' });
  const after = (await prisma.visitJourneySession.findUnique({ where: { id: sessionId } })).lastSeenAt;
  assert.equal(after.getTime(), before.getTime(), 'Delayed events must not move activity time backwards');
  await assert.rejects(recordStripePaymentEvent({ ...failed, id: `${prefix}_wrong_mode`, livemode: true }, { stripe, orderKind: 'test' }), /mode mismatch/);
  assert.equal(await prisma.stripePaymentEvent.count({ where: { id: `${prefix}_wrong_mode` } }), 0);
  console.log('PASS: Stripe event persistence, retry idempotency, multiple card attempts, legacy metadata recovery, payment milestone deduplication, delayed events and mode isolation; no payments were made');
} finally {
  await prisma.stripePaymentEvent.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.visitJourneySession.deleteMany({ where: { id: sessionId, visitorId } });
  await prisma.$disconnect();
}

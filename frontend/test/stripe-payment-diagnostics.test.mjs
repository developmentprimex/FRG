import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { describeStripePaymentEvent } from '../lib/stripe-payment-diagnostics.js';

const event = (type, object = {}) => ({ id: 'evt_test', type, created: 1793880000, data: { object: { id: 'pi_test', ...object } } });

test('Stripe decline codes are classified without storing sensitive error text', () => {
  const result = describeStripePaymentEvent(event('payment_intent.payment_failed', {
    last_payment_error: { code: 'card_declined', decline_code: 'insufficient_funds', message: 'secret@example.com 4242424242424242' },
  }));
  assert.equal(result.step, 'payment_failed');
  assert.equal(result.reason, 'insufficient_funds');
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.ok(!JSON.stringify(result).includes('4242'));
  const unknown = describeStripePaymentEvent(event('payment_intent.payment_failed', {
    last_payment_error: { code: 'unrecognized_code', decline_code: '<script>' },
  }));
  assert.equal(unknown.reason, 'unknown_failure');
  assert.equal(unknown.declineCode, null);
});

test('expired, canceled, requires-action and unpaid completion are distinct from paid', () => {
  assert.equal(describeStripePaymentEvent(event('checkout.session.expired')).reason, 'session_expired');
  assert.equal(describeStripePaymentEvent(event('payment_intent.canceled')).step, 'payment_canceled');
  assert.equal(describeStripePaymentEvent(event('payment_intent.requires_action')).step, 'payment_requires_action');
  assert.equal(describeStripePaymentEvent(event('checkout.session.completed', { status: 'complete', payment_status: 'unpaid' })).step, 'payment_pending');
  assert.equal(describeStripePaymentEvent(event('checkout.session.completed', { payment_status: 'paid' })).step, 'payment_paid');
  assert.equal(describeStripePaymentEvent(event('unrelated.event')), null);
});

const webhookSource = readFileSync(new URL('../lib/stripe-webhook-handler.js', import.meta.url), 'utf8')
  .replace(/^import .*;\s*$/gm, '').replaceAll('export ', '');

function webhookHarness(stripeEvent, { invalidSignature = false, storageFailure = false } = {}) {
  const writes = [], payments = [];
  const context = vm.createContext({
    process: { env: { STRIPE_TEST_WEBHOOK_SECRET: 'test-webhook-secret' } }, console: { error() {} },
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) },
    getStripeClient: () => ({ webhooks: { constructEvent: () => { if (invalidSignature) throw new Error('invalid'); return stripeEvent; } } }),
    updateOrderFromCheckoutSession: async (...args) => { payments.push(args); },
    recordStripePaymentEvent: async (...args) => { if (storageFailure) throw new Error('database unavailable'); writes.push(args); },
  });
  vm.runInContext(webhookSource, context);
  return { writes, payments, run: () => context.handleStripeWebhook({ headers: new Headers(), text: async () => '{}' }, { stripeMode: 'test', orderKind: 'test' }) };
}

test('failed card attempts are recorded only after webhook signature verification', async () => {
  const valid = webhookHarness(event('payment_intent.payment_failed'));
  assert.equal((await valid.run()).status, 200);
  assert.equal(valid.writes.length, 1);
  assert.equal(valid.payments.length, 0);
  const forged = webhookHarness(event('payment_intent.payment_failed'), { invalidSignature: true });
  assert.equal((await forged.run()).status, 400);
  assert.equal(forged.writes.length, 0);
  const retry = webhookHarness(event('payment_intent.payment_failed'), { storageFailure: true });
  assert.equal((await retry.run()).status, 500, 'Stripe must retry failed diagnostic writes');
});

test('async failures are not rewritten as checkout expiry', async () => {
  const harness = webhookHarness(event('checkout.session.async_payment_failed', { id: 'cs_test', status: 'complete' }));
  await harness.run();
  assert.equal(harness.payments[0][0].status, 'complete');
  assert.equal(harness.payments[0][1].failed, true);
});

test('late unpaid checkout events cannot downgrade paid orders or another checkout', async () => {
  const source = readFileSync(new URL('../lib/stripe-payments.js', import.meta.url), 'utf8');
  const start = source.indexOf('export async function updateOrderFromCheckoutSession(');
  const end = source.indexOf('\nexport ', start + 1);
  let record = { orderNumber: 'test-order', paymentStatus: 'PAID', stripeCheckoutSessionId: 'cs_new' };
  let updates = 0;
  const context = vm.createContext({
    Date, prisma: {}, ORDER_KIND_LIVE: 'live',
    maybeSendPaidOrderConfirmation: async () => {}, recordJourneyPayment: async () => {},
    getOrderDelegate: () => ({
      async updateMany({ where, data }) {
        assert.deepEqual([...where.paymentStatus.notIn], ['PAID', 'CANCELLED']);
        if (!where.paymentStatus.notIn.includes(record.paymentStatus) && where.OR.some(condition => condition.stripeCheckoutSessionId === record.stripeCheckoutSessionId)) {
          record = { ...record, ...data }; updates++;
        }
      },
      findUnique: async () => record,
      update: async ({ data }) => { record = { ...record, ...data }; updates++; return record; },
    }),
  });
  vm.runInContext(source.slice(start, end).replace('export ', ''), context);
  await context.updateOrderFromCheckoutSession({ id: 'cs_old', client_reference_id: 'test-order', status: 'expired', payment_status: 'unpaid' });
  assert.equal(updates, 0);
  assert.equal(record.paymentStatus, 'PAID');
  record.paymentStatus = 'PENDING';
  await context.updateOrderFromCheckoutSession({ id: 'cs_old', client_reference_id: 'test-order', status: 'expired', payment_status: 'unpaid' });
  assert.equal(updates, 0);
  await context.updateOrderFromCheckoutSession({ id: 'cs_new', client_reference_id: 'test-order', status: 'complete', payment_status: 'unpaid' });
  assert.equal(record.paymentStatus, 'PENDING');
});

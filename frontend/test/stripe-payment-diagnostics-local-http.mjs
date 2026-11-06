import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import dotenv from '../node_modules/dotenv/lib/main.js';
dotenv.config({ path: 'frontend/.env', quiet: true });
if (new URL(process.env.DATABASE_URL).hostname !== 'localhost') throw new Error('Local database required');
const origin = process.env.VISIT_TEST_ORIGIN || 'http://localhost:3000';
if (new URL(origin).hostname !== 'localhost') throw new Error('Local server required');
const { prisma } = await import('../lib/prisma.js');
const { recordStripePaymentEvent } = await import('../lib/stripe-payment-event-store.js');
const sessionId = randomUUID(), visitorId = randomUUID(), eventId = `evt_local_http_${randomUUID()}`;
try {
  const order = await prisma.order.findFirst({ select: { id: true, orderNumber: true, contractNumber: true } });
  assert.ok(order, 'Existing local order required for the read-only admin render check');
  await prisma.visitJourneySession.create({ data: { id: sessionId, visitorId, flow: 'FRG', contractNumber: order.contractNumber } });
  await recordStripePaymentEvent({ id: eventId, livemode: true, type: 'payment_intent.payment_failed', created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'pi_local_http_fixture', metadata: { orderId: order.id, orderNumber: order.orderNumber, journeySessionId: sessionId },
      last_payment_error: { code: 'card_declined', decline_code: 'insufficient_funds' },
    } },
  }, { stripe: {}, orderKind: 'live' });
  const admin = await prisma.adminUser.findFirst({ where: { role: 'SUPERADMIN', isActive: true }, select: { id: true } });
  assert.ok(admin);
  const base = Buffer.from(JSON.stringify({ adminId: admin.id, exp: Math.floor(Date.now() / 1000) + 300 })).toString('base64url');
  const signature = createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(base).digest('hex');
  const headers = { cookie: `fragmento_admin_session=${base}.${signature}; adminLanguage=en; adminWorkspace=FRG` };
  for (const path of [`/admin/contract-access?visit=${sessionId}`, `/admin/orders/${order.id}`]) {
    const response = await fetch(`${origin}${path}`, { headers });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('insufficient funds'), 'The Stripe reason must be visible in admin');
    assert.ok(html.includes('insufficient_funds'), 'The raw Stripe code must be visible');
    assert.ok(html.includes(order.orderNumber));
  }
  console.log('PASS: payment failure reason and Stripe code rendered in visitor history and order details; no payments or emails were sent');
} finally {
  await prisma.stripePaymentEvent.deleteMany({ where: { id: eventId } });
  await prisma.visitJourneySession.deleteMany({ where: { id: sessionId, visitorId } });
  await prisma.$disconnect();
}

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from '../node_modules/dotenv/lib/main.js';
dotenv.config({ path: 'frontend/.env', quiet: true });
if (new URL(process.env.DATABASE_URL).hostname !== 'localhost') throw new Error('Local database required');
const { prisma } = await import('../lib/prisma.js');
const { saveJourneyEvent, recordJourneyPayment } = await import('../lib/visit-journey-server.js');
const { loadJourneyReport } = await import('../lib/visit-journey-report.js');
const { loadFragmentoVisitors } = await import('../lib/fragmento-visitors-report.js');
const visitorId = randomUUID();
const sessionId = randomUUID();
const testSessionId = randomUUID();
const accessIds = [randomUUID(), randomUUID(), randomUUID()];
const request = { headers: new Headers({ cookie: `fragmento_visit_id=${visitorId}; fragmento_visit_frg=${sessionId}` }) };
try {
  const now = Date.now();
  const language = { request, sessionId, id: randomUUID(), step: 'language', occurredAt: new Date(now - 3000) };
  // Arrival order is intentionally different from occurrence order.
  await saveJourneyEvent({ request, sessionId, id: randomUUID(), step: 'order_form', occurredAt: new Date(now - 2000) });
  await saveJourneyEvent(language);
  await saveJourneyEvent(language);
  await saveJourneyEvent({ request, sessionId, step: 'contract_accepted', contractNumber: 'journey-test-only', occurredAt: new Date(now - 1500) });
  await saveJourneyEvent({ request, sessionId, step: 'language', occurredAt: new Date(now - 1000) });
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId } }), 4);
  const report = await loadJourneyReport('FRG', { excludeTestContracts: false }, { visit: sessionId });
  const row = report.sessions.find(value => value.id === sessionId);
  assert.equal(row.lastStep, 'language');
  assert.equal(row.furthestStep, 'order_form');
  assert.equal(row.contractNumber, 'journey-test-only');
  assert.equal(row.createdAt.getTime(), now - 3000);
  assert.equal(report.events.length, 4);
  await prisma.publicVisitEvent.createMany({ data: [
    { id: accessIds[0], eventType: 'CONTRACT_ACCEPTED', metadata: { journeySessionId: sessionId }, createdAt: new Date(now) },
    { id: accessIds[1], eventType: 'CONTRACT_REJECTED', contractNumber: 'legacy-journey-test', createdAt: new Date(now) },
    { id: accessIds[2], eventType: 'PAGE_OPENED', metadata: { journeySessionId: sessionId }, createdAt: new Date(now + 100) },
  ] });
  const unified = await loadFragmentoVisitors({ excludeTestContracts: false }, { visit: sessionId });
  assert.ok(unified.rows.some(row => row.id === sessionId && row.lastStep === 'language' && row.furthestStep === 'order_form'));
  assert.ok(unified.rows.some(row => row.id === accessIds[1] && row.kind === 'access'));
  assert.ok(!unified.rows.some(row => row.id === accessIds[0]), 'Linked contract access must not duplicate a visit row');
  assert.equal(unified.rows.find(row => row.id === sessionId).eventType, 'CONTRACT_ACCEPTED');
  assert.equal(unified.history.length, 4);
  const impostor = { headers: new Headers({ cookie: `fragmento_visit_id=${randomUUID()}` }) };
  assert.equal(await saveJourneyEvent({ request: impostor, sessionId, step: 'kitchen' }), null);
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId } }), 4);
  await recordJourneyPayment(sessionId, 'journey-test-stripe-session');
  await recordJourneyPayment(sessionId, 'journey-test-stripe-session');
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId, step: 'payment_paid' } }), 1);
  await saveJourneyEvent({ request, sessionId: testSessionId, step: 'contract_accepted', isTest: true });
  const live = await loadJourneyReport('FRG', { excludeTestContracts: true }, { visit: testSessionId });
  assert.ok(!live.sessions.some(value => value.id === testSessionId));
  assert.equal(live.events.length, 0);
  const unifiedLive = await loadFragmentoVisitors({ excludeTestContracts: true }, { visit: testSessionId });
  assert.ok(!unifiedLive.rows.some(row => row.id === testSessionId));
  assert.equal(unifiedLive.history.length, 0);
  await saveJourneyEvent({ request, sessionId, step: 'contract_accepted', contractNumber: 'older-contract', occurredAt: new Date(now - 2500) });
  const linked = await prisma.visitJourneySession.findUnique({ where: { id: sessionId } });
  assert.equal(linked.contractNumber, 'journey-test-only', 'Late retries must not overwrite a newer verified contract');
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId, contractNumber: 'older-contract' } }), 1);
  const before = await prisma.visitJourneyEvent.count({ where: { sessionId } });
  await saveJourneyEvent({ request: { headers: new Headers({ cookie: request.headers.get('cookie'), dnt: '1' }) }, step: 'kitchen' });
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId } }), before);
  console.log('PASS: database deduplication, chronological ordering, furthest step, contract linking including late retries, identity isolation, Stripe idempotency, test permissions, opt-out');
} finally {
  await prisma.publicVisitEvent.deleteMany({ where: { id: { in: accessIds } } });
  await prisma.visitJourneySession.deleteMany({ where: { id: { in: [sessionId, testSessionId] }, visitorId } });
  await prisma.$disconnect();
}

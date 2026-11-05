import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import dotenv from '../node_modules/dotenv/lib/main.js';
dotenv.config({ path: 'frontend/.env', quiet: true });
if (new URL(process.env.DATABASE_URL).hostname !== 'localhost') throw new Error('Local database required');
const { prisma } = await import('../lib/prisma.js');
const origin = 'http://localhost:3000';
const visitorId = randomUUID();
const sessionId = randomUUID();
const cookie = `fragmento_visit_id=${visitorId}; fragmento_visit_frg=${sessionId}`;
const post = (events, extra = {}) => fetch(`${origin}/api/visit-journey`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin, cookie, ...extra },
  body: JSON.stringify({ events }),
});
try {
  const event = { id: randomUUID(), sessionId, step: 'language', sequence: 1, occurredAt: Date.now(), path: '/' };
  assert.equal((await post([event])).status, 200);
  assert.equal((await post([event])).status, 200);
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId } }), 1);
  assert.equal((await post([{ ...event, id: randomUUID(), step: 'payment_paid' }])).status, 400);
  assert.equal((await post([null])).status, 400);
  assert.equal((await post([{ ...event, step: '__proto__' }])).status, 400);
  assert.equal((await post([{ ...event, id: randomUUID() }], { origin: 'https://unrelated.invalid' })).status, 403);
  await post([{ ...event, id: randomUUID() }], { dnt: '1' });
  assert.equal(await prisma.visitJourneyEvent.count({ where: { sessionId } }), 1);
  // Extra JSON keys must never become trusted server fields.
  assert.equal((await post([{ ...event, id: randomUUID(), sequence: 2, step: 'contract', contractNumber: 'FORGED', isTest: true }])).status, 200);
  const session = await prisma.visitJourneySession.findUnique({ where: { id: sessionId } });
  assert.equal(session.contractNumber, null);
  assert.equal(session.isTest, false);
  const admin = await prisma.adminUser.findFirst({ where: { role: 'SUPERADMIN', isActive: true }, select: { id: true } });
  assert.ok(admin, 'An existing local superadmin is required for the read-only admin render check');
  const base = Buffer.from(JSON.stringify({ adminId: admin.id, exp: Math.floor(Date.now() / 1000) + 300 })).toString('base64url');
  const signature = createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(base).digest('hex');
  const response = await fetch(`${origin}/admin/contract-access?visit=${sessionId}`, {
    headers: { cookie: `fragmento_admin_session=${base}.${signature}; adminLanguage=en; adminWorkspace=FRG` },
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.equal((html.match(/<table\b/g) || []).length, 1, 'Fragmento visitors must use one table');
  assert.ok(html.includes('Furthest step'));
  assert.ok(html.includes(sessionId));
  assert.ok(html.includes('Contract form'));
  assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'));
  console.log('PASS: HTTP ingestion, duplicate retry, milestone rejection, origin check, opt-out, field whitelisting and authenticated admin history render');
} finally {
  await prisma.visitJourneySession.deleteMany({ where: { id: sessionId, visitorId } });
  await prisma.$disconnect();
}

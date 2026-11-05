import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { JOURNEY_STEPS, JOURNEY_VISITOR_COOKIE, journeySessionCookie } from '../lib/visit-journey-steps.js';

const source = readFileSync(new URL('../lib/visit-journey-client.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/m, '').replaceAll('export function ', 'function ');
const settle = () => new Promise(resolve => setImmediate(resolve));

function browser({ storage = new Map(), cookies = new Map(), online = true, dnt = false } = {}) {
  const calls = [];
  const handlers = {};
  let connected = online;
  let testNow;
  const localStorage = {
    get length() { return storage.size; }, key: index => [...storage.keys()][index],
    getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key),
  };
  const document = {
    get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; '); },
    set cookie(value) { const pair = value.split(';')[0]; const index = pair.indexOf('='); cookies.set(pair.slice(0, index), pair.slice(index + 1)); },
    addEventListener: (name, handler) => { handlers[name] = handler; },
  };
  const context = vm.createContext({
    JOURNEY_STEPS, JOURNEY_VISITOR_COOKIE, journeySessionCookie, Date: class extends Date { static now() { return testNow ?? Date.now(); } }, Map, Set, crypto: { randomUUID },
    localStorage, document, navigator: { doNotTrack: dnt ? '1' : '0' }, location: { protocol: 'https:' },
    window: { location: { pathname: '/' }, addEventListener: (name, handler) => { handlers[name] = handler; }, setInterval: handler => { handlers.interval = handler; } },
    fetch: async (_url, options) => { calls.push(JSON.parse(options.body)); if (!connected) throw new Error('offline'); return { ok: true }; },
  });
  vm.runInContext(source, context);
  return { track: step => context.trackJourneyStep(step), calls, storage, cookies, handlers,
    setOnline: value => { connected = value; }, setTime: value => { testNow = value; },
    setPath: value => { context.window.location.pathname = value; },
  };
}

test('browser cannot emit server milestones, and opt-out creates no identifiers', async () => {
  const normal = browser();
  normal.track('payment_paid');
  normal.track('contract_accepted');
  assert.equal(normal.calls.length, 0);
  assert.equal(normal.cookies.size, 0);
  const optedOut = browser({ dnt: true });
  optedOut.track('language');
  assert.equal(optedOut.cookies.size, 0);
  assert.equal(optedOut.storage.size, 0);
});

test('offline visits persist their event IDs and replay without duplicating after reload', async () => {
  const first = browser({ online: false });
  first.track('language');
  await settle();
  const event = first.calls[0].events[0];
  const reloaded = browser({ storage: first.storage, cookies: first.cookies });
  reloaded.track('contract');
  await settle();
  assert.equal(reloaded.calls[0].events[0].id, event.id);
  assert.equal(reloaded.calls[0].events[0].sessionId, reloaded.calls[0].events[1].sessionId);
  assert.equal([...first.storage.keys()].filter(key => key.startsWith('fragmento.journey.queue.v1.')).length, 0);
});

test('two tabs keep independent queued events and immediate repeated effects are suppressed', async () => {
  const first = browser({ online: false });
  const second = browser({ storage: first.storage, cookies: first.cookies, online: false });
  first.track('language');
  first.track('language');
  second.track('contract');
  await settle();
  assert.equal([...first.storage.keys()].filter(key => key.startsWith('fragmento.journey.queue.v1.')).length, 2);
  second.setOnline(true);
  await second.handlers.online();
  assert.equal([...first.storage.keys()].filter(key => key.startsWith('fragmento.journey.queue.v1.')).length, 0);
});

test('idle visitors start a new visit while retaining their browser identity', async () => {
  const client = browser();
  client.setTime(1000000);
  client.track('language');
  await settle();
  const original = client.calls[0].events[0];
  const visitor = client.cookies.get(JOURNEY_VISITOR_COOKIE);
  client.setTime(1000000 + 31 * 60000);
  client.track('contract');
  await settle();
  assert.notEqual(client.calls[1].events[0].sessionId, original.sessionId);
  assert.equal(client.cookies.get(JOURNEY_VISITOR_COOKIE), visitor);
});

test('an old public tracker cannot create events after navigating to admin', async () => {
  const client = browser();
  client.setTime(1000000);
  client.track('language');
  await settle();
  client.setPath('/admin/contract-access');
  client.setTime(1000000 + 31 * 60000);
  client.handlers.pointerdown();
  await settle();
  assert.equal(client.calls.length, 1);
});

test('Stripe completion without confirmed payment cannot produce a paid journey milestone', async () => {
  const stripe = readFileSync(new URL('../lib/stripe-payments.js', import.meta.url), 'utf8');
  const start = stripe.indexOf('export async function updateOrderFromCheckoutSession(');
  const end = stripe.indexOf('\nexport ', start + 1);
  const outcomes = [];
  const context = vm.createContext({
    Date, prisma: {}, ORDER_KIND_LIVE: 'live', getOrderDelegate: () => ({ update: async () => ({}) }),
    maybeSendPaidOrderConfirmation: async () => {}, recordJourneyPayment: async (...args) => outcomes.push(args),
  });
  vm.runInContext(stripe.slice(start, end).replace('export ', ''), context);
  const session = { id: 'stripe-checkout', status: 'complete', metadata: { journeySessionId: randomUUID() } };
  await context.updateOrderFromCheckoutSession({ ...session, payment_status: 'unpaid' });
  assert.equal(outcomes.length, 0);
  await context.updateOrderFromCheckoutSession({ ...session, payment_status: 'paid' });
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0][0], session.metadata.journeySessionId);
  await context.updateOrderFromCheckoutSession({ ...session, payment_status: 'paid', metadata: {} });
  assert.equal(outcomes.length, 1);
});

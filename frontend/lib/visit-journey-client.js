"use client";

import { JOURNEY_STEPS, JOURNEY_VISITOR_COOKIE, journeySessionCookie } from "./visit-journey-steps.js";

const IDLE_MS = 30 * 60 * 1000;
const QUEUE_KEY = "fragmento.journey.queue.v1";
let memoryQueue = [];
let flushing = false;
let started = false;
const memorySessions = {};
let activeStep = null;
let lastActivity = 0;
let lastEmission = null;

function optedOut() {
  return navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1";
}
function readCookie(name) {
  return document.cookie.split("; ").find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
}
function writeCookie(name, value, age) {
  document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${age}${location.protocol === "https:" ? "; Secure" : ""}`;
}
function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* In-memory fallback. */ }
}

function pendingEvents() {
  const events = new Map(memoryQueue.map(event => [event.id, event]));
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(`${QUEUE_KEY}.`)) {
        const event = readStore(key, null);
        if (event?.id) events.set(event.id, event);
      }
    }
    const sorted = [...events.values()].sort((a, b) => a.occurredAt - b.occurredAt);
    for (const event of sorted) {
      if (Date.now() - event.occurredAt > 86400000 || events.size > 200) {
        localStorage.removeItem(`${QUEUE_KEY}.${event.id}`);
        events.delete(event.id);
      }
    }
  } catch { /* Memory queue remains usable without local storage. */ }
  return [...events.values()].sort((a, b) => a.occurredAt - b.occurredAt || a.sequence - b.sequence);
}

export function ensureJourneySession(flow = "FRG") {
  if (typeof window === "undefined" || optedOut()) return null;
  let visitorId = readCookie(JOURNEY_VISITOR_COOKIE);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    writeCookie(JOURNEY_VISITOR_COOKIE, visitorId, 90 * 86400);
  }
  const key = `fragmento.journey.session.${flow}`;
  const previous = readStore(key, memorySessions[flow]);
  const now = Date.now();
  const session = previous && previous.visitorId === visitorId && now - previous.activeAt < IDLE_MS
    ? previous : { id: crypto.randomUUID(), visitorId };
  session.activeAt = now;
  memorySessions[flow] = session;
  writeStore(key, session);
  writeCookie(journeySessionCookie(flow), session.id, 30 * 60);
  return session.id;
}

async function flush() {
  if (flushing || optedOut()) return;
  flushing = true;
  try {
    // Merge other tabs' pending events. The database deduplicates event IDs.
    const queue = pendingEvents().filter(event => Date.now() - event.occurredAt < 86400000).slice(-200);
    if (!queue.length) return;
    const batch = queue.slice(0, 25);
    const response = await fetch("/api/visit-journey", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }), keepalive: true,
    });
    if (!response.ok) return;
    const ids = new Set(batch.map(event => event.id));
    memoryQueue = memoryQueue.filter(event => !ids.has(event.id));
    try { for (const id of ids) localStorage.removeItem(`${QUEUE_KEY}.${id}`); } catch { /* Memory fallback. */ }
  } catch { /* Pending events are retried when online or on the next interval. */ }
  finally { flushing = false; }
}

export function trackJourneyStep(step, context = {}) {
  const definition = JOURNEY_STEPS[step];
  if (!definition || definition.server || typeof window === "undefined" || optedOut()) return;
  activeStep = step;
  if (!started) {
    started = true;
    window.addEventListener("online", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    window.setInterval(flush, 10000);
    const onActivity = () => {
      if (!activeStep || Date.now() - lastActivity < 10000) return;
      lastActivity = Date.now();
      const flow = JOURNEY_STEPS[activeStep].flow;
      const path = window.location.pathname;
      if (!(flow === "ASC" ? path === "/service" : /^(\/$|\/kitchens\/[^/?#]+$|\/checkout\/success$)/.test(path))) return;
      const before = memorySessions[flow]?.id;
      const after = ensureJourneySession(flow);
      if (before && before !== after) trackJourneyStep(activeStep);
    };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
  }
  const sessionId = ensureJourneySession(definition.flow);
  if (lastEmission?.step === step && lastEmission.sessionId === sessionId && Date.now() - lastEmission.at < 500) return;
  lastEmission = { step, sessionId, at: Date.now() };
  const session = memorySessions[definition.flow];
  session.sequence = (session.sequence || 0) + 1;
  writeStore(`fragmento.journey.session.${definition.flow}`, session);
  const event = {
    id: crypto.randomUUID(), sessionId, step, sequence: session.sequence,
    occurredAt: Date.now(), path: window.location.pathname,
    ...(step === "kitchen" && context.contractNumber ? { contractNumber: String(context.contractNumber).slice(0, 200) } : {}),
  };
  memoryQueue = [...memoryQueue.filter(pending => Date.now() - pending.occurredAt < 86400000), event].slice(-200);
  writeStore(`${QUEUE_KEY}.${event.id}`, event);
  void flush();
}

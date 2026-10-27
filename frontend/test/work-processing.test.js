import test from "node:test";
import assert from "node:assert/strict";
import { workAgeDays, workDateKey, workState, reminderDue, filterAndSortWork, summarizeWork } from "../lib/work-processing-rules.js";
import { attachWorkProcessing, updateWorkProcessing, reviewWorkReminder } from "../lib/work-processing.js";
import { buildWorkReminder, resolveReminderConfig, sendWorkReminders } from "../lib/email/work-reminders.js";

const now = new Date("2026-10-12T07:00:00Z");
const item = (id, date, extra = {}) => ({ id, workType: "CLAIM", contractNumber: "670123", createdAt: new Date(date), fullName: "Test Customer", ...extra });
const overdue = item("old", "2026-09-01T12:00:00Z");
const env = { NODE_ENV: "production", WORK_REMINDERS_ENABLED: "true", SMTP_111_USER: "315primex.eu@gmail.com", SMTP_111_FROM: "315primex.eu@gmail.com", SMTP_111_PASS: "mock-secret" };

function memoryDb(initial = {}) {
  const state = { records: [], events: [], batches: [], orders: [], claims: [overdue], locked: true, ...initial };
  const matches = (row, where) => row.workType === where.workType_workId.workType && row.workId === where.workType_workId.workId;
  const db = {
    $queryRaw: async () => [{ locked: state.locked }],
    order: { findMany: async () => state.orders, findUnique: async ({ where }) => state.orders.find((row) => row.id === where.id) || null },
    testOrder: { findUnique: async () => null },
    serviceClaim: { findMany: async () => state.claims, findUnique: async ({ where }) => state.claims.find((row) => row.id === where.id) || null },
    adminUser: { findFirst: async ({ where }) => where.email === "worker@example.com" ? { id: "worker" } : null },
    claimFeedbackInvitation: {
      create: async ({ data }) => ({ id: "feedback-fixture", ...data }),
      updateMany: async () => ({ count: 0 }),
    },
    workProcessing: {
      findMany: async ({ where }) => state.records.filter((row) => row.workType === where.workType && where.workId.in.includes(row.workId)),
      findUnique: async ({ where }) => state.records.find((row) => matches(row, where)) || null,
      upsert: async ({ where, create, update }) => {
        let record = state.records.find((row) => matches(row, where));
        if (record) Object.assign(record, update);
        else { record = { id: String(state.records.length), status: "OPEN", version: 0, ...create }; state.records.push(record); }
        return { ...record };
      },
    },
    workProcessingEvent: { create: async ({ data }) => { state.events.push(data); return data; } },
    workReminderBatch: {
      findUnique: async ({ where }) => state.batches.find((row) => where.id ? row.id === where.id : row.dateKey === where.dateKey) || null,
      findMany: async ({ where }) => state.batches.filter((row) => where.status.in.includes(row.status)),
      upsert: async ({ where, create, update }) => {
        let row = state.batches.find((entry) => entry.dateKey === where.dateKey);
        if (row) Object.assign(row, update);
        else { row = { id: String(state.batches.length), status: "SENDING", ...create }; state.batches.push(row); }
        return row;
      },
      update: async ({ where, data }) => { const row = state.batches.find((entry) => entry.id === where.id); Object.assign(row, data); return row; },
    },
  };
  // Only processing writes roll back. Batch creation models the independent,
  // durable connection used before SMTP submission.
  db.$transaction = async (fn) => {
    const records = structuredClone(state.records), events = structuredClone(state.events);
    try { return await fn(db); }
    catch (error) { state.records = records; state.events = events; throw error; }
  };
  return { db, state };
}

test("calendar deadline boundaries: days 10/11 and 25/26", () => {
  for (const [date, days, tone] of [["2026-10-02", 10, "green"], ["2026-10-01", 11, "orange"], ["2026-09-17", 25, "orange"], ["2026-09-16", 26, "red"]]) {
    const state = workState(item(date, `${date}T12:00:00Z`), now);
    assert.equal(state.days, days); assert.equal(state.tone, tone);
  }
});

test("Berlin calendar days handle midnight and both DST transitions", () => {
  assert.equal(workDateKey("2026-10-11T22:01:00Z"), "2026-10-12");
  assert.equal(workAgeDays("2026-03-28T23:30:00Z", "2026-03-29T22:30:00Z"), 1);
  assert.equal(workAgeDays("2026-10-24T22:30:00Z", "2026-10-25T23:30:00Z"), 1);
  assert.equal(workAgeDays("2027-01-01", now), 0);
});

test("confirmation, payment, email retries and legacy unfinished work do not close the deadline", () => {
  assert.equal(workState({ ...overdue, processing: { status: "IN_PROGRESS" }, updatedAt: now, paidAt: now }, now).tone, "red");
  assert.equal(workState({ ...overdue, processing: { status: "DONE" } }, now).tone, "done");
  assert.equal(reminderDue({ ...overdue, status: "CANCELLED" }, now), false);
  assert.equal(reminderDue({ ...overdue, processing: { status: "DONE" } }, now), false);
});

test("test orders and normalized 111 contracts never generate reminders", () => {
  assert.equal(reminderDue({ ...overdue, workType: "ORDER" }, now), false);
  assert.equal(reminderDue({ ...overdue, workType: "TEST_ORDER" }, now), false);
  assert.equal(reminderDue({ ...overdue, contractNumber: " 1 1 1 123" }, now), false);
  assert.equal(reminderDue({ ...overdue, contractNumber: "222123" }, now), true);
});

test("reminders repeat only after seven calendar days; reopened work retains age", () => {
  assert.equal(reminderDue({ ...overdue, processing: { lastReminderAt: new Date("2026-10-06") } }, now), false);
  assert.equal(reminderDue({ ...overdue, processing: { status: "OPEN", lastReminderAt: new Date("2026-10-05") } }, now), true);
});

test("newest-first sorting, processing filters and counts cover done and cancelled work", () => {
  const green = item("new", "2026-10-10"), orange = item("warning", "2026-10-01");
  const done = { ...overdue, id: "done", processing: { status: "DONE" } }, cancelled = { ...overdue, id: "cancelled", status: "CANCELLED" };
  const items = [green, done, orange, cancelled, overdue];
  assert.deepEqual(filterAndSortWork(items, "", now).map((row) => row.id), ["new", "warning", "done", "cancelled", "old"]);
  assert.deepEqual(filterAndSortWork(items, "OVERDUE", now).map((row) => row.id), ["old"]);
  assert.equal(filterAndSortWork(items, "ACTIVE", now).length, 3);
  assert.deepEqual(summarizeWork(items, now), { OPEN: 3, DONE: 1, OVERDUE: 1 });
});

test("completion is final and stale updates are rejected", async () => {
  const { db, state } = memoryDb();
  let record = await updateWorkProcessing({ db, workType: "CLAIM", workId: "old", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  assert.equal(record.completedBy, "admin@example.com"); assert.ok(record.completedAt); assert.equal(record.version, 1);
  await assert.rejects(updateWorkProcessing({ db, workType: "CLAIM", workId: "old", actor: "other@example.com", status: "OPEN", expectedVersion: 0 }), /another worker/);
  await assert.rejects(updateWorkProcessing({ db, workType: "CLAIM", workId: "old", actor: "other@example.com", status: "OPEN", expectedVersion: 1 }), /cannot be reopened/);
  assert.equal(state.events.length, 1); assert.equal(state.claims[0].createdAt.getTime(), overdue.createdAt.getTime());
  const [attached] = await attachWorkProcessing(db, [overdue], "CLAIM");
  assert.equal(workState(attached, now).tone, "done");
});

test("invalid status, missing claims and order processing are rejected", async () => {
  const { db } = memoryDb();
  const args = { db, workType: "CLAIM", workId: "old", actor: "admin@example.com", status: "OPEN", expectedVersion: 0 };
  await assert.rejects(updateWorkProcessing({ ...args, status: "HACK" }), /Invalid/);
  await assert.rejects(updateWorkProcessing({ ...args, status: "IN_PROGRESS" }), /Invalid/);
  await assert.rejects(updateWorkProcessing({ ...args, workId: "missing" }), /not found/);
  for (const workType of ["ORDER", "TEST_ORDER"]) {
    await assert.rejects(updateWorkProcessing({ ...args, workType, status: "DONE" }), /Invalid work item/);
    await assert.rejects(attachWorkProcessing(db, [overdue], workType), /only available for claims/);
  }
});

test("dry run neither requires SMTP nor changes delivery/processing data", async () => {
  const { db, state } = memoryDb();
  const result = await sendWorkReminders({ db, now, env: {}, createTransport: () => { throw new Error("SMTP must not run"); } });
  assert.equal(result.items.length, 1); assert.equal(state.records.length, 0); assert.equal(state.batches.length, 0);
});

test("sender is fixed to the authenticated internal account with no fallback", async () => {
  assert.equal(resolveReminderConfig(env).user, "315primex.eu@gmail.com");
  assert.throws(() => resolveReminderConfig({ ...env, SMTP_111_USER: "other@example.com" }), /315primex/);
  const { db } = memoryDb();
  await assert.rejects(sendWorkReminders({ db, now, env: {}, dryRun: false }), /disabled/);
});

test("successful digest goes to 140, records delivery and prevents same-day and weekly duplicates", async () => {
  const { db, state } = memoryDb(); let sends = 0;
  const createTransport = (config) => { assert.equal(config.socketTimeout, 20000); return { sendMail: async (mail) => {
    assert.equal(mail.to, "140primex.eu@gmail.com"); assert.match(mail.from, /315primex/); sends++;
    return { accepted: [mail.to], messageId: "receipt" };
  } }; };
  assert.equal((await sendWorkReminders({ db, now, env, dryRun: false, createTransport })).count, 1);
  assert.equal(state.batches[0].status, "SENT"); assert.equal(state.records[0].lastReminderAt.getTime(), now.getTime());
  assert.equal((await sendWorkReminders({ db, now, env, dryRun: false, createTransport })).skipped, "sent");
  assert.equal((await sendWorkReminders({ db, now: new Date("2026-10-18T07:00:00Z"), env, dryRun: false, createTransport })).count, 0);
  assert.equal((await sendWorkReminders({ db, now: new Date("2026-10-19T07:00:00Z"), env, dryRun: false, createTransport })).count, 1);
  assert.equal(sends, 2);
});

test("local reminders go to 334 and record successful redirected delivery", async () => {
  const { db, state } = memoryDb();
  const local = { ...env, NODE_ENV: "development", SMTP_USER: "315primex.eu@gmail.com", SMTP_FROM: "315primex.eu@gmail.com", SMTP_PASS: "mock-local-secret" };
  const result = await sendWorkReminders({ db, now, env: local, dryRun: false, createTransport: () => ({ sendMail: async mail => {
    assert.equal(mail.to, "334primex.eu@gmail.com");
    return { accepted: [mail.to], messageId: "local-receipt" };
  } }) });
  assert.equal(result.count, 1);
  assert.equal(state.batches[0].status, "SENT");
  assert.equal(state.records[0].lastReminderAt.getTime(), now.getTime());
});

test("done items are rechecked by the worker and concurrent workers do not send", async () => {
  for (const initial of [{ records: [{ workType: "CLAIM", workId: "old", status: "DONE" }] }, { locked: false }]) {
    const { db } = memoryDb(initial);
    const result = await sendWorkReminders({ db, now, env, dryRun: false, createTransport: () => { throw new Error("No send allowed"); } });
    assert.equal(result.count, 0);
  }
});

test("explicit rejection is logged as FAILED and can retry without advancing lastReminderAt", async () => {
  const { db, state } = memoryDb();
  await assert.rejects(sendWorkReminders({ db, now, env, dryRun: false, createTransport: () => ({ sendMail: async () => { throw Object.assign(new Error("Rejected"), { responseCode: 550 }); } }) }), /Rejected/);
  assert.equal(state.batches[0].status, "FAILED"); assert.equal(state.records.length, 0);
  const result = await sendWorkReminders({ db, now, env, dryRun: false, createTransport: () => ({ sendMail: async () => ({ accepted: ["140primex.eu@gmail.com"] }) }) });
  assert.equal(result.count, 1); assert.equal(state.batches.length, 1);
});

test("ambiguous SMTP timeout is UNKNOWN and blocks another-day automatic duplicates", async () => {
  const { db, state } = memoryDb();
  await assert.rejects(sendWorkReminders({ db, now, env, dryRun: false, createTransport: () => ({ sendMail: async () => { throw Object.assign(new Error("Timeout after DATA"), { code: "ETIMEDOUT" }); } }) }), /Timeout/);
  assert.equal(state.batches[0].status, "UNKNOWN");
  const result = await sendWorkReminders({ db, now: new Date("2026-10-13T07:00:00Z"), env, dryRun: false, createTransport: () => { throw new Error("No retry allowed"); } });
  assert.equal(result.count, 0);
});

test("email escapes customer data and links to the right dashboard detail", () => {
  const mail = buildWorkReminder([{ ...overdue, fullName: '<script>alert("x")</script> &' }, { ...overdue, id: "claim 1", fullName: "Test" }], { now });
  assert.ok(!mail.html.includes("<script>")); assert.match(mail.html, /&lt;script&gt;/);
  assert.match(mail.text, /\/admin\/claims\/old/); assert.match(mail.text, /\/admin\/claims\/claim%201/);
  assert.ok(!mail.subject.includes("Bestellungen"));
  assert.throws(() => buildWorkReminder([{ ...overdue, workType: "ORDER" }], { now }), /only available for claims/);
});

test("review records the administrator and resolves ambiguous attempts without resending", async () => {
  for (const outcome of ["DELIVERED", "NOT_DELIVERED"]) {
    const { db, state } = memoryDb({ batches: [{ id: "uncertain", dateKey: "2026-10-11", status: "UNKNOWN", startedAt: now, error: "Timeout", items: [{ id: "old", workType: "CLAIM" }] }] });
    const result = await reviewWorkReminder({ db, batchId: "uncertain", outcome, actor: "reviewer@example.com" });
    assert.equal(result.status, outcome === "DELIVERED" ? "SENT" : "FAILED");
    assert.match(result.error, /reviewer@example.com/);
    assert.equal(state.records.length, outcome === "DELIVERED" ? 1 : 0);
  }
});

test("an active send cannot be reviewed or released for a duplicate", async () => {
  const { db } = memoryDb({ batches: [{ id: "sending", status: "SENDING", startedAt: new Date(), items: [] }] });
  await assert.rejects(reviewWorkReminder({ db, batchId: "sending", outcome: "NOT_DELIVERED", actor: "reviewer@example.com" }), /still sending/);
});

test("database failure after SMTP acceptance is UNKNOWN and never blindly retried", async () => {
  const { db, state } = memoryDb();
  db.workProcessing.upsert = async () => { throw new Error("Database write failed after send"); };
  await assert.rejects(sendWorkReminders({ db, now, env, dryRun: false, createTransport: () => ({ sendMail: async () => ({ accepted: ["140primex.eu@gmail.com"] }) }) }), /Database write failed/);
  assert.equal(state.batches[0].status, "UNKNOWN");
});

test("reminder worker never queries orders, even when overdue orders exist", async () => {
  const { db } = memoryDb({ orders: [{ ...overdue, workType: "ORDER" }], claims: [] });
  db.order.findMany = async () => { throw new Error("Orders must not be queried"); };
  const result = await sendWorkReminders({ db, now, env, dryRun: false, createTransport: () => { throw new Error("No email expected"); } });
  assert.equal(result.count, 0);
  assert.equal(result.skipped, "no-due-items");
});

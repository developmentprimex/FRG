import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { buildOrderTicketSnapshot, findOrCreateOrderTicket, lockOrderTickets, recordOrderTicketSubmission } from "../lib/order-tickets.js";
import { formatOrderTicketReference, orderTicketSeries } from "../lib/order-ticket-reference.js";
import { getOrderTicketsPage, latestOrderTickets, orderTicketConditions } from "../lib/order-ticket-admin.js";
import { updateWorkProcessing } from "../lib/work-processing.js";

const order = (id = "order-1", contractNumber = "670123") => ({
  id, contractNumber, orderNumber: `${contractNumber}-1`, firstName: "Saved", lastName: "Customer",
  email: "saved@example.com", phone: "0123", totalPrice: "123.45", notes: "Original note",
  preferredDeliveryDate: new Date("2026-12-01T00:00:00Z"),
  items: [{ code: "APPLIANCE", itemType: "COMPONENT", nameSnapshot: "Fridge", priceSnapshot: "123.45", quantity: 1 }],
});

test("order references and series keep PX separate from live claims and orders", () => {
  assert.equal(formatOrderTicketReference({ contractNumber: "670123", ticketNumber: 1000, ticketSequence: 2 }), "#1000 670123 NK 02");
  assert.equal(orderTicketSeries("live"), "live");
  assert.equal(orderTicketSeries("test"), "px");
  assert.throws(() => orderTicketSeries("px"), /Invalid/);
});

test("snapshots retain submitted customer, price and items without payment credentials or mutable references", () => {
  const source = { ...order(), stripeCheckoutSessionId: "secret", confirmationEmailDelivery: { private: true } };
  const snapshot = buildOrderTicketSnapshot(source);
  source.items[0].nameSnapshot = "Changed";
  assert.equal(snapshot.items[0].nameSnapshot, "Fridge");
  assert.equal(snapshot.totalPrice, 123.45);
  assert.equal(snapshot.preferredDeliveryDate, "2026-12-01T00:00:00.000Z");
  assert.equal(snapshot.stripeCheckoutSessionId, undefined);
  assert.equal(snapshot.confirmationEmailDelivery, undefined);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

test("ambiguous open tickets block submission without silently choosing or creating a case", async () => {
  await assert.rejects(findOrCreateOrderTicket({ $queryRaw: async () => [{ id: "a" }, { id: "b" }] }, "670", "live"), error => error.status === 409);
});

test("filters bind search input, ignore invalid calendar dates and use Berlin overdue boundaries", () => {
  const attack = "' OR TRUE; --";
  const result = orderTicketConditions({ series: "live", q: attack, dateFrom: "2026-02-30", dateTo: "garbage" }, new Date("2026-11-04T12:00:00Z"));
  assert.ok(!result.where.text.includes(attack));
  assert.ok(result.where.values.includes(`%${attack}%`));
  assert.ok(!result.where.values.some(value => value instanceof Date));
  assert.equal(result.overdue.values[0].toISOString(), "2026-10-09T22:00:00.000Z");
});

function migrationStatements(source) {
  const bodies = [];
  return source.replace(/\$\$[\s\S]*?\$\$/g, body => { bodies.push(body); return `__BODY_${bodies.length - 1}__`; })
    .replace(/--[^\n]*/g, "").split(";").map(statement => statement.trim())
    .filter(statement => statement && !["BEGIN", "COMMIT"].includes(statement))
    .map(statement => statement.replace(/__BODY_(\d+)__/g, (_, index) => bodies[Number(index)]));
}

test("PostgreSQL: migration, concurrent follow-ups, final completion, separate numbering, history and pagination", { skip: !process.env.ORDER_TICKET_TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.ORDER_TICKET_TEST_DATABASE_URL);
  const schema = `order_ticket_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new PrismaClient({ datasourceUrl: url.toString() });
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const migration = readFileSync(new URL("../prisma/migrations/20261104150000_add_order_tickets/migration.sql", import.meta.url), "utf8");
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      await tx.$executeRawUnsafe('CREATE TABLE "KitchenContract" ("id" TEXT PRIMARY KEY, "contractNumber" TEXT)');
      await tx.$executeRawUnsafe('CREATE TABLE "Order" ("id" TEXT PRIMARY KEY, "contractNumber" TEXT, "kitchenContractId" TEXT, "orderNumber" TEXT, "createdAt" TIMESTAMP(3), "firstName" TEXT, "lastName" TEXT, "stripeCheckoutSessionId" TEXT)');
      await tx.$executeRawUnsafe('CREATE TABLE "TestOrder" (LIKE "Order" INCLUDING ALL)');
      await tx.$executeRawUnsafe('CREATE TABLE "OrderItem" ("id" TEXT PRIMARY KEY, "orderId" TEXT, "createdAt" TIMESTAMP(3), "nameSnapshot" TEXT)');
      await tx.$executeRawUnsafe('CREATE TABLE "TestOrderItem" (LIKE "OrderItem" INCLUDING ALL)');
      await tx.$executeRawUnsafe('CREATE TABLE "WorkProcessing" ("id" TEXT PRIMARY KEY, "workType" TEXT NOT NULL, "workId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'OPEN\', "assignedTo" TEXT, "completedAt" TIMESTAMP(3), "completedBy" TEXT, "lastReminderAt" TIMESTAMP(3), "version" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE ("workType", "workId"))');
      await tx.$executeRawUnsafe('CREATE TABLE "WorkProcessingEvent" ("id" TEXT PRIMARY KEY, "workType" TEXT, "workId" TEXT, "actor" TEXT, "fromStatus" TEXT, "toStatus" TEXT, "fromAssignee" TEXT, "toAssignee" TEXT, "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP)');
      await tx.$executeRawUnsafe(`INSERT INTO "Order" VALUES ('legacy-a','670LEGACY',NULL,'670LEGACY-1','2026-09-01','Original','Customer','secret'), ('legacy-b','670LEGACY',NULL,'670LEGACY-2','2026-09-02','Second','Customer',NULL)`);
      await tx.$executeRawUnsafe(`INSERT INTO "TestOrder" VALUES ('legacy-px','111LEGACY',NULL,'111LEGACY-1','2026-09-01','PX','Customer',NULL)`);
      await tx.$executeRawUnsafe(`INSERT INTO "OrderItem" VALUES ('legacy-item','legacy-a','2026-09-01','Saved appliance')`);
      for (const statement of migrationStatements(migration)) await tx.$executeRawUnsafe(statement);
    }, { timeout: 45000 });
    const backfill = await db.orderTicket.findMany({ orderBy: { ticketSeries: "asc" }, include: { submissions: true } });
    assert.equal(backfill.length, 2);
    assert.deepEqual(backfill.map(ticket => ticket.ticketNumber), [1000, 1000]);
    const legacy = backfill.find(ticket => ticket.ticketSeries === "live");
    assert.equal(legacy.submissions.length, 2);
    const snapshot = legacy.submissions.find(submission => submission.orderId === "legacy-a").payload;
    assert.equal(snapshot.items[0].nameSnapshot, "Saved appliance");
    assert.equal(snapshot.stripeCheckoutSessionId, undefined);

    async function submit(value, kind = "live") {
      return db.$transaction(async tx => {
        await lockOrderTickets(tx);
        return recordOrderTicketSubmission(tx, value, kind);
      }, { maxWait: 10000, timeout: 20000 });
    }
    const [first, followUp] = await Promise.all([submit(order()), submit({ ...order(), notes: "Follow-up" })]);
    assert.equal(first.id, followUp.id);
    assert.equal(first.ticketNumber, 1001);
    assert.equal(first.ticketSequence, 1);
    assert.equal(await db.orderTicketSubmission.count({ where: { ticketId: first.id } }), 2);

    const closed = await updateWorkProcessing({ db, workType: "ORDER", workId: first.id, status: "DONE", actor: "worker@example.com", expectedVersion: 0 });
    assert.equal(closed.version, 1);
    assert.equal(closed.completedBy, "worker@example.com");
    assert.equal(closed.feedbackInvitation, undefined);
    await assert.rejects(updateWorkProcessing({ db, workType: "ORDER", workId: first.id, status: "OPEN", actor: "worker@example.com", expectedVersion: 1 }), /cannot be reopened/);
    await assert.rejects(updateWorkProcessing({ db, workType: "ORDER", workId: first.id, status: "DONE", actor: "other@example.com", expectedVersion: 0 }), /another worker/);
    const next = await submit({ ...order(), notes: "New case" });
    assert.notEqual(next.id, first.id);
    assert.equal(next.ticketNumber, 1002);
    assert.equal(next.ticketSequence, 2);
    assert.equal((await db.orderTicketSubmission.findUnique({ where: { id: first.submissionId } })).payload.notes, "Original note");
    assert.equal(await db.workProcessingEvent.count({ where: { workType: "ORDER", workId: first.id } }), 1);
    const px = await submit(order("px-order", "111NEW"), "test");
    assert.equal(px.ticketNumber, 1001);
    assert.equal(px.ticketSeries, "px");

    // Completion and a new submission share the same lock, so either ordering is valid.
    const [raceSubmission] = await Promise.all([
      submit({ ...order("race", "670123"), notes: "Concurrent" }),
      updateWorkProcessing({ db, workType: "ORDER", workId: next.id, status: "DONE", actor: "worker@example.com", expectedVersion: 0 }),
    ]);
    assert.ok(raceSubmission.id === next.id || raceSubmission.ticketSequence === 3);
    assert.equal(await db.workProcessingEvent.count({ where: { workType: "ORDER", workId: next.id } }), 1);
    const mapping = await latestOrderTickets(db, [{ id: "order-1" }], "live");
    assert.equal(mapping.get("order-1").id, next.id);
    assert.equal((await latestOrderTickets(db, [{ id: "order-1" }], "test")).size, 0);

    const result = await getOrderTicketsPage(db, { series: "live", processing: "DONE", q: "saved@example.com" }, 999);
    assert.equal(result.pagination.totalItems, 2);
    assert.equal(result.pagination.page, 1);
    assert.ok(result.items.every(ticket => ticket.ticketSeries === "live" && ticket.processing.status === "DONE"));
    const old = await getOrderTicketsPage(db, { series: "live", processing: "OVERDUE" }, 1, new Date("2026-11-04T12:00:00Z"));
    assert.ok(old.items.some(ticket => ticket.id === legacy.id));
    assert.equal((await getOrderTicketsPage(db, { series: "px", q: "#1001" }, 1)).items[0].id, px.id);
    assert.equal((await getOrderTicketsPage(db, { series: "live", q: "' OR TRUE; --" }, 1)).pagination.totalItems, 0);
  } finally {
    await db.$disconnect();
    // Only the unique schema created by this test can be removed.
    assert.match(schema, /^order_ticket_test_[a-f0-9]{32}$/);
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
  }
});

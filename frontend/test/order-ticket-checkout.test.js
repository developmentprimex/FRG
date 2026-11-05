import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { getPreferredDeliveryDateAfterWeeks } from "../lib/preferred-delivery.js";
import { updateWorkProcessing } from "../lib/work-processing.js";
import "../lib/email/order-notifications.js";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && context.parentURL) {
    const candidate = new URL(`${specifier}.js`, context.parentURL);
    if (fs.existsSync(candidate)) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} });

test("PostgreSQL checkout: editable orders and additional purchases share an open ticket; Done freezes history and starts the next ticket", { skip: !process.env.ORDER_TICKET_TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.ORDER_TICKET_TEST_DATABASE_URL);
  const schema = `order_checkout_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new PrismaClient({ datasourceUrl: url.toString() });
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const cli = new URL("../node_modules/prisma/build/index.js", import.meta.url);
  const sql = execFileSync(process.execPath, [fileURLToPath(cli), "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], cwd: new URL("../", import.meta.url) });
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const statement of sql.replace(/--[^\n]*/g, "").split(";").map(value => value.trim()).filter(value => value && !value.startsWith("CREATE SCHEMA"))) {
        await tx.$executeRawUnsafe(statement);
      }
      const migration = fs.readFileSync(new URL("../prisma/migrations/20261104150000_add_order_tickets/migration.sql", import.meta.url), "utf8");
      const triggers = migration.slice(migration.indexOf("CREATE SEQUENCE"), migration.indexOf('CREATE TABLE "OrderTicketSubmission"'));
      const bodies = [];
      const statements = triggers.replace(/\$\$[\s\S]*?\$\$/g, body => { bodies.push(body); return `__BODY_${bodies.length - 1}__`; }).split(";");
      for (const statement of statements.map(value => value.trim()).filter(Boolean)) {
        await tx.$executeRawUnsafe(statement.replace(/__BODY_(\d+)__/g, (_, index) => bodies[Number(index)]));
      }
    }, { timeout: 45000 });
    // Route the actual checkout module and all of its dependencies to this schema.
    globalThis.prisma = db;
    const { createOrderFromSubmission, buildOrderForNotificationsWithConfirmedBaseline } = await import("../lib/orders.js");
    const kitchen = await db.kitchen.create({ data: {
      slug: "order-ticket-checkout", name: "Ticket checkout fixture", status: "ACTIVE",
      items: { create: [
        { code: "TICKET-ACCESSORY-A", name: "Fixture A", itemType: "ACCESSORY", price: 10 },
        { code: "TICKET-ACCESSORY-B", name: "Fixture B", itemType: "ACCESSORY", price: 20 },
      ] },
    } });
    for (const [contractNumber, kind] of [["670CHECKOUT", "live"], ["111CHECKOUT", "test"]]) {
      await db.kitchenContract.create({ data: { contractNumber, kitchenId: kitchen.id } });
      const customer = { contractNumber, firstName: "Test", lastName: "Customer", email: "test@example.com", phone: "123456", address1: "Test address", postalCode: "10115", city: "Berlin", country: "DE", preferredDeliveryDate: getPreferredDeliveryDateAfterWeeks(4), paymentMethod: "card", consent: true, termsConsent: true };
      const submit = (code, notes, quantity = 1) => createOrderFromSubmission({ kitchenSlug: kitchen.slug,
        orderPayload: { customer: { ...customer, notes }, accessories: [{ code, quantity }], components: [], services: [] },
      });
      const delegate = kind === "test" ? db.testOrder : db.order;
      const first = await submit("TICKET-ACCESSORY-A", "Initial");
      const edited = await submit("TICKET-ACCESSORY-A", "Edited", 2);
      assert.equal(first.id, edited.id);
      assert.equal(first.ticket.id, edited.ticket.id);
      assert.equal(edited.ticket.ticketNumber, 1000);
      assert.equal(edited.total, 20);
      assert.equal((await db.orderTicketSubmission.findFirst({ where: { ticketId: first.ticket.id }, orderBy: { createdAt: "asc" } })).payload.notes, "Initial");
      assert.deepEqual(edited.notifications, { emailSent: false, webhookSent: false, emailError: "", webhookError: "" });
      await delegate.update({ where: { id: first.id }, data: { status: "CONFIRMED" } });
      const additional = await submit("TICKET-ACCESSORY-B", "Additional purchase");
      assert.notEqual(additional.id, first.id);
      assert.equal(additional.ticket.id, first.ticket.id);
      assert.equal(additional.orderNumber, `${contractNumber}-2`);
      assert.equal(await delegate.count(), 2);
      const record = await delegate.findUnique({ where: { id: additional.id }, include: { kitchen: true, items: true } });
      const notification = await buildOrderForNotificationsWithConfirmedBaseline(record, kind);
      assert.equal(notification.ticket.reference, first.ticket.reference);
      await updateWorkProcessing({ db, workType: "ORDER", workId: first.ticket.id, status: "DONE", actor: "worker@example.com", expectedVersion: 0 });
      const next = await submit("TICKET-ACCESSORY-B", "Next ticket", 2);
      assert.notEqual(next.ticket.id, first.ticket.id);
      assert.equal(next.ticket.ticketNumber, 1001);
      assert.equal(next.ticket.ticketSequence, 2);
      assert.equal(await db.orderTicketSubmission.count({ where: { ticketId: first.ticket.id } }), 3);
      assert.equal((await delegate.findUnique({ where: { id: additional.id } })).status, "NEW");
      assert.equal(await db.claimFeedbackInvitation.count(), 0);
    }
  } finally {
    delete globalThis.prisma;
    await db.$disconnect();
    assert.match(schema, /^order_checkout_test_[a-f0-9]{32}$/);
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.$disconnect();
  }
});

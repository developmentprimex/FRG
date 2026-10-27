const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("../frontend/node_modules/dotenv");
const { PrismaClient } = require("../frontend/node_modules/@prisma/client");

async function main() {
  const values = dotenv.parse(fs.readFileSync(path.join(__dirname, "../frontend/.env")));
  const url = new URL(values.DATABASE_URL);
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname), "Verification is local only");
  const schema = `work_processing_verify_${Date.now()}`;
  assert.match(schema, /^work_processing_verify_[0-9]+$/);
  const rootDb = new PrismaClient({ datasourceUrl: url.href });
  url.searchParams.set("schema", schema);
  url.searchParams.set("connection_limit", "1");
  const db = new PrismaClient({ datasourceUrl: url.href });
  const deliveryDb = new PrismaClient({ datasourceUrl: url.href });
  const [{ updateWorkProcessing, attachWorkProcessing }, { sendWorkReminders }] = await Promise.all([
    import("../frontend/lib/work-processing.js"), import("../frontend/lib/email/work-reminders.js"),
  ]);
  let created = false;
  try {
    await rootDb.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
    const migration = fs.readFileSync(path.join(__dirname, "../frontend/prisma/migrations/20261012120000_add_work_processing/migration.sql"), "utf8");
    for (const sql of migration.split(";").filter((sql) => sql.trim())) await db.$executeRawUnsafe(sql);
    const simplified = fs.readFileSync(path.join(__dirname, "../frontend/prisma/migrations/20261012130000_simplify_work_processing/migration.sql"), "utf8");
    for (const sql of simplified.split(";").filter((sql) => sql.trim())) await db.$executeRawUnsafe(sql);
    await db.$executeRawUnsafe(`CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'EMAILED', 'CONFIRMED', 'CANCELLED')`);
    await db.$executeRawUnsafe('CREATE TABLE "Order" ("id" TEXT PRIMARY KEY, "status" "OrderStatus", "contractNumber" TEXT, "orderNumber" TEXT, "firstName" TEXT, "lastName" TEXT, "createdAt" TIMESTAMP(3))');
    await db.$executeRawUnsafe('CREATE TABLE "TestOrder" (LIKE "Order" INCLUDING ALL)');
    await db.$executeRawUnsafe('CREATE TABLE "ServiceClaim" ("id" TEXT PRIMARY KEY, "contractNumber" TEXT, "claimSequence" INT, "fullName" TEXT, "createdAt" TIMESTAMP(3))');
    await db.$executeRawUnsafe('CREATE TABLE "AdminUser" ("id" TEXT PRIMARY KEY, "email" TEXT, "isActive" BOOLEAN)');
    await db.$executeRawUnsafe(`INSERT INTO "Order" VALUES ('fixture-order', 'CONFIRMED', '670TEST', 'VERIFY-1', 'Synthetic', 'Verification', '2026-09-01')`);
    await db.$executeRawUnsafe(`INSERT INTO "ServiceClaim" VALUES ('fixture-claim', '670TEST', 1, 'Synthetic Verification', '2026-09-01'), ('fixture-px', '111TEST', 1, 'Test excluded', '2026-09-01')`);
    await db.$executeRawUnsafe(`INSERT INTO "AdminUser" VALUES ('fixture-admin', 'worker@example.com', true)`);
    const args = { db, workType: "ORDER", workId: "fixture-order", actor: "worker@example.com", expectedVersion: 0, status: "DONE" };
    const record = await updateWorkProcessing(args);
    assert.equal(record.version, 1);
    await assert.rejects(updateWorkProcessing({ ...args, status: "OPEN" }), /another worker/);
    const done = await updateWorkProcessing({ ...args, expectedVersion: 1, status: "OPEN" });
    assert.equal(done.completedBy, null);
    await updateWorkProcessing({ ...args, expectedVersion: 2, status: "OPEN" });
    assert.equal(await db.workProcessingEvent.count(), 2);
    const now = new Date("2026-10-12T07:00:00Z");
    const env = { NODE_ENV: "test", WORK_REMINDERS_ENABLED: "true", SMTP_111_USER: "315primex.eu@gmail.com", SMTP_111_FROM: "315primex.eu@gmail.com", SMTP_111_PASS: "mock-only" };
    let sends = 0;
    const result = await sendWorkReminders({ db, deliveryDb, now, env, dryRun: false, createTransport: () => ({ sendMail: async (mail) => {
      assert.equal(mail.to, "140primex.eu@gmail.com"); sends++;
      assert.equal(await deliveryDb.workReminderBatch.count({ where: { status: "SENDING" } }), 1, "Attempt is committed before SMTP");
      return { accepted: [mail.to], messageId: "mock-accepted" };
    } }) });
    assert.equal(result.count, 2); assert.equal(sends, 1);
    assert.equal(await db.workReminderBatch.count({ where: { status: "SENT" } }), 1);
    const [tracked] = await attachWorkProcessing(db, [{ id: "fixture-order" }], "ORDER");
    assert.equal(tracked.processing.lastReminderAt.getTime(), now.getTime());
    const again = await sendWorkReminders({ db, deliveryDb, now, env, dryRun: false, createTransport: () => { throw new Error("Must not send twice"); } });
    assert.equal(again.skipped, "sent");
    console.log("PASS: actual PostgreSQL migration, advisory locks, completion/reopen, version conflicts, status audit and durable digest ledger with connection_limit=1");
    console.log("No outgoing email; synthetic fixtures were isolated from application records.");
  } finally {
    await db.$disconnect(); await deliveryDb.$disconnect();
    if (created) await rootDb.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await rootDb.$disconnect();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });

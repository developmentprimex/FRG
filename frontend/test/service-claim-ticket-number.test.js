import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";

const source = readFileSync(new URL("../app/api/service-claims/route.js", import.meta.url), "utf8");
const insertSource = source.slice(source.indexOf("function buildServiceClaimInsertSql("), source.indexOf("function getReferencePlanAssetContentType("));

test("insert uses database default and exposes the returned number only after commit", async () => {
  const payload = { id: "fixture", contractNumber: "670105809", ticketNumber: 9999 };
  const context = vm.createContext({
    Prisma,
    lockWorkProcessing: async () => {},
    findOpenClaim: async () => null,
    saveClaimSubmission: async (_tx, _payload, claim) => claim,
    getServiceClaimInsertColumnSupport: async () => ({ includeClaimSequence: true }),
    getMissingOptionalInsertColumns: () => [],
  });
  vm.runInContext(insertSource, context);
  const db = { $transaction: async (run) => {
    const saved = await run({ $queryRaw: async (sql) => {
      const text = sql.sql || sql.join("?");
      if (text.includes("FOR UPDATE")) return [{ id: "contract" }];
      if (text.includes("nextSequence")) return [{ nextSequence: 2 }];
      assert.ok(text.includes('RETURNING "ticketNumber"'));
      assert.ok(!text.split("VALUES")[0].includes('"ticketNumber"'));
      assert.ok(!sql.values.includes(9999));
      return [{ ticketNumber: 1020 }];
    } });
    assert.equal(payload.ticketNumber, 9999, "payload must not change before commit");
    return saved;
  } };
  await context.insertServiceClaimRecord(db, payload);
  assert.equal(payload.ticketNumber, 1020);
  assert.equal(payload.claimSequence, 2);
});

// Opt in with TICKET_TEST_DATABASE_URL. Fixtures and DDL are always rolled back.
for (const populated of [false, true]) {
  test(`PostgreSQL ticket migration: ${populated ? "existing claims" : "empty table"}`, { skip: !process.env.TICKET_TEST_DATABASE_URL }, async () => {
    const db = new PrismaClient({ datasourceUrl: process.env.TICKET_TEST_DATABASE_URL });
    const rollback = new Error("rollback ticket fixtures");
    try {
      await assert.rejects(db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('CREATE SCHEMA ticket_number_migration_test');
        await tx.$executeRawUnsafe('SET LOCAL search_path TO ticket_number_migration_test');
        await tx.$executeRawUnsafe('CREATE TABLE "ServiceClaim" ("id" TEXT PRIMARY KEY, "createdAt" TIMESTAMP NOT NULL)');
        if (populated) await tx.$executeRawUnsafe(`INSERT INTO "ServiceClaim" VALUES ('b', '2026-01-01'), ('a', '2026-01-01'), ('c', '2026-02-01')`);
        const migration = readFileSync(new URL("../prisma/migrations/20261013140000_add_service_claim_ticket_number/migration.sql", import.meta.url), "utf8");
        const statements = migration.replace(/--[^\n]*/g, "").split(";").map((sql) => sql.trim()).filter((sql) => sql && sql !== "BEGIN" && sql !== "COMMIT");
        for (const sql of statements) {
          if (sql.startsWith("SELECT")) await tx.$queryRawUnsafe(sql);
          else await tx.$executeRawUnsafe(sql);
        }
        const existing = await tx.$queryRawUnsafe('SELECT "id", "ticketNumber" FROM "ServiceClaim" ORDER BY "ticketNumber"');
        assert.deepEqual(existing, populated ? [{ id: "a", ticketNumber: 1000 }, { id: "b", ticketNumber: 1001 }, { id: "c", ticketNumber: 1002 }] : []);
        const inserted = await tx.$queryRawUnsafe(`INSERT INTO "ServiceClaim" ("id", "createdAt") VALUES ('new', NOW()), ('new2', NOW()) RETURNING "ticketNumber"`);
        assert.deepEqual(inserted.map((row) => row.ticketNumber), populated ? [1003, 1004] : [1000, 1001]);
        await tx.$executeRawUnsafe(`DELETE FROM "ServiceClaim" WHERE "id" = 'new2'`);
        const next = await tx.$queryRawUnsafe(`INSERT INTO "ServiceClaim" ("id", "createdAt") VALUES ('new3', NOW()) RETURNING "ticketNumber"`);
        assert.equal(next[0].ticketNumber, populated ? 1005 : 1002);
        throw rollback;
      }), (error) => error === rollback);
    } finally { await db.$disconnect(); }
  });
}

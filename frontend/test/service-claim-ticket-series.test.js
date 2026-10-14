import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

for (const populated of [false, true]) {
  test(`independent PostgreSQL ticket series: ${populated ? "backfill" : "empty database"}`, { skip: !process.env.TICKET_TEST_DATABASE_URL }, async () => {
    const db = new PrismaClient({ datasourceUrl: process.env.TICKET_TEST_DATABASE_URL });
    const rollback = new Error("rollback isolated series test");
    try {
      await assert.rejects(db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('CREATE SCHEMA ticket_series_test');
        await tx.$executeRawUnsafe('SET LOCAL search_path TO ticket_series_test');
        await tx.$executeRawUnsafe('CREATE SEQUENCE "ServiceClaim_ticketNumber_seq" AS INTEGER START 1000 MINVALUE 1000');
        await tx.$executeRawUnsafe(`CREATE TABLE "ServiceClaim" ("id" TEXT PRIMARY KEY, "contractNumber" TEXT NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(), "ticketNumber" INTEGER NOT NULL DEFAULT nextval('"ServiceClaim_ticketNumber_seq"'))`);
        await tx.$executeRawUnsafe('CREATE UNIQUE INDEX "ServiceClaim_ticketNumber_key" ON "ServiceClaim"("ticketNumber")');
        if (populated) await tx.$executeRawUnsafe(`INSERT INTO "ServiceClaim" ("id", "contractNumber", "createdAt") VALUES ('a','670001','2026-01-01'), ('b','111001','2026-01-02'), ('c','670002','2026-01-03')`);
        const migration = readFileSync(new URL('../prisma/migrations/20261013160000_separate_px_ticket_numbers/migration.sql', import.meta.url), 'utf8').replace(/--[^\n]*/g, '');
        const statements = migration.match(/(?:[^;$]|\$(?!\$)|\$\$[\s\S]*?\$\$)+;/g).map((sql) => sql.trim().replace(/;$/, '')).filter((sql) => sql !== 'BEGIN' && sql !== 'COMMIT');
        for (const sql of statements) {
          if (sql.startsWith('SELECT')) await tx.$queryRawUnsafe(sql);
          else await tx.$executeRawUnsafe(sql);
        }
        if (populated) {
          const rows = await tx.$queryRawUnsafe('SELECT "ticketSeries", "ticketNumber" FROM "ServiceClaim" ORDER BY "id"');
          assert.deepEqual(rows, [{ticketSeries:'live',ticketNumber:1000},{ticketSeries:'px',ticketNumber:1000},{ticketSeries:'live',ticketNumber:1001}]);
        }
        const insert = async (id, contract) => (await tx.$queryRaw`INSERT INTO "ServiceClaim" ("id", "contractNumber") VALUES (${id}, ${contract}) RETURNING "ticketNumber", "ticketSeries"`)[0];
        assert.deepEqual(await insert('px1',' 111 999 '), {ticketSeries:'px',ticketNumber:populated ? 1001 : 1000});
        assert.deepEqual(await insert('px2','111998'), {ticketSeries:'px',ticketNumber:populated ? 1002 : 1001});
        assert.deepEqual(await insert('live1','670999'), {ticketSeries:'live',ticketNumber:populated ? 1002 : 1000});
        assert.deepEqual(await insert('live2','222999'), {ticketSeries:'live',ticketNumber:populated ? 1003 : 1001});
        assert.deepEqual(await insert('px3','111997'), {ticketSeries:'px',ticketNumber:populated ? 1003 : 1002});
        throw rollback;
      }), (error) => error === rollback);
    } finally { await db.$disconnect(); }
  });
}

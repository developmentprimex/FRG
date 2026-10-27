import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { Prisma, PrismaClient } from "@prisma/client";
import { findOpenClaim, saveClaimSubmission } from "../lib/service-claim-submissions.js";
import { lockWorkProcessing } from "../lib/work-processing.js";

test("ambiguous legacy open claims are blocked without choosing or modifying one", async () => {
  await assert.rejects(findOpenClaim({ $queryRaw: async () => [{ id: "a" }, { id: "b" }] }, "670"), (error) => error.status === 409);
});

test("follow-up reserves new attachment indices and preserves the original snapshot", async () => {
  const writes = [];
  const tx = { $executeRaw: async (strings, ...values) => { writes.push({ sql: strings.join("?"), values }); } };
  const payload = { id: "submission", problemDescription: "New issue", attachmentsJson: '[{"filename":"new.jpg"}]' };
  const result = await saveClaimSubmission(tx, payload, { id: "ticket", ticketNumber: 1020, claimSequence: 2, attachmentsJson: '[{"filename":"old.jpg"}]' }, true);
  assert.equal(result.id, "ticket"); assert.equal(result.attachmentStart, 1);
  assert.equal(result.ticketNumber, 1020); assert.equal(result.claimSequence, 2);
  assert.equal(payload.id, "submission");
  assert.equal(JSON.parse(writes[0].values[2]).problemDescription, "New issue");
  assert.deepEqual(JSON.parse(writes[1].values[0]).map((file) => file.filename), ["old.jpg", "new.jpg"]);
});

test("PostgreSQL: open submissions reuse both numbers, Done starts the next KD, history remains intact", { skip: !process.env.TICKET_TEST_DATABASE_URL }, async () => {
  const db = new PrismaClient({ datasourceUrl: process.env.TICKET_TEST_DATABASE_URL });
  const rollback = new Error("rollback isolated fixtures");
  const source = readFileSync(new URL("../app/api/service-claims/route.js", import.meta.url), "utf8");
  const functions = source.slice(source.indexOf("function buildServiceClaimInsertSql("), source.indexOf("function getReferencePlanAssetContentType("));
  const context = vm.createContext({ Prisma, lockWorkProcessing, findOpenClaim, saveClaimSubmission,
    getServiceClaimInsertColumnSupport: async () => ({ includeClaimSequence: true, includeAttachmentsJson: true }),
    getMissingOptionalInsertColumns: () => [] });
  vm.runInContext(functions, context);
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('CREATE SCHEMA claim_submission_test');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO claim_submission_test');
      await tx.$executeRawUnsafe('CREATE TABLE "ServiceClaim" (LIKE public."ServiceClaim" INCLUDING DEFAULTS INCLUDING CONSTRAINTS)');
      await tx.$executeRawUnsafe('CREATE SEQUENCE claim_submission_test.ticket_number START 1000');
      await tx.$executeRawUnsafe(`ALTER TABLE "ServiceClaim" ALTER COLUMN "ticketNumber" SET DEFAULT nextval('claim_submission_test.ticket_number')`);
      await tx.$executeRawUnsafe('ALTER TABLE "ServiceClaim" ADD PRIMARY KEY ("id")');
      await tx.$executeRawUnsafe('CREATE UNIQUE INDEX ticket_kd_test ON "ServiceClaim" ("contractNumber", "claimSequence")');
      await tx.$executeRawUnsafe('CREATE TABLE "KitchenContract" ("id" TEXT, "contractNumber" TEXT)');
      await tx.$executeRawUnsafe('CREATE TABLE "WorkProcessing" ("workId" TEXT, "workType" TEXT, "status" TEXT)');
      const sql = readFileSync(new URL("../prisma/migrations/20261013150000_add_claim_submissions/migration.sql", import.meta.url), "utf8");
      for (const statement of sql.split(";").map((part) => part.trim()).filter((part) => part && part !== "BEGIN" && part !== "COMMIT")) await tx.$executeRawUnsafe(statement);
      const client = { $transaction: async (run) => run(tx) };
      const make = (id) => ({ id, contractNumber: "670TEST", fullName: "Fixture", landlordContact: "Fixture", problemDescription: id, serialNumber: "N/A", requestType: "complaint", attachmentsJson: JSON.stringify([{ filename: `${id}.jpg` }]) });
      const first = make("first"), followUp = make("followup"), next = make("next");
      await context.insertServiceClaimRecord(client, first);
      await context.insertServiceClaimRecord(client, followUp);
      assert.equal(first.ticketNumber, 1000); assert.equal(first.claimSequence, 1);
      assert.equal(followUp.id, first.id); assert.equal(followUp.ticketNumber, 1000); assert.equal(followUp.claimSequence, 1);
      assert.equal(followUp.attachmentStart, 1); assert.equal(followUp.isFollowUp, true);
      await tx.$executeRaw`INSERT INTO "WorkProcessing" VALUES (${first.id}, 'CLAIM', 'DONE')`;
      await context.insertServiceClaimRecord(client, next);
      assert.equal(next.ticketNumber, 1001); assert.equal(next.claimSequence, 2);
      const history = await tx.$queryRaw`SELECT "payload", "attachmentStart" FROM "ServiceClaimSubmission" WHERE "claimId" = ${first.id} ORDER BY "attachmentStart"`;
      assert.deepEqual(history.map((entry) => entry.payload.problemDescription), ["first", "followup"]);
      assert.deepEqual(history.map((entry) => entry.attachmentStart), [0, 1]);
      throw rollback;
    }, { timeout: 20000 }), (error) => error === rollback);
  } finally { await db.$disconnect(); }
});

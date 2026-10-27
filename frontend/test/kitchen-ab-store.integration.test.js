import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";
import { createRequire } from "node:module";
import references from "../data/kitchen-specifications/index.json" with { type: "json" };
import { validateAbUpload } from "../lib/kitchen-ab-validation.js";
import { activateKitchenAb, listKitchenAbImports, readKitchenAb, readKitchenAbVersion, recordAbSyncRun, saveKitchenAb } from "../lib/kitchen-ab-store.js";
import { migrateKitchenAbPdfs } from "../lib/kitchen-ab-pdf-migration.js";

const require = createRequire(import.meta.url);

test("Postgres AB imports survive retries, preserve active versions, stage conflicts, and activate reviewed revisions", {
  skip: process.env.AB_SYNC_INTEGRATION !== "1",
}, async () => {
  require("@next/env").loadEnvConfig(process.cwd());
  const { PrismaClient } = require("@prisma/client");
  const base = new PrismaClient();
  const schema = `ab_test_${randomUUID().replaceAll("-", "")}`;
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("schema", schema);
  const client = new PrismaClient({ datasourceUrl: url.toString() });
  const previousDirectory = process.env.AB_PDF_DIRECTORY;
  const pdfDirectory = await mkdtemp(path.join(os.tmpdir(), "fragmento-ab-integration-"));
  process.env.AB_PDF_DIRECTORY = pdfDirectory;
  try {
    await base.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const migration = readFileSync(new URL("../prisma/migrations/20261015160000_add_kitchen_ab_sync/migration.sql", import.meta.url), "utf8");
    for (const statement of migration.split(";").filter((sql) => sql.trim())) await client.$executeRawUnsafe(statement);
    const diskMigration = readFileSync(new URL("../prisma/migrations/20261015180000_store_kitchen_ab_pdfs_on_disk/migration.sql", import.meta.url), "utf8");
    for (const statement of diskMigration.split(";").filter((sql) => sql.trim())) await client.$executeRawUnsafe(statement);
    const readTimeMigration = readFileSync(new URL("../prisma/migrations/20261015190000_add_kitchen_ab_last_read_at/migration.sql", import.meta.url), "utf8");
    for (const statement of readTimeMigration.split(";").filter((sql) => sql.trim())) await client.$executeRawUnsafe(statement);
    // Minimal kitchen identity table for exercising the actual imports-page query.
    await client.$executeRaw`CREATE TABLE "Kitchen" ("id" TEXT PRIMARY KEY, "slug" TEXT UNIQUE NOT NULL)`;
    const metadata = structuredClone(references["ab-105777"]);
    const bytes = readFileSync(new URL(`../data/kitchen-specifications/pdfs/${metadata.sourceFile}`, import.meta.url));
    const upload = validateAbUpload({ document: metadata, pdfBase64: bytes.toString("base64") });
    const first = await saveKitchenAb(client, upload);
    assert.equal(first.status, "ACTIVE");
    const firstRead = (await listKitchenAbImports(client)).documents.find(doc => doc.id === first.documentId).lastReadAt;
    assert.ok(firstRead instanceof Date);
    assert.ok(Math.abs(firstRead.getTime() - Date.now()) < 10000, "Read time must represent the current instant regardless of the database timezone");
    assert.equal((await listKitchenAbImports(client)).documents.find(doc => doc.id === first.documentId).hasKitchen, false);
    await client.$executeRaw`INSERT INTO "Kitchen" ("id", "slug") VALUES ('future-kitchen', '105-777')`;
    assert.equal((await listKitchenAbImports(client)).documents.find(doc => doc.id === first.documentId).hasKitchen, true);
    assert.equal((await readKitchenAb(client, { slug: "105-777" })).id, first.documentId);
    assert.equal((await readKitchenAb(client, { slug: "ab-105-777" })).id, first.documentId);
    assert.equal(await readKitchenAb(client, { slug: "105-777-modul-1" }), null);
    const duplicate = await saveKitchenAb(client, upload);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.documentId, first.documentId);
    assert.deepEqual(Buffer.from((await readKitchenAb(client, { slug: "105777" }, { includePdf: true })).pdfBytes), bytes);
    const [diskRecord] = await client.$queryRaw`SELECT "pdfBytes", "pdfStorageKey" FROM "KitchenAbDocument" WHERE "id" = ${first.documentId}`;
    assert.equal(diskRecord.pdfBytes, null);
    assert.ok(diskRecord.pdfStorageKey.endsWith(".pdf"));
    assert.deepEqual((await readKitchenAbVersion(client, { slug: "ab-105777" }, first.documentId)).pdfBytes, bytes);
    assert.equal(await readKitchenAbVersion(client, { slug: "ab-105803" }, first.documentId), null);
    const changedBytes = Buffer.concat([bytes, Buffer.from("\n% test revision\n")]);
    const changedMetadata = { ...metadata, sourceSha256: createHash("sha256").update(changedBytes).digest("hex") };
    const revision = await saveKitchenAb(client, validateAbUpload({ document: changedMetadata, pdfBase64: changedBytes.toString("base64") }));
    assert.equal(revision.status, "REVIEW");
    assert.equal((await readKitchenAb(client, { slug: "ab-105777" })).id, first.documentId);
    await activateKitchenAb(client, revision.documentId, "test-admin");
    assert.equal((await readKitchenAb(client, { slug: "ab-105777" })).id, revision.documentId);
    assert.equal((await saveKitchenAb(client, upload)).status, "REVIEW");
    assert.equal((await readKitchenAb(client, { slug: "ab-105777" })).id, revision.documentId);
    assert.equal(await readKitchenAb(client, { slug: "105777-modul-2" }), null);
    // Both contenders for a previously unseen kitchen must wait for review.
    const contender = structuredClone(references["ab-105803"]);
    const contenderBytes = readFileSync(new URL(`../data/kitchen-specifications/pdfs/${contender.sourceFile}`, import.meta.url));
    const held = await saveKitchenAb(client, validateAbUpload({ document: contender, pdfBase64: contenderBytes.toString("base64"), holdForReview: true }));
    assert.equal(held.status, "REVIEW");
    assert.equal(await readKitchenAb(client, { slug: "ab-105803" }), null);
    // A repeated actual read moves the existing document first, without creating
    // a duplicate or changing its original import time or active publication.
    const beforeRead = (await listKitchenAbImports(client)).documents.find(doc => doc.id === first.documentId);
    await client.$executeRaw`UPDATE "KitchenAbDocument" SET "lastReadAt" = TIMESTAMPTZ '2000-01-01T00:00:00Z' WHERE "id" = ${first.documentId}`;
    await saveKitchenAb(client, upload, { recordRead: false });
    assert.equal((await listKitchenAbImports(client)).documents.find(doc => doc.id === first.documentId).lastReadAt.toISOString(), "2000-01-01T00:00:00.000Z", "Deployment seeds must not reset last-read times");
    await saveKitchenAb(client, upload);
    const afterRead = await listKitchenAbImports(client);
    assert.equal(afterRead.documents[0].id, first.documentId);
    assert.ok(afterRead.documents[0].lastReadAt > firstRead);
    assert.equal(afterRead.documents[0].importedAt.toISOString(), beforeRead.importedAt.toISOString());
    assert.equal(afterRead.documents.length, 3);
    assert.equal((await readKitchenAb(client, { slug: "ab-105777" })).id, revision.documentId);
    // Unknown historic read times are kept unknown and sorted after real reads.
    await client.$executeRaw`UPDATE "KitchenAbDocument" SET "lastReadAt" = NULL, "importedAt" = TIMESTAMP '2099-01-01' WHERE "id" = ${held.documentId}`;
    assert.equal((await listKitchenAbImports(client)).documents.at(-1).id, held.documentId);
    const runId = randomUUID();
    await recordAbSyncRun(client, { operation: "start", runId, source: "test-server" });
    await recordAbSyncRun(client, { operation: "finish", runId, summary: { scanned: 2, uploaded: 1, skipped: 0, errors: 1, review: 0 } });
    const runs = await client.$queryRaw`SELECT "status" FROM "KitchenAbSyncRun" WHERE "id" = ${runId}`;
    assert.equal(runs[0].status, "ERROR");
    // Simulate an existing BYTEA document and verify the two-phase disk migration.
    await client.$executeRaw`UPDATE "KitchenAbDocument" SET "pdfBytes" = ${bytes}, "pdfStorageKey" = NULL WHERE "id" = ${first.documentId}`;
    await unlink(path.join(pdfDirectory, diskRecord.pdfStorageKey));
    assert.deepEqual((await readKitchenAbVersion(client, { slug: "ab-105777" }, first.documentId)).pdfBytes, bytes);
    const copied = await migrateKitchenAbPdfs(client);
    assert.equal(copied.documents, 3);
    const [legacy] = await client.$queryRaw`SELECT "pdfBytes", "pdfStorageKey" FROM "KitchenAbDocument" WHERE "id" = ${first.documentId}`;
    assert.ok(legacy.pdfBytes && legacy.pdfStorageKey);
    const released = await migrateKitchenAbPdfs(client, { releaseDatabaseBytes: true });
    assert.equal(released.releasedDatabaseBytes, bytes.length);
    const [counts] = await client.$queryRaw`SELECT count(*)::int AS "total", count("pdfBytes")::int AS "databasePdfs", count("pdfStorageKey")::int AS "diskPdfs" FROM "KitchenAbDocument"`;
    assert.deepEqual(counts, { total: 3, databasePdfs: 0, diskPdfs: 3 });
    assert.equal((await readKitchenAb(client, { slug: "ab-105777" })).id, revision.documentId);
    assert.deepEqual((await readKitchenAbVersion(client, { slug: "ab-105777" }, first.documentId)).pdfBytes, bytes);
    assert.equal((await migrateKitchenAbPdfs(client, { releaseDatabaseBytes: true })).releasedDatabaseBytes, 0);
  } finally {
    await client.$disconnect();
    await base.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await base.$disconnect();
    if (previousDirectory === undefined) delete process.env.AB_PDF_DIRECTORY;
    else process.env.AB_PDF_DIRECTORY = previousDirectory;
    await rm(pdfDirectory, { recursive: true, force: true });
  }
});

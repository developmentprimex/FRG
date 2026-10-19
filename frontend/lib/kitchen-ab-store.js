import { randomUUID } from "node:crypto";
import { kitchenAbIdentity } from "./kitchen-ab-validation.js";
import { loadKitchenAbPdfBytes, writeKitchenAbPdfFile } from "./kitchen-ab-pdf-files.js";

// Parameterized SQL also supports an already running Prisma client during rollout.
export async function saveKitchenAb(client, upload, { approve = false, actor = null, recordRead = true } = {}) {
  const { metadata, bytes, sha256, holdForReview } = upload;
  const slug = metadata.kitchenSlug;
  // Persist and verify the immutable file before publishing its database pointer.
  // A failed transaction may leave an unreferenced file, never a partial PDF.
  const pdfStorageKey = await writeKitchenAbPdfFile(bytes, sha256);
  return client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${slug})::bigint)::text`;
    const current = await tx.$queryRaw`SELECT "documentId" FROM "KitchenAbPublication" WHERE "kitchenSlug" = ${slug}`;
    const existing = await tx.$queryRaw`SELECT "id", "status" FROM "KitchenAbDocument" WHERE "sha256" = ${sha256}`;
    const documentId = existing[0]?.id || randomUUID();
    const active = approve || (!existing.length && !current.length && !holdForReview);
    if (!existing.length) {
      await tx.$executeRaw`INSERT INTO "KitchenAbDocument" ("id", "sha256", "kitchenSlug", "metadata", "pdfStorageKey", "status")
        VALUES (${documentId}, ${sha256}, ${slug}, ${JSON.stringify(metadata)}::jsonb, ${pdfStorageKey}, ${active ? "READY" : "REVIEW"})`;
    } else {
      await tx.$executeRaw`UPDATE "KitchenAbDocument" SET "pdfStorageKey" = ${pdfStorageKey} WHERE "id" = ${documentId}`;
    }
    // Successful imports/re-reads count; unchanged scan checkpoints and seeds do
    // not. TIMESTAMPTZ preserves the actual instant across server timezones.
    if (recordRead) {
      await tx.$executeRaw`UPDATE "KitchenAbDocument" SET "lastReadAt" = clock_timestamp() WHERE "id" = ${documentId}`;
    }
    if (active) {
      await tx.$executeRaw`UPDATE "KitchenAbDocument" SET "status" = 'READY', "reviewedAt" = CURRENT_TIMESTAMP, "reviewedBy" = ${actor}
        WHERE "id" = ${documentId}`;
      await tx.$executeRaw`INSERT INTO "KitchenAbPublication" ("kitchenSlug", "documentId") VALUES (${slug}, ${documentId})
        ON CONFLICT ("kitchenSlug") DO UPDATE SET "documentId" = EXCLUDED."documentId", "updatedAt" = CURRENT_TIMESTAMP`;
    }
    return { documentId, status: active || current[0]?.documentId === documentId ? "ACTIVE" : "REVIEW", duplicate: existing.length > 0 };
  }, { timeout: 30000 });
}

export async function activateKitchenAb(client, documentId, actor) {
  return client.$transaction(async (tx) => {
    const documents = await tx.$queryRaw`SELECT "kitchenSlug" FROM "KitchenAbDocument" WHERE "id" = ${documentId}`;
    if (!documents.length) throw new Error("AB document not found.");
    const slug = documents[0].kitchenSlug;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${slug})::bigint)::text`;
    await tx.$executeRaw`UPDATE "KitchenAbDocument" SET "status" = 'READY', "reviewedAt" = CURRENT_TIMESTAMP, "reviewedBy" = ${actor}
      WHERE "id" = ${documentId}`;
    await tx.$executeRaw`INSERT INTO "KitchenAbPublication" ("kitchenSlug", "documentId") VALUES (${slug}, ${documentId})
      ON CONFLICT ("kitchenSlug") DO UPDATE SET "documentId" = EXCLUDED."documentId", "updatedAt" = CURRENT_TIMESTAMP`;
  });
}

export function missingAbTables(error) {
  return error?.code === "P2010" && error?.meta?.code === "42P01";
}

export async function readKitchenAb(client, kitchen, { includePdf = false } = {}) {
  const slug = kitchenAbIdentity(kitchen);
  if (!slug) return null;
  try {
    const rows = includePdf
      ? await client.$queryRaw`SELECT doc."id", doc."sha256", doc."metadata", doc."pdfBytes", doc."pdfStorageKey" FROM "KitchenAbDocument" doc
          JOIN "KitchenAbPublication" pub ON pub."documentId" = doc."id" WHERE pub."kitchenSlug" = ${slug}`
      : await client.$queryRaw`SELECT doc."id", doc."metadata" FROM "KitchenAbDocument" doc
          JOIN "KitchenAbPublication" pub ON pub."documentId" = doc."id" WHERE pub."kitchenSlug" = ${slug}`;
    if (!rows.length) return null;
    if (includePdf) rows[0].pdfBytes = await loadKitchenAbPdfBytes(rows[0]);
    return rows[0];
  } catch (error) {
    // Existing packaged documents stay available while the migration is rolling out.
    if (missingAbTables(error)) return null;
    throw error;
  }
}

export async function readKitchenAbVersion(client, kitchen, documentId) {
  const slug = kitchenAbIdentity(kitchen);
  if (!slug) return null;
  const rows = await client.$queryRaw`SELECT "id", "sha256", "metadata", "pdfBytes", "pdfStorageKey"
    FROM "KitchenAbDocument" WHERE "id" = ${documentId} AND "kitchenSlug" = ${slug}`;
  if (!rows.length) return null;
  rows[0].pdfBytes = await loadKitchenAbPdfBytes(rows[0]);
  return rows[0];
}

export async function listKitchenAbImports(client) {
  const documents = await client.$queryRaw`SELECT doc."id", doc."kitchenSlug", doc."status", doc."importedAt", doc."lastReadAt",
      doc."metadata"->>'sourceFile' AS "sourceFile", doc."metadata"->>'abNumber' AS "abNumber",
      doc."metadata"->>'date' AS "documentDate", (pub."documentId" = doc."id") IS TRUE AS "active",
      EXISTS (SELECT 1 FROM "Kitchen" k WHERE k."slug" IN (
        doc."kitchenSlug", substring(doc."kitchenSlug" from 4),
        substring(doc."kitchenSlug" from 4 for 3) || '-' || substring(doc."kitchenSlug" from 7 for 3),
        substring(doc."kitchenSlug" from 1 for 6) || '-' || substring(doc."kitchenSlug" from 7 for 3)
      )) AS "hasKitchen"
    FROM "KitchenAbDocument" doc LEFT JOIN "KitchenAbPublication" pub ON pub."kitchenSlug" = doc."kitchenSlug"
    ORDER BY doc."lastReadAt" DESC NULLS LAST, doc."importedAt" DESC, doc."id" DESC LIMIT 500`;
  const runs = await client.$queryRaw`SELECT * FROM "KitchenAbSyncRun" ORDER BY "startedAt" DESC LIMIT 20`;
  return { documents, runs };
}

export async function recordAbSyncRun(client, input) {
  const id = String(input.runId || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid sync run ID.");
  if (input.operation === "start") {
    const source = String(input.source || "file-server").slice(0, 300);
    await client.$executeRaw`INSERT INTO "KitchenAbSyncRun" ("id", "source") VALUES (${id}, ${source}) ON CONFLICT ("id") DO NOTHING`;
  } else if (input.operation === "finish") {
    const summary = input.summary;
    if (!summary || JSON.stringify(summary).length > 50000) throw new Error("Invalid sync summary.");
    for (const key of ["scanned", "uploaded", "skipped", "errors", "review"]) {
      if (!Number.isInteger(summary[key]) || summary[key] < 0) throw new Error("Invalid sync counts.");
    }
    const status = summary.errors > 0 ? "ERROR" : summary.review > 0 ? "REVIEW" : "COMPLETE";
    const updated = await client.$executeRaw`UPDATE "KitchenAbSyncRun" SET "status" = ${status}, "summary" = ${JSON.stringify(summary)}::jsonb,
      "finishedAt" = CURRENT_TIMESTAMP WHERE "id" = ${id}`;
    if (!updated) throw new Error("Sync run not found.");
  } else throw new Error("Invalid run operation.");
  return { runId: id };
}

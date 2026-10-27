import { readKitchenAbPdfFile, writeKitchenAbPdfFile } from "./kitchen-ab-pdf-files.js";

// Copy first; release legacy database bytes only after the new application is
// serving PDFs from disk. Publication pointers and review history never change.
export async function migrateKitchenAbPdfs(client, { releaseDatabaseBytes = false } = {}) {
  const result = { documents: 0, bytes: 0, releasedDatabaseBytes: 0 };
  let cursor = "";
  for (;;) {
    const documents = await client.$queryRaw`SELECT "id", "sha256", "pdfBytes", "pdfStorageKey"
      FROM "KitchenAbDocument" WHERE "id" > ${cursor} ORDER BY "id" LIMIT 25`;
    if (!documents.length) return result;
    for (const document of documents) {
      const legacyBytes = document.pdfBytes ? Buffer.from(document.pdfBytes) : null;
      const key = legacyBytes ? await writeKitchenAbPdfFile(legacyBytes, document.sha256) : document.pdfStorageKey;
      const bytes = await readKitchenAbPdfFile(key, document.sha256);
      if (releaseDatabaseBytes) {
        await client.$executeRaw`UPDATE "KitchenAbDocument" SET "pdfStorageKey" = ${key}, "pdfBytes" = NULL
          WHERE "id" = ${document.id} AND "sha256" = ${document.sha256}`;
        result.releasedDatabaseBytes += legacyBytes?.length || 0;
      } else {
        await client.$executeRaw`UPDATE "KitchenAbDocument" SET "pdfStorageKey" = ${key}
          WHERE "id" = ${document.id} AND "sha256" = ${document.sha256}`;
      }
      result.documents++;
      result.bytes += bytes.length;
      cursor = document.id;
    }
  }
}

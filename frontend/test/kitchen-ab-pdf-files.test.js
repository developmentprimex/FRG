import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadKitchenAbPdfBytes, readKitchenAbPdfFile, writeKitchenAbPdfFile } from "../lib/kitchen-ab-pdf-files.js";

const bytes = Buffer.from("%PDF-1.7\nAB disk storage test fixture\n");
const digest = createHash("sha256").update(bytes).digest("hex");

test("concurrent duplicate PDF writes publish one intact immutable file and remove temporary files", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "fragmento-ab-pdfs-"));
  try {
    const keys = await Promise.all(Array.from({ length: 8 }, () => writeKitchenAbPdfFile(bytes, digest, { directory })));
    assert.equal(new Set(keys).size, 1);
    assert.deepEqual(await readKitchenAbPdfFile(keys[0], digest, { directory }), bytes);
    assert.deepEqual(await readdir(path.dirname(path.join(directory, keys[0]))), [`${digest}.pdf`]);
    assert.deepEqual(await readFile(path.join(directory, keys[0])), bytes);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("disk storage rejects traversal, wrong contents and corruption instead of overwriting existing PDFs", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "fragmento-ab-pdfs-"));
  try {
    await assert.rejects(readKitchenAbPdfFile("../../outside.pdf", digest, { directory }), /storage key/);
    await assert.rejects(writeKitchenAbPdfFile(Buffer.from("wrong"), digest, { directory }), { code: "AB_PDF_INTEGRITY" });
    const key = await writeKitchenAbPdfFile(bytes, digest, { directory });
    await writeFile(path.join(directory, key), Buffer.from("corrupted"));
    await assert.rejects(readKitchenAbPdfFile(key, digest, { directory }), { code: "AB_PDF_INTEGRITY" });
    await assert.rejects(writeKitchenAbPdfFile(bytes, digest, { directory }), { code: "AB_PDF_INTEGRITY" });
    assert.equal((await readFile(path.join(directory, key))).toString(), "corrupted");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("legacy database bytes remain readable during migration, but an absent disk-only PDF fails explicitly", async () => {
  assert.deepEqual(await loadKitchenAbPdfBytes({ sha256: digest, pdfBytes: bytes }), bytes);
  await assert.rejects(loadKitchenAbPdfBytes({ sha256: digest }), { code: "ENOENT" });
  await assert.rejects(loadKitchenAbPdfBytes({ sha256: digest, pdfBytes: Buffer.from("changed") }), { code: "AB_PDF_INTEGRITY" });
});

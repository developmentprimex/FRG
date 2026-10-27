import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { MAX_AB_BYTES } from "./kitchen-ab-validation.js";

export function kitchenAbPdfDirectory() {
  const configured = process.env.AB_PDF_DIRECTORY;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("Configure a private persistent AB_PDF_DIRECTORY in production.");
  if (configured && !path.isAbsolute(configured)) throw new Error("AB_PDF_DIRECTORY must be an absolute path.");
  return configured || path.join(process.cwd(), ".local-data", "ab-pdfs");
}

export function kitchenAbPdfKey(sha256) {
  if (!/^[0-9a-f]{64}$/.test(sha256 || "")) throw new Error("Invalid AB PDF hash.");
  return `${sha256.slice(0, 2)}/${sha256}.pdf`;
}

function checkBytes(bytes, sha256) {
  if (!bytes || bytes.length > MAX_AB_BYTES || Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-"
      || createHash("sha256").update(bytes).digest("hex") !== sha256) {
    const error = new Error("AB PDF contents do not match their recorded hash.");
    error.code = "AB_PDF_INTEGRITY";
    throw error;
  }
  return bytes;
}

export async function readKitchenAbPdfFile(storageKey, sha256, { directory = kitchenAbPdfDirectory() } = {}) {
  if (storageKey !== kitchenAbPdfKey(sha256)) throw new Error("Invalid AB PDF storage key.");
  const bytes = await readFile(path.join(directory, storageKey));
  return checkBytes(bytes, sha256);
}

export async function writeKitchenAbPdfFile(bytes, sha256, { directory = kitchenAbPdfDirectory() } = {}) {
  checkBytes(bytes, sha256);
  const storageKey = kitchenAbPdfKey(sha256);
  const destination = path.join(directory, storageKey);
  try {
    await readKitchenAbPdfFile(storageKey, sha256, { directory });
    return storageKey;
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const temporary = path.join(parent, `.${sha256}.${randomUUID()}.tmp`);
  try {
    const file = await open(temporary, "wx", 0o600);
    try { await file.writeFile(bytes); await file.sync(); }
    finally { await file.close(); }
    // Linking publishes the complete file atomically without overwriting a
    // concurrent upload. Both paths are on the same local NTFS/ext4 filesystem.
    try { await link(temporary, destination); }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      await readKitchenAbPdfFile(storageKey, sha256, { directory });
    }
    if (process.platform !== "win32") {
      const folder = await open(parent, "r");
      try { await folder.sync(); } finally { await folder.close(); }
    }
  } finally { await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; }); }
  return storageKey;
}

export async function loadKitchenAbPdfBytes(document) {
  if (document.pdfStorageKey) {
    try { return await readKitchenAbPdfFile(document.pdfStorageKey, document.sha256); }
    catch (error) { if (error.code !== "ENOENT" || !document.pdfBytes) throw error; }
  }
  // Compatibility during the two-phase migration: database bytes are retained
  // until every disk copy and the new authenticated PDF route have been checked.
  if (document.pdfBytes) return checkBytes(Buffer.from(document.pdfBytes), document.sha256);
  const error = new Error("AB PDF file is unavailable.");
  error.code = "ENOENT";
  throw error;
}

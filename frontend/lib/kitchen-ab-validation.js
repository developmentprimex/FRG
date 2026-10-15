import { createHash, timingSafeEqual } from "node:crypto";

export const MAX_AB_BYTES = 20 * 1024 * 1024;
export const MAX_AB_REQUEST_BYTES = 30 * 1024 * 1024;

export function kitchenAbIdentity(kitchen = {}) {
  const slug = String(kitchen.slug || "");
  // The dashboard turns a grouped code such as "105 672" into "105-672".
  // Only this exact six-digit identity is normalized; variants stay separate.
  const identity = /^(?:ab-)?(\d{3})-?(\d{3})$/.exec(slug);
  return identity ? `ab-${identity[1]}${identity[2]}` : null;
}

export function authorizeAbSync(request, expected = process.env.AB_SYNC_TOKEN) {
  if (!expected || expected.length < 32) return false;
  const supplied = String(request.headers.get("authorization") || "").replace(/^Bearer /, "");
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function string(value, label, max = 500, allowEmpty = false) {
  if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim()) || value.includes("\0")) {
    throw new Error(`Invalid ${label}.`);
  }
  return value;
}

export function validateAbUpload(input) {
  const value = input?.document;
  if (!value || !/^ab-\d{6}$/.test(value.kitchenSlug || "")) throw new Error("Invalid kitchen AB identity.");
  if (String(value.abNumber).replace(/\s/g, "") !== `670${value.kitchenSlug.slice(3)}`) throw new Error("AB number and kitchen disagree.");
  const filename = string(value.sourceFile, "PDF filename", 200);
  if (/[\\/]/.test(filename) || !/^AB[\s_]*(?:BD)?\d{6}\b.*\.pdf$/i.test(filename)
      || filename.match(/(?:BD)?(\d{6})/i)?.[1] !== value.kitchenSlug.slice(3)) throw new Error("Invalid AB filename.");
  const date = string(value.date, "document date", 10);
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) throw new Error("Invalid AB date.");
  const [day, month, year] = date.split(".").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (parsedDate.getUTCDate() !== day || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCFullYear() !== year) throw new Error("Invalid AB date.");
  const base64 = input.pdfBase64;
  if (typeof base64 !== "string" || base64.length > Math.ceil(MAX_AB_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("Invalid PDF body.");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_AB_BYTES || bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("Invalid or oversized PDF.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (value.sourceSha256 !== sha256) throw new Error("PDF hash does not match extracted AB data.");
  if (!Number.isInteger(value.pageCount) || value.pageCount < 1 || value.pageCount > 500) throw new Error("Invalid page count.");
  if (!Array.isArray(value.specifications) || !value.specifications.length || value.specifications.length > 250
      || !Array.isArray(value.header) || value.header.length > 100
      || !Array.isArray(value.articles) || !value.articles.length || value.articles.length > 5000) throw new Error("Incomplete AB data.");
  const fields = (items, codes) => items.map((field) => ({ label: string(field.label, "field label"),
    ...(codes ? { code: string(field.code, "field code", 200, true) } : {}), value: string(field.value, "field value", 10000) }));
  const seen = new Set();
  const articles = value.articles.map((item) => {
    const position = string(item.position, "position", 40);
    if (!/^\d+[a-z]?(?:\.\d+[a-z]?)*$/i.test(position) || seen.has(position)) throw new Error("Invalid or duplicate AB position.");
    seen.add(position);
    if (item.quantity !== null && (typeof item.quantity !== "number" || !Number.isFinite(item.quantity))) throw new Error("Invalid quantity.");
    if (!Number.isInteger(item.page) || item.page < 1 || item.page > value.pageCount) throw new Error("Invalid article page.");
    return { position, quantity: item.quantity, articleNumber: string(item.articleNumber, "article number"),
      name: string(item.name, "article name", 2000), manufacturer: string(item.manufacturer, "manufacturer", 500, true),
      handing: string(item.handing || "", "handing", 100, true), description: string(item.description || "", "description", 50000, true), page: item.page };
  });
  const locations = value.sourceLocations || [filename];
  if (!Array.isArray(locations) || locations.length > 100) throw new Error("Invalid source locations.");
  const metadata = { kitchenSlug: value.kitchenSlug, abNumber: value.abNumber, sourceFile: filename,
    sourceSha256: sha256, date, pageCount: value.pageCount, apartment: string(value.apartment || "", "apartment", 100, true),
    header: fields(value.header, false), specifications: fields(value.specifications, true), articles,
    sourceLocations: locations.map((location) => string(location, "source location", 1000)) };
  return { metadata, bytes, sha256, holdForReview: input.holdForReview === true };
}

export async function readAbRequest(request) {
  if (Number(request.headers.get("content-length")) > MAX_AB_REQUEST_BYTES) throw new Error("Request too large.");
  const chunks = [];
  let total = 0;
  if (!request.body) throw new Error("Missing request body.");
  const reader = request.body.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_AB_REQUEST_BYTES) { await reader.cancel(); throw new Error("Request too large."); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

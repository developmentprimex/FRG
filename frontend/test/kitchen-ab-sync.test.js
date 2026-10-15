import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import references from "../data/kitchen-specifications/index.json" with { type: "json" };
import { authorizeAbSync, kitchenAbIdentity, readAbRequest, validateAbUpload } from "../lib/kitchen-ab-validation.js";

const reference = references["ab-105777"];
const bytes = readFileSync(new URL(`../data/kitchen-specifications/pdfs/${reference.sourceFile}`, import.meta.url));
const fixture = () => ({ document: structuredClone(reference), pdfBase64: bytes.toString("base64") });

test("sync accepts the exact PDF and its extracted identity without exposing internal fields", () => {
  const input = fixture();
  input.document.pdfPath = "../../private";
  const result = validateAbUpload(input);
  assert.deepEqual(result.bytes, bytes);
  assert.equal(result.metadata.kitchenSlug, "ab-105777");
  assert.equal(result.metadata.pdfPath, undefined);
  assert.equal(result.holdForReview, false);
});

test("sync rejects mismatched hashes, kitchen numbers, paths, impossible dates and duplicate positions", () => {
  const mutations = [
    (x) => { x.document.sourceSha256 = "0".repeat(64); },
    (x) => { x.document.kitchenSlug = "ab-105803"; },
    (x) => { x.document.sourceFile = "../AB 105777.pdf"; },
    (x) => { x.document.date = "31.02.2026"; },
    (x) => { x.document.articles.push(x.document.articles[0]); },
    (x) => { x.document.articles[0].page = 999; },
    (x) => { x.pdfBase64 = Buffer.from("not a PDF").toString("base64"); },
  ];
  for (const mutate of mutations) { const input = fixture(); mutate(input); assert.throws(() => validateAbUpload(input)); }
});

test("a dedicated matching token is required and missing server configuration fails closed", () => {
  const key = "k".repeat(48);
  const request = (value) => new Request("https://example.test", { headers: { authorization: value } });
  assert.equal(authorizeAbSync(request(`Bearer ${key}`), key), true);
  assert.equal(authorizeAbSync(request(`Bearer ${"x".repeat(48)}`), key), false);
  assert.equal(authorizeAbSync(request("Bearer short"), "short"), false);
  assert.equal(authorizeAbSync(request(`Bearer ${key}`), ""), false);
});

test("runtime identities never infer an AB from module suffixes or unrelated contracts", () => {
  assert.equal(kitchenAbIdentity({ slug: "105777" }), "ab-105777");
  assert.equal(kitchenAbIdentity({ slug: "ab-105777" }), "ab-105777");
  assert.equal(kitchenAbIdentity({ slug: "105-777" }), "ab-105777");
  assert.equal(kitchenAbIdentity({ slug: "ab-105-777" }), "ab-105777");
  assert.equal(kitchenAbIdentity({ slug: "105-777-modul-1", kitchenCode: "105 777" }), null);
  assert.equal(kitchenAbIdentity({ slug: "670105777" }), null);
  assert.equal(kitchenAbIdentity({ slug: "1-05777" }), null);
  assert.equal(kitchenAbIdentity({ slug: "105845-modul-2", kitchenCode: "105 845" }), null);
  assert.equal(kitchenAbIdentity({ slug: "10577" }), null);
});

test("upload body limits are enforced before parsing a declared oversized request", async () => {
  await assert.rejects(readAbRequest(new Request("https://example.test", { method: "POST", body: "{}",
    headers: { "content-length": String(40 * 1024 * 1024) } })), /large/);
  assert.deepEqual(await readAbRequest(new Request("https://example.test", { method: "POST", body: '{"operation":"start"}' })), { operation: "start" });
});

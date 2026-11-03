import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app/api/service-claims/route.js", import.meta.url), "utf8");
const uploadSource = source.slice(
  source.indexOf("const MAX_SERVICE_CLAIM_ATTACHMENTS"),
  source.indexOf("export async function POST"),
);

function loadUploadHandlers() {
  // Multipart parsers can return File objects from a different runtime realm.
  return vm.runInNewContext(`${uploadSource}\n({ parseServiceClaimRequest, normalizeServiceClaimUploads })`, {
    File: class RuntimeFile {},
    Buffer,
  });
}

test("multipart damage and serial photos survive differing File constructors", async () => {
  const { parseServiceClaimRequest, normalizeServiceClaimUploads } = loadUploadHandlers();
  const form = new FormData();
  form.append("contractNumber", "111105807");
  form.append("problemAreaAttachment:component-claim-sink-cabinet", new File(["damage photo"], "Fridge 1.PNG", { type: "image/png" }));
  form.append("serialNumberImage:component-claim-oven", new File(["serial photo"], "serial.png", { type: "image/png" }));
  form.append("generalAttachments", new File(["document"], "details.pdf", { type: "application/pdf" }));
  const request = new Request("http://localhost/api/service-claims", { method: "POST", body: form });
  const parsed = await parseServiceClaimRequest(request);
  assert.equal(parsed.body.contractNumber, "111105807");
  const parts = await normalizeServiceClaimUploads(parsed.problemAreaAttachmentFilesByComponentId["component-claim-sink-cabinet"] || []);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].filename, "Fridge 1.PNG");
  assert.equal(parts[0].content.toString(), "damage photo");
  assert.equal((await normalizeServiceClaimUploads(parsed.serialNumberImageFilesByComponentId["component-claim-oven"] || [])).length, 1);
  assert.equal((await normalizeServiceClaimUploads(parsed.generalAttachmentFiles)).length, 1);
});

test("empty PNG files report the filename and size instead of disappearing", async () => {
  const { normalizeServiceClaimUploads } = loadUploadHandlers();
  await assert.rejects(
    normalizeServiceClaimUploads([new File([], "Fridge 1.PNG", { type: "image/png" })]),
    /Fridge 1\.PNG.*empty \(0 bytes\)/,
  );
});

test("a PNG image with an uppercase extension retains its bytes", async () => {
  const { normalizeServiceClaimUploads } = loadUploadHandlers();
  const png = fs.readFileSync(new URL("../public/product-info-previews/fridge-preview.png", import.meta.url));
  const parts = await normalizeServiceClaimUploads([new File([png], "Fridge 1.PNG", { type: "image/png" })]);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].contentType, "image/png");
  assert.deepEqual(parts[0].content, png);
});

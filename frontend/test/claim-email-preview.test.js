import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { buildClaimEmailPreview } from "../lib/email/claim-email-preview.js";
import { formatServiceClaimEmailSubject } from "../lib/service-claim-email-subject.js";
import { buildClaimConfirmationMessage } from "../lib/email/claim-confirmation.js";

const env = { NODE_ENV: "production", SMTP_HOST: "smtp.test", SMTP_FROM: "service@example.com", SERVICE_REQUEST_OTHER_EMAIL: "claims@example.com" };
const claim = { id: "claim-1", contractNumber: "670123456", claimSequence: 2, ticketNumber: 1004, fullName: "Current Name", email: "current@example.com" };
const submission = { id: "submission-1", attachmentStart: 7, payload: { fullName: "Saved Customer", givenName: "Saved", surname: "Customer", genderLabel: "Keine Angabe", email: "saved@example.com", contractType: "ARC", clientAddress: "Saved address", problemDescription: "Fridge is noisy", problemAreasJson: JSON.stringify([{ componentId: "fridge", name: "Fridge / freezer", code: "FR-1", detail: "Fridge is noisy", serialNumber: "SN-1" }]), attachmentsMeta: [{ filename: "photo.png", contentType: "image/png", role: "problem_area", areaComponentId: "fridge" }, { filename: "sketch.png", contentType: "image/png", role: "kitchen_preview" }] } };

test("preview uses actual email templates, stored ticket reference and selected submission", () => {
  const result = buildClaimEmailPreview({ claim, submission, kitchenPlan: { selectionMode: "reference-pdf" }, env });
  assert.equal(result.notification.to, "claims@example.com");
  assert.equal(result.notification.cc, "verwaltung@hbi-wohnen.de");
  assert.equal(result.notification.replyTo, "saved@example.com");
  assert.equal(result.notification.subject, formatServiceClaimEmailSubject(claim.contractNumber, 2, 1004));
  assert(result.notification.html.includes("Fridge / freezer"));
  assert(result.notification.html.includes("Fridge is noisy"));
  assert(!result.notification.html.includes("Current Name"));
  assert(result.notification.html.includes("/api/admin/claims/claim-1/attachments/7?view=1"));
  assert(result.notification.html.includes("/api/admin/claims/claim-1/attachments/8?view=1"));
  assert(!result.notification.html.includes('src="cid:'));
  const confirmation = buildClaimConfirmationMessage({ ...claim, ...submission.payload }, env);
  assert.equal(result.confirmation.html, confirmation.html);
  assert.equal(result.confirmation.to, "saved@example.com");
});

test("follow-up preview preserves ticket identity and escapes submitted HTML", () => {
  const result = buildClaimEmailPreview({ claim, submission: { ...submission, payload: { ...submission.payload, givenName: "<script>alert(1)</script>", ticketNumber: 9999, contractNumber: "111FAKE" } }, isFollowUp: true, env });
  assert(result.notification.subject.startsWith("#1004 670123456 KD 02"));
  assert(result.notification.subject.endsWith("Ergänzung"));
  assert(result.confirmation.subject.startsWith("Ihr Ticket wurde ergänzt"));
  assert(!result.notification.html.includes("<script>"));
  assert(result.notification.html.includes("&lt;script&gt;"));
});

test("legacy claims without submission metadata can still be reviewed", () => {
  const result = buildClaimEmailPreview({ claim, env });
  assert(result.notification.html.includes("Current"));
  assert(!result.notification.html.includes("undefined undefined"));
  assert.equal(result.notification.attachments.length, 0);
});

const routeSource = readFileSync(new URL("../app/api/admin/claims/[id]/email-preview/route.js", import.meta.url), "utf8").replace(/^import[\s\S]*?;\r?\n/gm, "").replace(/export /g, "");
function routeContext(overrides = {}) {
  let submissionReads = 0;
  const context = vm.createContext({
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers }) },
    requireAdminClaimsApi: async () => ({ role: "ADMIN" }),
    canAccessClaim: () => true,
    queryServiceClaimById: async () => [claim],
    prisma: { serviceClaimSubmission: { findMany: async () => { submissionReads++; return [submission]; } } },
    getServiceClaimKitchenPlan: async () => null,
    buildClaimEmailPreview: input => ({ selected: input.submission?.id }),
    ...overrides,
  });
  vm.runInContext(routeSource, context);
  return { context, reads: () => submissionReads };
}
const request = value => ({ nextUrl: { searchParams: new URLSearchParams(value) } });

test("preview checks permissions before accessing submission history", async () => {
  const fixture = routeContext({ canAccessClaim: () => false });
  const result = await fixture.context.GET(request(""), { params: { id: claim.id } });
  assert.equal(result.status, 403);
  assert.equal(fixture.reads(), 0);
});

test("preview rejects submission ids belonging to another ticket", async () => {
  const { context } = routeContext();
  const result = await context.GET(request("submission=other-ticket"), { params: { id: claim.id } });
  assert.equal(result.status, 404);
});

test("preview response uses selected history and is not cacheable", async () => {
  const { context } = routeContext();
  const result = await context.GET(request("submission=submission-1"), { params: { id: claim.id } });
  assert.equal(result.status, 200);
  assert.equal(result.body.selected, "submission-1");
  assert.equal(result.headers["Cache-Control"], "no-store");
});

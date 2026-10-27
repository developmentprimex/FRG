import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { setImmediate as nextTurn } from "node:timers/promises";
import vm from "node:vm";
import test from "node:test";
import { resolveServiceClaimEmailCc, resolveServiceClaimEmailRecipient } from "../lib/service-claim-email-recipient.js";
import { formatServiceClaimEmailSubject } from "../lib/service-claim-email-subject.js";
import { attachClaimEmailDelivery } from "../lib/email/claim-email-store.js";
import { CLAIM_INTERNAL_PREFIXES, resolveSmtpConfigForContract, sendMailForContract } from "../lib/email/contract-smtp.js";

globalThis.AsyncLocalStorage ||= AsyncLocalStorage;
const require = createRequire(import.meta.url);
const { AfterContext } = require("next/dist/server/after/after-context.js");
const { workAsyncStorage } = require("next/dist/server/app-render/work-async-storage.external.js");
const { after } = await import("next/server.js");
const { observeClaimEmailSend, buildClaimEmailDelivery } = await import("../lib/email/claim-email-tracking.js");
const source = readFileSync(new URL("../app/api/service-claims/route.js", import.meta.url), "utf8");
const senderSource = source.slice(source.indexOf("async function sendComplaintEmail("), source.indexOf("\nfunction formatEmailFileSize("));

test("multiple configured recipients are checked separately; Reply-To is not a recipient", () => {
  const result = buildClaimEmailDelivery({
    recipient: 'Service <service@example.com>, copy@example.com',
    receipt: { accepted: ["SERVICE@example.com"], rejected: ["copy@example.com"] },
    attemptedAt: "2026-10-05T10:00:00Z",
  });
  assert.deepEqual(result.recipients.map((r) => [r.email, r.status]), [["service@example.com", "SENT"], ["copy@example.com", "FAILED"]]);
});

for (const scenario of ["success", "px", "222", "arc-reference", "arc-reference-other", "arc-reference-cc-rejected", "arc-interactive", "partial", "failure", "missing-recipient", "missing-from", "tracking-failure", "tracking-hang"]) {
  test(`claim sender preserves original delivery and background response flow: ${scenario}`, async (t) => {
    t.mock.method(console, "warn", () => {});
    const previousClient = globalThis.orderEmailTrackingPrisma;
    t.after(() => {
      if (previousClient) globalThis.orderEmailTrackingPrisma = previousClient;
      else delete globalThis.orderEmailTrackingPrisma;
    });
    let closeResponse;
    const background = [];
    const afterContext = new AfterContext({ waitUntil: (promise) => background.push(promise), onClose: (callback) => { closeResponse = callback; } });
    let release;
    const stalled = new Promise((resolve) => { release = resolve; });
    const saved = [];
    const events = [];
    globalThis.orderEmailTrackingPrisma = {
      $transaction: async (run) => {
        events.push("tracking");
        if (scenario === "tracking-failure") throw new Error("Logging unavailable");
        if (scenario === "tracking-hang") await stalled;
        return run({ $executeRaw: async (strings, ...values) => {
          if (strings.join("?").includes('INSERT INTO "ServiceClaimEmailAttempt"')) saved.push({ claimId: values[1], delivery: JSON.parse(values[3]) });
          return 1;
        } });
      },
    };
    const env = {
      SMTP_FROM: scenario === "missing-from" ? "" : "sender@example.com",
      SMTP_HOST: "smtp.example.invalid", SMTP_USER: "audit", SMTP_PASS: "audit",
      SERVICE_REQUEST_EMAIL: "px-service@example.com",
      SERVICE_REQUEST_OTHER_EMAIL: scenario === "missing-recipient" ? "" : scenario === "partial" ? "service@example.com, other@example.com" : "service@example.com",
    };
    const payload = { id: "claim-fixture", contractNumber: scenario === "px" ? "111123456" : "670123456", claimSequence: 2, email: "customer@example.com", attachmentsMeta: [{ filename: "photo.png" }] };
    payload.contractType = scenario.startsWith("arc-") ? "ARC" : "PX";
    if (scenario === "222") payload.contractNumber = "222123456";
    if (scenario === "arc-reference-other") payload.contractNumber = "671123456";
    const kitchenPlan = { selectionMode: scenario.startsWith("arc-reference") ? "reference-pdf" : "interactive" };
    const expectedCc = scenario.startsWith("arc-reference")
      ? scenario === "arc-reference-other" ? "334primex.eu@gmail.com" : "verwaltung@hbi-wohnen.de"
      : undefined;
    const expectedTo = resolveServiceClaimEmailRecipient(payload.contractNumber, env);
    const smtpError = new Error("Original SMTP failure");
    const mails = [];
    const context = vm.createContext({
      process: { env }, observeClaimEmailSend,
      resolveServiceClaimEmailRecipient: (number) => resolveServiceClaimEmailRecipient(number, env),
      resolveServiceClaimEmailCc,
      getServiceClaimKitchenPlan: async () => kitchenPlan,
      formatServiceClaimEmailSubject,
      buildClaimKitchenPreviewAttachment: async () => null,
      isEmailInlineImage: () => true,
      buildUserAttachmentCid: () => "photo-cid",
      buildComplaintEmailText: () => "Original text",
      buildComplaintEmailHtml: () => "<p>Original HTML</p>",
      CLAIM_INTERNAL_PREFIXES,
      resolveSmtpConfigForContract: (number, _env, prefixes) => resolveSmtpConfigForContract(number, env, prefixes),
      // the route sends through the per-contract SMTP helper; feed it the same mocked transport
      sendMailForContract: (number, message, options = {}) => sendMailForContract(number, message, { ...options, env, createTransport: () => context.nodemailer.createTransport() }),
      nodemailer: { createTransport: () => ({ sendMail: async (mail) => {
        events.push("smtp");
        mails.push(mail);
        if (scenario === "failure") throw smtpError;
        return {
          accepted: [scenario === "px" || scenario === "222" ? "px-service@example.com" : "service@example.com", ...(expectedCc && scenario !== "arc-reference-cc-rejected" ? [expectedCc] : [])],
          rejected: scenario === "partial" ? ["other@example.com"] : scenario === "arc-reference-cc-rejected" ? [expectedCc] : [], messageId: "claim-mail",
        };
      } }) },
    });
    vm.runInContext(senderSource, context);
    let senderResult;
    let returnedError;
    await workAsyncStorage.run({ afterContext }, async () => {
      // Mirror the existing route: SMTP already runs inside after().
      after(async () => {
        try {
          senderResult = await context.sendComplaintEmail(payload, [{ filename: "photo.png", content: "image-bytes", contentType: "image/png" }]);
        } catch (error) { returnedError = error; }
        events.push("sender-finished");
      });
      events.push("response");
    });
    assert.deepEqual(events, ["response"]);
    closeResponse();
    if (scenario === "tracking-hang") {
      for (let i = 0; i < 30 && !events.includes("tracking"); i += 1) await nextTurn();
      assert.ok(events.includes("tracking"));
      assert.equal(senderResult, true, "SMTP must return before a blocked tracking write");
      release();
    }
    await Promise.all(background);
    const skipped = scenario.startsWith("missing-");
    assert.equal(mails.length, skipped ? 0 : 1);
    if (!skipped) {
      assert.equal(mails[0].to, expectedTo);
      assert.equal(mails[0].replyTo, payload.email);
      assert.equal(mails[0].cc, expectedCc);
      assert.equal(mails[0].subject, formatServiceClaimEmailSubject(payload.contractNumber, 2));
      assert.equal(mails[0].text, "Original text");
      assert.equal(mails[0].html, "<p>Original HTML</p>");
      assert.equal(mails[0].attachments[0].content, "image-bytes");
      assert.equal(mails[0].attachments[0].cid, "photo-cid");
    }
    assert.strictEqual(returnedError, scenario === "failure" ? smtpError : undefined);
    if (scenario !== "failure") assert.equal(senderResult, !skipped);
    if (scenario === "tracking-failure") assert.equal(saved.length, 0);
    else {
      assert.equal(saved.length, 1);
      assert.equal(saved[0].claimId, payload.id);
      const expected = skipped ? ["SKIPPED"] : scenario === "failure" ? ["FAILED"] : scenario === "partial" || scenario === "arc-reference-cc-rejected" ? ["SENT", "FAILED"] : expectedCc ? ["SENT", "SENT"] : ["SENT"];
      assert.deepEqual(saved[0].delivery.recipients.map((r) => r.status), expected);
      if (expectedCc) assert.equal(saved[0].delivery.recipients[1].email, expectedCc);
      assert.equal(saved[0].delivery.recipients.some((r) => r.email === payload.email), false);
    }
  });
}

test("tracking registration failure preserves the boolean result and original SMTP errors", async () => {
  const schedule = () => { throw new Error("No request context"); };
  for (const result of [true, false]) {
    assert.equal(await observeClaimEmailSend({ claimId: "id", recipient: "service@example.com", send: async () => result, schedule }), result);
  }
  const error = new Error("SMTP error");
  await assert.rejects(observeClaimEmailSend({ claimId: "id", send: async () => { throw error; }, schedule }), (actual) => actual === error);
});

test("claims dashboard stays usable if the tracking table is unavailable", async () => {
  const claims = [{ id: "a" }];
  assert.strictEqual(await attachClaimEmailDelivery(claims, { $transaction: async () => { throw new Error("Unavailable"); } }), claims);
});

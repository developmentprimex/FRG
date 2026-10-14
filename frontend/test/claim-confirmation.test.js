import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { buildClaimConfirmationMessage, sendClaimConfirmation } from "../lib/email/claim-confirmation.js";

const env = {
  NODE_ENV: "production", SMTP_HOST: "smtp.example.invalid", SMTP_FROM: "sender@example.com",
  SERVICE_REQUEST_EMAIL: "primex@example.com", SERVICE_REQUEST_OTHER_EMAIL: "service@example.com",
};
const payload = {
  id: "internal-id", contractNumber: "670123456", claimSequence: 2,
  fullName: "Anna <Müller>", email: " customer@example.com ",
};

test("customer acknowledgement includes the persisted ticket in subject and both bodies", () => {
  const message = buildClaimConfirmationMessage({ ...payload, ticketNumber: 1020 }, env);
  for (const value of [message.subject, message.text, message.html]) {
    assert.ok(value.includes("#1020 670123456 KD 02"));
  }
});

test("customer receives the agreed acknowledgement with a contract-specific reference and service Reply-To", async () => {
  const sent = [];
  assert.equal(await sendClaimConfirmation(payload, { env, send: async (...args) => sent.push(args) }), true);
  const [contract, message, options] = sent[0];
  assert.equal(contract, payload.contractNumber);
  assert.equal(message.to, "customer@example.com");
  assert.equal(message.replyTo, "service@example.com");
  assert.equal(message.subject, "Ihre Reklamation wurde erfasst – 670123456 KD 02");
  assert.match(message.text, /wir haben Ihre Reklamation erhalten/);
  assert.match(message.text, /Vertragsnummer: 670123456/);
  assert.match(message.text, /Eine erneute Einreichung ist nicht erforderlich/);
  assert.match(message.html, /Anna &lt;Müller&gt;/);
  assert.equal(message.html.includes("Anna <Müller>"), false);
  assert.equal(message.attachments, undefined);
  assert.equal(message.cc, undefined);
  assert.equal(message.text.includes(payload.id), false);
  assert.deepEqual(options.prefixes, ["111", "222"]);
  assert.equal(buildClaimConfirmationMessage({ ...payload, contractNumber: "111123456" }, env).replyTo, "primex@example.com");
});

test("follow-up acknowledgement keeps the ticket reference and confirms an addition", () => {
  const message = buildClaimConfirmationMessage({ ...payload, ticketNumber: 1020, isFollowUp: true }, env);
  assert.match(message.subject, /Ihr Ticket wurde ergänzt/);
  assert.match(message.subject, /#1020 670123456 KD 02/);
  assert.match(message.text, /offenen Ticket hinzugefügt/);
});

test("missing customer address does not send; SMTP failure is exposed to the background handler", async () => {
  let calls = 0;
  const send = async () => { calls += 1; throw new Error("SMTP unavailable"); };
  assert.equal(await sendClaimConfirmation({ ...payload, email: "" }, { env, send }), false);
  assert.equal(calls, 0);
  await assert.rejects(sendClaimConfirmation(payload, { env, send }), /SMTP unavailable/);
  await assert.rejects(sendClaimConfirmation(payload, { env: { ...env, SMTP_FROM: "" }, send }), /SMTP is not configured/);
});

const source = readFileSync(new URL("../app/api/service-claims/route.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const start = source.indexOf("    after(async () => {", source.indexOf("await insertServiceClaimRecord(prisma, payload)"));
const backgroundSource = source.slice(start, source.indexOf("\n\n    return NextResponse.json", start));

for (const failing of ["internal", "confirmation"]) {
  test(`background delivery remains independent when ${failing} email fails`, async () => {
    const events = [];
    let background;
    vm.runInNewContext(backgroundSource, {
      after: (callback) => { background = callback; }, payload,
      storedAttachmentParts: [], attachmentParts: [], referenceSnapshot: null,
      sendComplaintEmail: async () => { events.push("internal"); if (failing === "internal") throw new Error("Internal failure"); },
      sendClaimConfirmation: async () => { events.push("confirmation"); if (failing === "confirmation") throw new Error("Confirmation failure"); },
      postWebhook: async () => { events.push("webhook"); },
      formatServiceClaimErrorMessage: (error) => error.message,
      console: { warn: () => {}, error: () => {} },
    });
    assert.deepEqual(events, [], "Email work must wait until after the response");
    await background();
    assert.deepEqual(events, ["internal", "confirmation", "webhook"]);
  });
}

import assert from "node:assert/strict";
import test from "node:test";
import nodemailer from "nodemailer";
import { sendAdminLoginVerificationEmail, resolveAdminLoginVerificationRecipient } from "../lib/admin-login-verification.js";
import { createGuardedSmtpTransport, resolveLocalEmailRecipient } from "../lib/email/local-email-safety.js";

const local = {
  NODE_ENV: "development", LOCAL_ADMIN_LOGIN_RECIPIENT: "01primex.eu@gmail.com",
  SMTP_HOST: "smtp.office365.com", SMTP_USER: "nachkauf@myarchitecto.de", SMTP_PASS: "blocked", SMTP_FROM: "nachkauf@myarchitecto.de",
  SMTP_111_HOST: "smtp.gmail.com", SMTP_111_USER: "315primex.eu@gmail.com", SMTP_111_PASS: "safe test pass",
};

test("only admin verification reaches its allowlisted account; ordinary email remains redirected", async t => {
  const messages = [];
  const configs = [];
  t.mock.method(nodemailer, "createTransport", options => {
    configs.push(options);
    return { sendMail: async message => { messages.push(message); return { accepted: message.envelope.to }; } };
  });
  await sendAdminLoginVerificationEmail({ to: "01primex.eu@gmail.com", code: "123456" }, { env: local });
  const sent = messages.at(-1);
  assert.equal(configs[0].auth.user, "315primex.eu@gmail.com");
  assert.equal(configs[0].auth.pass, "safetestpass");
  assert.equal(sent.to, "01primex.eu@gmail.com");
  assert.deepEqual(sent.envelope.to, ["01primex.eu@gmail.com"]);
  assert.match(sent.text, /123456/);
  assert.equal(resolveAdminLoginVerificationRecipient("01primex.eu@gmail.com", local), sent.to);
  assert.equal(resolveLocalEmailRecipient({ to: "01primex.eu@gmail.com" }, local), "334primex.eu@gmail.com");
  await createGuardedSmtpTransport(configs[0], local).sendMail({ from: "315primex.eu@gmail.com", to: "01primex.eu@gmail.com" });
  assert.equal(messages.at(-1).to, "334primex.eu@gmail.com");
  await sendAdminLoginVerificationEmail({ to: "another-admin@example.com", code: "654321" }, { env: local });
  assert.equal(messages.at(-1).to, "334primex.eu@gmail.com");
  assert.equal(resolveAdminLoginVerificationRecipient("another-admin@example.com", local), "334primex.eu@gmail.com");
});

test("the local login exception requires the exact scope, allowlist, sender and SMTP account", () => {
  const target = { to: "01primex.eu@gmail.com", from: "315primex.eu@gmail.com", user: "315primex.eu@gmail.com", localAdminLoginRecipient: "01primex.eu@gmail.com" };
  assert.equal(resolveLocalEmailRecipient(target, local), target.to);
  for (const patch of [{ user: "other@example.com" }, { from: "other@example.com" }, { localAdminLoginRecipient: "other@example.com" }, { to: "other@example.com" }]) {
    assert.equal(resolveLocalEmailRecipient({ ...target, ...patch }, local), "334primex.eu@gmail.com");
  }
  assert.equal(resolveLocalEmailRecipient(target, { ...local, LOCAL_ADMIN_LOGIN_RECIPIENT: "" }), "334primex.eu@gmail.com");
});

test("missing SMTP fails in development too, without claiming a code was sent or logging it", async () => {
  await assert.rejects(sendAdminLoginVerificationEmail({ to: "admin@example.com", code: "123456" }, { env: { NODE_ENV: "development" } }), error => error.status === 503);
});

test("production retains its configured SMTP account and recipient", async () => {
  let sent;
  let options;
  const env = { ...local, NODE_ENV: "production" };
  await sendAdminLoginVerificationEmail({ to: "admin@example.com", code: "123456" }, { env, createTransport: config => {
    options = config;
    return { sendMail: async message => { sent = message; return { accepted: [message.to] }; } };
  } });
  assert.equal(options.auth.user, "nachkauf@myarchitecto.de");
  assert.equal(sent.to, "admin@example.com");
  assert.equal(resolveAdminLoginVerificationRecipient(sent.to, env), sent.to);
});

test("SMTP delivery errors remain visible to the login handler", async () => {
  const failure = new Error("SMTP temporarily unavailable");
  await assert.rejects(sendAdminLoginVerificationEmail({ to: "01primex.eu@gmail.com", code: "123456" }, {
    env: local, createTransport: () => ({ sendMail: async () => { throw failure; } }),
  }), failure);
});

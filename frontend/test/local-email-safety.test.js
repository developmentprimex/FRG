import assert from "node:assert/strict";
import test from "node:test";
import nodemailer from "nodemailer";
import { assertLocalEmailSenderAllowed, createGuardedSmtpTransport, isLocalEmailEnvironment } from "../lib/email/local-email-safety.js";
import { resolveSmtpConfigForContract, sendMailForContract } from "../lib/email/contract-smtp.js";
import { resolveServiceClaimEmailRecipient } from "../lib/service-claim-email-recipient.js";

const smtp={SMTP_HOST:"smtp.office365.com",SMTP_USER:"nachkauf@myarchitecto.de",SMTP_PASS:"production-pass",SMTP_FROM:"nachkauf@myarchitecto.de",SMTP_111_HOST:"smtp.gmail.com",SMTP_111_USER:"315primex.eu@gmail.com",SMTP_111_PASS:"local-pass"};
const local={...smtp,LOCAL_EMAIL_SAFETY:"true",NODE_ENV:"production"};

test("local protection covers dev, test and locally started production servers",()=>{
  for(const env of [{NODE_ENV:"development"},{NODE_ENV:"test"},{NODE_ENV:"production",LOCAL_EMAIL_SAFETY:"true"}]) assert.equal(isLocalEmailEnvironment(env),true);
  assert.equal(isLocalEmailEnvironment({NODE_ENV:"production",DATABASE_URL:"postgresql://user:pass@localhost:5432/fragmento"}),false);
  assert.equal(isLocalEmailEnvironment({NODE_ENV:"production",DATABASE_URL:"postgresql://user:pass@db.example.com/app"}),false);
});

test("local sender protection checks SMTP auth, From, Sender and envelope",()=>{
  for(const data of [{user:"nachkauf@myarchitecto.de"},{from:'"Fragmento" <NACHKAUF@myarchitecto.de>'},{from:{name:"Fragmento",address:"nachkauf@myarchitecto.de"}},{sender:"nachkauf@myarchitecto.de"},{envelopeFrom:"nachkauf@myarchitecto.de"}]) assert.throws(()=>assertLocalEmailSenderAllowed(data,local),{code:"LOCAL_EMAIL_SENDER_BLOCKED"});
  assert.doesNotThrow(()=>assertLocalEmailSenderAllowed({user:"315primex.eu@gmail.com",from:"315primex.eu@gmail.com"},local));
});

test("every local contract range uses the safe account when the default is blocked",()=>{
  for(const number of ["670105779","111105779","222104296","1234567"]){
    const config=resolveSmtpConfigForContract(number,local);
    assert.equal(config.from,"315primex.eu@gmail.com");
    assert.equal(config.user,"315primex.eu@gmail.com");
  }
  assert.throws(()=>resolveSmtpConfigForContract("670105779",{...local,SMTP_111_USER:"",SMTP_111_PASS:""}),{code:"LOCAL_EMAIL_SENDER_BLOCKED"});
});

test("local internal SMTP failure never retries the production account",async()=>{
  const accounts=[];
  await assert.rejects(()=>sendMailForContract("111105779",{to:"recipient@example.com"},{env:local,createTransport:config=>{accounts.push(config.user);return {sendMail:async()=>{throw new Error("local SMTP unavailable")}}}}),/local SMTP unavailable/);
  assert.deepEqual(accounts,["315primex.eu@gmail.com"]);
});

test("production retains its configured sender and internal fallback",async()=>{
  const env={...smtp,NODE_ENV:"production",DATABASE_URL:"postgresql://user:pass@localhost:5432/app"};
  assert.equal(resolveSmtpConfigForContract("670105779",env).from,"nachkauf@myarchitecto.de");
  const accounts=[];
  const warn=console.warn;
  console.warn=()=>{};
  try{
    await sendMailForContract("111105779",{to:"recipient@example.com"},{env,createTransport:config=>({sendMail:async()=>{accounts.push(config.user);if(config.profile==="internal")throw new Error("internal unavailable");return {accepted:["recipient@example.com"]}}})});
  }finally{console.warn=warn;}
  assert.deepEqual(accounts,["315primex.eu@gmail.com","nachkauf@myarchitecto.de"]);
});

test("guarded transport blocks forbidden messages before Nodemailer sends",async t=>{
  let sent=0,created=0;
  t.mock.method(nodemailer,"createTransport",()=>{created++;return {sendMail:async()=>{sent++;return {accepted:["recipient@example.com"]}}}});
  assert.throws(()=>createGuardedSmtpTransport({auth:{user:"nachkauf@myarchitecto.de"}},local),{code:"LOCAL_EMAIL_SENDER_BLOCKED"});
  assert.equal(created,0);
  const transport=createGuardedSmtpTransport({auth:{user:"315primex.eu@gmail.com"}},local);
  await assert.rejects(()=>transport.sendMail({from:"nachkauf@myarchitecto.de",to:"recipient@example.com"}),{code:"LOCAL_EMAIL_SENDER_BLOCKED"});
  await assert.rejects(()=>transport.sendMail({from:"315primex.eu@gmail.com",envelope:{from:"nachkauf@myarchitecto.de"}}),{code:"LOCAL_EMAIL_SENDER_BLOCKED"});
  assert.equal(sent,0);
  await transport.sendMail({from:"315primex.eu@gmail.com",to:"recipient@example.com"});
  assert.equal(sent,1);
});

test("local transport redirects To, CC, BCC and SMTP envelope to 334 only", async t => {
  const messages = [];
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail: async message => {
    messages.push(message);
    return { accepted: message.envelope.to };
  } }));
  const message = {
    from: "315primex.eu@gmail.com", to: "kd@myarchitecto.de",
    cc: "verwaltung@hbi-wohnen.de", bcc: "other@example.com",
    replyTo: "kd@myarchitecto.de",
    envelope: { from: "315primex.eu@gmail.com", to: ["kd@myarchitecto.de", "verwaltung@hbi-wohnen.de"] },
  };
  for (const env of [{ NODE_ENV: "development" }, { NODE_ENV: "test" }, local]) {
    const transport = createGuardedSmtpTransport({ auth: { user: "315primex.eu@gmail.com" } }, env);
    await transport.sendMail(message);
    const sent = messages.at(-1);
    assert.equal(sent.to, "334primex.eu@gmail.com");
    assert.equal(sent.cc, undefined);
    assert.equal(sent.bcc, undefined);
    assert.equal(sent.replyTo, "334primex.eu@gmail.com");
    assert.deepEqual(sent.envelope.to, ["334primex.eu@gmail.com"]);
    assert.equal(resolveServiceClaimEmailRecipient("670103832", { ...env, SERVICE_REQUEST_OTHER_EMAIL: "kd@myarchitecto.de" }), "334primex.eu@gmail.com");
    await assert.rejects(transport.sendMail({ ...message, raw: "To: kd@myarchitecto.de\r\n\r\nTest" }), /Raw email is disabled locally/);
  }
  const production = createGuardedSmtpTransport({ auth: { user: "315primex.eu@gmail.com" } }, { NODE_ENV: "production" });
  await production.sendMail(message);
  assert.strictEqual(messages.at(-1), message);
  assert.equal(messages.length, 4);
});

test("only an allowlisted claim feedback email can reach the local test mailbox", async t => {
  const messages = [];
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail: async message => {
    messages.push(message);
    return { accepted: message.envelope.to };
  } }));
  const env = { NODE_ENV: "development", LOCAL_CLAIM_FEEDBACK_RECIPIENT: "01primex.eu@gmail.com" };
  const options = { auth: { user: "315primex.eu@gmail.com" } };
  const feedback = createGuardedSmtpTransport(options, env, { localFeedbackRecipient: "01primex.eu@gmail.com" });
  await feedback.sendMail({ from: '"Fragmento" <315primex.eu@gmail.com>', to: "01primex.eu@gmail.com", cc: "other@example.com" });
  assert.equal(messages.at(-1).to, "01primex.eu@gmail.com");
  assert.equal(messages.at(-1).cc, undefined);
  assert.deepEqual(messages.at(-1).envelope.to, ["01primex.eu@gmail.com"]);
  await feedback.sendMail({ from: '"Fragmento" <315primex.eu@gmail.com>', to: "other@example.com" });
  assert.equal(messages.at(-1).to, "334primex.eu@gmail.com");
  const ordinary = createGuardedSmtpTransport(options, env);
  await ordinary.sendMail({ from: "315primex.eu@gmail.com", to: "01primex.eu@gmail.com" });
  assert.equal(messages.at(-1).to, "334primex.eu@gmail.com");
  await feedback.sendMail({ from: "other@example.com", to: "01primex.eu@gmail.com" });
  assert.equal(messages.at(-1).to, "334primex.eu@gmail.com");
});

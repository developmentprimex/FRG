import assert from "node:assert/strict";
import test from "node:test";
import nodemailer from "nodemailer";
import { assertLocalEmailSenderAllowed, createGuardedSmtpTransport, isLocalEmailEnvironment } from "../lib/email/local-email-safety.js";
import { resolveSmtpConfigForContract, sendMailForContract } from "../lib/email/contract-smtp.js";

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

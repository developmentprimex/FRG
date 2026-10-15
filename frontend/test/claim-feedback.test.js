import test from "node:test";
import assert from "node:assert/strict";
import {
  CLAIM_FEEDBACK_SENDER, buildClaimFeedbackMessage, createClaimFeedbackToken,
  dispatchClaimFeedbackInvitation, feedbackExpiry, hashClaimFeedbackToken,
  prepareClaimFeedbackRetry, resolveClaimFeedbackSmtp, reviewClaimFeedbackDelivery,
  submitClaimFeedback, validateClaimFeedback,
} from "../lib/claim-feedback.js";
import { updateWorkProcessing } from "../lib/work-processing.js";

const env = { NODE_ENV: "production", SMTP_111_USER: CLAIM_FEEDBACK_SENDER, SMTP_111_FROM: CLAIM_FEEDBACK_SENDER, SMTP_111_PASS: "test-secret" };
const answers = { resolved: "PARTLY", speedRating: 3, communicationRating: 4, overallRating: 5, comment: "Please call before visiting." };

function memoryDb({ email = "customer@example.com", contractNumber = "111123" } = {}) {
  const state = { processing: null, invitations: [], events: [] };
  let nextId = 1;
  const db = {
    $queryRaw: async () => [{ alive: 1 }],
    serviceClaim: { findUnique: async () => ({ id: "claim-1", email, contractNumber, createdAt: new Date() }) },
    workProcessing: {
      findUnique: async () => state.processing,
      upsert: async ({ create, update }) => {
        state.processing = state.processing ? { ...state.processing, ...update } : { id: "processing-1", ...create };
        return { ...state.processing };
      },
    },
    workProcessingEvent: { create: async ({ data }) => { state.events.push(data); } },
    claimFeedbackInvitation: {
      create: async ({ data }) => { const row = { id: `inv-${nextId++}`, createdAt: new Date(), attemptedAt: null, submittedAt: null, ...data }; state.invitations.push(row); return { ...row }; },
      findUnique: async ({ where }) => state.invitations.find((row) => row.id === where.id || row.tokenHash === where.tokenHash) || null,
      update: async ({ where, data }) => { const row = state.invitations.find((entry) => entry.id === where.id); Object.assign(row, data); return { ...row }; },
      updateMany: async ({ where, data }) => {
        const rows = state.invitations.filter((row) => {
          if (where.id && row.id !== where.id) return false;
          if (where.claimId && row.claimId !== where.claimId) return false;
          if (where.submittedAt === null && row.submittedAt !== null) return false;
          const status = where.status?.in || (where.status ? [where.status] : null);
          return !status || status.includes(row.status);
        });
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
    },
  };
  db.$transaction = async (fn) => {
    const before = structuredClone(state);
    try { return await fn(db); }
    catch (error) { Object.assign(state, before); throw error; }
  };
  return { db, state };
}

test("claim completion creates one invitation and cannot be reopened", async () => {
  const { db, state } = memoryDb();
  const done = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  assert.equal(state.invitations.length, 1);
  assert.equal(state.invitations[0].tokenHash, hashClaimFeedbackToken(done.feedbackInvitation.token));
  assert.equal(state.invitations[0].status, "PENDING");
  const again = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 1 });
  assert.equal(again.feedbackInvitation, undefined);
  assert.equal(state.invitations.length, 1);
  await assert.rejects(updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "OPEN", expectedVersion: 1 }), /cannot be reopened/);
  assert.equal(state.invitations[0].status, "PENDING");
});

test("all claim contracts receive invitations on completion; missing email is recorded", async () => {
  const missing = memoryDb({ email: "" });
  const missingResult = await updateWorkProcessing({ db: missing.db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  assert.equal(missingResult.feedbackInvitation, undefined);
  assert.equal(missing.state.invitations[0].status, "NO_EMAIL");
  for (const contractNumber of ["111123", "670123", "222123"]) {
    const { db, state } = memoryDb({ contractNumber });
    const result = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
    assert.equal(result.status, "DONE");
    assert.ok(result.feedbackInvitation.token);
    assert.equal(state.invitations.length, 1);
    assert.equal(state.invitations[0].status, "PENDING");
    assert.equal(state.events.length, 1);
  }
});

test("670 invitation sends, can retry failed delivery, and accepts one response", async () => {
  const { db, state } = memoryDb({ contractNumber: "670123" });
  const done = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  const invitation = done.feedbackInvitation;
  assert.equal(await dispatchClaimFeedbackInvitation({ db, invitationId: invitation.id, token: invitation.token, baseUrl: "https://fragmento.de", env,
    createTransport: () => ({ sendMail: async (mail) => ({ accepted: [mail.to] }) }),
  }), "sent");
  state.invitations[0].status = "FAILED";
  const retry = await prepareClaimFeedbackRetry({ db, invitationId: invitation.id });
  assert.notEqual(retry.token, invitation.token);
  assert.equal(await dispatchClaimFeedbackInvitation({ db, invitationId: invitation.id, token: retry.token, baseUrl: "https://fragmento.de", env,
    createTransport: () => ({ sendMail: async (mail) => ({ accepted: [mail.to] }) }),
  }), "sent");
  assert.equal(await submitClaimFeedback({ db, token: retry.token, data: answers }), true);
  assert.equal(await submitClaimFeedback({ db, token: retry.token, data: answers }), false);
});

test("survey sender is exactly 315 and the form enforces complete answers", () => {
  assert.equal(resolveClaimFeedbackSmtp(env).user, CLAIM_FEEDBACK_SENDER);
  assert.equal(resolveClaimFeedbackSmtp({ NODE_ENV: "development", SMTP_USER: CLAIM_FEEDBACK_SENDER, SMTP_FROM: CLAIM_FEEDBACK_SENDER, SMTP_PASS: "test-secret" }).user, CLAIM_FEEDBACK_SENDER);
  assert.throws(() => resolveClaimFeedbackSmtp({ ...env, SMTP_111_USER: "other@example.com" }), /315primex/);
  assert.throws(() => resolveClaimFeedbackSmtp({ NODE_ENV: "production", SMTP_USER: "other@example.com", SMTP_FROM: "other@example.com", SMTP_PASS: "test-secret" }), /315primex/);
  assert.throws(() => resolveClaimFeedbackSmtp({ ...env, SMTP_111_PASS: "" }), /315primex/);
  const mail = buildClaimFeedbackMessage({ recipientEmail: "customer@example.com", token: createClaimFeedbackToken(), baseUrl: "https://fragmento.de" });
  assert.match(mail.from, /315primex\.eu@gmail\.com/);
  assert.match(mail.text, /https:\/\/fragmento.de\/claim-feedback\//);
  assert.deepEqual(validateClaimFeedback(answers), answers);
  assert.throws(() => validateClaimFeedback({ ...answers, overallRating: 6 }), /rating/);
});

test("a sent invitation accepts one answer only while claim is done and link is valid", async () => {
  const { db, state } = memoryDb();
  const done = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  const token = done.feedbackInvitation.token;
  state.invitations[0].status = "SENT";
  assert.equal(await submitClaimFeedback({ db, token, data: answers }), true);
  assert.equal(state.invitations[0].status, "ANSWERED");
  assert.equal(state.invitations[0].overallRating, 5);
  assert.equal(await submitClaimFeedback({ db, token, data: answers }), false);
  state.invitations[0].status = "SENT"; state.invitations[0].submittedAt = null;
  assert.equal(await submitClaimFeedback({ db, token, data: answers, now: feedbackExpiry(state.invitations[0].expiresAt) }), false);
  state.processing.status = "OPEN";
  assert.equal(await submitClaimFeedback({ db, token, data: answers }), false);
});

test("SMTP acceptance sends once; database failure after acceptance requires review", async () => {
  const { db, state } = memoryDb();
  const done = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  const invitationId = done.feedbackInvitation.id;
  const args = { db, invitationId, token: done.feedbackInvitation.token, baseUrl: "https://fragmento.de", env };
  let sends = 0;
  const createTransport = () => ({ sendMail: async (mail) => { sends++; assert.equal(mail.to, "customer@example.com"); return { accepted: [mail.to] }; } });
  assert.equal(await dispatchClaimFeedbackInvitation({ ...args, createTransport }), "sent");
  assert.equal(state.invitations[0].status, "SENT");
  assert.equal(await dispatchClaimFeedbackInvitation({ ...args, createTransport }), "skipped");
  assert.equal(sends, 1);

  const second = memoryDb();
  const doneAgain = await updateWorkProcessing({ db: second.db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  const originalUpdate = second.db.claimFeedbackInvitation.update;
  second.db.claimFeedbackInvitation.update = async ({ data, ...rest }) => {
    if (data.status === "SENT") throw new Error("Database write failed after send");
    return originalUpdate({ data, ...rest });
  };
  assert.equal(await dispatchClaimFeedbackInvitation({ ...args, db: second.db, invitationId: doneAgain.feedbackInvitation.id, token: doneAgain.feedbackInvitation.token, createTransport }), "unknown");
  assert.equal(second.state.invitations[0].status, "UNKNOWN");
  await assert.rejects(prepareClaimFeedbackRetry({ db: second.db, invitationId: doneAgain.feedbackInvitation.id }), /cannot be retried/);
  assert.equal(await submitClaimFeedback({ db: second.db, token: doneAgain.feedbackInvitation.token, data: answers }), true);
});

test("failed delivery can rotate its link; uncertain delivery needs an explicit review", async () => {
  const { db, state } = memoryDb();
  const done = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  const id = done.feedbackInvitation.id;
  assert.equal(await dispatchClaimFeedbackInvitation({ db, invitationId: id, token: done.feedbackInvitation.token, baseUrl: "https://fragmento.de", env: {}, createTransport: () => { throw new Error("SMTP should not run"); } }), "failed");
  assert.equal(state.invitations[0].status, "FAILED");
  const retry = await prepareClaimFeedbackRetry({ db, invitationId: id });
  assert.notEqual(retry.token, done.feedbackInvitation.token);
  state.invitations[0].status = "UNKNOWN";
  assert.equal((await reviewClaimFeedbackDelivery({ db, invitationId: id, outcome: "NOT_DELIVERED" })).status, "FAILED");
});

test("local delivery accepts the guarded recipient while retaining the 315 sender", async () => {
  const { db, state } = memoryDb();
  const done = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  const localEnv = { ...env, NODE_ENV: "development" };
  const result = await dispatchClaimFeedbackInvitation({ db, invitationId: done.feedbackInvitation.id, token: done.feedbackInvitation.token,
    baseUrl: "http://localhost:3000", env: localEnv, createTransport: (config) => {
      assert.equal(config.user, CLAIM_FEEDBACK_SENDER);
      return { sendMail: async (mail) => {
        assert.match(mail.from, /315primex\.eu@gmail\.com/);
        return { accepted: ["334primex.eu@gmail.com"] };
      } };
    },
  });
  assert.equal(result, "sent");
  assert.equal(state.invitations[0].status, "SENT");
});

test("allowlisted local feedback reaches only the selected test customer address", async () => {
  const { db, state } = memoryDb({ email: "01primex.eu@gmail.com" });
  const done = await updateWorkProcessing({ db, workType: "CLAIM", workId: "claim-1", actor: "admin@example.com", status: "DONE", expectedVersion: 0 });
  const localEnv = { ...env, NODE_ENV: "development", LOCAL_CLAIM_FEEDBACK_RECIPIENT: "01primex.eu@gmail.com" };
  const result = await dispatchClaimFeedbackInvitation({ db, invitationId: done.feedbackInvitation.id, token: done.feedbackInvitation.token,
    baseUrl: "http://localhost:3000", env: localEnv, createTransport: (config) => {
      assert.equal(config.localFeedbackRecipient, "01primex.eu@gmail.com");
      return { sendMail: async () => ({ accepted: ["01primex.eu@gmail.com"] }) };
    },
  });
  assert.equal(result, "sent");
  assert.equal(state.invitations[0].status, "SENT");
});

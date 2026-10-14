import { WORK_STATUSES, WORK_TYPES } from "./work-processing-rules.js";
import { isTestContractNumber } from "./order-kind.js";
import { createClaimFeedbackToken, feedbackExpiry, hashClaimFeedbackToken } from "./claim-feedback.js";

// One shared lock coordinates completion and reminder delivery. It is held only
// during a mutation or a bounded SMTP send, never during dashboard reads.
export async function lockWorkProcessing(tx, tryOnly = false) {
  if (tryOnly) {
    const [row] = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(31514026) AS locked`;
    return row.locked;
  }
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(31514026)::text`;
  return true;
}

export async function attachWorkProcessing(db, items, workType) {
  if (!WORK_TYPES.includes(workType)) throw new Error("Processing is only available for claims.");
  const ids = items.filter(Boolean).map((item) => item.id);
  if (!ids.length) return items;
  const records = await db.workProcessing.findMany({ where: { workType, workId: { in: ids } } });
  const byId = new Map(records.map((record) => [record.workId, record]));
  return items.map((item) => item ? { ...item, workType, processing: byId.get(item.id) || null } : item);
}

export async function findWorkItem(db, workType, workId) {
  if (!WORK_TYPES.includes(workType) || !workId) throw new Error("Invalid work item.");
  const item = await db.serviceClaim.findUnique({ where: { id: workId }, select: {
    id: true, createdAt: true, contractNumber: true, fullName: true, email: true,
  } });
  if (!item) throw new Error("Work item not found.");
  return { ...item, workType, test: isTestContractNumber(item.contractNumber) };
}

export async function updateWorkProcessing({ db, workType, workId, status, actor, expectedVersion }) {
  if (!actor || !WORK_STATUSES.includes(status)) throw new Error("Invalid processing status.");
  return db.$transaction(async (tx) => {
    await lockWorkProcessing(tx);
    const item = await findWorkItem(tx, workType, workId);
    const key = { workType_workId: { workType, workId } };
    const previous = await tx.workProcessing.findUnique({ where: key });
    if (!Number.isInteger(expectedVersion) || expectedVersion !== (previous?.version || 0)) {
      throw new Error("This item was updated by another worker. Refresh the page and try again.");
    }
    const oldStatus = previous?.status || "OPEN";
    if (oldStatus === "DONE" && status !== "DONE") throw new Error("Closed tickets cannot be reopened.");
    if (oldStatus === status) return previous;
    const now = new Date();
    const data = {
      status, version: (previous?.version || 0) + 1,
      completedAt: status === "DONE" ? previous?.completedAt || now : null,
      completedBy: status === "DONE" ? previous?.completedBy || actor : null,
    };
    const record = await tx.workProcessing.upsert({ where: key, create: { workType, workId, ...data }, update: data });
    await tx.workProcessingEvent.create({ data: {
      workType, workId, actor, fromStatus: oldStatus, toStatus: status,
    } });
    let feedbackInvitation = null;
    if (workType === "CLAIM") {
      if (status === "OPEN") {
        await tx.claimFeedbackInvitation.updateMany({ where: { claimId: workId, status: { in: ["PENDING", "SENDING", "FAILED", "UNKNOWN", "SENT"] } }, data: { status: "CANCELLED" } });
      } else if (isTestContractNumber(item.contractNumber)) {
        const email = String(item.email || "").trim();
        const deliverable = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const token = deliverable ? createClaimFeedbackToken() : null;
        const invitation = await tx.claimFeedbackInvitation.create({ data: {
          claimId: workId, completionVersion: record.version, recipientEmail: deliverable ? email : null,
          tokenHash: token ? hashClaimFeedbackToken(token) : null,
          expiresAt: token ? feedbackExpiry(now) : null, status: token ? "PENDING" : "NO_EMAIL",
        } });
        if (token) feedbackInvitation = { id: invitation.id, token };
      }
    }
    return feedbackInvitation ? { ...record, feedbackInvitation } : record;
  }, { maxWait: 10000, timeout: 45000 });
}

export async function reviewWorkReminder({ db, batchId, outcome, actor }) {
  if (!actor || !["DELIVERED", "NOT_DELIVERED"].includes(outcome)) throw new Error("Invalid reminder review.");
  return db.$transaction(async (tx) => {
    await lockWorkProcessing(tx);
    const batch = await tx.workReminderBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new Error("Reminder not found.");
    const interrupted = batch.status === "SENDING" && Date.now() - new Date(batch.startedAt).getTime() > 120000;
    if (batch.status !== "UNKNOWN" && !interrupted) throw new Error("This reminder cannot be reviewed or is still sending.");
    if (outcome === "DELIVERED") {
      for (const item of batch.items) {
        if (item.workType !== "CLAIM") continue;
        const where = { workType_workId: { workType: item.workType, workId: item.id } };
        const record = await tx.workProcessing.findUnique({ where });
        if (!record?.lastReminderAt || new Date(record.lastReminderAt) < new Date(batch.startedAt)) {
          await tx.workProcessing.upsert({ where, create: { workType: item.workType, workId: item.id, lastReminderAt: batch.startedAt }, update: { lastReminderAt: batch.startedAt } });
        }
      }
    }
    return tx.workReminderBatch.update({ where: { id: batch.id }, data: {
      status: outcome === "DELIVERED" ? "SENT" : "FAILED",
      sentAt: outcome === "DELIVERED" ? batch.startedAt : null,
      error: `${batch.error || "Interrupted attempt"}\nReviewed by ${actor} at ${new Date().toISOString()}: ${outcome}`,
    } });
  }, { maxWait: 10000, timeout: 45000 });
}

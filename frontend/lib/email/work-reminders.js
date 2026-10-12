import { attachWorkProcessing, lockWorkProcessing } from "../work-processing.js";
import { filterAndSortWork, reminderDue, workDateKey, workAgeDays } from "../work-processing-rules.js";
import { resolveInternalSmtpConfig, createSmtpTransport } from "./contract-smtp.js";

export const REMINDER_FROM = "315primex.eu@gmail.com";
export const REMINDER_TO = "140primex.eu@gmail.com";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export function resolveReminderConfig(env = process.env) {
  const config = resolveInternalSmtpConfig(env);
  const fromAddress = String(config?.from || "").match(/<([^>]+)>/)?.[1] || config?.from;
  if (!config || config.user.toLowerCase() !== REMINDER_FROM || String(fromAddress).toLowerCase() !== REMINDER_FROM) {
    throw new Error(`Work reminders require SMTP_111_USER and SMTP_111_FROM to use ${REMINDER_FROM}, and SMTP_111_PASS.`);
  }
  // A dedicated transport has bounded timeouts and never falls back to another sender.
  return config;
}

export function buildWorkReminder(items, { now = new Date(), baseUrl = "https://fragmento.de" } = {}) {
  const base = new URL(baseUrl);
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password) throw new Error("Invalid dashboard URL.");
  const rows = items.map((item) => {
    const path = item.workType === "CLAIM" ? "claims" : "orders";
    const link = new URL(`/admin/${path}/${encodeURIComponent(item.id)}`, base).href;
    const label = item.orderNumber || `${item.contractNumber} / ${item.claimSequence || item.id}`;
    return { label, contract: item.contractNumber || "—", customer: item.fullName || `${item.firstName || ""} ${item.lastName || ""}`.trim(), days: workAgeDays(item.createdAt, now), status: "Offen", link };
  });
  const subject = `[Fragmento] Erinnerung: ${items.length} offene Bestellungen/Reklamationen über 25 Tage`;
  const explanation = "Diese Anfragen sind seit mehr als 25 Kalendertagen im Dashboard und noch nicht abgeschlossen. Bitte bearbeiten und anschließend als Done markieren.";
  const headings = ["Anfrage", "Vertrag", "Kunde", "Tage", "Bearbeitung", "Dashboard"];
  return {
    subject,
    text: [explanation, "", ...rows.map((row) => Object.values(row).join(" | "))].join("\n"),
    html: `<html lang="de"><body style="font-family:Arial,sans-serif;color:#332820"><h2>${escapeHtml(subject)}</h2><p>${explanation}</p><table style="border-collapse:collapse"><thead><tr>${headings.map((heading) => `<th style="padding:8px;border:1px solid #ddd;text-align:left">${heading}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${[row.label, row.contract, row.customer, row.days, row.status].map((value) => `<td style="padding:8px;border:1px solid #ddd">${escapeHtml(value)}</td>`).join("")}<td style="padding:8px;border:1px solid #ddd"><a href="${escapeHtml(row.link)}">Öffnen</a></td></tr>`).join("")}</tbody></table></body></html>`,
  };
}

export async function listReminderCandidates(db, now = new Date()) {
  // Broad UTC prefilter; the shared Berlin calendar rule makes the final decision,
  // including DST changes and dates just either side of midnight.
  const before = new Date(new Date(now).getTime() - 24 * 86400000);
  const [orders, claims] = await Promise.all([
    db.order.findMany({ where: { status: { not: "CANCELLED" }, createdAt: { lt: before } }, select: { id: true, orderNumber: true, contractNumber: true, firstName: true, lastName: true, status: true, createdAt: true } }),
    db.serviceClaim.findMany({ where: { createdAt: { lt: before } }, select: { id: true, contractNumber: true, claimSequence: true, fullName: true, createdAt: true } }),
  ]);
  const [trackedOrders, trackedClaims] = await Promise.all([
    attachWorkProcessing(db, orders, "ORDER"), attachWorkProcessing(db, claims, "CLAIM"),
  ]);
  return filterAndSortWork([...trackedOrders, ...trackedClaims].filter((item) => reminderDue(item, now)), "", now);
}

function definitelyNotDelivered(error) {
  // Only explicit SMTP rejection or failure before message submission is safe
  // to retry. A timeout after DATA may already have delivered the message.
  return ["EAUTH", "ECONNECTION", "EDNS", "EENVELOPE"].includes(error?.code)
    || (Number(error?.responseCode) >= 400 && Number(error?.responseCode) < 600);
}

export async function sendWorkReminders({ db, deliveryDb = db, now = new Date(), env = process.env, dryRun = true, createTransport = createSmtpTransport }) {
  if (dryRun) return { dryRun: true, items: await listReminderCandidates(db, now) };
  if (env.WORK_REMINDERS_ENABLED !== "true") throw new Error("Work reminders are disabled outside the hosted reminder service.");
  const config = resolveReminderConfig(env);
  let batch;
  let accepted = false;
  try {
    const result = await db.$transaction(async (tx) => {
      if (!await lockWorkProcessing(tx, true)) return { skipped: "busy", count: 0 };
      const dateKey = workDateKey(now);
      const today = await tx.workReminderBatch.findUnique({ where: { dateKey } });
      if (today && today.status !== "FAILED") return { skipped: today.status.toLowerCase(), count: 0 };
      const unresolved = await tx.workReminderBatch.findMany({ where: { status: { in: ["SENDING", "UNKNOWN"] } }, select: { items: true } });
      const blocked = new Set(unresolved.flatMap((record) => record.items.map((item) => `${item.workType}:${item.id}`)));
      const items = (await listReminderCandidates(tx, now)).filter((item) => !blocked.has(`${item.workType}:${item.id}`));
      if (!items.length) return { skipped: "no-due-items", count: 0 };
      const message = buildWorkReminder(items, { now, baseUrl: env.WORK_DASHBOARD_URL || "https://fragmento.de" });
      // Commit the attempt through a separate connection BEFORE SMTP. If the
      // process stops after submission, SENDING blocks automatic duplicate sends.
      batch = await deliveryDb.workReminderBatch.upsert({ where: { dateKey },
        create: { dateKey, items: items.map((item) => ({ id: item.id, workType: item.workType, reference: item.orderNumber || item.contractNumber })), startedAt: now },
        update: { status: "SENDING", items: items.map((item) => ({ id: item.id, workType: item.workType, reference: item.orderNumber || item.contractNumber })), startedAt: now, error: null },
      });
      // Ensure the transaction and its completion lock are still alive after
      // waiting for the independent durable write, before submitting email.
      await tx.$queryRaw`SELECT 1 AS alive`;
      const transporter = createTransport({ ...config, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000 }, env);
      let receipt;
      let deadline;
      try {
        receipt = await Promise.race([
          transporter.sendMail({ ...message, from: `"Fragmento" <${REMINDER_FROM}>`, to: REMINDER_TO }),
          new Promise((_, reject) => { deadline = setTimeout(() => reject(Object.assign(new Error("Reminder SMTP deadline exceeded; delivery requires review."), { code: "ETIMEDOUT" })), 30000); }),
        ]);
      } finally { clearTimeout(deadline); transporter.close?.(); }
      accepted = (receipt.accepted || []).some((address) => String(address).toLowerCase() === REMINDER_TO);
      if (!accepted) {
        const error = new Error("SMTP did not accept the reminder recipient.");
        error.code = "EENVELOPE";
        throw error;
      }
      for (const item of items) {
        await tx.workProcessing.upsert({ where: { workType_workId: { workType: item.workType, workId: item.id } },
          create: { workType: item.workType, workId: item.id, lastReminderAt: now }, update: { lastReminderAt: now },
        });
      }
      await tx.workReminderBatch.update({ where: { id: batch.id }, data: { status: "SENT", sentAt: now, messageId: receipt.messageId || null } });
      return { count: items.length, batchId: batch.id };
    }, { maxWait: 10000, timeout: 60000 });
    return result;
  } catch (error) {
    if (batch) await deliveryDb.workReminderBatch.update({ where: { id: batch.id }, data: { status: !accepted && definitelyNotDelivered(error) ? "FAILED" : "UNKNOWN", error: String(error.message).slice(0,2000) } });
    throw error;
  }
}

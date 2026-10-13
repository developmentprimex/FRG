import { formatServiceClaimReference } from "../service-claim-email-subject.js";
import { resolveServiceClaimEmailRecipient } from "../service-claim-email-recipient.js";
import { CLAIM_INTERNAL_PREFIXES, resolveSmtpConfigForContract, sendMailForContract } from "./contract-smtp.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function buildClaimConfirmationMessage(payload, env = process.env) {
  const reference = formatServiceClaimReference(payload.contractNumber, payload.claimSequence, payload.ticketNumber);
  const paragraphs = [
    payload.fullName ? `Guten Tag ${payload.fullName},` : "Guten Tag,",
    "wir haben Ihre Reklamation erhalten.",
    `Ticketnummer: ${reference}\nVertragsnummer: ${payload.contractNumber}`,
    "Wir prüfen Ihr Anliegen und melden uns bei Ihnen, sobald die nächsten Schritte feststehen oder weitere Informationen benötigt werden.",
    "Bitte geben Sie bei Rückfragen Ihre Ticketnummer an. Eine erneute Einreichung ist nicht erforderlich.",
    "Mit freundlichen Grüßen\nIhr Kundenservice",
  ];
  return {
    to: String(payload.email || "").trim(),
    replyTo: resolveServiceClaimEmailRecipient(payload.contractNumber, env) || undefined,
    subject: `Ihre Reklamation wurde erfasst – ${reference}`,
    text: paragraphs.join("\n\n"),
    html: `<div lang="de" style="font-family:Arial,sans-serif;line-height:1.6;color:#222">${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("")}</div>`,
  };
}

export async function sendClaimConfirmation(payload, { env = process.env, send = sendMailForContract } = {}) {
  const message = buildClaimConfirmationMessage(payload, env);
  if (!message.to) return false;
  const config = resolveSmtpConfigForContract(payload.contractNumber, env, CLAIM_INTERNAL_PREFIXES);
  if (!config.host || !config.from) throw new Error("Claim confirmation SMTP is not configured");
  await send(payload.contractNumber, message, { env, prefixes: CLAIM_INTERNAL_PREFIXES });
  return true;
}

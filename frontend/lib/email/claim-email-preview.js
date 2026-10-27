import { buildComplaintEmailHtml, buildComplaintEmailText, isEmailInlineImage } from "./claim-notification-template.js";
import { buildClaimConfirmationMessage } from "./claim-confirmation.js";
import { formatServiceClaimEmailSubject } from "../service-claim-email-subject.js";
import { resolveServiceClaimEmailCc, resolveServiceClaimEmailRecipient } from "../service-claim-email-recipient.js";
import { CLAIM_INTERNAL_PREFIXES, resolveSmtpConfigForContract } from "./contract-smtp.js";

function parseFiles(value) {
  if (Array.isArray(value)) return value;
  try { const files = JSON.parse(value || "[]"); return Array.isArray(files) ? files : []; } catch { return []; }
}

export function buildClaimEmailPreview({ claim, submission = null, isFollowUp = false, kitchenPlan = null, env = process.env }) {
  const snapshot = submission?.payload || claim;
  const fullName = String(snapshot.fullName || claim.fullName || "").replace(/\s*\((female|male|diverse|other)\)\s*$/i, "").replace(/^(Herr|Frau)\s+/i, "").trim();
  const [firstName = "", ...lastNames] = fullName.split(/\s+/);
  const files = parseFiles(snapshot.attachmentsMeta || snapshot.attachmentsJson);
  const attachmentStart = submission?.attachmentStart || 0;
  const attachments = files.map((file, index) => ({ filename: file.filename || "Attachment", contentType: file.contentType || "", url: "/api/admin/claims/" + encodeURIComponent(claim.id) + "/attachments/" + (attachmentStart + index) + "?view=1" }));
  const payload = {
    ...claim, ...snapshot, id: claim.id, contractNumber: claim.contractNumber,
    claimSequence: claim.claimSequence, ticketNumber: claim.ticketNumber, isFollowUp,
    givenName: snapshot.givenName || firstName, surname: snapshot.surname || lastNames.join(" "),
    genderLabel: snapshot.genderLabel || "Keine Angabe",
    landlordGivenName: snapshot.landlordGivenName || "", landlordSurname: snapshot.landlordSurname || "",
    hausmeisterGivenName: snapshot.hausmeisterGivenName || snapshot.hausmeisterName || "", hausmeisterSurname: snapshot.hausmeisterSurname || "",
    attachmentsMeta: files.map((file, index) => ({ ...file, cid: isEmailInlineImage(file.contentType) ? "preview-" + index : "" })),
  };
  const sketchIndex = files.findIndex(file => file.role === "kitchen_preview");
  const sketch = sketchIndex >= 0 ? { cid: "preview-" + sketchIndex, isArcReferenceImage: payload.contractType === "ARC" && kitchenPlan?.selectionMode === "reference-pdf" } : null;
  const html = buildComplaintEmailHtml(payload, sketch).replace(/src="cid:preview-(\d+)"/g, (_, index) => 'src="' + attachments[Number(index)].url + '"');
  const config = resolveSmtpConfigForContract(claim.contractNumber, env, CLAIM_INTERNAL_PREFIXES);
  const notification = {
    from: config.from || "", to: resolveServiceClaimEmailRecipient(claim.contractNumber, env),
    cc: resolveServiceClaimEmailCc(payload.contractType, kitchenPlan, claim.contractNumber) || "",
    replyTo: payload.email || "", subject: formatServiceClaimEmailSubject(claim.contractNumber, claim.claimSequence, claim.ticketNumber) + (isFollowUp ? " – Ergänzung" : ""),
    html, text: buildComplaintEmailText(payload), attachments,
  };
  const confirmation = { ...buildClaimConfirmationMessage(payload, env), from: config.from || "", attachments: [] };
  return { notification, confirmation };
}

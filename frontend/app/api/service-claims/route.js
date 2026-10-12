import { readFile } from "fs/promises";
import http from "http";
import path from "path";
import https from "https";
import sharp from "sharp";
import { resolveServiceClaimEmailRecipient } from "../../../lib/service-claim-email-recipient";
import { CLAIM_INTERNAL_PREFIXES, resolveSmtpConfigForContract, sendMailForContract } from "../../../lib/email/contract-smtp";
import { observeClaimEmailSend } from "../../../lib/email/claim-email-tracking.js";
import { normalizeReferencePlanMarkerAppearance } from "../../../lib/reference-plan-marker-appearance";
import { Prisma } from "@prisma/client";
import { after, NextResponse } from "next/server";
import { getPublicContractClaimPlanAsset } from "../../../lib/contract-claim-plan-assets";
import { enforceRateLimit, getRequestClientIp } from "../../../lib/rate-limit";
import { prisma } from "../../../lib/prisma";
import {
  isMissingAttachmentsJsonColumnError,
  isMissingProblemAreasJsonColumnError,
} from "../../../lib/service-claim-admin-query";
import { persistServiceClaimAttachments } from "../../../lib/service-claim-attachments-storage";
import {
  REFERENCE_PLAN_EMAIL_DISPLAY_WIDTH,
  renderClaimKitchenPreviewPng,
  renderReferencePlanMarkersPng,
} from "../../../lib/claim-kitchen-preview";
import {
  getServiceClaimContractDetails,
  normalizeServiceClaimContractNumber,
} from "../../../lib/service-claims";
import { formatServiceClaimProblemAreaForEmail, formatServiceClaimProblemAreaList, parseServiceClaimProblemAreas } from "../../../lib/service-claim-problem-areas";
import { KITCHEN_AREA_FIRST_LINE_PREFIXES } from "../../../lib/service-claim-problem-description";
import { isElectricalApplianceProblemArea } from "../../../lib/service-claim-serial-number";
import { formatServiceClaimEmailSubject } from "../../../lib/service-claim-email-subject";
import { getServiceClaimKitchenPlan } from "../../../lib/service-claim-kitchen-plan";
import { buildServiceClaimComponentChoiceGroups } from "../../../lib/service-claim-component-choices";
import { validateReferenceAppliances } from "../../../lib/contract-appliances";
import { stripProductDimensionsFromLabel } from "../../../lib/product-label-format";
import { getOrderKindForContractNumber } from "../../../lib/order-kind";
import {
  PUBLIC_VISIT_EVENT_TYPES,
  SERVICE_PAGE_PATH,
  safelyTrackPublicVisitEvent,
} from "../../../lib/public-visit-tracking";

function descriptionHasClientKitchenAreasLine(text) {
  const first = String(text || "").split("\n")[0] || "";
  return KITCHEN_AREA_FIRST_LINE_PREFIXES.some((p) => first.startsWith(p));
}

function requiredString(value, fieldName, maxLength) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  if (Number.isInteger(maxLength) && normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

function optionalString(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function booleanFromFormValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function parseSerialNumberEntries(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function mergeProblemAreasIntoDescription(problemDescription, problemAreasJsonRaw) {
  const submittedDescription = String(problemDescription || "").trim();
  const base = descriptionHasClientKitchenAreasLine(submittedDescription)
    ? stripSelectedKitchenAreasFromProblemText(submittedDescription)
    : submittedDescription;
  const raw = String(problemAreasJsonRaw || "").trim();
  if (!raw) {
    return base;
  }
  try {
    const areas = JSON.parse(raw);
    if (!Array.isArray(areas) || areas.length === 0) {
      return base;
    }
    const lines = areas
      .map((a) => {
        const name = stripProductDimensionsFromLabel(String(a?.name || "").trim());
        const code = String(a?.code || "").trim();
        if (name && code) {
          return `- ${name} (${code})`;
        }
        if (name) {
          return `- ${name}`;
        }
        if (code) {
          return `- ${code}`;
        }
        return null;
      })
      .filter(Boolean);
    if (!lines.length) {
      return base;
    }
    return `Ausgewählte Küchenbereiche:\n${lines.join("\n")}\n\n${base}`.trim();
  } catch {
    return base;
  }
}

function normalizeProblemAreasJson(problemAreasJsonRaw) {
  const normalized = parseServiceClaimProblemAreas(problemAreasJsonRaw);
  return normalized.length ? JSON.stringify(normalized) : null;
}

function normalizeReferenceIssuesJson(referenceIssuesJsonRaw) {
  let submittedIssues;
  try {
    submittedIssues = JSON.parse(String(referenceIssuesJsonRaw || "[]"));
  } catch {
    throw new Error("Invalid reference-plan components.");
  }
  if (!Array.isArray(submittedIssues)) {
    throw new Error("Invalid reference-plan components.");
  }
  for (const issue of submittedIssues) {
    if (!Object.prototype.hasOwnProperty.call(issue || {}, "planMarker")) continue;
    if (issue.planMarker == null) continue;
    const x = issue.planMarker?.x;
    const y = issue.planMarker?.y;
    if (
      typeof x !== "number"
      || typeof y !== "number"
      || !Number.isFinite(x)
      || x < 0
      || x > 100
      || !Number.isFinite(y)
      || y < 0
      || y > 100
    ) {
      throw new Error("Invalid kitchen-sketch marker coordinates.");
    }
  }

  return parseServiceClaimProblemAreas(referenceIssuesJsonRaw).map((area) => {
    const componentId = String(area.componentId || "").trim();
    const isElectrical = componentId.startsWith("reference-electrical-");
    const isFurniture = componentId.startsWith("reference-furniture-");
    if (!isElectrical && !isFurniture) {
      throw new Error("Invalid reference-plan component.");
    }
    const name = requiredString(area.name, "Affected component");
    const detail = requiredString(area.detail, "Problem description");
    return {
      componentId,
      name,
      code: isElectrical ? "REFERENCE-ELECTRICAL" : "REFERENCE-FURNITURE",
      ...(isElectrical ? { applianceType: area.applianceType } : {}),
      detail,
      ...(isElectrical ? { serialNumber: requiredString(area.serialNumber, "Serial number") } : {}),
      ...(area.planMarker ? { planMarker: area.planMarker } : {}),
    };
  });
}

function normalizeSketchMarkersJson(sketchMarkersJsonRaw) {
  let submittedMarkers;
  try {
    submittedMarkers = JSON.parse(String(sketchMarkersJsonRaw || "[]"));
  } catch {
    throw new Error("Invalid kitchen-sketch markers.");
  }
  if (!Array.isArray(submittedMarkers) || submittedMarkers.length > 30) {
    throw new Error("Invalid kitchen-sketch markers.");
  }
  return submittedMarkers.map((marker) => {
    const x = marker?.x;
    const y = marker?.y;
    if (
      typeof x !== "number"
      || typeof y !== "number"
      || !Number.isFinite(x)
      || !Number.isFinite(y)
      || x < 0
      || x > 100
      || y < 0
      || y > 100
    ) {
      throw new Error("Invalid kitchen-sketch marker coordinates.");
    }
    return { x, y };
  });
}

function formatAttachmentLabel(entry) {
  const areaName = String(entry?.areaName || "").trim();
  const areaCode = String(entry?.areaCode || "").trim();
  const role = String(entry?.role || "").trim();
  const areaLabel = areaName && areaCode
    ? `${areaName} (${areaCode})`
    : areaName || areaCode;

  if (role === "problem_area" && areaLabel) {
    return `[${areaLabel}] ${entry.filename}`;
  }
  if (role === "serial_number") {
    return `[Seriennummer] ${entry.filename}`;
  }
  return entry.filename;
}

function requiredGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized !== "female" && normalized !== "male" && normalized !== "ms" && normalized !== "prefer_not_to_say") {
    throw new Error("Salutation is required.");
  }
  return normalized;
}

function genderDisplayLabel(gender) {
  if (gender === "male") return "Herr";
  if (gender === "female" || gender === "ms") return "Frau";
  if (gender === "prefer_not_to_say") return "Keine Angabe";
  return String(gender || "-");
}

function optionalGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "female" || normalized === "male" || normalized === "ms" || normalized === "prefer_not_to_say") {
    return normalized;
  }
  return "";
}

function formatContactPersonName({ gender, givenName, surname, legacyName = "" }) {
  const joined = combinePersonName(givenName, surname);
  const person = legacyName || joined;
  if (!person) {
    return "";
  }
  if (gender === "female" || gender === "male" || gender === "ms") {
    return `${genderDisplayLabel(gender)} ${person}`;
  }
  return person;
}

function buildCustomerFullName({ givenName, surname, gender }) {
  const combined = [givenName, surname].filter(Boolean).join(" ").trim();
  if (gender === "female" || gender === "male" || gender === "ms") {
    return `${genderDisplayLabel(gender)} ${combined}`;
  }
  return combined;
}

function combinePersonName(givenName, surname) {
  return [givenName, surname].filter(Boolean).join(" ").trim();
}

function buildPartyContactBlock(contact) {
  const companyName = String(contact?.companyName || "").trim();
  const companyPhone = String(contact?.companyPhone || "").trim();
  const companyEmail = String(contact?.companyEmail || "").trim();
  const contactPerson = String(contact?.contactPerson || "").trim();
  const givenName = String(contact?.givenName || "").trim();
  const surname = String(contact?.surname || "").trim();
  const phone = String(contact?.phone || "").trim();
  const email = String(contact?.email || "").trim();
  const resolvedContactPerson =
    formatContactPersonName({
      gender: contact?.gender,
      givenName: contact?.contactGivenName || givenName,
      surname: contact?.contactSurname || surname,
      legacyName: contactPerson,
    });

  return [
    ["Firma", companyName],
    ["Firma Telefon", companyPhone],
    ["Firma E-Mail", companyEmail],
    ["Ansprechperson", resolvedContactPerson],
    ["Telefon Ansprechperson", phone],
    ["E-Mail Ansprechperson", email],
  ]
    .filter(([, value]) => String(value || "").trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function formatServiceClaimErrorMessage(error) {
  const direct = String(error?.message || "").trim();
  if (direct) {
    return direct;
  }

  if (error && typeof error === "object" && Array.isArray(error.errors)) {
    const nested = error.errors
      .map((entry) => String(entry?.message || entry || "").trim())
      .filter(Boolean);
    if (nested.length) {
      return nested.join(" ");
    }
  }

  const fallback = String(error || "").trim();
  return fallback || "The complaint request could not be processed.";
}

async function postWebhook(payload) {
  const webhookUrl = String(process.env.N8N_WEBHOOK_URL || "").trim();
  if (!webhookUrl) {
    return false;
  }

  const target = new URL(webhookUrl);
  const requestBody = JSON.stringify(payload);
  const lib = target.protocol === "https:" ? https : http;

  try {
    await new Promise((resolve, reject) => {
      const req = lib.request(
        {
          hostname: target.hostname,
          port: target.port || (target.protocol === "https:" ? 443 : 80),
          path: `${target.pathname}${target.search}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(requestBody),
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "fragmento-service-claims/1.0",
          },
        },
        (res) => {
          res.resume();
          res.on("end", resolve);
        },
      );

      req.on("error", reject);
      req.write(requestBody);
      req.end();
    });
    return true;
  } catch (error) {
    console.warn("Service claim webhook delivery failed:", formatServiceClaimErrorMessage(error));
    return false;
  }
}

async function sendComplaintEmail(payload, attachmentParts = [], referenceSnapshot = null) {
  return observeClaimEmailSend({
    claimId: payload.id,
    recipient: () => resolveServiceClaimEmailRecipient(payload.contractNumber),
    send: (captureReceipt) => sendComplaintEmailMessage(payload, attachmentParts, referenceSnapshot, captureReceipt),
  });
}

async function sendComplaintEmailMessage(payload, attachmentParts = [], referenceSnapshot = null, captureReceipt = () => {}) {
  const recipient = resolveServiceClaimEmailRecipient(payload.contractNumber);
  const smtpConfig = resolveSmtpConfigForContract(payload.contractNumber, process.env, CLAIM_INTERNAL_PREFIXES);

  if (!recipient || !smtpConfig.host || !smtpConfig.from) {
    return false;
  }

  const kitchenPreviewAttachment = referenceSnapshot || await buildClaimKitchenPreviewAttachment(payload);
  const emailAttachmentParts = attachmentParts.map((part, index) => ({
    ...part,
    cid: isEmailInlineImage(part.contentType) ? buildUserAttachmentCid(payload.id, index) : "",
  }));
  const userFiles = emailAttachmentParts.map((part) => ({
    filename: part.filename,
    content: part.content,
    contentType: part.contentType,
    ...(part.cid ? { cid: part.cid } : {}),
    contentDisposition: part.cid ? "inline" : "attachment",
  }));
  const attachments = [
    ...(kitchenPreviewAttachment ? [kitchenPreviewAttachment] : []),
    ...userFiles,
  ];
  const emailPayload = {
    ...payload,
    attachmentsMeta: (payload.attachmentsMeta || []).map((entry, index) => ({
      ...entry,
      cid: emailAttachmentParts[index]?.cid || "",
    })),
  };

  // 111 and 222 contract claims are sent from SMTP_111_* (315primex), all others from SMTP_*.
  const { receipt } = await sendMailForContract(payload.contractNumber, {
    to: recipient,
    subject: formatServiceClaimEmailSubject(payload.contractNumber, payload.claimSequence),
    replyTo: payload.email || undefined,
    text: buildComplaintEmailText(emailPayload),
    html: buildComplaintEmailHtml(emailPayload, kitchenPreviewAttachment),
    attachments,
  }, { prefixes: CLAIM_INTERNAL_PREFIXES });
  captureReceipt(receipt);

  return true;
}

function formatEmailFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) {
    return "—";
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function extractAvailabilityFromDescription(description) {
  const raw = String(description || "");
  const match = raw.match(/^Erreichbarkeit\s*:\s*(.+)$/m);
  if (!match) {
    return { description: raw.trim(), availability: "" };
  }
  const availability = match[1].trim();
  const cleaned = raw
    .replace(/^Erreichbarkeit\s*:\s*.+$/m, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { description: cleaned, availability };
}

function splitLegacyAvailability(availability) {
  const parts = String(availability || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { date: parts[0], time: parts.slice(1).join(" | ") };
  }
  const onlyValue = parts[0] || "";
  return /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(onlyValue)
    ? { date: onlyValue, time: "" }
    : { date: "", time: onlyValue };
}

function formatGermanPreferredContactTime({ window, from, to }) {
  if (window === "morning") return "Vormittag, 08:00–12:00";
  if (window === "afternoon") return "Nachmittag, 12:00–17:00";
  if (window === "evening") return "Abend, 17:00–20:00";
  if (window === "custom") {
    return from && to ? `Eigene Uhrzeit (${from}–${to})` : "Eigene Uhrzeit";
  }
  return "";
}

function stripSelectedKitchenAreasFromProblemText(description) {
  let text = String(description || "").trim();
  if (!text) {
    return "";
  }

  for (const prefix of KITCHEN_AREA_FIRST_LINE_PREFIXES) {
    if (text.startsWith(prefix)) {
      const lines = text.split("\n");
      let index = 1;
      while (index < lines.length && lines[index].trim()) {
        index += 1;
      }
      return lines.slice(index).join("\n").trim();
    }
  }

  if (text.startsWith("AusgewÃ¤hlte KÃ¼chenbereiche:")) {
    const lines = text.split("\n");
    let index = 1;
    while (index < lines.length && lines[index].trim().startsWith("-")) {
      index += 1;
    }
    return lines.slice(index).join("\n").trim();
  }

  return text;
}

function isEmailInlineImage(contentType) {
  const normalized = String(contentType || "").toLowerCase().split(";")[0].trim();
  return normalized.startsWith("image/") && normalized !== "image/svg+xml";
}

function buildUserAttachmentCid(claimId, index) {
  return `claim-upload-${String(claimId || "claim").replace(/[^a-z0-9-]/gi, "")}-${index}@fragmento`;
}

function formatAttachmentMetaLine(entry) {
  return `${formatAttachmentLabel(entry)} (${entry.contentType}, ${formatEmailFileSize(entry.size)})`;
}

function formatAttachmentFileMetaLine(entry) {
  return `${entry.filename} (${entry.contentType}, ${formatEmailFileSize(entry.size)})`;
}

function buildClaimItemRows(problemAreasJson, attachmentsMeta = []) {
  const attachmentsByComponentId = new Map();
  const serialAttachmentsByComponentId = new Map();
  const orphanProblemAreaAttachments = [];

  for (const entry of attachmentsMeta || []) {
    if (entry?.role !== "problem_area" && entry?.role !== "serial_number") {
      continue;
    }
    const componentId = String(entry.areaComponentId || "").trim();
    if (!componentId) {
      orphanProblemAreaAttachments.push(entry);
      continue;
    }
    const targetMap = entry.role === "serial_number"
      ? serialAttachmentsByComponentId
      : attachmentsByComponentId;
    const list = targetMap.get(componentId) || [];
    list.push(entry);
    targetMap.set(componentId, list);
  }

  const rows = parseServiceClaimProblemAreas(problemAreasJson).map((area, index) => {
    const componentId = String(area.componentId || "").trim();
    return {
      isElectricalAppliance: isElectricalApplianceProblemArea(area),
      name: String(area.name || "").trim(),
      articleCode: String(area.code || "").trim(),
      detail: String(area.detail || "").trim(),
      serialNumber: String(area.serialNumber || "").trim(),
      planMarker: area.planMarker || null,
      markerNumber: area.planMarker ? index + 1 : null,
      serialAttachments: componentId ? serialAttachmentsByComponentId.get(componentId) || [] : [],
      attachments: componentId ? attachmentsByComponentId.get(componentId) || [] : [],
    };
  });

  for (const entry of orphanProblemAreaAttachments) {
    rows.push({
      isElectricalAppliance: false,
      name: String(entry.areaName || "").trim() || "Küchenteil",
      articleCode: String(entry.areaCode || "").trim(),
      detail: "",
      serialNumber: "",
      serialAttachments: [],
      attachments: [entry],
    });
  }

  return rows;
}

function buildClaimItemText(row, { showArticleCode = true } = {}) {
  return [
    `Type: ${row.name || "-"}`,
    ...(showArticleCode ? [`Typen - NR: ${row.articleCode || "-"}`] : []),
    `Problembeschreibung: ${row.detail || "-"}`,
    ...(row.markerNumber ? [`Skizzenposition: X${row.markerNumber}`] : []),
    ...(row.isElectricalAppliance
      ? [
          `Seriennummer: ${row.serialNumber || (row.serialAttachments?.length ? "Siehe Seriennummernfoto" : "-")}`,
          row.serialAttachments?.length
            ? [
                "Seriennummer-Foto:",
                ...row.serialAttachments.map((entry) => `  - ${formatAttachmentFileMetaLine(entry)}`),
              ].join("\n")
            : "Seriennummer-Foto: -",
        ]
      : []),
    row.attachments?.length
      ? [
          "Anhänge:",
          ...row.attachments.map((entry) => `  - ${formatAttachmentFileMetaLine(entry)}`),
        ].join("\n")
      : "Anhänge: -",
  ].join("\n");
}

function buildClaimItemHtml(row, { showArticleCode = true, itemNumber = 1 } = {}) {
  const itemTdStyles = "padding:8px 0;border-bottom:1px solid #eeeeee;vertical-align:top;";
  const itemLabelStyles = `${itemTdStyles}box-sizing:border-box;font-weight:bold;width:35%;padding-left:15px;padding-right:15px;line-height:1.45;`;
  const itemValueStyles = `${itemTdStyles}box-sizing:border-box;padding-left:15px;padding-right:15px;line-height:1.45;`;
  const itemKind = row.isElectricalAppliance ? "Elektrogerät" : "Möbelteil";
  const uploads = row.attachments?.length
    ? row.attachments.map((entry) => formatAttachmentHtml(entry, { includeItemContext: false })).join("")
    : "-";
  const serialUploads = row.serialAttachments?.length
    ? row.serialAttachments.map((entry) => formatAttachmentHtml(entry, { includeItemContext: false })).join("")
    : "-";
  const serialRows = row.isElectricalAppliance
    ? `
        <tr><td style="${itemLabelStyles}">Seriennummer</td><td style="${itemValueStyles}">${formatMultiline(row.serialNumber || (row.serialAttachments?.length ? "Siehe Seriennummernfoto" : "-"))}</td></tr>
        <tr><td style="${itemLabelStyles}">Seriennummer-Foto</td><td style="${itemValueStyles}">${serialUploads}</td></tr>
      `
    : "";

  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;">
      <tbody>
        <tr>
          <td colspan="2" style="padding:10px 15px;border-bottom:2px solid #d9c7b8;font-size:14px;font-weight:bold;color:#5f4634;">
            Problem ${itemNumber} &middot; ${itemKind}
          </td>
        </tr>
        <tr><td style="${itemLabelStyles}">Type</td><td style="${itemValueStyles}">${formatMultiline(row.name || "-")}</td></tr>
        ${showArticleCode ? `<tr><td style="${itemLabelStyles}">Typen - NR</td><td style="${itemValueStyles}">${formatMultiline(row.articleCode || "-")}</td></tr>` : ""}
        <tr><td style="${itemLabelStyles}">Problembeschreibung</td><td style="${itemValueStyles}">${formatMultiline(row.detail || "-")}</td></tr>
        ${row.markerNumber ? `<tr><td style="${itemLabelStyles}">Skizzenposition</td><td style="${itemValueStyles}">X${row.markerNumber}</td></tr>` : ""}
        ${serialRows}
        <tr><td style="${itemLabelStyles}border-bottom:0;">Anhänge</td><td style="${itemValueStyles}border-bottom:0;">${uploads}</td></tr>
      </tbody>
    </table>
  `;
}

function buildEmailDetailSubtable(rows) {
  const labelStyles = "padding:8px 15px;border-bottom:1px solid #eeeeee;box-sizing:border-box;font-weight:bold;width:35%;vertical-align:top;line-height:1.45;";
  const valueStyles = "padding:8px 15px;border-bottom:1px solid #eeeeee;box-sizing:border-box;vertical-align:top;line-height:1.45;";
  const populatedRows = rows.filter(([, value]) => String(value || "").trim());
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;">
      <tbody>
        ${populatedRows.map(([label, value], index) => {
          const isLast = index === populatedRows.length - 1;
          const borderOverride = isLast ? "border-bottom:0;" : "";
          return `<tr><td style="${labelStyles}${borderOverride}">${escapeHtml(label)}</td><td style="${valueStyles}${borderOverride}">${formatMultiline(value)}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function hasPartyContactDetails(values) {
  return values.some((value) => String(value || "").trim());
}

function formatAttachmentHtml(entry, { includeItemContext = true } = {}) {
  const label = escapeHtml(
    includeItemContext ? formatAttachmentMetaLine(entry) : formatAttachmentFileMetaLine(entry),
  );
  if (!entry?.cid || !isEmailInlineImage(entry.contentType)) {
    return `<div style="margin-top:4px;">${label}</div>`;
  }

  return `
    <div style="margin-top:8px;">
      <div style="margin-bottom:6px;">${label}</div>
      <table role="presentation" width="150" cellspacing="0" cellpadding="0" border="0" style="width:150px;border-collapse:separate;">
        <tbody>
          <tr>
            <td width="148" height="148" align="center" valign="middle" style="box-sizing:border-box;width:148px;height:148px;padding:4px;border:1px solid #e5e5e5;border-radius:6px;background:#fafafa;text-align:center;vertical-align:middle;">
              <img src="cid:${escapeHtml(entry.cid)}" alt="${escapeHtml(entry.filename || "Hochgeladenes Bild")}" width="140" height="140" style="display:block;width:140px;height:140px;max-width:140px;max-height:140px;object-fit:contain;border:0;" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function parseConfirmedChoiceGroupKeys(raw) {
  try {
    const keys = JSON.parse(String(raw || "[]"));
    return new Set(
      Array.isArray(keys)
        ? keys.map((key) => String(key || "").trim()).filter(Boolean)
        : [],
    );
  } catch {
    return new Set();
  }
}

async function resolveProblemAreasFromDatabase(
  contractNumber,
  rawProblemAreasJson,
  rawConfirmedChoiceGroupsJson = "[]",
) {
  const submittedAreas = parseServiceClaimProblemAreas(rawProblemAreasJson);
  if (!submittedAreas.length) {
    return null;
  }

  const kitchenPlan = await getServiceClaimKitchenPlan(contractNumber);
  if (!kitchenPlan?.selectableComponents?.length) {
    throw new Error("Die Artikeldaten der ausgewählten Küchenteile konnten nicht geladen werden.");
  }

  const databaseAreasByComponentId = new Map(
    kitchenPlan.selectableComponents.map((area) => [String(area?.componentId || "").trim(), area]),
  );
  const confirmedChoiceGroupKeys = parseConfirmedChoiceGroupKeys(rawConfirmedChoiceGroupsJson);
  const choiceGroupByOptionId = new Map(
    buildServiceClaimComponentChoiceGroups(kitchenPlan.selectableComponents)
      .flatMap((group) => group.options.map((option) => [option.componentId, group])),
  );
  const resolvedAreas = submittedAreas.map((submittedArea) => {
    const componentId = String(submittedArea.componentId || "").trim();
    const databaseArea = databaseAreasByComponentId.get(componentId);
    if (!databaseArea) {
      throw new Error("Ein ausgewähltes Küchenteil gehört nicht zur Küche dieses Vertrags.");
    }
    const choiceGroup = choiceGroupByOptionId.get(componentId);
    if (choiceGroup && !confirmedChoiceGroupKeys.has(choiceGroup.sourceComponentKey)) {
      throw new Error("Please select at least one affected kitchen component.");
    }
    const databaseGermanName = String(databaseArea.nameDe || "").trim();
    if (!databaseGermanName) {
      throw new Error(`Für den Artikel ${databaseArea.articleCode || databaseArea.code || componentId} ist kein deutscher Name in der Datenbank hinterlegt.`);
    }

    return {
      componentId,
      name: databaseGermanName,
      code: String(databaseArea.articleCode || databaseArea.code || "").trim(),
      ...(submittedArea.detail ? { detail: submittedArea.detail } : {}),
      ...(submittedArea.serialNumber ? { serialNumber: submittedArea.serialNumber } : {}),
    };
  });

  return JSON.stringify(resolvedAreas);
}

let serviceClaimInsertColumnSupportPromise = null;

async function getServiceClaimInsertColumnSupport(prismaClient) {
  if (!serviceClaimInsertColumnSupportPromise) {
    serviceClaimInsertColumnSupportPromise = prismaClient.$queryRaw`
      SELECT "column_name"
      FROM "information_schema"."columns"
      WHERE "table_schema" = 'public'
        AND "table_name" = 'ServiceClaim'
    `
      .then((rows) => {
        const availableColumns = new Set(
          Array.isArray(rows)
            ? rows
                .map((row) => String(row?.column_name || "").trim())
                .filter(Boolean)
            : [],
        );

        return {
          includeAttachmentsJson: availableColumns.has("attachmentsJson"),
          includeProblemAreasJson: availableColumns.has("problemAreasJson"),
          includeClaimSequence: availableColumns.has("claimSequence"),
          includeLandlordCompanyPhone: availableColumns.has("landlordCompanyPhone"),
          includeLandlordCompanyEmail: availableColumns.has("landlordCompanyEmail"),
        };
      })
      .catch(() => ({
        includeAttachmentsJson: true,
        includeProblemAreasJson: true,
        includeClaimSequence: true,
        includeLandlordCompanyPhone: true,
        includeLandlordCompanyEmail: true,
      }));
  }

  return serviceClaimInsertColumnSupportPromise;
}

function isMissingServiceClaimInsertColumnError(error, columnName) {
  const message = String(error?.message ?? "");
  const metaMessage = typeof error?.meta?.message === "string" ? error.meta.message : "";
  const combined = `${message} ${metaMessage}`;
  return (
    combined.includes(columnName)
    && (combined.includes("does not exist") || combined.includes("42703"))
  );
}

function isClaimSequenceNotNullViolation(error) {
  const code = String(error?.code || error?.meta?.code || "");
  const message = `${String(error?.message || "")} ${String(error?.meta?.message || "")}`;
  return code === "23502" || message.includes("23502");
}

export function getMissingOptionalInsertColumns(error, options) {
  const missing = [];
  if (options.includeAttachmentsJson && isMissingAttachmentsJsonColumnError(error)) {
    missing.push("attachmentsJson");
  }
  if (options.includeProblemAreasJson && isMissingProblemAreasJsonColumnError(error)) {
    missing.push("problemAreasJson");
  }
  if (options.includeClaimSequence && isMissingServiceClaimInsertColumnError(error, "claimSequence")) {
    missing.push("claimSequence");
  }
  if (options.includeLandlordCompanyPhone && isMissingServiceClaimInsertColumnError(error, "landlordCompanyPhone")) {
    missing.push("landlordCompanyPhone");
  }
  if (options.includeLandlordCompanyEmail && isMissingServiceClaimInsertColumnError(error, "landlordCompanyEmail")) {
    missing.push("landlordCompanyEmail");
  }
  return missing;
}

function buildServiceClaimInsertSql(payload, options) {
  const columns = [
    Prisma.raw(`"id"`),
    Prisma.raw(`"contractNumber"`),
    ...(options.includeClaimSequence ? [Prisma.raw(`"claimSequence"`)] : []),
    Prisma.raw(`"fullName"`),
    Prisma.raw(`"phone"`),
    Prisma.raw(`"email"`),
    Prisma.raw(`"clientAddress"`),
    Prisma.raw(`"clientCountry"`),
    Prisma.raw(`"clientCity"`),
    Prisma.raw(`"clientPostalCode"`),
    Prisma.raw(`"landlordName"`),
    ...(options.includeLandlordCompanyPhone ? [Prisma.raw(`"landlordCompanyPhone"`)] : []),
    ...(options.includeLandlordCompanyEmail ? [Prisma.raw(`"landlordCompanyEmail"`)] : []),
    Prisma.raw(`"landlordPhone"`),
    Prisma.raw(`"landlordEmail"`),
    Prisma.raw(`"hausmeisterName"`),
    Prisma.raw(`"hausmeisterPhone"`),
    Prisma.raw(`"hausmeisterEmail"`),
    Prisma.raw(`"landlordContact"`),
    Prisma.raw(`"problemDescription"`),
    Prisma.raw(`"serialNumber"`),
    Prisma.raw(`"requestType"`),
    ...(options.includeProblemAreasJson ? [Prisma.raw(`"problemAreasJson"`)] : []),
    ...(options.includeAttachmentsJson ? [Prisma.raw(`"attachmentsJson"`)] : []),
  ];

  const values = [
    payload.id,
    payload.contractNumber,
    ...(options.includeClaimSequence ? [payload.claimSequence] : []),
    payload.fullName,
    payload.phone || null,
    payload.email || null,
    payload.clientAddress,
    payload.clientCountry,
    payload.clientCity,
    payload.clientPostalCode,
    payload.landlordName,
    ...(options.includeLandlordCompanyPhone ? [payload.landlordCompanyPhone || null] : []),
    ...(options.includeLandlordCompanyEmail ? [payload.landlordCompanyEmail || null] : []),
    payload.landlordPhone || null,
    payload.landlordEmail || null,
    payload.hausmeisterName,
    payload.hausmeisterPhone || null,
    payload.hausmeisterEmail || null,
    payload.landlordContact,
    payload.problemDescription,
    payload.serialNumber,
    payload.requestType,
    ...(options.includeProblemAreasJson ? [payload.problemAreasJson] : []),
    ...(options.includeAttachmentsJson ? [payload.attachmentsJson] : []),
  ].map((value) => Prisma.sql`${value}`);

  return Prisma.sql`
    INSERT INTO "ServiceClaim" (${Prisma.join(columns)})
    VALUES (${Prisma.join(values)})
  `;
}

async function insertServiceClaimRecord(prismaClient, payload) {
  const options = { ...(await getServiceClaimInsertColumnSupport(prismaClient)) };

  while (true) {
    try {
      const claimSequence = await prismaClient.$transaction(async (transaction) => {
        // Serialize sequence allocation per contract so simultaneous submissions
        // cannot receive the same KD number.
        await transaction.$queryRaw`
          SELECT "id"
          FROM "KitchenContract"
          WHERE "contractNumber" = ${payload.contractNumber}
          FOR UPDATE
        `;

        const rows = options.includeClaimSequence
          ? await transaction.$queryRaw`
              SELECT COALESCE(MAX("claimSequence"), 0) + 1 AS "nextSequence"
              FROM "ServiceClaim"
              WHERE "contractNumber" = ${payload.contractNumber}
            `
          : await transaction.$queryRaw`
              SELECT COUNT(*) + 1 AS "nextSequence"
              FROM "ServiceClaim"
              WHERE "contractNumber" = ${payload.contractNumber}
            `;
        const nextSequence = Number(rows?.[0]?.nextSequence || 1);

        await transaction.$executeRaw(buildServiceClaimInsertSql(
          { ...payload, claimSequence: nextSequence },
          options,
        ));
        return nextSequence;
      });

      payload.claimSequence = claimSequence;
      return claimSequence;
    } catch (error) {
      // The column-support result can be cached by a dev server that was already
      // running when the migration added the required claimSequence column.
      if (!options.includeClaimSequence && isClaimSequenceNotNullViolation(error)) {
        options.includeClaimSequence = true;
        continue;
      }

      const missingColumns = getMissingOptionalInsertColumns(error, options);
      if (!missingColumns.length) {
        throw error;
      }

      for (const columnName of missingColumns) {
        if (columnName === "attachmentsJson") {
          options.includeAttachmentsJson = false;
        }
        if (columnName === "problemAreasJson") {
          options.includeProblemAreasJson = false;
        }
        if (columnName === "claimSequence") {
          options.includeClaimSequence = false;
        }
        if (columnName === "landlordCompanyPhone") {
          options.includeLandlordCompanyPhone = false;
        }
        if (columnName === "landlordCompanyEmail") {
          options.includeLandlordCompanyEmail = false;
        }
      }
    }
  }
}

function getReferencePlanAssetContentType(assetPath, fallback = "application/octet-stream") {
  const extension = path.extname(String(assetPath || "")).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".pdf") return "application/pdf";
  return fallback;
}

async function readPublicReferencePlanAsset(assetPath) {
  let decodedPath = "";
  try {
    decodedPath = decodeURIComponent(String(assetPath || "").trim());
  } catch {
    return null;
  }
  if (!/^\/(?:jpg|img|pdfs)\//.test(decodedPath) || decodedPath.includes("..")) {
    return null;
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const resolvedPath = path.resolve(publicRoot, decodedPath.replace(/^\/+/, ""));
  if (!resolvedPath.startsWith(`${publicRoot}${path.sep}`)) {
    return null;
  }
  const content = await readFile(resolvedPath).catch(() => null);
  if (!content?.length) {
    return null;
  }
  return {
    content,
    contentType: getReferencePlanAssetContentType(decodedPath),
    filename: sanitizeServiceClaimFilename(path.basename(decodedPath)),
  };
}

async function loadReferencePlanAsset(contractNumber, assetPath, kind) {
  const normalizedPath = String(assetPath || "").trim();
  if (!normalizedPath) return null;

  if (/^\/api\/service-claims\/contracts\/[^/]+\/plan-assets\/(?:preview|pdf)$/.test(normalizedPath)) {
    const storedAsset = await getPublicContractClaimPlanAsset(prisma, contractNumber, kind).catch(() => null);
    if (!storedAsset?.bytes) return null;
    return {
      content: Buffer.from(storedAsset.bytes),
      contentType: storedAsset.mimeType || (kind === "preview" ? "image/jpeg" : "application/pdf"),
      filename: sanitizeServiceClaimFilename(
        storedAsset.fileName || (kind === "preview" ? "kitchen-sketch.jpg" : "kitchen-plan.pdf"),
      ),
    };
  }

  return readPublicReferencePlanAsset(normalizedPath);
}

async function buildArcReferencePlanEmailAttachment(payload) {
  if (payload?.contractType !== "ARC") return null;

  const kitchenPlan = await getServiceClaimKitchenPlan(payload.contractNumber).catch(() => null);
  if (kitchenPlan?.selectionMode !== "reference-pdf") return null;

  const previewAsset = await loadReferencePlanAsset(
    payload.contractNumber,
    kitchenPlan.previewImagePath,
    "preview",
  );
  if (previewAsset?.content?.length && previewAsset.contentType.startsWith("image/")) {
    const markers = Array.isArray(payload.sketchMarkers)
      ? payload.sketchMarkers
      : [];
    const annotatedContent = markers.length
      ? await renderReferencePlanMarkersPng({
          content: previewAsset.content,
          markers,
          appearance: payload.sketchMarkerAppearance,
        }).catch(() => null)
      : null;
    const emailContent = annotatedContent || previewAsset.content;
    const emailImageMetadata = await sharp(emailContent).metadata().catch(() => null);
    return {
      filename: annotatedContent
        ? `arc-kitchen-sketch-marked-${payload.contractNumber}.png`
        : previewAsset.filename || `arc-kitchen-sketch-${payload.contractNumber}.jpg`,
      content: emailContent,
      cid: "arc-kitchen-sketch@fragmento",
      contentType: annotatedContent ? "image/png" : previewAsset.contentType,
      contentDisposition: "inline",
      emailLabel: "ARC-Küchenskizze",
      emailAlt: `ARC-Küchenskizze für Vertrag ${payload.contractNumber}`,
      width: emailImageMetadata?.width || null,
      height: emailImageMetadata?.height || null,
      isArcReferenceImage: true,
      isReferencePdf: false,
    };
  }

  const pdfAsset = await loadReferencePlanAsset(payload.contractNumber, kitchenPlan.pdfPath, "pdf");
  if (!pdfAsset?.content?.length) return null;
  return {
    filename: pdfAsset.filename || `arc-kitchen-plan-${payload.contractNumber}.pdf`,
    content: pdfAsset.content,
    contentType: "application/pdf",
    contentDisposition: "attachment",
    emailLabel: "ARC-Küchenskizze",
    emailAlt: "",
    isReferencePdf: true,
  };
}

async function buildClaimKitchenPreviewAttachment(payload) {
  const arcReferenceAttachment = await buildArcReferencePlanEmailAttachment(payload);
  if (arcReferenceAttachment) {
    return arcReferenceAttachment;
  }

  if (!String(payload?.kitchenSlug || "").trim()) {
    return null;
  }

  const selectedAreas = parseServiceClaimProblemAreas(payload.problemAreasJson);
  if (!selectedAreas.length) {
    return null;
  }

  const preview = await renderClaimKitchenPreviewPng({
    kitchenSlug: payload.kitchenSlug,
    selectedAreas,
    contractNumber: payload.contractNumber,
    width: 480,
  }).catch(() => null);

  if (!preview?.content?.length) {
    return null;
  }

  return {
    filename: `claim-kitchen-preview-${payload.contractNumber || payload.id}.png`,
    content: preview.content,
    cid: "claim-kitchen-preview@fragmento",
    contentType: preview.contentType || "image/png",
    contentDisposition: "inline",
    emailLabel: "Küche / ausgewählte Komponenten",
    emailAlt: "Küchenplan mit hervorgehobenen Reklamationskomponenten",
    width: preview.width || 480,
    height: preview.height || null,
    isReferencePdf: false,
  };
}
function buildComplaintEmailText(payload) {
  const landlordBlock = buildPartyContactBlock({
    companyName: payload.landlordCompanyName,
    companyPhone: payload.landlordCompanyPhone,
    companyEmail: payload.landlordCompanyEmail,
    contactPerson: payload.landlordContactPerson,
    gender: payload.landlordContactGender,
    contactGivenName: payload.landlordContactGivenName,
    contactSurname: payload.landlordContactSurname,
    givenName: payload.landlordGivenName,
    surname: payload.landlordSurname,
    phone: payload.landlordPhone,
    email: payload.landlordEmail,
  });
  const hausBlock = buildPartyContactBlock({
    givenName: payload.hausmeisterGivenName,
    surname: payload.hausmeisterSurname,
    phone: payload.hausmeisterPhone,
    email: payload.hausmeisterEmail,
  });
  const hasHausmeisterDetails = hasPartyContactDetails([
    payload.hausmeisterGivenName,
    payload.hausmeisterSurname,
    payload.hausmeisterPhone,
    payload.hausmeisterEmail,
  ]);
  const hasLandlordDetails = Boolean(landlordBlock);
  const { availability } = extractAvailabilityFromDescription(
    payload.problemDescription,
  );
  const legacyAvailability = splitLegacyAvailability(availability);
  const availabilityDate = payload.preferredContactDate || legacyAvailability.date;
  const availabilityTime = payload.preferredContactTime || legacyAvailability.time;
  const claimItemRows = buildClaimItemRows(payload.problemAreasJson, payload.attachmentsMeta);
  const showClaimItemArticleCode = payload.contractType !== "ARC";
  const generalAttachments = (payload.attachmentsMeta || []).filter((entry) => entry.role === "general");
  return [
    "Servicereklamation",
    "",
    `Vertragsnummer: ${payload.contractNumber}`,
    `Küche: ${payload.kitchenName || "-"}`,
    `Kunde: ${payload.genderLabel === "Keine Angabe" ? "" : `${payload.genderLabel} `}${payload.givenName} ${payload.surname}`,
    `Adresse: ${formatClaimClientAddressForEmail(payload.clientAddress)}`,
    `Telefon: ${payload.phone || "—"}`,
    `E-Mail: ${payload.email || "—"}`,
    ...(claimItemRows.length
      ? [
          "",
          "Ausgewählte Küchenteile",
          ...claimItemRows.flatMap((row, index) => [
            "",
            `${row.name || `Küchenteil ${index + 1}`}:`,
            buildClaimItemText(row, { showArticleCode: showClaimItemArticleCode }),
          ]),
        ]
      : []),
    ...(hasLandlordDetails ? ["", "Vermieter", landlordBlock] : []),
    ...(hasHausmeisterDetails ? ["", "Hausmeister", hausBlock] : []),
    ...(availabilityDate || availabilityTime
      ? [
          "",
          ...(availabilityDate ? [`GewÃ¼nschtes Kontaktdatum: ${availabilityDate}`] : []),
          ...(availabilityTime ? [`GewÃ¼nschte Kontaktzeit: ${availabilityTime}`] : []),
        ]
      : []),
    ...(generalAttachments.length
      ? [
          "",
          "Allgemeine Anhänge (siehe E-Mail-Anhänge):",
          ...generalAttachments.map((entry) => `- ${formatAttachmentMetaLine(entry)}`),
        ]
      : []),
  ].join("\n");
}

function buildComplaintEmailHtml(payload, previewAttachment = null) {
  const tableStyles = "width:100%;border-collapse:collapse;font-family:Arial,sans-serif;";
  const tdStyles = "padding:12px 15px;border-bottom:1px solid #eaeaea;color:#555;vertical-align:top;";
  const customerName = escapeHtml(`${payload.givenName} ${payload.surname}`.trim());
  const landlordContactDisplay = formatContactPersonName({
    gender: payload.landlordContactGender,
    givenName: payload.landlordContactGivenName,
    surname: payload.landlordContactSurname,
    legacyName: payload.landlordContactPerson,
  });
  const landlordFallbackContact = `${payload.landlordGivenName} ${payload.landlordSurname}`.trim();
  const hasLandlordDetails = hasPartyContactDetails([
    payload.landlordCompanyName,
    payload.landlordCompanyPhone,
    payload.landlordCompanyEmail,
    landlordContactDisplay,
    landlordFallbackContact,
    payload.landlordPhone,
    payload.landlordEmail,
  ]);
  const landlordHtml = buildEmailDetailSubtable([
    ["Firma", payload.landlordCompanyName],
    ["Telefon Firma", payload.landlordCompanyPhone],
    ["E-Mail Firma", payload.landlordCompanyEmail],
    ["Ansprechperson", landlordContactDisplay || landlordFallbackContact],
    ["Telefon Ansprechperson", payload.landlordPhone],
    ["E-Mail Ansprechperson", payload.landlordEmail],
  ]);
  const hausmeisterHtml = buildEmailDetailSubtable([
    ["Name", `${payload.hausmeisterGivenName} ${payload.hausmeisterSurname}`.trim()],
    ["Telefon", payload.hausmeisterPhone],
    ["E-Mail", payload.hausmeisterEmail],
  ]);
  const hasHausmeisterDetails = hasPartyContactDetails([
    payload.hausmeisterGivenName,
    payload.hausmeisterSurname,
    payload.hausmeisterPhone,
    payload.hausmeisterEmail,
  ]);

  const { availability } = extractAvailabilityFromDescription(
    payload.problemDescription,
  );
  const legacyAvailability = splitLegacyAvailability(availability);
  const availabilityDate = payload.preferredContactDate || legacyAvailability.date;
  const availabilityTime = payload.preferredContactTime || legacyAvailability.time;
  const claimItemRows = buildClaimItemRows(payload.problemAreasJson, payload.attachmentsMeta);
  const showClaimItemArticleCode = payload.contractType !== "ARC";
  const generalAttachments = (payload.attachmentsMeta || []).filter((entry) => entry.role === "general");
  const detailRows = [
    ["Vertragsnummer", payload.contractNumber],
    ["Küche", payload.kitchenName || "-"],
    ["Vorname", payload.givenName],
    ["Nachname", payload.surname],
    ["Anrede", payload.genderLabel],
    ["Kundenadresse", formatClaimClientAddressForEmail(payload.clientAddress)],
    ["Telefon", payload.phone || "—"],
    ["E-Mail", payload.email || "—"],
    ...claimItemRows.map((row, index) => ["", { html: buildClaimItemHtml(row, { showArticleCode: showClaimItemArticleCode, itemNumber: index + 1 }), fullWidth: true }]),
    ...(hasLandlordDetails ? [["", { html: landlordHtml, fullWidth: true, sectionTitle: "Vermieter" }]] : []),
    ...(hasHausmeisterDetails ? [["", { html: hausmeisterHtml, fullWidth: true, sectionTitle: "Hausmeister" }]] : []),
    ...(availabilityDate ? [["Gewünschtes Kontaktdatum", availabilityDate]] : []),
    ...(availabilityTime ? [["Gewünschte Kontaktzeit", availabilityTime]] : []),
  ];

  const tbody = detailRows
    .map(
      ([label, value]) => {
        const renderedValue = value && typeof value === "object" && "html" in value
          ? value.html
          : formatMultiline(value);
        if (value && typeof value === "object" && value.fullWidth) {
          const sectionTitle = value.sectionTitle
            ? `<div style="padding:10px 15px;border-top:2px solid #d9c7b8;border-bottom:1px solid #e5d9cf;background:#faf7f4;font-size:14px;font-weight:bold;color:#5f4634;">${escapeHtml(value.sectionTitle)}</div>`
            : "";
          return `<tr><td colspan="2" style="${tdStyles}padding-left:0;padding-right:0;">${sectionTitle}${renderedValue}</td></tr>`;
        }
        return `<tr><td style="${tdStyles}font-weight:bold;width:35%;">${escapeHtml(label)}</td><td style="${tdStyles}">${renderedValue}</td></tr>`;
      },
    )
    .join("");

  const attachmentsRow =
    generalAttachments.length > 0
      ? `<tr><td style="${tdStyles}font-weight:bold;width:35%;">Allgemeine Anhänge</td><td style="${tdStyles}">${generalAttachments
          .map(formatAttachmentHtml)
          .join("")}</td></tr>`
      : "";
  const previewCid = String(previewAttachment?.cid || "").trim();
  const previewLabel = previewAttachment?.emailLabel || "Küche / ausgewählte Komponenten";
  const previewAlt = previewAttachment?.emailAlt || "Küchenplan mit hervorgehobenen Reklamationskomponenten";
  const previewDisplayWidth = REFERENCE_PLAN_EMAIL_DISPLAY_WIDTH;
  const previewDisplayHeight = previewAttachment?.height && previewAttachment?.width
    ? Math.max(1, Math.round(previewAttachment.height * previewDisplayWidth / previewAttachment.width))
    : null;
  const previewDimensions = previewDisplayHeight
    ? ` width="${previewDisplayWidth}" height="${previewDisplayHeight}"`
    : ` width="${previewDisplayWidth}"`;
  const previewImageStyle = previewAttachment?.isArcReferenceImage
    ? `display:block;width:${previewDisplayWidth}px;max-width:100%;height:auto;border:0;`
    : "display:block;width:100%;max-width:540px;height:auto;border:0;";
  const previewBlock = previewCid
    ? `
      <div style="margin:0 0 18px;">
        <div style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#777;">${escapeHtml(previewLabel)}</div>
        <div style="padding:12px;border:1px solid #eaeaea;border-radius:10px;background:#fffaf5;">
          <img src="cid:${escapeHtml(previewCid)}" alt="${escapeHtml(previewAlt)}"${previewDimensions} loading="eager" fetchpriority="high" decoding="sync" style="${previewImageStyle}" />
        </div>
      </div>
    `
    : previewAttachment?.isReferencePdf
      ? `
        <div style="margin:0 0 18px;padding:12px;border:1px solid #eaeaea;border-radius:10px;background:#fffaf5;">
          <div style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#777;">${escapeHtml(previewLabel)}</div>
          <div style="font-size:14px;color:#555;">Küchenskizze als PDF im Anhang.</div>
        </div>
      `
      : "";
  return `
    <div style="max-width:600px;margin:20px 0;font-family:Arial,sans-serif;color:#333;">
      <p style="margin:0 0 16px;line-height:1.5;">
        Neue Servicereklamation zu Vertrag <strong>${escapeHtml(payload.contractNumber)}</strong>
        (${customerName}).
      </p>
      ${previewBlock}
      <div style="padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h4 style="margin-top:0;">Reklamationsdaten</h4>
        <table style="${tableStyles}"><tbody>${tbody}${attachmentsRow}</tbody></table>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.5;color:#777;">
        E-Mail automatisch gesendet (Fragmento Servicemeldung).
      </p>
    </div>
  `;
}

function formatClaimClientAddressForEmail(value) {
  return String(value || "")
    .replace(/(^|[,\r\n]\s*)(?:Floor|Etage):\s*/gi, (_match, separator) => `${separator ? "\n" : ""}Etage: `)
    .replace(/(^|[,\r\n]\s*)(?:Unit|Einheit|Wohnungsnummer):\s*/gi, (_match, separator) => `${separator ? "\n" : ""}Wohnungsnummer: `);
}

function formatMultiline(value) {
  return escapeHtml(value || "-").replaceAll("\n", "<br />");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const MAX_SERVICE_CLAIM_ATTACHMENTS = 20;
const MAX_SERVICE_CLAIM_FILE_BYTES = 4 * 1024 * 1024;

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const EXTENSION_TO_MIME = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function sanitizeServiceClaimFilename(name) {
  let base = String(name || "attachment").replace(/^\.*[\\/]+/g, "");
  base = base.split(/[/\\]/).pop() || "attachment";
  base = base.replace(/[^\w.\- ()\u00C0-\u024F]+/g, "_");
  if (base.length > 120) {
    const dot = base.lastIndexOf(".");
    const ext = dot > 0 ? base.slice(dot) : "";
    base = `${base.slice(0, 110)}${ext}`;
  }
  return base || "attachment";
}

function getAttachmentExtension(filename) {
  const safe = sanitizeServiceClaimFilename(filename);
  const dot = safe.lastIndexOf(".");
  if (dot <= 0 || dot === safe.length - 1) return "";
  return safe.slice(dot + 1).toLowerCase();
}

function inferAttachmentContentType(filename, declared) {
  const trimmed = String(declared || "").toLowerCase().split(";")[0].trim();
  if (trimmed && trimmed !== "application/octet-stream") {
    return trimmed;
  }
  const ext = getAttachmentExtension(filename);
  return EXTENSION_TO_MIME[ext] || "application/octet-stream";
}

function isAllowedServiceClaimAttachment(mime, filename) {
  const normalized = String(mime || "").toLowerCase().split(";")[0].trim();
  if (normalized === "image/svg+xml") {
    return false;
  }
  if (ALLOWED_ATTACHMENT_MIME_TYPES.has(normalized)) return true;
  if (normalized.startsWith("image/")) return true;
  if (normalized === "application/octet-stream" || normalized === "") {
    const ext = getAttachmentExtension(filename);
    return Boolean(EXTENSION_TO_MIME[ext]);
  }
  return false;
}

async function normalizeServiceClaimUploads(files) {
  if (!files.length) {
    return [];
  }
  if (files.length > MAX_SERVICE_CLAIM_ATTACHMENTS) {
    throw new Error(`You can upload at most ${MAX_SERVICE_CLAIM_ATTACHMENTS} files.`);
  }
  const parts = [];
  for (const file of files) {
    if (!(file instanceof File)) {
      continue;
    }
    if (file.size <= 0) {
      continue;
    }
    if (file.size > MAX_SERVICE_CLAIM_FILE_BYTES) {
      throw new Error("Each attachment must be 4 MB or smaller.");
    }
    const filename = sanitizeServiceClaimFilename(file.name);
    const declaredType = file.type;
    if (!isAllowedServiceClaimAttachment(declaredType, filename)) {
      throw new Error(
        "One or more files use a type that is not allowed. Use PDF, images, or common office documents.",
      );
    }
    const contentType = inferAttachmentContentType(filename, declaredType);
    const buffer = Buffer.from(await file.arrayBuffer());
    parts.push({
      filename,
      contentType,
      content: buffer,
      size: buffer.length,
    });
  }
  return parts;
}

async function parseServiceClaimRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body = {};
    const generalAttachmentFiles = [];
    const serialNumberImageFiles = [];
    const serialNumberImageFilesByComponentId = {};
    const problemAreaAttachmentFilesByComponentId = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (key === "attachments" || key === "generalAttachments") {
          generalAttachmentFiles.push(value);
          continue;
        }
        if (key === "serialNumberImages") {
          serialNumberImageFiles.push(value);
          continue;
        }
        if (key.startsWith("serialNumberImage:")) {
          const componentId = key.slice("serialNumberImage:".length).trim();
          if (componentId) {
            if (!Array.isArray(serialNumberImageFilesByComponentId[componentId])) {
              serialNumberImageFilesByComponentId[componentId] = [];
            }
            serialNumberImageFilesByComponentId[componentId].push(value);
          }
          continue;
        }
        if (key.startsWith("problemAreaAttachment:")) {
          const componentId = key.slice("problemAreaAttachment:".length).trim();
          if (componentId) {
            if (!Array.isArray(problemAreaAttachmentFilesByComponentId[componentId])) {
              problemAreaAttachmentFilesByComponentId[componentId] = [];
            }
            problemAreaAttachmentFilesByComponentId[componentId].push(value);
          }
          continue;
        }
        continue;
      }
      if (typeof value === "string") {
        body[key] = value;
      }
    }
    return {
      body,
      generalAttachmentFiles,
      serialNumberImageFiles,
      serialNumberImageFilesByComponentId,
      problemAreaAttachmentFilesByComponentId,
    };
  }

  const body = await request.json();
  return {
    body,
    generalAttachmentFiles: [],
    serialNumberImageFiles: [],
    serialNumberImageFilesByComponentId: {},
    problemAreaAttachmentFilesByComponentId: {},
  };
}

export async function POST(request) {
  try {
    const clientIp = getRequestClientIp(request);
    enforceRateLimit(`service-claims:${clientIp}`, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const {
      body,
      generalAttachmentFiles,
      serialNumberImageFiles,
      serialNumberImageFilesByComponentId,
      problemAreaAttachmentFilesByComponentId,
    } = await parseServiceClaimRequest(request);
    const contractNumber = normalizeServiceClaimContractNumber(
      requiredString(body.contractNumber, "Contract number"),
    );
    const contract = await getServiceClaimContractDetails(contractNumber);
    if (!contract) {
      return NextResponse.json(
        { error: "Contract number was not found." },
        { status: 404 },
      );
    }

    const landlordCompanyName = optionalString(body.landlordCompanyName);
    const landlordContactGender = optionalGender(body.landlordContactGender);
    const landlordContactGivenName = optionalString(body.landlordContactGivenName);
    const landlordContactSurname = optionalString(body.landlordContactSurname);
    const landlordContactPersonJoined = combinePersonName(
      landlordContactGivenName,
      landlordContactSurname,
    );
    const landlordContactPerson =
      optionalString(body.landlordContactPerson) || landlordContactPersonJoined;
    const landlordGivenName = optionalString(body.landlordGivenName);
    const landlordSurname = optionalString(body.landlordSurname);
    const landlordNameJoined = combinePersonName(landlordGivenName, landlordSurname);
    const landlordResolvedContactPerson =
      formatContactPersonName({
        gender: landlordContactGender,
        givenName: landlordContactGivenName,
        surname: landlordContactSurname,
        legacyName: landlordContactPerson || landlordNameJoined,
      }) || landlordContactPerson || landlordNameJoined;
    const landlordName = [landlordCompanyName, landlordResolvedContactPerson].filter(Boolean).join(" / ") || null;
    const landlordCompanyPhone = optionalString(body.landlordCompanyPhone);
    const landlordCompanyEmail = optionalString(body.landlordCompanyEmail);
    const landlordPhone = optionalString(body.landlordPhone);
    const landlordEmail = optionalString(body.landlordEmail);
    const hausmeisterGivenName = optionalString(body.hausmeisterGivenName);
    const hausmeisterSurname = optionalString(body.hausmeisterSurname);
    const hausmeisterNameJoined = combinePersonName(hausmeisterGivenName, hausmeisterSurname);
    const hausmeisterName = hausmeisterNameJoined || null;
    const hausmeisterPhone = optionalString(body.hausmeisterPhone);
    const hausmeisterEmail = optionalString(body.hausmeisterEmail);
    const preferredContactDate = optionalString(body.preferredContactDate);
    const preferredContactTime = formatGermanPreferredContactTime({
      window: optionalString(body.preferredContactTimeWindow),
      from: optionalString(body.preferredContactTimeFrom),
      to: optionalString(body.preferredContactTimeTo),
    });
    const givenName = requiredString(body.givenName, "Name");
    const surname = requiredString(body.surname, "Surname");
    requiredString(body.clientFloor, "Floor", 20);
    const gender = requiredGender(body.gender);
    const genderLabel = genderDisplayLabel(gender);
    const customerDisplayName = [givenName, surname].filter(Boolean).join(" ").trim();
    const fullName = buildCustomerFullName({ givenName, surname, gender });
    const resolvedProblemAreasJson = await resolveProblemAreasFromDatabase(
      contractNumber,
      normalizeProblemAreasJson(body.problemAreasJson),
      body.confirmedChoiceGroupsJson,
    );
    let referenceIssues = normalizeReferenceIssuesJson(body.referenceIssuesJson);
    if (referenceIssues.length) {
      const kitchenPlan = await getServiceClaimKitchenPlan(contractNumber);
      if (kitchenPlan?.selectionMode !== "reference-pdf") {
        throw new Error("Reference-plan components are not allowed for this contract.");
      }
      referenceIssues = validateReferenceAppliances(referenceIssues, kitchenPlan);
    }
    const allProblemAreas = [
      ...parseServiceClaimProblemAreas(resolvedProblemAreasJson),
      ...referenceIssues,
    ];
    const problemAreasJson = allProblemAreas.length ? JSON.stringify(allProblemAreas) : null;
    const problemDescription = mergeProblemAreasIntoDescription(
      optionalString(body.problemDescription),
      problemAreasJson,
    );
    const parsedProblemAreas = parseServiceClaimProblemAreas(problemAreasJson);
    const problemAreasByComponentId = new Map(
      parsedProblemAreas.map((area) => [String(area.componentId || "").trim(), area]),
    );
    const generalAttachmentParts = await normalizeServiceClaimUploads(generalAttachmentFiles);
    const serialNumberImageParts = await normalizeServiceClaimUploads(serialNumberImageFiles);
    const serialNumberImagePartsByComponentId = new Map();
    for (const [componentId, files] of Object.entries(serialNumberImageFilesByComponentId)) {
      const normalizedComponentId = String(componentId || "").trim();
      if (!normalizedComponentId || !problemAreasByComponentId.has(normalizedComponentId)) continue;
      serialNumberImagePartsByComponentId.set(
        normalizedComponentId,
        await normalizeServiceClaimUploads(files),
      );
    }
    const problemAreaAttachmentParts = [];
    const problemAreaAttachmentPartsByComponentId = new Map();
    for (const [componentId, files] of Object.entries(problemAreaAttachmentFilesByComponentId)) {
      const normalizedComponentId = String(componentId || "").trim();
      if (!normalizedComponentId || !files?.length) {
        continue;
      }
      const area = problemAreasByComponentId.get(normalizedComponentId) || {};
      if (!area.componentId) {
        continue;
      }
      const parts = await normalizeServiceClaimUploads(files);
      if (parts.some((part) => !part.contentType.startsWith("image/"))) {
        throw new Error("Damage attachments must be image files.");
      }
      problemAreaAttachmentPartsByComponentId.set(normalizedComponentId, parts);
      for (const part of parts) {
        problemAreaAttachmentParts.push({
          ...part,
          role: "problem_area",
          areaComponentId: normalizedComponentId,
          areaName: String(area?.name || "").trim(),
          areaCode: String(area?.code || "").trim(),
        });
      }
    }
    for (const area of parsedProblemAreas) {
      const componentId = String(area.componentId || "").trim();
      if (!problemAreaAttachmentPartsByComponentId.get(componentId)?.length) {
        throw new Error(`Upload at least one damage photo for ${area.name || "each affected component"}.`);
      }
      if (isElectricalApplianceProblemArea(area)) {
        if (!String(area.serialNumber || "").trim()) {
          throw new Error(`Enter the serial number for ${area.name || "each electrical component"}.`);
        }
        const serialPhotos = serialNumberImagePartsByComponentId.get(componentId) || [];
        if (!serialPhotos.length || serialPhotos.some((part) => !part.contentType.startsWith("image/"))) {
          throw new Error(`Upload a serial-number photo for ${area.name || "each electrical component"}.`);
        }
      }
    }
    const attachmentParts = [
      ...serialNumberImageParts.map((part) => ({ ...part, role: "serial_number" })),
      ...[...serialNumberImagePartsByComponentId.entries()].flatMap(([componentId, parts]) => {
        const area = problemAreasByComponentId.get(componentId) || {};
        return parts.map((part) => ({
          ...part,
          role: "serial_number",
          areaComponentId: componentId,
          areaName: String(area.name || "").trim(),
          areaCode: String(area.code || "").trim(),
        }));
      }),
      ...generalAttachmentParts.map((part) => ({ ...part, role: "general" })),
      ...problemAreaAttachmentParts,
    ];
    if (attachmentParts.length > MAX_SERVICE_CLAIM_ATTACHMENTS) {
      throw new Error(`You can upload at most ${MAX_SERVICE_CLAIM_ATTACHMENTS} files.`);
    }
    if (!problemDescription) {
      throw new Error("Problem description is required.");
    }
    const rawSerialNumber = optionalString(body.serialNumber);
    const electricalProblemAreas = parsedProblemAreas.filter(isElectricalApplianceProblemArea);
    const usesPerAreaSerialEvidence = electricalProblemAreas.some((area) => (
      String(area.serialNumber || "").trim()
      || (serialNumberImagePartsByComponentId.get(String(area.componentId || "").trim()) || []).length
    ));
    const hasMissingPerAreaSerialEvidence = electricalProblemAreas.some((area) => {
      const componentId = String(area.componentId || "").trim();
      const typedCount = String(area.serialNumber || "").trim() ? 1 : 0;
      const imageCount = (serialNumberImagePartsByComponentId.get(componentId) || []).length;
      return typedCount !== 1 || imageCount !== 1;
    });
    const hasMissingLegacySerialEvidence = parseSerialNumberEntries(rawSerialNumber).length !== electricalProblemAreas.length
      || serialNumberImageParts.length !== electricalProblemAreas.length;
    if (
      (usesPerAreaSerialEvidence && hasMissingPerAreaSerialEvidence)
      || (!usesPerAreaSerialEvidence && hasMissingLegacySerialEvidence)
    ) {
      return NextResponse.json(
        { error: "Please provide a serial number and one serial-number photo for each selected electrical appliance." },
        { status: 400 },
      );
    }
    const hasSerialNumberImage = serialNumberImageParts.length > 0
      || serialNumberImagePartsByComponentId.size > 0
      || booleanFromFormValue(body.hasSerialNumberImage);
    const sketchMarkers = contract.contractType === "ARC"
      ? normalizeSketchMarkersJson(body.sketchMarkersJson)
      : [];

    const payload = {
      id: crypto.randomUUID(),
      contractNumber,
      givenName,
      surname,
      gender,
      genderLabel,
      customerDisplayName,
      fullName,
      contractType: contract.contractType,
      kitchenName: contract.kitchenName || "",
      kitchenSlug: contract.kitchenSlug || "",
      phone: optionalString(body.phone),
      email: optionalString(body.email),
      clientAddress: requiredString(body.clientAddress, "Client address"),
      clientCountry: requiredString(body.clientCountry, "Client country"),
      clientCity: requiredString(body.clientCity, "Client city"),
      clientPostalCode: requiredString(body.clientPostalCode, "Client postal code"),
      landlordCompanyName,
      landlordContactGender,
      landlordContactGivenName,
      landlordContactSurname,
      landlordContactPerson: landlordResolvedContactPerson,
      landlordGivenName,
      landlordSurname,
      landlordName,
      landlordCompanyPhone,
      landlordCompanyEmail,
      landlordPhone,
      landlordEmail,
      hausmeisterGivenName,
      hausmeisterSurname,
      hausmeisterName,
      hausmeisterPhone,
      hausmeisterEmail,
      preferredContactDate,
      preferredContactTime,
      landlordContact: [
        `Landlord company: ${landlordCompanyName || "—"}`,
        `Company phone: ${landlordCompanyPhone || "-"}`,
        `Company email: ${landlordCompanyEmail || "-"}`,
        `Landlord contact person: ${landlordResolvedContactPerson || "—"}`,
        `Contact person phone: ${landlordPhone || "-"}`,
        `Contact person email: ${landlordEmail || "-"}`,
        `Hausmeister: ${hausmeisterNameJoined || "—"}`,
        `Hausmeister phone: ${hausmeisterPhone || "-"}`,
        `Hausmeister email: ${hausmeisterEmail || "-"}`,
      ].join("\n"),
      problemDescription,
      problemAreasJson,
      sketchMarkers,
      sketchMarkerAppearance: normalizeReferencePlanMarkerAppearance(body.sketchMarkerAppearanceJson),
      serialNumber: rawSerialNumber || (hasSerialNumberImage ? "Siehe Seriennummernfoto in den Anhängen." : "Nicht zutreffend"),
      requestType: "complaint",
      hasSerialNumberImage,
      attachmentsMeta: attachmentParts.map(({ filename, contentType, size, role, areaComponentId, areaName, areaCode }) => ({
        filename,
        contentType,
        size,
        role: role || "general",
        ...(areaComponentId ? { areaComponentId } : {}),
        ...(areaName ? { areaName } : {}),
        ...(areaCode ? { areaCode } : {}),
      })),
    };

    if (!payload.phone || !payload.email) {
      return NextResponse.json(
        { error: "Please provide both a phone number and an email address." },
        { status: 400 },
      );
    }

    // Store the submitted sketch as a claim attachment so the dashboard retains
    // exactly the same marked image even if the contract sketch changes later.
    const referenceSnapshot = await buildClaimKitchenPreviewAttachment(payload).catch(() => null);
    const storedAttachmentParts = [...attachmentParts];
    if (referenceSnapshot?.content?.length && referenceSnapshot.contentType?.startsWith("image/")) {
      storedAttachmentParts.push(referenceSnapshot);
      payload.attachmentsMeta.push({
        filename: referenceSnapshot.filename,
        contentType: referenceSnapshot.contentType,
        size: referenceSnapshot.content.length,
        role: "kitchen_preview",
      });
    }
    payload.attachmentsJson =
      payload.attachmentsMeta.length > 0 ? JSON.stringify(payload.attachmentsMeta) : null;

    await insertServiceClaimRecord(prisma, payload);

    const orderKind = getOrderKindForContractNumber(contractNumber);
    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.SERVICE_CLAIM_SUBMITTED,
      contractNumber,
      kitchenContractId: contract.id,
      path: SERVICE_PAGE_PATH,
      metadata: {
        orderKind,
        claimId: payload.id,
        claimSequence: payload.claimSequence ?? null,
      },
    });

    // The complaint is durable at this point. Do not keep the browser waiting
    // for file storage, image rendering, SMTP, or the external webhook.
    after(async () => {
      await Promise.all([
        storedAttachmentParts.length
          ? persistServiceClaimAttachments(payload.id, storedAttachmentParts).catch((persistError) => {
              console.error("Service claim attachment persist error:", persistError);
              return false;
            })
          : Promise.resolve(true),
        sendComplaintEmail(payload, attachmentParts, referenceSnapshot).catch((error) => {
          console.warn("Service claim email delivery failed:", formatServiceClaimErrorMessage(error));
          return false;
        }),
        postWebhook(payload),
      ]);
    });

    return NextResponse.json({
      success: true,
      message: "Your complaint has been recorded successfully and is being sent.",
      notifications: {
        pending: true,
      },
    });
  } catch (error) {
    console.error("Service claim submit error:", error);
    return NextResponse.json(
      { error: formatServiceClaimErrorMessage(error) },
      { status: error.status || 500 },
    );
  }
}

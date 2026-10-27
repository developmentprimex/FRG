import { buildComplaintEmailText, buildPartyContactBlock, formatContactPersonName, combinePersonName, genderDisplayLabel, hasPartyContactDetails, extractAvailabilityFromDescription, splitLegacyAvailability, buildClaimItemRows, formatClaimClientAddressForEmail, buildClaimItemText, formatAttachmentFileMetaLine, formatAttachmentMetaLine, formatAttachmentLabel, buildComplaintEmailHtml, escapeHtml, buildEmailDetailSubtable, formatMultiline, buildClaimItemHtml, formatAttachmentHtml, isEmailInlineImage, formatEmailFileSize as formatClaimEmailFileSize } from "../../../lib/email/claim-notification-template.js";
import { readFile } from "fs/promises";
import http from "http";
import path from "path";
import https from "https";
import sharp from "sharp";
import { resolveServiceClaimEmailCc, resolveServiceClaimEmailRecipient } from "../../../lib/service-claim-email-recipient";
import { CLAIM_INTERNAL_PREFIXES, resolveSmtpConfigForContract, sendMailForContract } from "../../../lib/email/contract-smtp";
import { observeClaimEmailSend } from "../../../lib/email/claim-email-tracking.js";
import { sendClaimConfirmation } from "../../../lib/email/claim-confirmation.js";
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
import { formatServiceClaimEmailSubject, formatServiceClaimReference } from "../../../lib/service-claim-email-subject";
import { lockWorkProcessing } from "../../../lib/work-processing";
import { findOpenClaim, saveClaimSubmission } from "../../../lib/service-claim-submissions";
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



function requiredGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized !== "female" && normalized !== "male" && normalized !== "ms" && normalized !== "prefer_not_to_say") {
    throw new Error("Salutation is required.");
  }
  return normalized;
}



function optionalGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "female" || normalized === "male" || normalized === "ms" || normalized === "prefer_not_to_say") {
    return normalized;
  }
  return "";
}



function buildCustomerFullName({ givenName, surname, gender }) {
  const combined = [givenName, surname].filter(Boolean).join(" ").trim();
  if (gender === "female" || gender === "male" || gender === "ms") {
    return `${genderDisplayLabel(gender)} ${combined}`;
  }
  return combined;
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
  const kitchenPlan = payload.contractType === "ARC"
    ? await getServiceClaimKitchenPlan(payload.contractNumber)
    : null;
  const cc = resolveServiceClaimEmailCc(payload.contractType, kitchenPlan, payload.contractNumber);
  return observeClaimEmailSend({
    claimId: payload.id,
    recipient: () => [resolveServiceClaimEmailRecipient(payload.contractNumber), cc].filter(Boolean).join(", "),
    send: (captureReceipt) => sendComplaintEmailMessage(payload, attachmentParts, referenceSnapshot, captureReceipt, cc),
  });
}

async function sendComplaintEmailMessage(payload, attachmentParts = [], referenceSnapshot = null, captureReceipt = () => {}, cc = undefined) {
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
    cc,
    subject: `${formatServiceClaimEmailSubject(payload.contractNumber, payload.claimSequence, payload.ticketNumber)}${payload.isFollowUp ? " – Ergänzung" : ""}`,
    replyTo: payload.email || undefined,
    text: buildComplaintEmailText(emailPayload),
    html: buildComplaintEmailHtml(emailPayload, kitchenPreviewAttachment),
    attachments,
  }, { prefixes: CLAIM_INTERNAL_PREFIXES });
  captureReceipt(receipt);

  return true;
}

function formatEmailFileSize(bytes) {
  return formatClaimEmailFileSize(bytes);
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



function buildUserAttachmentCid(claimId, index) {
  return `claim-upload-${String(claimId || "claim").replace(/[^a-z0-9-]/gi, "")}-${index}@fragmento`;
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
    RETURNING "ticketNumber"
  `;
}

async function insertServiceClaimRecord(prismaClient, payload) {
  const options = { ...(await getServiceClaimInsertColumnSupport(prismaClient)) };

  while (true) {
    try {
      const savedClaim = await prismaClient.$transaction(async (transaction) => {
        await lockWorkProcessing(transaction);
        const activeClaim = await findOpenClaim(transaction, payload.contractNumber);
        if (activeClaim) return saveClaimSubmission(transaction, payload, activeClaim, true);
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

        const inserted = await transaction.$queryRaw(buildServiceClaimInsertSql(
          { ...payload, claimSequence: nextSequence },
          options,
        ));
        return saveClaimSubmission(transaction, payload, { id: payload.id, claimSequence: nextSequence, ticketNumber: inserted[0].ticketNumber }, false);
      }, { maxWait: 10000, timeout: 45000 });

      Object.assign(payload, savedClaim);
      return savedClaim.claimSequence;
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
        ticketNumber: payload.ticketNumber,
      },
    });

    // The complaint is durable at this point. Do not keep the browser waiting
    // for file storage, image rendering, SMTP, or the external webhook.
    after(async () => {
      await Promise.all([
        storedAttachmentParts.length
          ? persistServiceClaimAttachments(payload.id, storedAttachmentParts, payload.attachmentStart).catch((persistError) => {
              console.error("Service claim attachment persist error:", persistError);
              return false;
            })
          : Promise.resolve(true),
        sendComplaintEmail(payload, attachmentParts, referenceSnapshot).catch((error) => {
          console.warn("Service claim email delivery failed:", formatServiceClaimErrorMessage(error));
          return false;
        }),
        sendClaimConfirmation(payload).catch((error) => {
          console.warn("Service claim confirmation email failed:", formatServiceClaimErrorMessage(error));
          return false;
        }),
        postWebhook(payload),
      ]);
    });

    return NextResponse.json({
      success: true,
      message: payload.isFollowUp ? "Your submission has been added to your open ticket." : "Your complaint has been recorded successfully and is being sent.",
      isFollowUp: payload.isFollowUp,
      ticketNumber: payload.ticketNumber,
      claimSequence: payload.claimSequence,
      ticketReference: formatServiceClaimReference(payload.contractNumber, payload.claimSequence, payload.ticketNumber),
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

import { formatServiceClaimReference } from "../service-claim-email-subject.js";
import { parseServiceClaimProblemAreas } from "../service-claim-problem-areas.js";
import { isElectricalApplianceProblemArea } from "../service-claim-serial-number.js";
import { REFERENCE_PLAN_EMAIL_DISPLAY_WIDTH } from "./claim-notification-layout.js";

export function buildComplaintEmailText(payload) {
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
    `Ticket: ${formatServiceClaimReference(payload.contractNumber, payload.claimSequence, payload.ticketNumber)}`,
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

export function buildPartyContactBlock(contact) {
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

export function formatContactPersonName({ gender, givenName, surname, legacyName = "" }) {
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

export function combinePersonName(givenName, surname) {
  return [givenName, surname].filter(Boolean).join(" ").trim();
}

export function genderDisplayLabel(gender) {
  if (gender === "male") return "Herr";
  if (gender === "female" || gender === "ms") return "Frau";
  if (gender === "prefer_not_to_say") return "Keine Angabe";
  return String(gender || "-");
}

export function hasPartyContactDetails(values) {
  return values.some((value) => String(value || "").trim());
}

export function extractAvailabilityFromDescription(description) {
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

export function splitLegacyAvailability(availability) {
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

export function buildClaimItemRows(problemAreasJson, attachmentsMeta = []) {
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

export function formatClaimClientAddressForEmail(value) {
  return String(value || "")
    .replace(/(^|[,\r\n]\s*)(?:Floor|Etage):\s*/gi, (_match, separator) => `${separator ? "\n" : ""}Etage: `)
    .replace(/(^|[,\r\n]\s*)(?:Unit|Einheit|Wohnungsnummer):\s*/gi, (_match, separator) => `${separator ? "\n" : ""}Wohnungsnummer: `);
}

export function buildClaimItemText(row, { showArticleCode = true } = {}) {
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

export function formatAttachmentFileMetaLine(entry) {
  return `${entry.filename} (${entry.contentType}, ${formatEmailFileSize(entry.size)})`;
}

export function formatEmailFileSize(bytes) {
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

export function formatAttachmentMetaLine(entry) {
  return `${formatAttachmentLabel(entry)} (${entry.contentType}, ${formatEmailFileSize(entry.size)})`;
}

export function formatAttachmentLabel(entry) {
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

export function buildComplaintEmailHtml(payload, previewAttachment = null) {
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
    ["Ticket", formatServiceClaimReference(payload.contractNumber, payload.claimSequence, payload.ticketNumber)],
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

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildEmailDetailSubtable(rows) {
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

export function formatMultiline(value) {
  return escapeHtml(value || "-").replaceAll("\n", "<br />");
}

export function buildClaimItemHtml(row, { showArticleCode = true, itemNumber = 1 } = {}) {
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

export function formatAttachmentHtml(entry, { includeItemContext = true } = {}) {
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

export function isEmailInlineImage(contentType) {
  const normalized = String(contentType || "").toLowerCase().split(";")[0].trim();
  return normalized.startsWith("image/") && normalized !== "image/svg+xml";
}

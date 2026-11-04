import { createGuardedSmtpTransport } from "./local-email-safety.js";
import { PUBLIC_VISIT_EVENT_TYPES } from "../public-visit-tracking.js";
import { isJunkServiceClaimVisitEvent } from "../service-claim-lookup.js";
import { reportDateKey, reportDayStart } from "../business-report-dates.js";

export const CONTRACT_ACCESS_REPORT_EVENT_TYPES = [
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED,
];

export const ASC_ACCESS_REPORT_EVENT_TYPES = [
  PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND,
  PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND,
];

const RESULT_LABELS = {
  [PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED]: "Accepted",
  [PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED]: "Test contract",
  [PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED]: "Rejected",
};

const ASC_RESULT_LABELS = {
  [PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_FOUND]: "Found",
  [PUBLIC_VISIT_EVENT_TYPES.SERVICE_CONTRACT_NOT_FOUND]: "Not found",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getContractNumber(event) {
  return event?.kitchenContract?.contractNumber
    || event?.contractNumber
    || (event?.contractNumberLast4 ? `••••${event.contractNumberLast4}` : "-");
}

function getSource(event) {
  return event?.source || event?.referrerHost || "Direct";
}

function getDevice(event) {
  return [event?.deviceType, event?.browserFamily, event?.operatingSystem]
    .filter(Boolean)
    .join(" / ") || "-";
}

export function isContractAccessReportDay(now = new Date()) {
  const day = new Date(`${reportDateKey(now)}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

export function getContractAccessReportWindow(now = new Date()) {
  const dateKey = reportDateKey(now);
  const previousDay = new Date(`${dateKey}T00:00:00Z`);
  previousDay.setUTCDate(previousDay.getUTCDate() - (previousDay.getUTCDay() === 1 ? 3 : 1));
  // Use scheduled Berlin cutoffs so timer delays cannot leave gaps. Weekday
  // cutoffs also stay at 08:00 across the Sunday daylight-saving changes.
  const end = new Date(reportDayStart(dateKey).getTime() + 8 * 60 * 60 * 1000);
  const start = new Date(reportDayStart(previousDay.toISOString().slice(0, 10)).getTime() + 8 * 60 * 60 * 1000);
  return { start, end };
}

function getReportPeriodLabel(start, end) {
  return end.getTime() - start.getTime() > 24 * 60 * 60 * 1000
    ? "since Friday at 08:00"
    : "in the last 24 hours";
}

function buildAccessReport({
  events = [],
  start,
  end,
  subjectLabel,
  heading,
  resultLabels,
}) {
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Europe/Berlin",
  });
  const period = `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
  const count = events.length;
  const subject = `[Fragmento] ${subjectLabel} (${count})`;

  const rows = events.map((event) => {
    const values = [
      dateFormatter.format(new Date(event.createdAt)),
      getContractNumber(event),
      resultLabels[event.eventType] || event.eventType,
      event.countryCode || "-",
      getSource(event),
      getDevice(event),
    ];
    return `<tr>${values.map((value) => `<td style="padding:9px 10px;border-bottom:1px solid #eadfd3;vertical-align:top;">${escapeHtml(value)}</td>`).join("")}</tr>`;
  }).join("");

  const emptyRow = `
    <tr>
      <td colspan="6" style="padding:18px 10px;color:#74665b;text-align:center;">No access attempts during this period.</td>
    </tr>`;

  const html = `<!doctype html>
  <html lang="en">
    <body style="margin:0;padding:24px;background:#f3ebe2;font-family:Arial,Helvetica,sans-serif;color:#332820;">
      <div style="max-width:980px;margin:0 auto;background:#fff;border:1px solid #dfd1c3;border-radius:14px;overflow:hidden;">
        <div style="padding:22px 26px;background:#7b3f2d;color:#fff;">
          <div style="font-size:11px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#f5d9ca;">Fragmento · Security report</div>
          <h1 style="margin:7px 0 0;font-size:24px;">${escapeHtml(heading)}</h1>
        </div>
        <div style="padding:22px 26px;">
          <p style="margin:0 0 6px;"><strong>${count}</strong> access attempt${count === 1 ? "" : "s"}</p>
          <p style="margin:0 0 18px;color:#74665b;">Period (Europe/Berlin): ${escapeHtml(period)}</p>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead>
                <tr style="background:#f8f1ea;text-align:left;">
                  <th style="padding:9px 10px;">Time</th>
                  <th style="padding:9px 10px;">Contract number</th>
                  <th style="padding:9px 10px;">Result</th>
                  <th style="padding:9px 10px;">Country</th>
                  <th style="padding:9px 10px;">Source</th>
                  <th style="padding:9px 10px;">Device</th>
                </tr>
              </thead>
              <tbody>${rows || emptyRow}</tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
  </html>`;

  const textRows = events.map((event) => [
    dateFormatter.format(new Date(event.createdAt)),
    getContractNumber(event),
    resultLabels[event.eventType] || event.eventType,
    event.countryCode || "-",
    getSource(event),
    getDevice(event),
  ].join(" | "));

  return {
    subject,
    html,
    text: [
      `Fragmento – ${heading}`,
      `Period (Europe/Berlin): ${period}`,
      `Access attempts: ${count}`,
      "",
      ...(textRows.length ? textRows : ["No access attempts during this period."]),
    ].join("\n"),
  };
}

export function buildContractAccessReport({ events = [], start, end }) {
  return buildAccessReport({
    events,
    start,
    end,
    subjectLabel: `Contract access attempts ${getReportPeriodLabel(start, end)}`,
    heading: `Contract access attempts ${getReportPeriodLabel(start, end)}`,
    resultLabels: RESULT_LABELS,
  });
}

export function buildAscAccessReport({ events = [], start, end }) {
  return buildAccessReport({
    events: events.filter((event) => !isJunkServiceClaimVisitEvent(event)),
    start,
    end,
    subjectLabel: `ASC contract lookups ${getReportPeriodLabel(start, end)}`,
    heading: `ASC contract lookups ${getReportPeriodLabel(start, end)}`,
    resultLabels: ASC_RESULT_LABELS,
  });
}

function getMailConfig(env) {
  const host = String(env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number.parseInt(env.SMTP_PORT || "587", 10);
  const user = String(env.SMTP_USER || "").trim();
  const pass = String(env.SMTP_PASS || "");
  const from = String(env.SMTP_FROM || "").trim();
  const recipients = String(
    env.CONTRACT_ACCESS_REPORT_EMAIL
      || "it@forestdream.de,334primex.eu@gmail.com,01primex.eu@gmail.com",
  )
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !pass && "SMTP_PASS", !from && "SMTP_FROM", !recipients.length && "CONTRACT_ACCESS_REPORT_EMAIL"].filter(Boolean);

  if (missing.length) throw new Error(`Contract access report email config is missing: ${missing.join(", ")}`);

  return { host, port, user, pass, from, recipients };
}

async function sendAccessReport({ db, now, env, eventTypes, buildReport }) {
  if (env.CONTRACT_ACCESS_REPORT_ENABLED !== "true") {
    throw new Error("Contract access report is disabled. Set CONTRACT_ACCESS_REPORT_ENABLED=true on the Hetzner report service.");
  }

  if (!isContractAccessReportDay(now)) {
    return { skipped: true, reason: "weekend", count: 0, recipients: [] };
  }

  const { start, end } = getContractAccessReportWindow(now);
  const events = await db.publicVisitEvent.findMany({
    where: {
      eventType: { in: eventTypes },
      createdAt: { gt: start, lte: end },
    },
    select: {
      eventType: true,
      createdAt: true,
      contractNumber: true,
      contractNumberLast4: true,
      countryCode: true,
      source: true,
      referrerHost: true,
      deviceType: true,
      browserFamily: true,
      operatingSystem: true,
      kitchenContract: { select: { contractNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const report = buildReport({ events, start, end });
  const config = getMailConfig(env);
  const transporter = createGuardedSmtpTransport({
    host: config.host,
    port: config.port,
    secure: env.SMTP_SECURE === "true",
    auth: { user: config.user, pass: config.pass },
  }, env);
  const delivery = await transporter.sendMail({
    from: config.from,
    to: config.recipients,
    subject: report.subject,
    text: report.text,
    html: report.html,
  });
  const accepted = new Set(
    (delivery.accepted || []).map((address) => String(address).trim().toLowerCase()),
  );
  const rejectedRecipients = config.recipients.filter(
    (address) => !accepted.has(address.toLowerCase()),
  );

  if (rejectedRecipients.length) {
    throw new Error(`SMTP did not accept the contract access report recipient(s): ${rejectedRecipients.join(", ")}`);
  }

  return { count: events.length, recipients: config.recipients, start, end };
}

export async function sendContractAccessReport({ db, now = new Date(), env = process.env }) {
  return sendAccessReport({
    db,
    now,
    env,
    eventTypes: CONTRACT_ACCESS_REPORT_EVENT_TYPES,
    buildReport: buildContractAccessReport,
  });
}

export async function sendAscAccessReport({ db, now = new Date(), env = process.env }) {
  return sendAccessReport({
    db,
    now,
    env,
    eventTypes: ASC_ACCESS_REPORT_EVENT_TYPES,
    buildReport: buildAscAccessReport,
  });
}

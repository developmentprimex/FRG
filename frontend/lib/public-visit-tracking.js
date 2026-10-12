import crypto from "node:crypto";
import { prisma } from "./prisma.js";

export const PUBLIC_VISIT_EVENT_TYPES = {
  PAGE_OPENED: "PAGE_OPENED",
  CONTRACT_SUBMITTED: "CONTRACT_SUBMITTED",
  CONTRACT_ACCEPTED: "CONTRACT_ACCEPTED",
  CONTRACT_TEST_ACCEPTED: "CONTRACT_TEST_ACCEPTED",
  CONTRACT_REJECTED: "CONTRACT_REJECTED",
  SERVICE_CONTRACT_LOOKUP: "SERVICE_CONTRACT_LOOKUP",
  SERVICE_CONTRACT_FOUND: "SERVICE_CONTRACT_FOUND",
  SERVICE_CONTRACT_NOT_FOUND: "SERVICE_CONTRACT_NOT_FOUND",
  SERVICE_CLAIM_SUBMITTED: "SERVICE_CLAIM_SUBMITTED",
};

export const SERVICE_PAGE_PATH = "/service";

const PUBLIC_EVENT_TYPE_SET = new Set(Object.values(PUBLIC_VISIT_EVENT_TYPES));
// Contract access history is permanent, including unsuccessful and test attempts.
const PERMANENT_CONTRACT_EVENT_TYPES = [
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED,
  PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED,
];
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const CLEANUP_TIMER_MS = 6 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 90;
let lastCleanupAt = 0;
let countryLookupPromise = null;

function cleanText(value, maxLength = 200) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function hashValue(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const salt = process.env.VISIT_TRACKING_SALT
    || process.env.ADMIN_SESSION_SECRET
    || process.env.NEXTAUTH_SECRET
    || "fragmento-public-visit-tracking-local-only";
  return crypto.createHash("sha256").update(`${salt}:${text}`).digest("hex");
}

function normalizeIp(value) {
  let ip = String(value || "").trim().replace(/^"|"$/g, "");
  if (!ip) return "";
  if (ip.startsWith("[")) ip = ip.slice(1, ip.indexOf("]") > 0 ? ip.indexOf("]") : undefined);
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");
  return ip;
}

export function getPublicRequestClientIp(request) {
  const realIp = normalizeIp(request?.headers?.get("x-real-ip"));
  if (realIp) return realIp;

  const cloudflareIp = normalizeIp(request?.headers?.get("cf-connecting-ip"));
  if (cloudflareIp) return cloudflareIp;

  const forwarded = request?.headers?.get("x-forwarded-for") || "";
  return normalizeIp(forwarded.split(",")[0]);
}

function normalizeContractNumber(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

export function normalizePublicVisitEventType(value) {
  const eventType = String(value || "").trim().toUpperCase();
  return PUBLIC_EVENT_TYPE_SET.has(eventType) ? eventType : "";
}

export function normalizeCountryCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

async function getLocalCountryLookup() {
  if (!countryLookupPromise) {
    process.env.ILA_FIELDS ||= "country";
    process.env.ILA_IP_LOCATION_DB ||= "user";
    process.env.ILA_AUTO_UPDATE ||= "false";
    process.env.ILA_SILENT ||= "true";
    countryLookupPromise = import("ip-location-api/pack").then((module) => module.lookup);
  }
  return countryLookupPromise;
}

export async function getPublicVisitCountryCode(request) {
  if (process.env.TRUST_GEO_COUNTRY_HEADER === "true") {
    const trustedHeader = normalizeCountryCode(request?.headers?.get("x-fragmento-country"));
    if (trustedHeader) return trustedHeader;
  }

  const ip = getPublicRequestClientIp(request);
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;

  try {
    const lookup = await getLocalCountryLookup();
    return normalizeCountryCode(lookup(ip)?.country);
  } catch (error) {
    console.warn("Local country lookup failed:", error?.message || error);
    return null;
  }
}

export function getCoarseDeviceData(userAgent = "") {
  const ua = String(userAgent || "");
  const lower = ua.toLowerCase();
  const deviceType = /bot|crawler|spider|slurp/.test(lower)
    ? "bot"
    : /ipad|tablet|kindle|silk/.test(lower)
      ? "tablet"
      : /mobile|iphone|ipod|android/.test(lower)
        ? "mobile"
        : "desktop";
  const browserFamily = /edg\//i.test(ua)
    ? "Edge"
    : /opr\//i.test(ua)
      ? "Opera"
      : /samsungbrowser/i.test(ua)
        ? "Samsung Internet"
        : /chrome|crios/i.test(ua)
          ? "Chrome"
          : /firefox|fxios/i.test(ua)
            ? "Firefox"
            : /safari/i.test(ua)
              ? "Safari"
              : "Other";
  const operatingSystem = /windows/i.test(ua)
    ? "Windows"
    : /iphone|ipad|ipod/i.test(ua)
      ? "iOS"
      : /android/i.test(ua)
        ? "Android"
        : /macintosh|mac os x/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "Other";

  return { deviceType, browserFamily, operatingSystem };
}

export function normalizeReferrerHost(value) {
  const text = String(value || "").trim().slice(0, 300);
  if (!text) return null;

  try {
    const url = new URL(text.includes("://") ? text : `https://${text}`);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return hostname && /^[a-z0-9.-]+$/.test(hostname) ? hostname.slice(0, 120) : null;
  } catch {
    return null;
  }
}

export function hasPublicTrackingOptOut(request) {
  return request?.headers?.get("sec-gpc") === "1" || request?.headers?.get("dnt") === "1";
}

function getDailyVisitorKey({ ip, userAgent, now }) {
  if (!ip && !userAgent) return null;
  const day = now.toISOString().slice(0, 10);
  return hashValue(`daily-visitor:${day}:${ip}:${userAgent}`);
}

function getRetentionDays() {
  const configured = Number.parseInt(process.env.VISIT_TRACKING_RETENTION_DAYS || "", 10);
  return Number.isFinite(configured) && configured >= 1 && configured <= 365
    ? configured
    : DEFAULT_RETENTION_DAYS;
}

async function cleanupExpiredPublicVisitEvents(now) {
  if (now.getTime() - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now.getTime();
  const cutoff = new Date(now.getTime() - getRetentionDays() * 24 * 60 * 60 * 1000);

  try {
    await prisma.publicVisitEvent.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        eventType: { notIn: PERMANENT_CONTRACT_EVENT_TYPES },
      },
    });
  } catch (error) {
    lastCleanupAt = 0;
    console.warn("Public visit retention cleanup failed:", error?.message || error);
  }
}

function ensurePublicVisitCleanupTimer() {
  if (globalThis.__fragmentoPublicVisitCleanupTimer) return;
  const timer = setInterval(() => {
    cleanupExpiredPublicVisitEvents(new Date()).catch((error) => {
      console.warn("Scheduled public visit cleanup failed:", error?.message || error);
    });
  }, CLEANUP_TIMER_MS);
  timer.unref?.();
  globalThis.__fragmentoPublicVisitCleanupTimer = timer;
}

export async function trackPublicVisitEvent({
  request,
  eventType,
  contractNumber = "",
  kitchenContractId = null,
  source = "",
  utmMedium = "",
  utmCampaign = "",
  referrerHost = "",
  path = "",
  metadata = null,
}) {
  const normalizedEventType = normalizePublicVisitEventType(eventType);
  if (!normalizedEventType) return null;

  const normalizedContractNumber = normalizeContractNumber(contractNumber);
  const storedContractNumber = cleanText(normalizedContractNumber, 200);
  ensurePublicVisitCleanupTimer();
  const userAgent = request?.headers?.get("user-agent") || "";
  const ip = request ? getPublicRequestClientIp(request) : "";
  const now = new Date();
  const optedOut = hasPublicTrackingOptOut(request);
  const device = optedOut ? {} : getCoarseDeviceData(userAgent);
  const countryCode = await getPublicVisitCountryCode(request);

  const event = await prisma.publicVisitEvent.create({
    data: {
      eventType: normalizedEventType,
      source: optedOut ? null : cleanText(source, 80),
      utmMedium: optedOut ? null : cleanText(utmMedium, 80),
      utmCampaign: optedOut ? null : cleanText(utmCampaign, 120),
      referrerHost: optedOut ? null : normalizeReferrerHost(referrerHost),
      path: cleanText(path, 200),
      countryCode,
      deviceType: device.deviceType || null,
      browserFamily: device.browserFamily || null,
      operatingSystem: device.operatingSystem || null,
      visitorKey: optedOut ? null : getDailyVisitorKey({ ip, userAgent, now }),
      kitchenContractId: cleanText(kitchenContractId, 40),
      contractNumber: storedContractNumber,
      contractNumberHash: hashValue(storedContractNumber),
      contractNumberLast4: storedContractNumber ? storedContractNumber.slice(-4) : null,
      ipHash: null,
      userAgentHash: null,
      metadata,
      createdAt: now,
    },
  });

  await cleanupExpiredPublicVisitEvents(now);
  return event;
}

export async function safelyTrackPublicVisitEvent(args) {
  try {
    return await trackPublicVisitEvent(args);
  } catch (error) {
    console.warn("Public visit tracking failed:", error?.message || error);
    return null;
  }
}

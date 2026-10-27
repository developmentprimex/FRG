import { isTestContractNumber } from "./order-kind.js";
import { isElectricalApplianceProblemArea } from "./service-claim-serial-number.js";
import { stripProductDimensionsFromLabel } from "./product-label-format.js";
import { workDateKey, workDayStart, workState } from "./work-processing-rules.js";

const DAY_MS = 86400000;
const CATEGORY_KEYS = ["cabinets", "electrical", "other", "unknown"];
const AREA_PREFIXES = /^(?:Küchenbereiche:|Kitchen areas:|Mutfak bölgeleri:|Zonas de la cocina:|Zones concernées :|Кухонные зоны:)/;
const text = (value) => String(value || "").trim();
const normalized = (value) => text(value).toLowerCase().replace(/\s+/g, " ");

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

export function claimContactKey(claim) {
  const email = normalized(claim.email);
  if (email) return `email:${email}`;
  // Normalize international 00/+ formatting, without guessing a country code.
  const phone = text(claim.phone).replace(/\D/g, "").replace(/^00/, "");
  return phone ? `phone:${phone}` : null;
}

export function classifyClaimArea(area = {}) {
  const identity = normalized(`${area.componentId || ""} ${area.code || ""} ${area.claimPartKey || ""}`);
  const name = normalized(`${area.name || ""} ${area.nameDe || ""}`);
  // A furniture front, drawer or filter is not the appliance behind it.
  if (/front|drawer|filter|blende|panel|worktop|sink|faucet/.test(identity + " " + name)
      && !/sink-cabinet|sinkbase|sink base cabinet|sink lower cabinet/.test(identity + " " + name)) {
    return /front|drawer/.test(identity + " " + name) ? "cabinets" : "other";
  }
  if (isElectricalApplianceProblemArea(area)) return "electrical";
  if (/cabinet|sinkbase|\bschrank\b|unterschrank|oberschrank|hochschrank|\bcab-|\bus\d|\bwu\d|furniture-front|oven-drawer/.test(identity + " " + name)) return "cabinets";
  if (!identity.includes("reference-furniture") && /\b(?:kühlschrank|kuehlschrank|geschirrspüler|geschirrspueler|waschmaschine|backofen|kochfeld|dunstabzugshaube|herd)\b/.test(name)) return "electrical";
  if (/reference-furniture|\btop-|\bsink|worktop|blende|faucet|spüle|spuele|arbeitsplatte|sockel|rückwand|rueckwand|armatur|besteck|beleuchtung|lighting/.test(identity + " " + name)) return "other";
  return "unknown";
}

export function extractClaimAnalyticsAreas(claim) {
  const structured = parseArray(claim.problemAreasJson).filter((area) => area && typeof area === "object" && (area.name || area.code || area.componentId));
  if (structured.length) return structured;
  // Older submissions store only the selected-area header. Never classify free problem text.
  const lines = text(claim.problemDescription).split("\n").map((line) => line.trim());
  let names = [];
  if (AREA_PREFIXES.test(lines[0] || "")) {
    const inline = lines[0].replace(AREA_PREFIXES, "").trim();
    if (inline) names = inline.split(",");
    else for (const line of lines.slice(1)) { if (!line) break; names.push(line.split(":")[0]); }
  } else {
    const index = lines.indexOf("Ausgewählte Küchenbereiche:");
    if (index >= 0) for (const line of lines.slice(index + 1)) { if (!line.startsWith("-")) break; names.push(line.slice(1)); }
  }
  return names.map((name) => ({ name: stripProductDimensionsFromLabel(name).trim() })).filter((area) => area.name);
}

function itemKey(area) {
  const code = text(area.articleCode || area.code).toUpperCase();
  return code && !code.startsWith("REFERENCE-") ? `code:${code}` : `name:${normalized(area.name || area.nameDe || area.componentId)}`;
}

function addGroup(map, key, name, claim, state) {
  const row = map.get(key) || { key, name, claims: 0, open: 0, overdue: 0, contracts: new Set() };
  row.claims++;
  row.open += state.status === "OPEN" ? 1 : 0;
  row.overdue += state.overdue ? 1 : 0;
  if (claim.contractNumber) row.contracts.add(text(claim.contractNumber));
  map.set(key, row);
}

const ranked = (map) => [...map.values()].map((row) => ({ ...row, contracts: row.contracts?.size || 0 })).sort((a, b) => b.claims - a.claims || a.name.localeCompare(b.name));

export function buildClaimAnalytics(claims, { history = claims, now = new Date(), startDate = null, kitchenId = "" } = {}) {
  const live = (rows) => rows.filter((claim) => !isTestContractNumber(claim.contractNumber) && new Date(claim.createdAt) <= now);
  const selected = live(claims);
  const allHistory = live(history);
  const lifetime = new Map();
  for (const claim of allHistory) {
    const key = claimContactKey(claim);
    if (key) lifetime.set(key, (lifetime.get(key) || 0) + 1);
  }
  const categories = new Map(CATEGORY_KEYS.map((key) => [key, { key, claims: 0, items: 0 }]));
  const users = new Map(), contracts = new Map(), items = new Map(), cities = new Map(), kitchens = new Map(), projects = new Map(), companies = new Map(), timeline = new Map(), completedTimeline = new Map();
  const aging = [{ key: "onTrack", claims: 0 }, { key: "attention", claims: 0 }, { key: "overdue", claims: 0 }];
  const summary = { total: selected.length, open: 0, done: 0, completedInPeriod: 0, overdue: 0, mixed: 0, multiItem: 0, withFiles: 0, withPhotos: 0, missingContact: 0, oldestOpenDays: 0, averageOpenDays: null, averageCompletionDays: null, medianCompletionDays: null, p90CompletionDays: null };
  let openDays = 0;
  const completionDays = [];
  const monthly = startDate ? (now - new Date(startDate)) / DAY_MS > 90 : true;
  for (const claim of selected) {
    const state = workState(claim, now);
    summary[state.status === "DONE" ? "done" : "open"]++;
    if (state.overdue) summary.overdue++;
    if (state.status === "OPEN") {
      openDays += state.days;
      summary.oldestOpenDays = Math.max(summary.oldestOpenDays, state.days);
      aging[state.days > 25 ? 2 : state.days > 10 ? 1 : 0].claims++;
    } else if (claim.processing?.completedAt) {
      const elapsed = (new Date(claim.processing.completedAt) - new Date(claim.createdAt)) / DAY_MS;
      if (Number.isFinite(elapsed) && elapsed >= 0) completionDays.push(elapsed);
    }
    const areas = extractClaimAnalyticsAreas(claim);
    const uniqueAreas = [...new Map(areas.map((area) => [text(area.componentId) || itemKey(area), area])).values()];
    const touched = new Set();
    const claimItems = new Set();
    for (const area of uniqueAreas) {
      const category = classifyClaimArea(area);
      touched.add(category);
      categories.get(category).items++;
      const key = itemKey(area);
      if (!claimItems.has(key)) {
        const row = items.get(key) || { key, name: stripProductDimensionsFromLabel(area.nameDe || area.name || area.code || area.componentId), code: text(area.articleCode || area.code), category, claims: 0 };
        row.claims++;
        items.set(key, row);
        claimItems.add(key);
      }
    }
    if (!uniqueAreas.length) touched.add("unknown");
    for (const category of touched) categories.get(category).claims++;
    if (touched.has("cabinets") && touched.has("electrical")) summary.mixed++;
    if (uniqueAreas.length > 1) summary.multiItem++;
    const files = parseArray(claim.attachmentsJson).filter((file) => file?.filename && file.role !== "kitchen_preview");
    if (files.length) summary.withFiles++;
    if (files.some((file) => text(file.contentType).startsWith("image/"))) summary.withPhotos++;
    const contactKey = claimContactKey(claim);
    if (contactKey) {
      const row = users.get(contactKey) || { key: contactKey, name: text(claim.fullName).replace(/\s*\((female|male|diverse|other)\)\s*$/i, ""), contact: contactKey.startsWith("email:") ? normalized(claim.email) : text(claim.phone), claims: 0, lifetimeClaims: lifetime.get(contactKey) || 0, cabinets: 0, electrical: 0, contracts: new Set(), lastClaimAt: null };
      row.claims++;
      row.cabinets += touched.has("cabinets") ? 1 : 0;
      row.electrical += touched.has("electrical") ? 1 : 0;
      row.contracts.add(text(claim.contractNumber));
      if (!row.lastClaimAt || new Date(claim.createdAt) > new Date(row.lastClaimAt)) row.lastClaimAt = new Date(claim.createdAt).toISOString();
      users.set(contactKey, row);
    } else summary.missingContact++;
    const contractKey = text(claim.contractNumber);
    if (contractKey) addGroup(contracts, contractKey, contractKey, claim, state);
    for (const [map, key, name] of [[cities, normalized(claim.clientCity) || "unknown", text(claim.clientCity)], [kitchens, claim.kitchenId || "unknown", claim.kitchenName], [projects, claim.projectId || "unknown", claim.projectName], [companies, claim.companyId || "unknown", claim.companyName]]) addGroup(map, key, text(name), claim, state);
    const date = workDateKey(claim.createdAt);
    const bucket = monthly ? date.slice(0, 7) : date;
    timeline.set(bucket, (timeline.get(bucket) || 0) + 1);
  }
  for (const claim of allHistory) {
    if (kitchenId && claim.kitchenId !== kitchenId) continue;
    if ((claim.processingStatus || claim.processing?.status) !== "DONE") continue;
    const completedAt = new Date(claim.completedAt || claim.processing?.completedAt);
    if (!Number.isFinite(completedAt.getTime()) || completedAt > now || (startDate && completedAt < startDate)) continue;
    summary.completedInPeriod++;
    const date = workDateKey(completedAt);
    const bucket = monthly ? date.slice(0, 7) : date;
    completedTimeline.set(bucket, (completedTimeline.get(bucket) || 0) + 1);
  }
  // Fill zero-volume buckets so the chart shows real gaps in submissions.
  const firstDate = startDate || selected.reduce((earliest, claim) => !earliest || new Date(claim.createdAt) < new Date(earliest) ? claim.createdAt : earliest, null);
  if (firstDate) {
    const cursor = new Date(`${workDateKey(firstDate).slice(0, monthly ? 7 : 10)}${monthly ? "-01" : ""}T12:00:00Z`);
    const endKey = workDateKey(now).slice(0, monthly ? 7 : 10);
    while (cursor.toISOString().slice(0, monthly ? 7 : 10) <= endKey) {
      const key = cursor.toISOString().slice(0, monthly ? 7 : 10);
      if (!timeline.has(key)) timeline.set(key, 0);
      if (monthly) cursor.setUTCMonth(cursor.getUTCMonth() + 1); else cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  summary.uniqueUsers = users.size;
  summary.repeatUsers = [...users.values()].filter((user) => user.claims > 1).length;
  summary.returningUsers = [...users.values()].filter((user) => user.lifetimeClaims > 1).length;
  summary.uniqueContracts = contracts.size;
  summary.repeatContracts = [...contracts.values()].filter((row) => row.claims > 1).length;
  summary.averageOpenDays = summary.open ? openDays / summary.open : null;
  summary.averageCompletionDays = completionDays.length ? completionDays.reduce((sum, value) => sum + value, 0) / completionDays.length : null;
  if (completionDays.length) {
    completionDays.sort((a, b) => a - b);
    const middle = Math.floor(completionDays.length / 2);
    summary.medianCompletionDays = completionDays.length % 2 ? completionDays[middle] : (completionDays[middle - 1] + completionDays[middle]) / 2;
    summary.p90CompletionDays = completionDays[Math.ceil(completionDays.length * 0.9) - 1];
  }
  summary.completionSamples = completionDays.length;
  summary.previousPeriod = null;
  if (startDate) {
    const span = Date.parse(workDateKey(now)) - Date.parse(workDateKey(startDate)) + DAY_MS;
    const previousKey = new Date(Date.parse(`${workDateKey(startDate)}T12:00:00Z`) - span).toISOString().slice(0, 10);
    const previousStart = workDayStart(previousKey);
    summary.previousPeriod = allHistory.filter((claim) => (!kitchenId || claim.kitchenId === kitchenId) && new Date(claim.createdAt) >= previousStart && new Date(claim.createdAt) < new Date(startDate)).length;
  }
  return { summary, categories: [...categories.values()], aging, users: [...users.values()].map((row) => ({ ...row, contracts: row.contracts.size })).sort((a, b) => b.claims - a.claims || b.lifetimeClaims - a.lifetimeClaims || a.name.localeCompare(b.name)), contracts: ranked(contracts), items: ranked(items), cities: ranked(cities), kitchens: ranked(kitchens), projects: ranked(projects), companies: ranked(companies), timeline: [...new Set([...timeline.keys(), ...completedTimeline.keys()])].sort().map((date) => ({ date, claims: timeline.get(date) || 0, completed: completedTimeline.get(date) || 0 })), monthly };
}

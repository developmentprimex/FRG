import { classifyClaimArea, extractClaimAnalyticsAreas } from "./asc-claim-analytics.js";
import { getAscClaimItem } from "./asc-claim-item-labels.js";
import { reportDateKey, reportDayStart } from "./business-report-dates.js";
import { getAscComparisonWindow, resolveAscProduct, buildAscProductBreakdown, buildAscRecurrence } from "./asc-dashboard-insights.js";

export const ASC_DASHBOARD_CATEGORIES = ["cabinets", "electrical", "other", "unknown"];
const clean = value => String(value || "").trim();
const contractKey = value => clean(value).replace(/[\s\u200B\u2060]+/g, "");
const emptyCategories = () => ({ cabinets: 0, electrical: 0, other: 0, unknown: 0 });
const timestamp = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).getTime() : null;
const iso = value => timestamp(value) === null ? null : new Date(value).toISOString();
const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });
const ranked = map => [...map.values()].sort((a, b) => b.claims - a.claims || a.name.localeCompare(b.name));

export function getAscDashboardStartDate(days, now = new Date()) {
  if (!days) return null;
  const date = new Date(`${reportDateKey(now)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return reportDayStart(date.toISOString().slice(0, 10));
}

function array(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

export function getAscClaimKitchen(row) {
  const type = ["FRG", "ARC"].includes(row.contractType) ? row.contractType : "unknown";
  const number = contractKey(row.contractNumber);
  const key = type === "FRG" && row.kitchenId ? `FRG:${row.kitchenId}`
    : type === "ARC" && row.contractId ? `ARC:${row.contractId}` : `unknown:${number || row.id}`;
  return { key, contractType: type, name: type === "FRG" && row.kitchenName ? row.kitchenName : number,
    kitchenId: type === "FRG" ? row.kitchenId || null : null, contractId: row.contractId || null };
}

function enrichClaim(row) {
  // A submission belongs to the retained case; it can add products, never another case.
  const submissions = (row.submissions || []).filter(submission => submission.id !== row.id && submission.payload?.id !== row.id);
  const areas = [row, ...submissions.map(submission => submission.payload || {})].flatMap(extractClaimAnalyticsAreas);
  const categories = new Set(areas.map(classifyClaimArea));
  if (!categories.size) categories.add("unknown");
  const items = new Map();
  for (const area of areas) {
    const category = classifyClaimArea(area);
    const item = getAscClaimItem(area, category);
    const originalName = clean(area.name || area.nameDe || area.code || area.componentId);
    const originals = new Set([...(items.get(item.key)?.originalNames || []), originalName].filter(Boolean));
    items.set(item.key, { ...item, category, originalNames: [...originals] });
  }
  const hasFiles = [row, ...submissions.map(submission => submission.payload || {})]
    .some(submission => array(submission.attachmentsJson).some(file => file && typeof file === "object" && (file.name || file.filename || file.fileName || file.url || file.path || file.storageKey)));
  return { ...row, contractNumber: contractKey(row.contractNumber), kitchen: getAscClaimKitchen(row),
    categories: [...categories], items: [...items.values()], products: areas.map(area => resolveAscProduct(area, row.contract)), hasFiles, createdAt: iso(row.createdAt) };
}

export function summarizeAscDashboard(input, filters = {}) {
  const unique = new Map();
  for (const row of input) {
    if (contractKey(row.contractNumber).startsWith("111") || row.ticketSeries === "test") continue;
    unique.set(row.id, row);
  }
  const all = [...unique.values()].map(enrichClaim).sort((a, b) => (timestamp(a.createdAt) ?? -Infinity) - (timestamp(b.createdAt) ?? -Infinity) || clean(a.id).localeCompare(clean(b.id)));
  const history = new Map();
  const ordinals = new Map();
  for (const row of all) {
    const key = row.kitchen.key;
    if (!history.has(key)) history.set(key, { ...row.kitchen, totalClaims: 0, firstAt: row.createdAt, lastAt: null, contracts: new Set() });
    const group = history.get(key);
    group.totalClaims++;
    if (row.createdAt) { group.firstAt ||= row.createdAt; group.lastAt = row.createdAt; }
    if (row.contractNumber) group.contracts.add(row.contractNumber);
    ordinals.set(row.id, group.totalClaims);
  }
  const window = getAscComparisonWindow(filters.period, filters.now ? new Date(filters.now) : new Date());
  const start = timestamp(window.start || filters.startDate);
  const end = timestamp(window.end);
  const inScope = row => (!filters.contractType || row.kitchen.contractType === filters.contractType)
    && (!filters.kitchenKey || row.kitchen.key === filters.kitchenKey)
    && (!filters.kitchenId || row.kitchenId === filters.kitchenId)
    && (!filters.category || row.categories.includes(filters.category));
  const rows = all.filter(row => inScope(row) && (start === null || (timestamp(row.createdAt) !== null && timestamp(row.createdAt) >= start))
    && (end === null || (timestamp(row.createdAt) !== null && timestamp(row.createdAt) < end)));
  const previous = window.previousStart ? all.filter(row => inScope(row) && timestamp(row.createdAt) !== null
    && timestamp(row.createdAt) >= timestamp(window.previousStart) && timestamp(row.createdAt) < timestamp(window.previousEnd)).length : null;
  const comparison = previous === null ? null : { ...window, current: rows.length, previous, delta: rows.length - previous,
    changePercent: previous ? (rows.length - previous) / previous * 100 : rows.length ? null : 0 };
  const categories = emptyCategories();
  const contracts = new Set(), cities = new Map(), items = new Map(), days = new Map(), kitchens = new Map();
  const sources = ["FRG", "ARC", "unknown"].map(key => ({ key, claims: 0, kitchens: 0, categories: emptyCategories() }));
  let withAttachments = 0, repeatClaims = 0, multiCategory = 0;
  for (const row of rows) {
    if (row.contractNumber) contracts.add(row.contractNumber);
    if (row.hasFiles) withAttachments++;
    if (ordinals.get(row.id) > 1) repeatClaims++;
    if (row.categories.length > 1) multiCategory++;
    const source = sources.find(source => source.key === row.kitchen.contractType);
    source.claims++;
    for (const category of row.categories) { categories[category]++; source.categories[category]++; }
    const city = clean(row.clientCity);
    if (city) {
      const key = city.toLocaleLowerCase("de");
      const cityRow = cities.get(key) || { key, name: city, claims: 0 };
      cityRow.claims++; cities.set(key, cityRow);
    }
    if (row.createdAt) { const day = dateFormat.format(new Date(row.createdAt)); days.set(day, (days.get(day) || 0) + 1); }
    for (const item of row.items) {
      const current = items.get(item.key) || { ...item, claims: 0 };
      current.originalNames = [...new Set([...current.originalNames, ...item.originalNames])];
      current.claims++; items.set(item.key, current);
    }
    const key = row.kitchen.key;
    if (!kitchens.has(key)) kitchens.set(key, { ...history.get(key), contracts: [...history.get(key).contracts].sort(), claims: 0, categories: emptyCategories(), latestClaimId: row.id });
    const kitchen = kitchens.get(key);
    kitchen.claims++; kitchen.latestClaimId = row.id;
    for (const category of row.categories) kitchen.categories[category]++;
  }
  const kitchenRows = [...kitchens.values()].sort((a, b) => b.totalClaims - a.totalClaims || b.claims - a.claims || a.name.localeCompare(b.name));
  for (const source of sources) source.kitchens = kitchenRows.filter(row => row.contractType === source.key).length;
  return {
    comparison, productBreakdown: buildAscProductBreakdown(rows),
    productRecurrence: buildAscRecurrence(all.filter(row => end === null || (timestamp(row.createdAt) !== null && timestamp(row.createdAt) < end)), rows),
    total: rows.length, contracts: contracts.size, kitchens: kitchens.size, cities: cities.size,
    withAttachments, missingCity: rows.length - [...cities.values()].reduce((sum, row) => sum + row.claims, 0),
    repeatKitchens: kitchenRows.filter(row => row.totalClaims > 1).length, repeatClaims, multiCategory,
    categories, sources, kitchenRows, items: ranked(items), cityRows: ranked(cities),
    kitchenOptions: [...history.values()]
      .map(row => ({ key: row.key, name: row.name, contractType: row.contractType })).sort((a, b) => a.name.localeCompare(b.name)),
    daily: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, claims]) => ({ date, claims })),
    recent: [...rows].reverse().slice(0, 8).map(row => ({ id: row.id, contractNumber: row.contractNumber,
      fullName: clean(row.fullName).replace(/\s*\((female|male|diverse|other)\)\s*$/i, ""),
      city: clean(row.clientCity), createdAt: row.createdAt, contractType: row.kitchen.contractType,
      categories: row.categories, kitchenName: row.kitchen.name, ordinal: ordinals.get(row.id) })),
  };
}

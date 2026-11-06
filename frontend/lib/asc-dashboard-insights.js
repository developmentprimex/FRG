import { reportDateKey, reportDayStart } from "./business-report-dates.js";
import { classifyClaimArea } from "./asc-claim-analytics.js";
import { getAscClaimItem } from "./asc-claim-item-labels.js";
import { getContractApplianceBrandLabel, inferApplianceBrand } from "./contract-appliances.js";

const text = value => String(value || "").trim();
const key = value => text(value).toUpperCase().replace(/\s+/g, "");
const realCode = value => !/^REFERENCE(?:-|$)/i.test(text(value)) ? text(value) : "";
const recordedSerial = value => /^(?:not recorded|not specified|unknown|unbekannt|nicht erfasst|nicht angegeben|n\/?a|none|null|-+)$/i.test(text(value)) ? "" : text(value);
const sorted = values => [...values].sort((a, b) => b.claims - a.claims || a.key.localeCompare(b.key));

export function getAscComparisonWindow(period, now = new Date()) {
  if (!period || period === "all") return { start: null, end: null, previousStart: null, previousEnd: null };
  const today = new Date(`${reportDateKey(now)}T12:00:00Z`);
  const end = new Date(today); end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(today), previous = new Date(today);
  if (period === "month") {
    start.setUTCDate(1); previous.setUTCDate(1); previous.setUTCMonth(previous.getUTCMonth() - 1);
  } else {
    const days = { "7d": 7, "30d": 30, "90d": 90 }[period];
    if (!days) return getAscComparisonWindow("all", now);
    start.setUTCDate(start.getUTCDate() - days + 1);
    previous.setTime(start.getTime()); previous.setUTCDate(previous.getUTCDate() - days);
  }
  const midnight = date => reportDayStart(date.toISOString().slice(0, 10)).toISOString();
  return { start: midnight(start), end: midnight(end), previousStart: midnight(previous), previousEnd: midnight(start) };
}

export function resolveAscProduct(area, contract = null) {
  const category = classifyClaimArea(area);
  const item = getAscClaimItem(area, category);
  const article = realCode(area.articleCode);
  const explicitModel = text(area.model || area.modelNumber);
  let manufacturer = text(area.manufacturer || area.brand);
  let model = explicitModel || article;
  let manufacturerSource = manufacturer ? "claim" : "";
  let modelSource = model ? "claim" : "";
  // Only exact recorded article matches may enrich a claim. Never assume an
  // installed brand/model by appliance type or from a shared ARC upload shell.
  const inventory = (contract?.appliances || []).filter(entry => entry.isPresent !== false && article && key(entry.articleNumber) === key(article));
  const products = contract?.contractType === "FRG" ? (contract.kitchen?.items || []).filter(entry =>
    article ? key(entry.articleNumber) === key(article) : text(area.code) && key(entry.code) === key(area.code)) : [];
  const candidates = inventory.length ? inventory.map(entry => ({ manufacturer: entry.brand, article: entry.articleNumber }))
    : products.map(entry => ({ manufacturer: entry.catalogArticle?.manufacturer || getContractApplianceBrandLabel(inferApplianceBrand(entry.catalogArticle || entry)), article: entry.articleNumber || entry.catalogArticle?.articleNumber }));
  const unique = field => [...new Map(candidates.filter(entry => text(entry[field])).map(entry => [key(entry[field]), text(entry[field])])).values()];
  const brands = unique("manufacturer"), articles = unique("article");
  const source = inventory.length ? "inventory" : "catalog";
  if (!manufacturer && brands.length === 1) { manufacturer = brands[0]; manufacturerSource = source; }
  if (!model && !explicitModel && articles.length === 1) { model = articles[0]; modelSource = source; }
  manufacturer = getContractApplianceBrandLabel(manufacturer) || manufacturer;
  return { ...item, category, manufacturer, model, manufacturerSource, modelSource,
    article: article || (modelSource === "catalog" ? model : ""), serial: recordedSerial(area.serialNumber),
    component: /^reference-/i.test(text(area.componentId)) ? "" : text(area.componentId),
    knownType: !item.key.includes("unclassified") };
}

export function buildAscProductBreakdown(rows) {
  const manufacturers = new Map(), models = new Map();
  let missingManufacturer = 0, missingModel = 0;
  for (const row of rows) {
    const seenBrands = new Set(), seenModels = new Set();
    if (!row.products.length || row.products.some(product => !product.manufacturer)) missingManufacturer++;
    if (!row.products.length || row.products.some(product => !product.model)) missingModel++;
    for (const product of row.products) {
      if (product.manufacturer) {
        const id = key(product.manufacturer);
        const entry = manufacturers.get(id) || { key: id, name: product.manufacturer, claims: 0, sources: new Set() };
        entry.sources.add(product.manufacturerSource);
        if (!seenBrands.has(id)) { entry.claims++; seenBrands.add(id); }
        manufacturers.set(id, entry);
      }
      if (product.model) {
        // Preserve distinct models for different manufacturers and product types.
        const id = `${key(product.manufacturer)}:${key(product.model)}:${product.key}`;
        const entry = models.get(id) || { key: id, manufacturer: product.manufacturer, model: product.model,
          name: product.name, nameDe: product.nameDe, claims: 0, sources: new Set() };
        entry.sources.add(product.modelSource);
        if (!seenModels.has(id)) { entry.claims++; seenModels.add(id); }
        models.set(id, entry);
      }
    }
  }
  return { manufacturers: sorted(manufacturers.values()).map(row => ({ ...row, sources: [...row.sources] })),
    models: sorted(models.values()).map(row => ({ ...row, sources: [...row.sources] })), missingManufacturer, missingModel };
}

function matchProducts(current, previous) {
  if (!current.knownType || !previous.knownType || current.key !== previous.key) return null;
  if (current.serial && previous.serial) return key(current.serial) === key(previous.serial) ? "serial" : null;
  if (current.manufacturer && previous.manufacturer && key(current.manufacturer) !== key(previous.manufacturer)) return null;
  const model = current.article || current.model, previousModel = previous.article || previous.model;
  if (model && previousModel) return key(model) === key(previousModel) ? "article" : null;
  return "type";
}

export function buildAscRecurrence(all, selected) {
  const selectedIds = new Set(selected.map(row => row.id));
  const byKitchen = new Map(), groups = new Map();
  const result = { sameAppliance: 0, sameModel: 0, sameType: 0, differentProduct: 0, unknown: 0, rows: [] };
  const rank = { serial: 3, article: 2, type: 1 };
  for (const row of all) {
    const prior = byKitchen.get(row.kitchen.key) || [];
    let strongest = null;
    for (const product of row.products) for (const old of prior) for (const previous of old.products) {
      const evidence = matchProducts(product, previous);
      if (!evidence) continue;
      if (!strongest || rank[evidence] > rank[strongest]) strongest = evidence;
      const identity = evidence === "serial" ? key(product.serial) : evidence === "article" ? `${key(product.manufacturer)}:${key(product.article || product.model)}` : "type";
      const id = `${row.kitchen.key}:${product.key}:${evidence}:${identity}`;
      const group = groups.get(id) || { key: id, kitchenKey: row.kitchen.key, kitchenName: row.kitchen.name,
        contractType: row.kitchen.contractType, name: product.name, nameDe: product.nameDe, evidence,
        reference: evidence === "serial" ? product.serial : evidence === "article" ? product.article || product.model : "", ids: new Set(), selectedIds: new Set(), latestClaimId: row.id, lastAt: row.createdAt };
      group.ids.add(old.id); group.ids.add(row.id);
      if (selectedIds.has(old.id)) group.selectedIds.add(old.id);
      if (selectedIds.has(row.id)) group.selectedIds.add(row.id);
      group.latestClaimId = row.id; group.lastAt = row.createdAt;
      groups.set(id, group);
    }
    if (selectedIds.has(row.id) && prior.length) {
      if (strongest) result[{ serial: "sameAppliance", article: "sameModel", type: "sameType" }[strongest]]++;
      else if (row.products.some(product => product.knownType) && prior.some(old => old.products.some(product => product.knownType))) result.differentProduct++;
      else result.unknown++;
    }
    prior.push(row); byKitchen.set(row.kitchen.key, prior);
  }
  result.rows = [...groups.values()].filter(group => group.selectedIds.size).map(({ ids, selectedIds: idsInPeriod, ...group }) =>
    ({ ...group, totalClaims: ids.size, selectedClaims: idsInPeriod.size })).sort((a, b) => b.totalClaims - a.totalClaims || a.key.localeCompare(b.key));
  return result;
}

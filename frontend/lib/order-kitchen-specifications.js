import specifications from "../data/kitchen-specifications/index.json" with { type: "json" };
import { inferApplianceBrand, getContractApplianceBrandLabel } from "./contract-appliances.js";
import { kitchenAbIdentity } from "./kitchen-ab-validation.js";

const normalizeArticle = (value) => String(value || "").replace(/\s+/g, "").toUpperCase();

// Dashboard and legacy kitchens may use six digits with a grouping hyphen.
// Never infer a document from a contract number, partial code or layout variant.
export function getKitchenSpecification(kitchen = {}) {
  const identity = kitchenAbIdentity(kitchen);
  return identity && Object.hasOwn(specifications, identity) ? specifications[identity] : null;
}

function manufacturerForItem(item, reference) {
  const article = item.articleNumberSnapshot || item.kitchenItem?.articleNumber || "";
  const kitchenItem = item.kitchenItem || {};
  const catalog = kitchenItem.catalogArticle || {};
  const snapshotBrand = getContractApplianceBrandLabel(inferApplianceBrand({ name: item.nameSnapshot, nameDe: item.nameDeSnapshot }));
  if (snapshotBrand) return snapshotBrand;

  // Current product metadata is only valid for the article actually ordered.
  const productBrand = [catalog, kitchenItem]
    .filter((product) => article && normalizeArticle(product.articleNumber) === normalizeArticle(article))
    .map((product) => product.manufacturer || product.brand || getContractApplianceBrandLabel(inferApplianceBrand(product)))
    .find(Boolean);
  if (productBrand) return productBrand;

  const codes = String(article).split("+").map(normalizeArticle).filter(Boolean);
  const manufacturers = (reference?.articles || [])
    .filter((entry) => codes.includes(normalizeArticle(entry.articleNumber)))
    .map((entry) => entry.manufacturer).filter(Boolean);
  return [...new Set(manufacturers)].join(" / ");
}

export function buildOrderKitchenSpecifications(order = {}, reference = getKitchenSpecification(order.kitchen)) {
  const kitchen = order.kitchen || {};
  return {
    kitchen: { id: kitchen.id || "", slug: kitchen.slug || "", name: kitchen.name || "",
      kitchenCode: kitchen.kitchenCode || "", programmId: kitchen.programmId || "" },
    reference,
    orderedItems: (order.items || []).map((item, index) => ({
      id: item.id || `${item.code || "item"}-${index}`,
      code: item.code || "",
      articleNumber: item.articleNumberSnapshot || item.kitchenItem?.articleNumber || "",
      name: item.nameSnapshot || item.kitchenItem?.name || item.code || "",
      nameDe: item.nameDeSnapshot || "",
      itemType: item.itemType || "",
      quantity: Number(item.quantity ?? 1),
      manufacturer: manufacturerForItem(item, reference),
    })),
  };
}

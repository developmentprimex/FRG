"use client";
import { trackJourneyStep, ensureJourneySession } from "../lib/visit-journey-client.js";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import KitchenCatalogPanel from "./kitchen-catalog-panel";
import styles from "./kitchen-configurator.module.css";
import KitchenOrderForm from "./public-kitchen-order-form";
import KitchenSelectionSummary from "./kitchen-selection-summary";
import {
  componentIdForItem,
  componentIdForKey,
  formatCurrency,
  getAutoLinkedAccessoryCodes,
  getCatalogDisplayItem,
  getItemBlendeTotal,
  getItemPriceWithoutBlende,
  getLinkedComponentIds,
  getLocalizedBlendeDisplayLabel,
  getLocalizedItemName,
  hasAssistantProductInfo,
  isHiddenLinkedComponent,
  isLinkedComponentSelected,
  itemRequiresBlendeConfirmation,
  normalizeColor,
  selectedMap,
  shouldShowProductAssistantLauncher,
  toggleLinkedComponentSelection,
} from "./kitchen-selection-utils";
import useKitchenSvgStage from "./kitchen-svg-stage";
import { PLAN_VIEWPORT_BY_SLUG } from "./kitchen-svg-plan-utils";
import { speakAssistantTextWithTts, stopAssistantSpeech } from "./assistant-tts";
import {
  getServiceEligibility,
  SERVICE_CODE_MONTAGE,
  SERVICE_CODE_PICKUP,
} from "../lib/service-eligibility";
import {
  ADDRESS_VERIFICATION_STATUS,
  addressVerificationSnapshotKey,
  buildAddressVerificationSnapshot,
  buildAddressVerificationState,
} from "../lib/address-verification";
import {
  buildCutleryLineItems,
  buildInitialCutleryLines,
  getAvailableCutleryVariantsForComponents,
  getCutleryBaseItem,
  isCutleryAccessoryCode,
  isCutleryAccessoryItem,
  normalizeCutleryVariants,
  normalizeCutleryLines,
  normalizeCutleryQuantity,
} from "../lib/cutlery-accessories";
import { applyArticleVariantSelectionForDisplay, findAuszugVariantOption } from "../lib/auszug-variants";
import { PublicI18nProvider, PublicLanguageSwitcher, usePublicI18n } from "./public-i18n";

function buildInitialCustomer(contractNumber) {
  return {
    contractNumber,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    postalCode: "",
    city: "",
    country: "",
    preferredDeliveryDate: "",
    notes: "",
    paymentMethod: "card",
    consent: false,
    termsConsent: false,
  };
}

const ADDRESS_VERIFICATION_FIELD_KEYS = new Set([
  "address1",
  "address2",
  "country",
  "city",
  "postalCode",
]);
const ORDER_ADDRESS_FIELD_KEYS = ["address1", "address2", "country", "city", "postalCode"];

const ORDER_COUNTRY_BY_CONTRACT_COUNTRY = {
  Germany: "Deutschland",
  Austria: "Oesterreich",
  Switzerland: "Schweiz",
  Hungary: "Ungarn",
  Kosovo: "Kosovo",
  Czechia: "Tschechien",
  Slovakia: "Slowakei",
  Poland: "Polen",
};

const DEFAULT_LOCKED_COMPONENT_KEYS_BY_SLUG = {
  // Burger 103898 includes these lower cabinets in the supplied kitchen plan.
  // Keep this slug-specific so legacy kitchens retain their existing defaults.
  "burger-103898": ["sink-base", "base-module-1", "base-module-2", "drawer-module"],
  "ab-105835": ["oven-module", "worktop", "sink-base", "sink-faucet"],
  "l-shaped-kitchen": ["worktop", "oven-base", "base-module-3"],
};

const DEFAULT_LOCKED_PLAN_COMPONENT_KEYS_BY_SLUG = {
  "l-shaped-kitchen": ["sink-faucet"],
  "ab-101246": ["under-cabinet-light"],
};

const DEFAULT_LOCKED_ACCESSORY_CODES_BY_SLUG = {
  "l-shaped-kitchen": [],
};

const CONFIGURATOR_DRAFT_REVISION_BY_SLUG = {
  "ab-105762": "corner-blende-v1",
  "ab-105766": "corner-blende-v1",
  "ab-105770": "corner-blende-v1",
  "ab-105774": "corner-blende-v1",
  "ab-105805": "default-components-v2-cutlery-v1",
  "ab-105809": "default-components-v2-cutlery-v1",
  "ab-105813": "default-components-v2-cutlery-v1",
  "ab-105814": "ab105810-view-cutlery-v1",
  "ab-105817": "default-components-v2-cutlery-v1",
  "ab-105818": "ab105810-view-cutlery-v1",
  "ab-105834": "default-components-v2-cutlery-v1",
  "l-shaped-kitchen": "default-components-v2-cutlery-v1",
};

function buildCustomerAddressFromContract(contractAddress) {
  if (!contractAddress) return {};

  return {
    country: ORDER_COUNTRY_BY_CONTRACT_COUNTRY[contractAddress.country] || contractAddress.country || "",
    city: contractAddress.city || "",
    postalCode: contractAddress.postalCode || "",
    address1: contractAddress.address1 || "",
    address2: contractAddress.address2 || "",
  };
}

function normalizeAddressValue(value) {
  return String(value ?? "").trim();
}

function hasContractAddress(contractAddress) {
  const contractCustomerAddress = buildCustomerAddressFromContract(contractAddress);
  return ORDER_ADDRESS_FIELD_KEYS.some((fieldKey) => normalizeAddressValue(contractCustomerAddress[fieldKey]));
}

function customerUsesContractAddress(customer, contractAddress) {
  if (!hasContractAddress(contractAddress)) return false;

  const contractCustomerAddress = buildCustomerAddressFromContract(contractAddress);
  return ORDER_ADDRESS_FIELD_KEYS.every(
    (fieldKey) => normalizeAddressValue(customer?.[fieldKey]) === normalizeAddressValue(contractCustomerAddress[fieldKey]),
  );
}

function buildInitialCustomerFromOrder(initialOrder, contractNumber) {
  return {
    ...buildInitialCustomer(contractNumber),
    ...(initialOrder?.customer || {}),
    contractNumber: initialOrder?.customer?.contractNumber || contractNumber,
    consent: false,
    termsConsent: false,
  };
}

function buildInitialCustomerState(initialOrder, contractNumber, contractAddress) {
  if (initialOrder) {
    return buildInitialCustomerFromOrder(initialOrder, contractNumber);
  }

  return {
    ...buildInitialCustomer(contractNumber),
    ...buildCustomerAddressFromContract(contractAddress),
  };
}

function buildInitialAddressPreference(initialOrder, contractNumber, contractAddress) {
  const initialCustomer = buildInitialCustomerState(initialOrder, contractNumber, contractAddress);
  return customerUsesContractAddress(initialCustomer, contractAddress);
}

function getOrderItemEffectivePrice(item) {
  if (item?.isLocked || item?.isOrderLocked) {
    return 0;
  }
  const unitPrice = Number(item?.priceSnapshot ?? item?.price ?? 0);
  const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
  return unitPrice * quantity;
}

function buildOrderSubmissionItem(item) {
  const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
  const unitPrice = item?.isLocked || item?.isOrderLocked
    ? 0
    : Number(item?.priceSnapshot ?? item?.price ?? 0);

  return {
    ...item,
    price: unitPrice,
    quantity,
  };
}

function localizeProductInfoDocumentLabel(label, translate) {
  const normalized = String(label || "").trim().toLowerCase();

  switch (normalized) {
    case "backofen e-label":
      return translate("configurator.productInfoLabelOvenELabel", "Oven E-Label");
    case "backofen pdf":
      return translate("configurator.productInfoLabelOvenPdf", "Oven PDF");
    case "kochfeld pdf":
      return translate("configurator.productInfoLabelHobPdf", "Cooktop PDF");
    case "produktinfo pdf":
      return translate("configurator.productInfoLabelProductPdf", "Product info PDF");
    case "e-label pdf":
      return translate("configurator.productInfoLabelELabelPdf", "E-Label PDF");
    default:
      return label;
  }
}

const PRODUCT_INFO_PDF_REVISION = "20260506";

function withProductInfoPdfRevision(href) {
  const value = String(href || "").trim();
  if (!value) return "";

  const [pathWithQuery, fragment] = value.split("#", 2);
  const separator = pathWithQuery.includes("?") ? "&" : "?";
  const revisedHref = `${pathWithQuery}${separator}v=${PRODUCT_INFO_PDF_REVISION}`;
  return fragment ? `${revisedHref}#${fragment}` : revisedHref;
}

function buildProductInfoState(payload, translate, language = "en") {
  if (!payload?.infoPdfHref || !payload?.item) return null;

  const rawProductInfoDocuments = Array.isArray(payload.item.productInfoDocuments)
    ? payload.item.productInfoDocuments.filter((document) => document?.href)
    : payload.infoPdfHref
      ? [{ label: "Produktinfo PDF", href: payload.infoPdfHref }]
      : [];
  const defaultProductInfoDocument =
    rawProductInfoDocuments.find((document) => String(document.label || "").toLowerCase().includes("produktinfo"))
    || rawProductInfoDocuments[0]
    || null;
  const productInfoDocuments = rawProductInfoDocuments.map((document) => ({
    ...document,
    label: localizeProductInfoDocumentLabel(document.label, translate),
    href: withProductInfoPdfRevision(document.href),
  }));

  return {
    ...payload,
    infoPdfHref: withProductInfoPdfRevision(payload.infoPdfHref),
    title:
      formatProductAssistantDisplayName(payload.item, translate)
      || payload.item.productAssistantName
      || getLocalizedItemName(payload.item, translate, language)
      || translate("configurator.productInfoTitle", "Product information", { title: "" }).trim(),
    price: Number(payload.price ?? payload.item.price ?? 0),
    infoText: payload.item.infoText || "",
    productInfoSummary: payload.item.productInfoSummary || "",
    productInfoKeyFacts: Array.isArray(payload.item.productInfoKeyFacts) ? payload.item.productInfoKeyFacts : [],
    productInfoExtractedText: payload.item.productInfoExtractedText || "",
    productInfoItemId: payload.item.productInfoItemId || payload.item.id || "",
    productInfoDocuments,
    activeProductInfoDocumentHref:
      withProductInfoPdfRevision(defaultProductInfoDocument?.href) || withProductInfoPdfRevision(payload.infoPdfHref),
  };
}

function splitProductInfoSentences(value, limit = 3) {
  return String(value || "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function extractProductInfoBullets(text, heading, limit = 6) {
  const lines = String(text || "").split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim().toLowerCase() === `${heading.toLowerCase()}:`);
  if (headingIndex < 0) return [];

  const bullets = [];
  for (const line of lines.slice(headingIndex + 1)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith("-") && trimmed.endsWith(":")) break;
    if (trimmed.startsWith("-")) {
      bullets.push(trimmed.replace(/^-\s*/, ""));
    }
    if (bullets.length >= limit) break;
  }
  return bullets;
}

function extractProductAssistantProductNameLine(item) {
  return String(item?.productInfoExtractedText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(produktname|product name):/i.test(line)) || "";
}

function extractProductAssistantModel(item) {
  const articleNumber = String(item?.articleNumber || "").trim();
  if (articleNumber) return articleNumber;

  const sourceText = [
    item?.productInfoSummary || "",
    ...(Array.isArray(item?.productInfoKeyFacts) ? item.productInfoKeyFacts : []),
    item?.productInfoExtractedText || "",
    item?.productAssistantName || "",
    item?.name || "",
  ].join("\n");
  const patterns = [
    /\bKHF\s*664\s*611\s*S(?:\s*Stripe\s*X)?\b/i,
    /\bFH\s*664\s*621\s*S\b/i,
    /\bEWA34660W\b/i,
    /\bA-EGSPV597210\b/i,
    /\bKGC\s*15495\s*S\b/i,
    /\bEBX\s*943\s*600\s*S\b/i,
    /\bOL-KMI\s*754\s*000\s*E\b/i,
  ];

  for (const pattern of patterns) {
    const match = sourceText.match(pattern);
    if (match) return match[0].replace(/\s+/g, " ").trim();
  }

  const productNameLine = extractProductAssistantProductNameLine(item);
  if (!productNameLine) return "";
  return productNameLine.replace(/^(produktname|product name):\s*/i, "").trim();
}

function isExtractorHoodProductAssistantItem(item) {
  const sourceText = [
    item?.productInfoSummary || "",
    ...(Array.isArray(item?.productInfoKeyFacts) ? item.productInfoKeyFacts : []),
    item?.productInfoExtractedText || "",
    item?.productAssistantName || "",
    item?.name || "",
  ].join("\n");

  return /flachschirmhaube|teleskophaube|kaminhaube|chimney hood|extractor hood/i.test(sourceText)
    || String(item?.productInfoCode || item?.code || "").toUpperCase().startsWith("HOOD-");
}

function isWashingMachineProductAssistantItem(item) {
  const sourceText = [
    item?.productInfoSummary || "",
    ...(Array.isArray(item?.productInfoKeyFacts) ? item.productInfoKeyFacts : []),
    item?.productInfoExtractedText || "",
    item?.productAssistantName || "",
    item?.name || "",
    item?.articleNumber || "",
  ].join("\n");

  return /waschmaschine|washing machine|\bEWA34660W\b/i.test(sourceText)
    || String(item?.productInfoCode || item?.code || "").toUpperCase().startsWith("WM-");
}

function isRefrigeratorProductAssistantItem(item) {
  const sourceText = [
    item?.productInfoSummary || "",
    ...(Array.isArray(item?.productInfoKeyFacts) ? item.productInfoKeyFacts : []),
    item?.productInfoExtractedText || "",
    item?.productAssistantName || "",
    item?.name || "",
    item?.articleNumber || "",
  ].join("\n");

  return /kuehl|kühl|gefrier|refrigerator|fridge|freezer|\bKGC\s*15495\s*S\b/i.test(sourceText)
    || String(item?.productInfoCode || item?.code || "").toUpperCase().startsWith("REF-");
}

function isDishwasherProductAssistantItem(item) {
  const sourceText = [
    item?.productInfoSummary || "",
    ...(Array.isArray(item?.productInfoKeyFacts) ? item.productInfoKeyFacts : []),
    item?.productInfoExtractedText || "",
    item?.productAssistantName || "",
    item?.name || "",
    item?.articleNumber || "",
  ].join("\n");

  return /geschirrspueler|geschirrspüler|dishwasher|\bA-EGSPV597210\b/i.test(sourceText)
    || String(item?.productInfoCode || item?.code || "").toUpperCase().startsWith("DISH-");
}

function isLedLightingProductAssistantItem(item) {
  const sourceText = [
    item?.productInfoSummary || "",
    ...(Array.isArray(item?.productInfoKeyFacts) ? item.productInfoKeyFacts : []),
    item?.productInfoExtractedText || "",
    item?.productAssistantName || "",
    item?.name || "",
    item?.articleNumber || "",
  ].join("\n");
  const code = String(item?.productInfoCode || item?.code || "").trim().toUpperCase();

  return /\bKA220043_S3\b|led lighting set|led-beleuchtungsset|beleuchtungsset/i.test(sourceText)
    || code === "LIGHT-B-LED-001"
    || code === "LIGHT-C-LED-001"
    || code === "ACC-LIGHT-003";
}

function formatProductAssistantDisplayName(item, translate) {
  if (!item) return "";

  if ((item.catalogArticleId || item.catalogServiceId) && item.name) {
    return item.name;
  }

  if (isExtractorHoodProductAssistantItem(item)) {
    const baseLabel = translate("configurator.productAssistantExtractorHood", "Extractor hood");
    return baseLabel;
  }

  if (isWashingMachineProductAssistantItem(item)) {
    return translate("configurator.catalogItemNames.washingMachine", "Washing machine");
  }

  if (isRefrigeratorProductAssistantItem(item)) {
    return item.name || item.productAssistantName || translate("configurator.catalogItemNames.refrigerator", "Freestanding refrigerator");
  }

  if (isDishwasherProductAssistantItem(item)) {
    return translate("configurator.catalogItemNames.dishwasher", "Fully integrated dishwasher");
  }

  if (isLedLightingProductAssistantItem(item)) {
    return translate("configurator.catalogItemNames.ledLightingSet", "LED Lighting Set");
  }

  return formatProductAssistantOptionName(
    item.productAssistantName || item.name || item.code,
    translate("configurator.productAssistantProductFallback", "Product"),
  );
}

function formatProductAssistantContextLabel(activeProductInfo, selectedItems) {
  if (activeProductInfo?.title) {
    return activeProductInfo.title;
  }

  const names = selectedItems.map((item) => item.name).filter(Boolean);
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} und ${names[1]}`;
  return `${names[0]}, ${names[1]} und ${names.length - 2} weitere`;
}

function buildProductAssistantIntro(activeProductInfo, selectedItems) {
  const names = selectedItems.map((item) => item.name).filter(Boolean);
  if (activeProductInfo?.title) {
    return `Ich sehe, du hast ${activeProductInfo.title} geöffnet. Stelle eine Frage dazu.`;
  }
  if (names.length === 1) {
    return `Ich sehe, du hast ${names[0]} ausgewählt. Stelle eine Frage dazu.`;
  }
  if (names.length > 1) {
    return `Ich sehe, du hast ${names.join(", ")} ausgewählt. Stelle eine Frage dazu.`;
  }
  return "Wähle zuerst ein Produkt mit Produktinformation aus.";
}

const PRODUCT_ASSISTANT_INTRO =
  "Hallo! Ich kann dir Fragen zu den ausgewählten Produkten beantworten. Worüber möchtest du sprechen?";

function buildLocalizedProductAssistantIntro(activeProductInfo, selectedItems, translate) {
  const names = selectedItems
    .map((item) => formatProductAssistantDisplayName(item, translate))
    .filter(Boolean);

  if (activeProductInfo?.title) {
    return translate("configurator.productAssistantIntroOpened", "You're now viewing {label}. Ask a question about its product information.", {
      label: activeProductInfo.title,
    });
  }

  if (names.length === 1) {
    return translate("configurator.productAssistantIntroSelectedOne", "You've selected {label}. Ask a question about its product information.", {
      label: names[0],
    });
  }

  if (names.length > 1) {
    return translate("configurator.productAssistantIntroSelectedMany", "You've selected {labels}. Ask a question about their product information.", {
      labels: names.join(", "),
    });
  }

  return translate("configurator.productAssistantIntroChooseDocumented", "Choose a product with product information first.");
}

function buildAssistantCatalogItems(kitchenConfig, kitchenSlug) {
  const itemsById = new Map();
  const visibleComponents = kitchenConfig.components.filter((item) => {
    const componentId = componentIdForItem(item);
    return !isHiddenLinkedComponent(kitchenSlug, componentId);
  });

  for (const item of visibleComponents) {
    const displayItem = getCatalogDisplayItem(kitchenConfig.components, kitchenSlug, item)?.item;
    const itemId = getProductAssistantIdentityKey(displayItem);
    if (!hasAssistantProductInfo(displayItem) || itemsById.has(itemId)) continue;
    itemsById.set(itemId, displayItem);
  }

  for (const item of [...kitchenConfig.accessories, ...kitchenConfig.services]) {
    const itemId = getProductAssistantIdentityKey(item);
    if (!hasAssistantProductInfo(item) || itemsById.has(itemId)) continue;
    itemsById.set(itemId, item);
  }

  return Array.from(itemsById.values());
}

function getProductAssistantIdentityKey(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  if (code === "LIGHT-B-LED-001" || code === "LIGHT-C-LED-001" || code === "ACC-LIGHT-003") {
    return "model:KA220043_S3";
  }

  return item?.productInfoItemId || item?.id || code;
}

function uniqueProductAssistantItems(items) {
  const itemsByKey = new Map();
  for (const item of items) {
    const key = getProductAssistantIdentityKey(item);
    if (!key || itemsByKey.has(key)) continue;
    itemsByKey.set(key, item);
  }
  return Array.from(itemsByKey.values());
}

function isWorktopSelectionItem(item) {
  return String(item?.componentKey || "").trim().toLowerCase() === "worktop";
}

function isSinkSelectionItem(item) {
  const code = String(item?.code || "").trim().toUpperCase();
  const componentKey = String(item?.componentKey || "").trim().toLowerCase();
  const name = String(item?.name || item?.nameSnapshot || "").trim().toLowerCase();
  return componentKey === "sink-faucet" || code.startsWith("SINK-") || name.includes("sink and waste system");
}

function getSelectedDisplayCount(defaultSelectedComponents, confirmedSelectedComponents, optionalSelectedComponents, selectedAccessories, selectedServices) {
  const standardMergeAdjustment =
    defaultSelectedComponents.some(isWorktopSelectionItem) && defaultSelectedComponents.some(isSinkSelectionItem) ? 1 : 0;

  return (
    defaultSelectedComponents.length -
    standardMergeAdjustment +
    confirmedSelectedComponents.length +
    optionalSelectedComponents.length +
    selectedAccessories.length +
    selectedServices.length
  );
}

function formatProductAssistantOptionName(value, fallback = "") {
  const label = String(value || "").trim();
  if (!label) return fallback;

  return label
    .replace(/^(?=[A-Z0-9-]{5,}\s)(?=.*\d)[A-Z0-9-]+\s+/, "")
    .replace(/\s*\(\s*\d+\s*x\s*\d+(?:\s*x\s*\d+)?\s*mm\s*\)\s*$/i, "")
    .trim() || fallback;
}

function buildProductAssistantContextItem(item, overrides = {}) {
  return {
    name: overrides.name || formatProductAssistantDisplayName(item, (key, fallback) => fallback) || item.name || "",
    code: overrides.code || item.code || "",
    productInfoCode: overrides.productInfoCode || item.productInfoCode || item.code || "",
    productInfoSummary: overrides.productInfoSummary ?? item.productInfoSummary ?? "",
    productInfoKeyFacts: Array.isArray(overrides.productInfoKeyFacts)
      ? overrides.productInfoKeyFacts
      : (Array.isArray(item.productInfoKeyFacts) ? item.productInfoKeyFacts : []),
    productInfoExtractedText: overrides.productInfoExtractedText ?? item.productInfoExtractedText ?? "",
  };
}

function filterProductAssistantFactsByPattern(facts, pattern) {
  return (Array.isArray(facts) ? facts : []).filter((fact) => pattern.test(String(fact || "")));
}

function filterProductAssistantTextByPattern(text, pattern) {
  const lines = String(text || "").split(/\r?\n/);
  const selected = [];
  let inSelectionHints = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^auswahlhinweise:/i.test(trimmed)) {
      inSelectionHints = true;
      selected.push(trimmed);
      continue;
    }

    if (inSelectionHints) {
      if (trimmed.startsWith("-")) {
        selected.push(trimmed);
        continue;
      }
      inSelectionHints = false;
    }

    if (pattern.test(trimmed)) {
      selected.push(trimmed);
    }
  }

  return selected.join("\n");
}

function findProductAssistantLine(text, pattern) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => pattern.test(line)) || "";
}

function normalizeProductAssistantPublicBrand(value) {
  return String(value || "")
    .replace(/\bArchitecto\s*\/\s*AMICA\b/gi, "Architecto")
    .replace(/\bAMICA\b/gi, "Architecto");
}

function buildStructuredProductAssistantFacts(baseFacts, definitions) {
  const facts = [...baseFacts];

  for (const definition of definitions) {
    if (definition.when()) {
      facts.push(definition.fact);
    }
  }

  return [...new Set(facts.map((fact) => String(fact || "").trim()).filter(Boolean))];
}

function productAssistantSourceIncludes(item, pattern) {
  const factsText = Array.isArray(item?.productInfoKeyFacts) ? item.productInfoKeyFacts.join("\n") : "";
  return pattern.test(`${factsText}\n${item?.productInfoSummary || ""}\n${item?.productInfoExtractedText || ""}`);
}

function buildSplitProductAssistantOptions(item, itemId, translate) {
  const code = String(item?.code || "").trim().toUpperCase();
  if (!code.startsWith("OVEN-") || !code.includes("-HOB")) return [];

  const ovenPattern = /\b(backofen|oven)\b/i;
  const hobPattern = /\b(kochfeld|hob)\b/i;

  const ovenFacts = filterProductAssistantFactsByPattern(item.productInfoKeyFacts, ovenPattern);
  const hobFacts = filterProductAssistantFactsByPattern(item.productInfoKeyFacts, hobPattern);
  const ovenText = filterProductAssistantTextByPattern(item.productInfoExtractedText, ovenPattern);
  const hobText = filterProductAssistantTextByPattern(item.productInfoExtractedText, hobPattern);
  const productNameLine = findProductAssistantLine(item.productInfoExtractedText, /^produktname:/i);
  const ovenModelMatch = productNameLine.match(/(?:AMICA\s+)?(EBX\s*943\s*600\s*S)\s*(?:Backofen|Oven)?/i);
  const hobModelMatch = productNameLine.match(/(?:AMICA\s+)?(OL-KMI\s*754\s*000\s*E)\s*(?:Induktionskochfeld|Kochfeld|Hob)?/i);
  const ovenModel = ovenModelMatch ? `Architecto ${ovenModelMatch[1].replace(/\s+/g, " ").trim()}` : "";
  const hobModel = hobModelMatch ? `Architecto ${hobModelMatch[1].replace(/\s+/g, " ").trim()}` : "";
  const publicProductNameLine = normalizeProductAssistantPublicBrand(productNameLine);

  const options = [];

  if (ovenFacts.length || ovenText) {
    const ovenLabel = translate("configurator.productAssistantSplitOven", "Built-in oven");
    const structuredOvenFacts = buildStructuredProductAssistantFacts(ovenFacts, [
      {
        when: () => true,
        fact: `Model: ${ovenModel || "Architecto EBX 943 600 S"}`,
      },
      {
        when: () => productAssistantSourceIncludes(item, /\b77\s*l\b/i),
        fact: "Capacity: 77 l",
      },
      {
        when: () => productAssistantSourceIncludes(item, /\b9\s*(functions|funktionen)\b/i),
        fact: "Functions: 9",
      },
      {
        when: () => productAssistantSourceIncludes(item, /\benergieklasse\s*a\b/i),
        fact: "Energy class: A",
      },
      {
        when: () => productAssistantSourceIncludes(item, /\btimer\b/i),
        fact: "Timer: Yes",
      },
      {
        when: () => productAssistantSourceIncludes(item, /\bsteam\s*clean\b/i),
        fact: "Steam Clean: Yes",
      },
      {
        when: () => productAssistantSourceIncludes(item, /\bcooldoor3\b/i),
        fact: "CoolDoor3: Yes",
      },
    ]);
    options.push({
      key: `item-${itemId}-oven`,
      label: ovenLabel,
      shortLabel: ovenLabel,
      itemIds: [itemId],
      type: "item",
      contextItems: [
        buildProductAssistantContextItem(item, {
          name: ovenLabel,
          code: "",
          productInfoSummary: structuredOvenFacts.join(", "),
          productInfoKeyFacts: structuredOvenFacts,
          productInfoExtractedText: normalizeProductAssistantPublicBrand([publicProductNameLine, ovenText].filter(Boolean).join("\n")),
        }),
      ],
    });
  }

  if (hobFacts.length || hobText) {
    const hobLabel = translate("configurator.productAssistantSplitHob", "Cooktop");
    const structuredHobFacts = buildStructuredProductAssistantFacts(hobFacts, [
      {
        when: () => true,
        fact: `Model: ${hobModel || "Architecto OL-KMI 754 000 E"}`,
      },
      {
        when: () => productAssistantSourceIncludes(item, /\b4\s*(kochzonen|cooking zones|zones)\b/i),
        fact: "Cooking zones: 4",
      },
      {
        when: () => productAssistantSourceIncludes(item, /\b9\s*(leistungsstufen|power levels)\b/i),
        fact: "Power levels: 9",
      },
      {
        when: () => productAssistantSourceIncludes(item, /\bbooster\b/i),
        fact: "Booster: Yes",
      },
      {
        when: () => productAssistantSourceIncludes(item, /topferkennung|pot detection/i),
        fact: "Pot detection: Yes",
      },
      {
        when: () => productAssistantSourceIncludes(item, /kindersicherung|kinder?sicherung|child safety/i),
        fact: "Child safety lock: Yes",
      },
      {
        when: () => productAssistantSourceIncludes(item, /restwaermeanzeige|residual heat/i),
        fact: "Residual heat indicator: Yes",
      },
      {
        when: () => productAssistantSourceIncludes(item, /\btimer\b/i),
        fact: "Timer: Yes",
      },
    ]);
    options.push({
      key: `item-${itemId}-hob`,
      label: hobLabel,
      shortLabel: hobLabel,
      itemIds: [itemId],
      type: "item",
      contextItems: [
        buildProductAssistantContextItem(item, {
          name: hobLabel,
          code: "",
          productInfoSummary: structuredHobFacts.join(", "),
          productInfoKeyFacts: structuredHobFacts,
          productInfoExtractedText: normalizeProductAssistantPublicBrand([publicProductNameLine, hobText].filter(Boolean).join("\n")),
        }),
      ],
    });
  }

  return options;
}

function buildProductAssistantContextOptions(activeProductInfo, catalogItems, selectedItems, translate) {
  const itemsById = new Map();

  for (const item of catalogItems) {
    const itemId = getProductAssistantIdentityKey(item);
    if (!hasAssistantProductInfo(item) || itemsById.has(itemId)) continue;
    itemsById.set(itemId, item);
  }

  const items = Array.from(itemsById.values());
  if (!items.length) return [];

  const itemOptions = [];
  const selectableItemOptions = [];
  for (const item of items) {
    const itemId = getProductAssistantIdentityKey(item);
    const splitOptions = buildSplitProductAssistantOptions(item, itemId, translate);
    if (splitOptions.length) {
      itemOptions.push(...splitOptions);
      if (shouldShowProductAssistantLauncher(item)) {
        selectableItemOptions.push(...splitOptions);
      }
      continue;
    }

    const itemLabel = formatProductAssistantDisplayName(item, translate);
    const option = {
      key: `item-${itemId}`,
      label: itemLabel,
      shortLabel: itemLabel,
      itemIds: [itemId],
      type: "item",
      contextItems: [buildProductAssistantContextItem(item)],
    };
    itemOptions.push(option);
    if (shouldShowProductAssistantLauncher(item)) {
      selectableItemOptions.push(option);
    }
  }

  const options = [];
  const activeItemId = activeProductInfo?.productInfoItemId;
  const activeItemIdentityKey = activeProductInfo
    ? getProductAssistantIdentityKey({
        id: activeProductInfo.productInfoItemId,
        productInfoItemId: activeProductInfo.productInfoItemId,
        code: activeProductInfo.item?.code || activeProductInfo.code,
      })
    : "";
  options.push({
    key: "all-documented",
    label: translate("configurator.productAssistantAllProducts", "All products"),
    shortLabel: translate("configurator.productAssistantAllProducts", "All products"),
    itemIds: items.map((item) => item.productInfoItemId || item.id).filter(Boolean),
    contextItems: itemOptions.flatMap((option) => option.contextItems || []),
    type: "all",
  });

  if (activeItemIdentityKey && itemsById.has(activeItemIdentityKey) && shouldShowProductAssistantLauncher(itemsById.get(activeItemIdentityKey))) {
    const activeItem = itemsById.get(activeItemIdentityKey);
    const activeItemName =
      formatProductAssistantDisplayName(activeItem, translate)
      || formatProductAssistantOptionName(
        activeItem.productAssistantName || activeItem.name || activeProductInfo.title,
        translate("configurator.productAssistantCurrentProductFallback", "This product"),
      );
    options.push({
      key: `current-${activeItemIdentityKey}`,
      label: translate("configurator.productAssistantCurrentProduct", "This product: {name}", { name: activeItemName }),
      shortLabel: activeItemName,
      itemIds: [activeItem.productInfoItemId || activeItem.id].filter(Boolean),
      isHighlighted: true,
      type: "current",
    });
  }

  options.push(...selectableItemOptions);

  return options;
}

function findProductAssistantOptionForCatalogItem(options, item) {
  const itemId = item?.productInfoItemId || item?.id;
  if (!itemId || !Array.isArray(options)) return null;

  const exact = options.find((option) => option.type === "item" && option.key === `item-${itemId}`);
  if (exact) return exact;

  const splitOptions = options.filter(
    (option) => option.type === "item" && typeof option.key === "string" && option.key.startsWith(`item-${itemId}-`),
  );
  return splitOptions[0] || null;
}

function getDefaultProductAssistantContext(options) {
  return (
    options.find((option) => option.type === "all")
    || options.find((option) => option.type === "current")
    || options.find((option) => option.type === "item")
    || options[0]
    || null
  );
}

function normalizeQuestionToken(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, "");
}

function answerFromProductInfoText(question, text) {
  const stopWords = new Set(["der", "die", "das", "ist", "sind", "und", "oder", "zum", "zur", "mit", "was", "wie", "welche", "welcher", "welches", "bitte"]);
  const questionTokens = String(question || "")
    .split(/\s+/)
    .map(normalizeQuestionToken)
    .filter((token) => token.length >= 3 && !stopWords.has(token));
  if (!questionTokens.length) return "";

  const asksForName = questionTokens.some((token) =>
    ["name", "produktname", "productname", "modell", "model"].includes(token),
  );
  if (asksForName) {
    const productNameLine = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^(produktname|product name|modell|model):/i.test(line));

    if (productNameLine) {
      return productNameLine.replace(/^(produktname|product name|modell|model):\s*/i, "");
    }
  }

  const sentences = String(text || "")
    .replace(/\r?\n-/g, ". ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim().replace(/^\.\s*/, ""))
    .filter(Boolean);

  const bestSentence = sentences.find((sentence) => {
    const normalizedSentence = normalizeQuestionToken(sentence);
    return questionTokens.some((token) => normalizedSentence.includes(token));
  });

  return bestSentence || "Diese Information konnte ich in der Produktinformation nicht finden.";
}

function initialItemCodesByType(initialOrder, itemType) {
  return new Set(
    (initialOrder?.items || [])
      .filter((item) => item.itemType === itemType)
      .map((item) => item.code)
      .filter(Boolean),
  );
}

function lockedItemCodesByType(initialOrder, itemType) {
  return new Set(
    (initialOrder?.items || [])
      .filter((item) => item.itemType === itemType && item.locked)
      .map((item) => item.code)
      .filter(Boolean),
  );
}

function buildInitialOrderItemLookup(initialOrder) {
  const lookup = new Map();
  (initialOrder?.items || []).forEach((item) => {
    const itemType = String(item?.itemType || "").trim();
    const code = String(item?.code || "").trim();
    if (!itemType || !code) return;
    lookup.set(`${itemType}:${code}`, item);
  });
  return lookup;
}

function mergeInitialOrderItemFields(item, itemType, initialOrderItemLookup) {
  const initialItem = initialOrderItemLookup.get(`${itemType}:${item.code}`);
  if (!initialItem) return item;

  return {
    ...item,
    // Included catalog packages use the current catalog identity. Historical
    // order snapshots still identify paid items and their selected variants.
    articleNumber: item.isLocked
      ? item.articleNumber
      : initialItem.articleNumber || item.articleNumber,
    blendeCode: initialItem.blendeCode || item.blendeCode,
    blendeLabel: initialItem.blendeLabel || item.blendeLabel,
    blendeName: initialItem.blendeName || item.blendeName,
    blendeNameDe: initialItem.blendeNameDe || item.blendeNameDe,
    blendePrice: initialItem.blendePrice ?? item.blendePrice,
    sourceOrderId: initialItem.sourceOrderId || item.sourceOrderId,
    sourceOrderNumber: initialItem.sourceOrderNumber || item.sourceOrderNumber,
  };
}

function expandLinkedComponentIds(kitchenSlug, componentIds) {
  return [
    ...new Set(
      componentIds.flatMap((componentId) => getLinkedComponentIds(kitchenSlug, componentId)),
    ),
  ];
}

function buildInitialComponentIds(kitchenConfig, lockedComponentIds, initialOrder, kitchenSlug) {
  const componentCodes = initialItemCodesByType(initialOrder, "component");
  const existingComponentIds = kitchenConfig.components
    .filter((item) => componentCodes.has(item.code))
    .map((item) => componentIdForItem(item));

  return expandLinkedComponentIds(kitchenSlug, [...lockedComponentIds, ...existingComponentIds]);
}

function buildInitialCodes(kitchenConfig, initialOrder, itemType, configKey) {
  const itemCodes = initialItemCodesByType(initialOrder, itemType);
  return kitchenConfig[configKey].filter((item) => itemCodes.has(item.code)).map((item) => item.code);
}

function buildInitialArticleVariants(kitchenConfig, initialOrder) {
  const variants = {};
  for (const initialItem of initialOrder?.items || []) {
    if (initialItem.itemType !== "component") continue;
    const item = kitchenConfig.components.find((candidate) => candidate.code === initialItem.code);
    if (!item) continue;
    const selectedOption = findAuszugVariantOption(item, initialItem.articleNumber);
    if (selectedOption?.key === "yes") {
      variants[componentIdForItem(item)] = selectedOption.articleNumber;
    }
  }
  return variants;
}

function buildOrderLockedComponentIds(kitchenConfig, initialOrder, kitchenSlug) {
  const componentCodes = lockedItemCodesByType(initialOrder, "component");
  const componentIds = kitchenConfig.components
    .filter((item) => componentCodes.has(item.code))
    .map((item) => componentIdForItem(item));

  return expandLinkedComponentIds(kitchenSlug, componentIds);
}

function buildDefaultLockedComponentIds(kitchenSlug, kitchenConfig) {
  const normalizedSlug = String(kitchenSlug || "").trim().toLowerCase();
  const componentKeys = DEFAULT_LOCKED_COMPONENT_KEYS_BY_SLUG[normalizedSlug] || [];

  const availableComponentIds = new Set(kitchenConfig.components.map((item) => componentIdForItem(item)));
  const lockedIds = componentKeys
    .map((componentKey) => componentIdForKey(componentKey))
    .filter((componentId) => availableComponentIds.has(componentId));

  // Older hosted Burger records used a generated component key for the sink
  // item. Resolve that item by its stable supplier code/name as a fallback.
  if (normalizedSlug === "burger-103898") {
    kitchenConfig.components.forEach((item) => {
      const code = String(item?.code || "").trim().toUpperCase();
      const name = String(item?.name || "").trim().toLowerCase();
      if (code.startsWith("SINK-BASE") || name === "sink lower cabinet") {
        lockedIds.push(componentIdForItem(item));
      }
    });
  }

  return [...new Set(lockedIds)];
}

function buildDefaultLockedPlanComponentIds(kitchenSlug) {
  const componentKeys = DEFAULT_LOCKED_PLAN_COMPONENT_KEYS_BY_SLUG[String(kitchenSlug || "").trim().toLowerCase()] || [];
  return componentKeys.map((componentKey) => componentIdForKey(componentKey));
}

function buildDefaultLockedAccessoryCodes(kitchenSlug, kitchenConfig) {
  const accessoryCodes = DEFAULT_LOCKED_ACCESSORY_CODES_BY_SLUG[String(kitchenSlug || "").trim().toLowerCase()] || [];
  if (!accessoryCodes.length) return [];

  const availableAccessoryCodes = new Set(kitchenConfig.accessories.map((item) => item.code).filter(Boolean));
  return accessoryCodes.filter((code) => availableAccessoryCodes.has(code));
}

function buildConfiguratorDraftStorageKey(kitchenSlug, contractNumber) {
  const normalizedSlug = String(kitchenSlug || "").trim().toLowerCase();
  const draftRevision = CONFIGURATOR_DRAFT_REVISION_BY_SLUG[normalizedSlug] || "default";
  return `fragmento-configurator-draft:${normalizedSlug}:${draftRevision}:${String(contractNumber || "").trim().toUpperCase() || "guest"}`;
}

function readConfiguratorDraft(storageKey) {
  if (typeof window === "undefined" || !storageKey) return null;

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      selectedComponentIds: Array.isArray(parsed.selectedComponentIds) ? parsed.selectedComponentIds : [],
      selectedArticleVariants: parsed.selectedArticleVariants && typeof parsed.selectedArticleVariants === "object"
        ? parsed.selectedArticleVariants
        : {},
      selectedAccessoryCodes: Array.isArray(parsed.selectedAccessoryCodes) ? parsed.selectedAccessoryCodes : [],
      selectedServiceCodes: Array.isArray(parsed.selectedServiceCodes) ? parsed.selectedServiceCodes : [],
      cutleryLines: Array.isArray(parsed.cutleryLines) ? parsed.cutleryLines : [],
      acknowledgedBlendeComponentIds: Array.isArray(parsed.acknowledgedBlendeComponentIds)
        ? parsed.acknowledgedBlendeComponentIds
        : [],
    };
  } catch {
    return null;
  }
}

function writeConfiguratorDraft(storageKey, draft) {
  if (typeof window === "undefined" || !storageKey) return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Ignore storage write failures so the configurator remains usable.
  }
}

function clearConfiguratorDraft(storageKey) {
  if (typeof window === "undefined" || !storageKey) return;

  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore storage clear failures so the configurator remains usable.
  }
}

function filterRegularAccessoryCodes(accessoryCodes = [], accessories = []) {
  const cutleryCodes = new Set(
    accessories.filter((item) => isCutleryAccessoryItem(item)).map((item) => item.code).filter(Boolean),
  );

  return accessoryCodes.filter((code) => !cutleryCodes.has(code) && !isCutleryAccessoryCode(code));
}

function buildInitialSelectionState(kitchenConfig, fixedComponentIds, fixedAccessoryCodes, initialOrder, draft, kitchenSlug) {
  const baseComponentIds = buildInitialComponentIds(kitchenConfig, fixedComponentIds, initialOrder, kitchenSlug);
  const baseArticleVariants = buildInitialArticleVariants(kitchenConfig, initialOrder);
  const baseAccessoryCodes = filterRegularAccessoryCodes(
    [...new Set([...fixedAccessoryCodes, ...buildInitialCodes(kitchenConfig, initialOrder, "accessory", "accessories")])],
    kitchenConfig.accessories,
  );
  const baseServiceCodes = buildInitialCodes(kitchenConfig, initialOrder, "service", "services");
  const cutleryLines = buildInitialCutleryLines({
    initialOrder,
    draft,
    accessoryCodes: [...new Set([...fixedAccessoryCodes, ...buildInitialCodes(kitchenConfig, initialOrder, "accessory", "accessories")])],
  });

  if (!draft) {
    return {
      selectedComponentIds: baseComponentIds,
      selectedArticleVariants: baseArticleVariants,
      selectedAccessoryCodes: baseAccessoryCodes,
      selectedServiceCodes: baseServiceCodes,
      cutleryLines,
      acknowledgedBlendeComponentIds: [],
    };
  }

  const validComponentIds = new Set(kitchenConfig.components.map((item) => componentIdForItem(item)));
  const validAccessoryCodes = new Set(
    filterRegularAccessoryCodes(
      kitchenConfig.accessories.map((item) => item.code).filter(Boolean),
      kitchenConfig.accessories,
    ),
  );
  const validServiceCodes = new Set(kitchenConfig.services.map((item) => item.code).filter(Boolean));

  const selectedComponentIds = expandLinkedComponentIds(
    kitchenSlug,
    [
      ...fixedComponentIds,
      ...baseComponentIds,
      ...draft.selectedComponentIds.filter((itemId) => validComponentIds.has(itemId)),
    ],
  );

  const acknowledgedFromDraft = (draft.acknowledgedBlendeComponentIds || []).filter((itemId) =>
    validComponentIds.has(itemId),
  );
  const acknowledgedFromSelection = kitchenConfig.components
    .filter((item) => {
      const componentId = componentIdForItem(item);
      return selectedComponentIds.includes(componentId) && itemRequiresBlendeConfirmation(item);
    })
    .map((item) => componentIdForItem(item));

  return {
    selectedComponentIds,
    selectedArticleVariants: Object.fromEntries(
      Object.entries({ ...baseArticleVariants, ...(draft.selectedArticleVariants || {}) }).filter(([componentId, articleNumber]) => {
        if (!validComponentIds.has(componentId)) return false;
        const item = kitchenConfig.components.find((candidate) => componentIdForItem(candidate) === componentId);
        return Boolean(item && findAuszugVariantOption(item, articleNumber)?.key === "yes");
      }),
    ),
    selectedAccessoryCodes: [
      ...new Set([
        ...fixedAccessoryCodes,
        ...baseAccessoryCodes,
        ...filterRegularAccessoryCodes(draft.selectedAccessoryCodes, kitchenConfig.accessories).filter((code) => validAccessoryCodes.has(code)),
      ]),
    ],
    selectedServiceCodes: [
      ...new Set([
        ...baseServiceCodes,
        ...draft.selectedServiceCodes.filter((code) => validServiceCodes.has(code)),
      ]),
    ],
    cutleryLines: buildInitialCutleryLines({
      initialOrder,
      draft,
      accessoryCodes: draft.selectedAccessoryCodes,
    }),
    acknowledgedBlendeComponentIds: [...new Set([...acknowledgedFromDraft, ...acknowledgedFromSelection])],
  };
}

export default function KitchenConfigurator({ initialLanguage = "de", ...props }) {
  return (
    <PublicI18nProvider initialLanguage={initialLanguage}>
      <KitchenConfiguratorContent {...props} />
    </PublicI18nProvider>
  );
}

function KitchenConfiguratorContent({
  kitchenConfig,
  svgMarkup,
  initialContractNumber = "",
  initialOrder = null,
  initialContractAddress = null,
  deliveryMinOrderSettings = null,
  deliveryLeadTimeDays = 0,
}) {
  const { translate, language } = usePublicI18n();
  const orderSectionRef = useRef(null);
  const kitchenSlug = String(kitchenConfig.kitchen.slug || "").trim().toLowerCase();
  const planViewport = PLAN_VIEWPORT_BY_SLUG[kitchenConfig.kitchen.slug];
  const lockedComponentIds = useMemo(
    () => {
      const lockedIds = [
        ...(kitchenConfig.lockedBaseColors || []),
        ...kitchenConfig.components
          .filter((item) => item.isLocked)
          .map((item) => (item.componentKey ? item.componentKey : normalizeColor(item.colorKey))),
      ].map((value) => componentIdForKey(value));

      // A locked commercial article can span multiple drawn faces (for example
      // AB 109873 SP120). Every linked face must use the same fixed blue state.
      return expandLinkedComponentIds(kitchenSlug, lockedIds);
    },
    [kitchenConfig, kitchenSlug],
  );
  const defaultLockedComponentIds = useMemo(
    () => buildDefaultLockedComponentIds(kitchenSlug, kitchenConfig),
    [kitchenConfig, kitchenSlug],
  );
  const defaultLockedPlanComponentIds = useMemo(
    () => buildDefaultLockedPlanComponentIds(kitchenSlug),
    [kitchenSlug],
  );
  const orderLockedComponentIds = useMemo(
    () => buildOrderLockedComponentIds(kitchenConfig, initialOrder, kitchenSlug),
    [kitchenConfig, initialOrder, kitchenSlug],
  );
  const fixedComponentIds = useMemo(
    () => [
      ...new Set([
        ...lockedComponentIds,
        ...defaultLockedComponentIds,
        ...defaultLockedPlanComponentIds,
        ...orderLockedComponentIds,
      ]),
    ],
    [defaultLockedComponentIds, defaultLockedPlanComponentIds, lockedComponentIds, orderLockedComponentIds],
  );
  const planLockedComponentIds = useMemo(
    () => [
      ...new Set([
        ...lockedComponentIds,
        ...defaultLockedComponentIds,
        ...defaultLockedPlanComponentIds,
      ]),
    ],
    [defaultLockedComponentIds, defaultLockedPlanComponentIds, lockedComponentIds],
  );
  const draftStorageKey = useMemo(
    () => buildConfiguratorDraftStorageKey(kitchenSlug, initialContractNumber),
    [initialContractNumber, kitchenSlug],
  );
  const initialOrderItemLookup = useMemo(
    () => buildInitialOrderItemLookup(initialOrder),
    [initialOrder],
  );
  const orderLockedAccessoryCodes = useMemo(
    () => lockedItemCodesByType(initialOrder, "accessory"),
    [initialOrder],
  );
  const defaultLockedAccessoryCodes = useMemo(
    () => new Set(buildDefaultLockedAccessoryCodes(kitchenSlug, kitchenConfig)),
    [kitchenConfig, kitchenSlug],
  );
  const fixedAccessoryCodes = useMemo(
    () => new Set([...defaultLockedAccessoryCodes, ...orderLockedAccessoryCodes]),
    [defaultLockedAccessoryCodes, orderLockedAccessoryCodes],
  );
  const orderLockedServiceCodes = useMemo(
    () => lockedItemCodesByType(initialOrder, "service"),
    [initialOrder],
  );
  const initialSelection = useMemo(
    () => buildInitialSelectionState(kitchenConfig, fixedComponentIds, fixedAccessoryCodes, initialOrder, null, kitchenSlug),
    [fixedAccessoryCodes, fixedComponentIds, initialOrder, kitchenConfig, kitchenSlug],
  );

  const [selectedComponentIds, setSelectedComponentIds] = useState(initialSelection.selectedComponentIds);
  const [selectedArticleVariants, setSelectedArticleVariants] = useState(initialSelection.selectedArticleVariants);
  const [selectedAccessoryCodes, setSelectedAccessoryCodes] = useState(initialSelection.selectedAccessoryCodes);
  const [selectedServiceCodes, setSelectedServiceCodes] = useState(initialSelection.selectedServiceCodes);
  const [cutleryLines, setCutleryLines] = useState(initialSelection.cutleryLines);
  const [acknowledgedBlendeComponentIds, setAcknowledgedBlendeComponentIds] = useState(
    () => initialSelection.acknowledgedBlendeComponentIds || [],
  );
  const [pendingBlendeConfirmation, setPendingBlendeConfirmation] = useState(null);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState("idle");
  const [savedOrderNumber, setSavedOrderNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderSectionOpen, setIsOrderSectionOpen] = useState(false);
  useEffect(() => {
    trackJourneyStep(isOrderSectionOpen ? "order_form" : "kitchen", { contractNumber: initialContractNumber });
  }, [isOrderSectionOpen, initialContractNumber]);
  const [activeProductInfo, setActiveProductInfo] = useState(null);
  const [activeProductPhotos, setActiveProductPhotos] = useState(null);
  const [isProductAssistantOpen, setIsProductAssistantOpen] = useState(false);
  const [isProductAssistantLauncherDismissed, setIsProductAssistantLauncherDismissed] = useState(false);
  const [productAssistantLauncherDragX, setProductAssistantLauncherDragX] = useState(0);
  const [productAssistantLauncherDragY, setProductAssistantLauncherDragY] = useState(0);
  const [productAssistantMessages, setProductAssistantMessages] = useState([]);
  const [selectedProductAssistantContext, setSelectedProductAssistantContext] = useState(null);
  const [productInfoQuestion, setProductInfoQuestion] = useState("");
  const [productInfoIsLoading, setProductInfoIsLoading] = useState(false);
  const [productInfoError, setProductInfoError] = useState("");
  const [isProductAssistantVoiceSupported, setIsProductAssistantVoiceSupported] = useState(false);
  const [isProductAssistantListening, setIsProductAssistantListening] = useState(false);
  const [productAssistantVoiceError, setProductAssistantVoiceError] = useState("");
  const productAssistantSkipOptionsResetRef = useRef(false);
  const productAssistantRecognitionRef = useRef(null);
  const productAssistantAudioRef = useRef(null);
  const productAssistantTtsAbortControllerRef = useRef(null);
  const productAssistantLastVoiceSubmitRef = useRef({ text: "", submittedAt: 0 });
  const productAssistantLauncherSwipeRef = useRef(null);
  const suppressProductAssistantLauncherClickRef = useRef(false);
  const autoLinkedLedWasSelectedRef = useRef(null);
  const [customer, setCustomer] = useState(() =>
    buildInitialCustomerState(initialOrder, initialContractNumber, initialContractAddress),
  );
  const [useContractAddressForOrder, setUseContractAddressForOrder] = useState(() =>
    buildInitialAddressPreference(initialOrder, initialContractNumber, initialContractAddress),
  );
  const [addressVerification, setAddressVerification] = useState(() =>
    buildAddressVerificationState(),
  );
  const addressSnapshot = useMemo(() => buildAddressVerificationSnapshot(customer), [customer]);
  const addressSnapshotKey = useMemo(
    () => addressVerificationSnapshotKey(addressSnapshot),
    [addressSnapshot],
  );

  useEffect(() => {
    if (initialOrder) {
      const nextCustomer = buildInitialCustomerFromOrder(initialOrder, initialContractNumber);
      const draft = readConfiguratorDraft(draftStorageKey);
      const nextSelection = buildInitialSelectionState(kitchenConfig, fixedComponentIds, fixedAccessoryCodes, initialOrder, draft, kitchenSlug);
      setCustomer(nextCustomer);
      setUseContractAddressForOrder(customerUsesContractAddress(nextCustomer, initialContractAddress));
      setAddressVerification(buildAddressVerificationState());
      setSelectedComponentIds(nextSelection.selectedComponentIds);
      setSelectedArticleVariants(nextSelection.selectedArticleVariants);
      setSelectedAccessoryCodes(nextSelection.selectedAccessoryCodes);
      setSelectedServiceCodes(nextSelection.selectedServiceCodes);
      setCutleryLines(nextSelection.cutleryLines);
      setAcknowledgedBlendeComponentIds(nextSelection.acknowledgedBlendeComponentIds || []);
      setPendingBlendeConfirmation(null);
      return;
    }

    if (initialContractAddress) {
      const draft = readConfiguratorDraft(draftStorageKey);
      const nextSelection = buildInitialSelectionState(kitchenConfig, fixedComponentIds, fixedAccessoryCodes, initialOrder, draft, kitchenSlug);
      setCustomer((current) => ({
        ...current,
        ...buildCustomerAddressFromContract(initialContractAddress),
        contractNumber: initialContractNumber,
      }));
      setUseContractAddressForOrder(true);
      setAddressVerification(buildAddressVerificationState());
      setSelectedComponentIds(nextSelection.selectedComponentIds);
      setSelectedArticleVariants(nextSelection.selectedArticleVariants);
      setSelectedAccessoryCodes(nextSelection.selectedAccessoryCodes);
      setSelectedServiceCodes(nextSelection.selectedServiceCodes);
      setCutleryLines(nextSelection.cutleryLines);
      setAcknowledgedBlendeComponentIds(nextSelection.acknowledgedBlendeComponentIds || []);
      setPendingBlendeConfirmation(null);
      return;
    }

    if (!initialContractNumber) return;
    const draft = readConfiguratorDraft(draftStorageKey);
    const nextSelection = buildInitialSelectionState(kitchenConfig, fixedComponentIds, fixedAccessoryCodes, initialOrder, draft, kitchenSlug);
    setCustomer((current) => {
      if (current.contractNumber === initialContractNumber) return current;
      return { ...current, contractNumber: initialContractNumber };
    });
    setUseContractAddressForOrder(false);
    setAddressVerification(buildAddressVerificationState());
    setSelectedComponentIds(nextSelection.selectedComponentIds);
    setSelectedArticleVariants(nextSelection.selectedArticleVariants);
    setSelectedAccessoryCodes(nextSelection.selectedAccessoryCodes);
    setSelectedServiceCodes(nextSelection.selectedServiceCodes);
    setCutleryLines(nextSelection.cutleryLines);
    setAcknowledgedBlendeComponentIds(nextSelection.acknowledgedBlendeComponentIds || []);
    setPendingBlendeConfirmation(null);
  }, [draftStorageKey, fixedAccessoryCodes, fixedComponentIds, initialContractAddress, initialContractNumber, initialOrder, kitchenConfig, kitchenSlug]);

  useEffect(() => {
    if (!pendingBlendeConfirmation) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingBlendeConfirmation(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingBlendeConfirmation]);

  useEffect(() => {
    const autoLinkedAccessoryCodes = getAutoLinkedAccessoryCodes(kitchenSlug, selectedComponentIds);
    const shouldSelectLed = autoLinkedAccessoryCodes.includes("ACC-LIGHT-003");
    const wasSelected = autoLinkedLedWasSelectedRef.current;

    if (shouldSelectLed && wasSelected !== true) {
      setSelectedAccessoryCodes((current) => (
        current.includes("ACC-LIGHT-003") ? current : [...current, "ACC-LIGHT-003"]
      ));
    } else if (!shouldSelectLed && wasSelected === true) {
      setSelectedAccessoryCodes((current) => current.filter((code) => code !== "ACC-LIGHT-003"));
    }
    autoLinkedLedWasSelectedRef.current = shouldSelectLed;
  }, [kitchenSlug, selectedComponentIds]);

  useEffect(() => {
    const verifiedSnapshotKey = addressVerification?.verification?.snapshot
      ? addressVerificationSnapshotKey(addressVerification.verification.snapshot)
      : "";

    if (!verifiedSnapshotKey) return;
    if (verifiedSnapshotKey === addressSnapshotKey) return;

    setAddressVerification(buildAddressVerificationState());
  }, [addressSnapshotKey, addressVerification]);

  useEffect(() => {
    if (!activeProductInfo) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveProductInfo(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeProductInfo]);

  useEffect(() => {
    if (!isProductAssistantOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeProductAssistant();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isProductAssistantOpen]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsProductAssistantVoiceSupported(Boolean(SpeechRecognition && window.speechSynthesis));

    const stopProductAssistantVoice = () => {
      productAssistantRecognitionRef.current?.abort?.();
      stopProductAssistantSpeech();
    };

    window.addEventListener("beforeunload", stopProductAssistantVoice);
    window.addEventListener("pagehide", stopProductAssistantVoice);

    return () => {
      stopProductAssistantVoice();
      window.removeEventListener("beforeunload", stopProductAssistantVoice);
      window.removeEventListener("pagehide", stopProductAssistantVoice);
    };
  }, []);

  const selectedComponents = kitchenConfig.components
    .filter((item) => selectedComponentIds.includes(componentIdForItem(item)))
    .map((item) => {
      const componentId = componentIdForItem(item);
      const variantItem = applyArticleVariantSelectionForDisplay(item, selectedArticleVariants[componentId]);
      const mergedItem = mergeInitialOrderItemFields(variantItem, "component", initialOrderItemLookup);
      return {
        ...mergedItem,
        isLocked: item.isLocked || defaultLockedComponentIds.includes(componentId),
        isOrderLocked: orderLockedComponentIds.includes(componentId),
      };
    });
  const cutleryBaseItem = useMemo(
    () => getCutleryBaseItem(kitchenConfig.accessories),
    [kitchenConfig.accessories],
  );
  const cutleryVariants = useMemo(
    () => getAvailableCutleryVariantsForComponents(
      kitchenConfig.components.filter((item) => selectedComponentIds.includes(componentIdForItem(item))),
      kitchenConfig.cutleryVariants || [],
    ),
    [kitchenConfig.components, kitchenConfig.cutleryVariants, selectedComponentIds],
  );
  useEffect(() => {
    setCutleryLines((current) => {
      const next = normalizeCutleryLines(current, cutleryVariants);
      if (
        next.length === current.length &&
        next.every((line, index) =>
          line.articleNumber === current[index]?.articleNumber &&
          line.quantity === current[index]?.quantity
        )
      ) {
        return current;
      }
      return next;
    });
  }, [cutleryVariants]);
  const selectedAccessories = [
    ...selectedMap(kitchenConfig.accessories, selectedAccessoryCodes)
      .filter((item) => !isCutleryAccessoryItem(item))
      .map((item) => ({
        ...mergeInitialOrderItemFields(item, "accessory", initialOrderItemLookup),
        isLocked: item.isLocked || defaultLockedAccessoryCodes.has(item.code),
        isOrderLocked: orderLockedAccessoryCodes.has(item.code),
      })),
    ...buildCutleryLineItems(cutleryBaseItem, cutleryLines, translate, language, cutleryVariants).map((item) => ({
      ...item,
      isLocked: false,
      isOrderLocked: orderLockedAccessoryCodes.has(item.code),
    })),
  ];
  const selectedServices = selectedMap(kitchenConfig.services, selectedServiceCodes).map((item) => ({
    ...mergeInitialOrderItemFields(item, "service", initialOrderItemLookup),
    isOrderLocked: orderLockedServiceCodes.has(item.code),
  }));
  const selectedProductCount = selectedComponents.length + selectedAccessories.length + selectedServices.length;
  const selectedProductInfoItems = uniqueProductAssistantItems(
    [...selectedComponents, ...selectedAccessories, ...selectedServices].filter(hasAssistantProductInfo),
  );
  const assistantCatalogItems = useMemo(
    () => buildAssistantCatalogItems(kitchenConfig, kitchenSlug),
    [kitchenConfig, kitchenSlug],
  );
  const hasAnySelectedProducts = selectedProductCount > 0;
  const hasAnyAssistantProducts = assistantCatalogItems.length > 0;
  const productAssistantContextOptions = buildProductAssistantContextOptions(
    activeProductInfo,
    assistantCatalogItems,
    selectedProductInfoItems,
    translate,
  );
  const hasProductAssistantOptions = productAssistantContextOptions.length > 0;
  const productAssistantEmptyIntro = translate("configurator.productAssistantIntro", "Hi. I can answer questions about the available products and their documentation. What would you like to know?");
  const productAssistantPickerIntro = hasAnySelectedProducts
    ? buildLocalizedProductAssistantIntro(activeProductInfo, selectedProductInfoItems, translate)
    : productAssistantEmptyIntro;
  const productAssistantSuggestedContext = getDefaultProductAssistantContext(productAssistantContextOptions);
  const productAssistantOptionsKey = productAssistantContextOptions
    .map((option) => `${option.key}:${option.itemIds.join(",")}`)
    .join("|");
  const selectedProductInfoNames = selectedProductInfoItems.map((item) => item.productAssistantName || item.name).filter(Boolean);
  const selectedProductInfoNotes = selectedProductInfoItems.flatMap((item) =>
    extractProductInfoBullets(item.productInfoExtractedText, "Auswahlhinweise", 2).map((note) => ({
      key: `${item.code}-${note}`,
      text: `${item.name}: ${note}`,
    })),
  );
  const defaultSelectedComponents = selectedComponents.filter((item) => item.isLocked);
  const confirmedSelectedComponents = selectedComponents.filter((item) => !item.isLocked && item.isOrderLocked);
  const optionalSelectedComponents = selectedComponents.filter((item) => !item.isLocked && !item.isOrderLocked);
  const selectedDisplayCount = getSelectedDisplayCount(
    defaultSelectedComponents,
    confirmedSelectedComponents,
    optionalSelectedComponents,
    selectedAccessories,
    selectedServices,
  );
  const fixedComponentIdsKey = [kitchenSlug, ...fixedComponentIds].join("|");
  const visibleComponents = kitchenConfig.components.filter((item) => {
    const componentId = componentIdForItem(item);
    return !fixedComponentIds.includes(componentId) && !isHiddenLinkedComponent(kitchenSlug, componentId);
  });
  const serviceEligibility = useMemo(
    () =>
      getServiceEligibility({
        selectedComponents,
        selectedAccessories,
      }),
    [selectedAccessories, selectedComponents],
  );
  useEffect(() => {
    if (hasProductAssistantOptions || hasAnyAssistantProducts) return;

    setProductAssistantMessages([]);
    setSelectedProductAssistantContext(null);
    setProductInfoQuestion("");
    setProductInfoError("");
    setProductInfoIsLoading(false);
    closeProductAssistant();
  }, [hasAnyAssistantProducts, hasProductAssistantOptions]);

  useEffect(() => {
    if (!isProductAssistantOpen) {
      productAssistantSkipOptionsResetRef.current = false;
      return;
    }

    if (productAssistantSkipOptionsResetRef.current) {
      productAssistantSkipOptionsResetRef.current = false;
      return;
    }

    if (hasProductAssistantOptions) {
      resetProductAssistantContext(getDefaultProductAssistantContext(productAssistantContextOptions));
      return;
    }

    resetProductAssistantContext();
  }, [isProductAssistantOpen, productAssistantOptionsKey, hasProductAssistantOptions]);
  const grandTotal = [...selectedComponents, ...selectedAccessories, ...selectedServices].reduce(
    (sum, item) => sum + getOrderItemEffectivePrice(item),
    0,
  );
  const deliveryMinAmount = deliveryMinOrderSettings?.amount ?? 1000;
  const deliveryMinEligible =
    !deliveryMinOrderSettings?.enabled || grandTotal >= deliveryMinAmount;

  useEffect(() => {
    setSelectedComponentIds((current) => {
      const next = expandLinkedComponentIds(kitchenSlug, [...fixedComponentIds, ...current]);
      if (next.length === current.length && next.every((item, index) => item === current[index])) {
        return current;
      }
      return next;
    });
  }, [fixedComponentIds, fixedComponentIdsKey]);

  useEffect(() => {
    const selectedSet = new Set(selectedComponentIds);
    setSelectedArticleVariants((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([componentId]) => selectedSet.has(componentId)),
      );
      if (Object.keys(next).length === Object.keys(current).length) {
        return current;
      }
      return next;
    });
  }, [selectedComponentIds]);

  useEffect(() => {
    setSelectedAccessoryCodes((current) => {
      const next = [...new Set([...fixedAccessoryCodes, ...current])].filter(
        (code) => !isCutleryAccessoryCode(code),
      );
      if (next.length === current.length && next.every((item, index) => item === current[index])) {
        return current;
      }
      return next;
    });
  }, [fixedAccessoryCodes]);

  useEffect(() => {
    if (
      (!serviceEligibility.montageEligible || !deliveryMinEligible) &&
      selectedServiceCodes.includes(SERVICE_CODE_MONTAGE)
    ) {
      setSelectedServiceCodes((current) => current.filter((code) => code !== SERVICE_CODE_MONTAGE));
    }
    if (
      !serviceEligibility.pickupEligible &&
      selectedServiceCodes.includes(SERVICE_CODE_PICKUP)
    ) {
      setSelectedServiceCodes((current) => current.filter((code) => code !== SERVICE_CODE_PICKUP));
    }
  }, [selectedServiceCodes, serviceEligibility, deliveryMinEligible]);

  useEffect(() => {
    writeConfiguratorDraft(draftStorageKey, {
      selectedComponentIds,
      selectedArticleVariants,
      selectedAccessoryCodes,
      selectedServiceCodes,
      cutleryLines,
      acknowledgedBlendeComponentIds,
    });
  }, [
    acknowledgedBlendeComponentIds,
    cutleryLines,
    draftStorageKey,
    selectedAccessoryCodes,
    selectedArticleVariants,
    selectedComponentIds,
    selectedServiceCodes,
  ]);

  function toggleAccessory(itemCode) {
    trackJourneyStep("products");
    const accessoryItem = kitchenConfig.accessories.find((item) => item.code === itemCode);
    if (isCutleryAccessoryItem(accessoryItem)) return;
    if (fixedAccessoryCodes.has(itemCode)) return;
    setSelectedAccessoryCodes((current) =>
      current.includes(itemCode) ? current.filter((code) => code !== itemCode) : [...current, itemCode],
    );
  }

  function toggleCutleryVariant(articleNumber) {
    trackJourneyStep("products");
    if (orderLockedAccessoryCodes.has(cutleryBaseItem?.code)) return;

    const normalizedArticleNumber = String(articleNumber || "").trim().toUpperCase();
    setCutleryLines((current) => {
      const exists = current.some((line) => line.articleNumber === normalizedArticleNumber);
      if (exists) {
        return current.filter((line) => line.articleNumber !== normalizedArticleNumber);
      }
      return normalizeCutleryLines([...current, { articleNumber: normalizedArticleNumber, quantity: 1 }], cutleryVariants);
    });
    setStatus("");
    setStatusTone("idle");
  }

  function updateCutleryLineQuantity(articleNumber, quantity) {
    trackJourneyStep("products");
    if (orderLockedAccessoryCodes.has(cutleryBaseItem?.code)) return;

    const normalizedArticleNumber = String(articleNumber || "").trim().toUpperCase();
    const nextQuantity = normalizeCutleryQuantity(quantity);
    setCutleryLines((current) =>
      normalizeCutleryLines(
        current.map((line) =>
          line.articleNumber === normalizedArticleNumber ? { ...line, quantity: nextQuantity } : line,
        ),
        cutleryVariants,
      ),
    );
  }

  function toggleService(itemCode) {
    trackJourneyStep("products");
    if (orderLockedServiceCodes.has(itemCode)) return;
    if (itemCode === SERVICE_CODE_MONTAGE && !serviceEligibility.montageEligible) {
      setStatus(translate("configurator.servicePickupError", "Pickup can only be added once at least one item has been selected."));
      setStatusTone("error");
      return;
    }
    if (itemCode === SERVICE_CODE_MONTAGE && !deliveryMinEligible) {
      setStatus(
        translate(
          "configurator.serviceDeliveryMinError",
          `Delivery, Carry-in, Assembly and Installation requires a minimum order value of €${deliveryMinAmount}.`,
          { amount: deliveryMinAmount },
        ),
      );
      setStatusTone("error");
      return;
    }

    if (itemCode === SERVICE_CODE_PICKUP && !serviceEligibility.pickupEligible) {
      setStatus(translate("configurator.servicePickupError", "Pickup can only be added once at least one item has been selected."));
      setStatusTone("error");
      return;
    }

    setStatus("");
    setStatusTone("idle");

    setSelectedServiceCodes((current) => {
      const exists = current.includes(itemCode);
      if (exists) return current.filter((code) => code !== itemCode);
      if (itemCode === SERVICE_CODE_MONTAGE) {
        return [...current.filter((code) => code !== SERVICE_CODE_PICKUP), itemCode];
      }
      if (itemCode === SERVICE_CODE_PICKUP) {
        return [...current.filter((code) => code !== SERVICE_CODE_MONTAGE), itemCode];
      }
      return [...current, itemCode];
    });
  }

  function updateCustomer(field, value) {
    setCustomer((current) => ({ ...current, [field]: value }));

    if (ADDRESS_VERIFICATION_FIELD_KEYS.has(field)) {
      setAddressVerification((current) => {
        const verifiedSnapshotKey = current?.verification?.snapshot
          ? addressVerificationSnapshotKey(current.verification.snapshot)
          : "";

        if (
          !verifiedSnapshotKey
          && current.status === ADDRESS_VERIFICATION_STATUS.IDLE
          && !current.message
          && !current.suggestion
          && !current.verification
        ) {
          return current;
        }

        if (!verifiedSnapshotKey || verifiedSnapshotKey === addressSnapshotKey) {
          return buildAddressVerificationState();
        }

        return current;
      });
    }
  }

  function useContractAddress() {
    if (!initialContractAddress) return;

    setCustomer((current) => ({
      ...current,
      ...buildCustomerAddressFromContract(initialContractAddress),
    }));
    setUseContractAddressForOrder(true);
    setAddressVerification(buildAddressVerificationState());
  }

  function editOrderAddress() {
    setUseContractAddressForOrder(false);
  }

  function selectArticleVariant(componentId, articleNumber) {
    trackJourneyStep("products");
    const item = kitchenConfig.components.find((candidate) => componentIdForItem(candidate) === componentId);
    const selectedOption = findAuszugVariantOption(item, articleNumber);
    if (!item || !selectedOption) return;

    setSelectedArticleVariants((current) => {
      const next = { ...current };
      if (selectedOption.key === "yes") {
        next[componentId] = selectedOption.articleNumber;
      } else {
        delete next[componentId];
      }
      return next;
    });

    setSelectedComponentIds((current) => {
      if (current.includes(componentId)) return current;
      const currentSet = new Set(current);
      getLinkedComponentIds(kitchenSlug, componentId).forEach((linkedId) => {
        currentSet.add(linkedId);
      });
      return [...currentSet];
    });
  }

  function applyComponentToggle(componentId) {
    trackJourneyStep("products");
    setSelectedComponentIds((current) =>
      toggleLinkedComponentSelection(kitchenSlug, current, componentId, fixedComponentIds),
    );
  }

  function getBlendeItemsForComponent(componentId) {
    return getLinkedComponentIds(kitchenSlug, componentId)
      .map((linkedId) => kitchenConfig.components.find((item) => componentIdForItem(item) === linkedId))
      .map((item) => (item ? applyArticleVariantSelectionForDisplay(item, "") : item))
      .filter((item) => item && itemRequiresBlendeConfirmation(item, language));
  }

  function toggleComponentSelection(componentId) {
    trackJourneyStep("products");
    if (fixedComponentIds.includes(componentId)) return;

    if (isLinkedComponentSelected(kitchenSlug, selectedComponentIds, componentId)) {
      applyComponentToggle(componentId);
      return;
    }

    const blendeItems = getBlendeItemsForComponent(componentId);
    const needsConfirmation = blendeItems.some((item) => {
      const id = componentIdForItem(item);
      return !acknowledgedBlendeComponentIds.includes(id);
    });

    if (!needsConfirmation) {
      applyComponentToggle(componentId);
      return;
    }

    const primaryBlendeItem = blendeItems.find((item) => {
      const id = componentIdForItem(item);
      return !acknowledgedBlendeComponentIds.includes(id);
    }) || blendeItems[0];
    const displaySource = primaryBlendeItem
      || kitchenConfig.components.find((item) => componentIdForItem(item) === componentId);
    const displayItem = displaySource
      ? getCatalogDisplayItem(kitchenConfig.components, kitchenSlug, displaySource).item
      : null;
    const blendeTotal = getItemBlendeTotal(primaryBlendeItem || displaySource);
    const itemTotal = Number((primaryBlendeItem || displaySource)?.price || 0);
    const cabinetTotal = getItemPriceWithoutBlende(primaryBlendeItem || displaySource);

    setPendingBlendeConfirmation({
      componentId,
      itemName: displayItem
        ? getLocalizedItemName(displayItem, translate, language, false)
        : getLocalizedItemName(displaySource, translate, language, false),
      blendeLabel: getLocalizedBlendeDisplayLabel(primaryBlendeItem || displaySource, language),
      blendeCode: String((primaryBlendeItem || displaySource)?.blendeCode || "").trim(),
      blendeTotal,
      cabinetTotal,
      itemTotal,
      acknowledgeIds: blendeItems.map((item) => componentIdForItem(item)),
    });
  }

  function cancelBlendeConfirmation() {
    setPendingBlendeConfirmation(null);
  }

  function confirmBlendeConfirmation() {
    if (!pendingBlendeConfirmation) return;
    const { componentId, acknowledgeIds } = pendingBlendeConfirmation;
    setAcknowledgedBlendeComponentIds((current) => [...new Set([...current, ...acknowledgeIds])]);
    setPendingBlendeConfirmation(null);
    applyComponentToggle(componentId);
  }

  function removeComponent(item) {
    const componentId = componentIdForItem(item);
    if (fixedComponentIds.includes(componentId)) {
      return;
    }
    applyComponentToggle(componentId);
  }

  function removeAccessory(item) {
    trackJourneyStep("products");
    if (item.isLocked || item.isOrderLocked) return;
    if (item.isCutleryLine && item.selectionKey) {
      const line = cutleryLines.find((entry) => entry.id === item.selectionKey);
      if (line) {
        toggleCutleryVariant(line.articleNumber);
      }
      return;
    }
    setSelectedAccessoryCodes((current) => current.filter((code) => code !== item.code));
  }

  function removeService(item) {
    trackJourneyStep("products");
    if (item.isOrderLocked) return;
    setSelectedServiceCodes((current) => current.filter((code) => code !== item.code));
  }

  function resetSelection() {
    trackJourneyStep("products");
    setSelectedAccessoryCodes([...fixedAccessoryCodes].filter((code) => {
      const accessoryItem = kitchenConfig.accessories.find((item) => item.code === code);
      return !isCutleryAccessoryItem(accessoryItem);
    }));
    setCutleryLines([]);
    setSelectedServiceCodes([...orderLockedServiceCodes]);
    setSelectedComponentIds(fixedComponentIds);
    setSelectedArticleVariants({});
    setAcknowledgedBlendeComponentIds([]);
    setPendingBlendeConfirmation(null);
    setStatus("");
    setStatusTone("idle");
  }

  function openOrderSection() {
    setIsOrderSectionOpen(true);
    window.requestAnimationFrame(() => {
      orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openProductInfo(payload) {
    const nextState = buildProductInfoState(payload, translate, language);
    if (!nextState) return;
    setActiveProductInfo(nextState);
  }

  function selectProductInfoDocument(href) {
    setActiveProductInfo((current) => {
      if (!current || !href) return current;
      return {
        ...current,
        activeProductInfoDocumentHref: href,
      };
    });
  }

  function openProductPhotos(payload) {
    const images = Array.isArray(payload?.images) ? payload.images.filter(Boolean) : [];
    if (!images.length) return;
    setActiveProductPhotos({
      title: payload.title || translate("configurator.productPhotosTitle", "Product photos"),
      images,
      index: 0,
    });
  }

  function showProductPhoto(direction) {
    setActiveProductPhotos((current) => {
      if (!current?.images?.length) return current;
      const length = current.images.length;
      return {
        ...current,
        index: (current.index + direction + length) % length,
      };
    });
  }

  function resetProductAssistantContext(option = null) {
    productAssistantRecognitionRef.current?.abort?.();
    stopProductAssistantSpeech();
    setSelectedProductAssistantContext(option);
    setProductAssistantMessages(
      option
        ? [
          {
            role: "assistant",
            text: option.type === "all"
              ? translate(
                "configurator.productAssistantContextConfirmedAll",
                "You're now viewing all selected products. Ask a question about their product information.",
              )
              : translate("configurator.productAssistantContextConfirmed", "You're asking about {label}. Ask a question about its product information.", {
                label: option.shortLabel,
              }),
          },
        ]
        : [],
    );
    setProductInfoQuestion("");
    setProductInfoError("");
    setProductAssistantVoiceError("");
    setIsProductAssistantListening(false);
    setProductInfoIsLoading(false);
  }

  function selectProductAssistantContext(option) {
    resetProductAssistantContext(option);
  }

  function stopProductAssistantSpeech() {
    stopAssistantSpeech(productAssistantAudioRef, productAssistantTtsAbortControllerRef);
  }

  function closeProductAssistant() {
    productAssistantRecognitionRef.current?.abort?.();
    stopProductAssistantSpeech();
    setIsProductAssistantListening(false);
    setIsProductAssistantOpen(false);
  }

  function returnToProductAssistantPicker() {
    resetProductAssistantContext(productAssistantSuggestedContext);
  }

  function openProductAssistant() {
    if (!hasAnyAssistantProducts) return;
    setIsProductAssistantLauncherDismissed(false);
    productAssistantSkipOptionsResetRef.current = true;
    if (hasProductAssistantOptions) {
      resetProductAssistantContext(productAssistantSuggestedContext);
    } else {
      resetProductAssistantContext();
    }
    setIsProductAssistantOpen(true);
  }

  function openProductAssistantForCatalogItem(catalogItem) {
    if (!hasAnyAssistantProducts || !shouldShowProductAssistantLauncher(catalogItem)) return;
    setIsProductAssistantLauncherDismissed(false);
    if (!hasProductAssistantOptions) {
      openProductAssistant();
      return;
    }
    const option = findProductAssistantOptionForCatalogItem(productAssistantContextOptions, catalogItem);
    if (!option) return;
    productAssistantSkipOptionsResetRef.current = true;
    resetProductAssistantContext(option);
    setIsProductAssistantOpen(true);
  }

  function startProductAssistantLauncherSwipe(event) {
    if (isProductAssistantOpen) return;
    productAssistantLauncherSwipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    suppressProductAssistantLauncherClickRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveProductAssistantLauncherSwipe(event) {
    const swipe = productAssistantLauncherSwipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      suppressProductAssistantLauncherClickRef.current = true;
    }
    setProductAssistantLauncherDragX(Math.max(0, deltaX));
    setProductAssistantLauncherDragY(Math.max(0, deltaY));
  }

  function finishProductAssistantLauncherSwipe(event) {
    const swipe = productAssistantLauncherSwipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    productAssistantLauncherSwipeRef.current = null;
    setProductAssistantLauncherDragX(0);
    setProductAssistantLauncherDragY(0);
    const swipedRight = deltaX >= 70 && Math.abs(deltaX) > Math.abs(deltaY);
    const swipedDown = deltaY >= 70 && Math.abs(deltaY) >= Math.abs(deltaX);
    if (swipedRight || swipedDown) {
      suppressProductAssistantLauncherClickRef.current = true;
      closeProductAssistant();
      setIsProductAssistantLauncherDismissed(true);
    }
  }

  function getProductAssistantSpeechLanguage() {
    return language === "de" ? "de-DE" : "en-US";
  }

  function formatProductAssistantSpokenText(text) {
    const isGerman = language === "de";
    return String(text || "")
      .replace(/^\s*[-*]\s+/gm, ". ")
      .replace(/\n\s*(?=[A-Z\u00c4\u00d6\u00dc][^\n:]{2,40}\n)/g, ". ")
      .replace(/\((?:[^)]*\b[A-Z]{2,}[-\s]?[A-Z0-9]{2,}[^)]*|\b[A-Z0-9]{3,}[-\s]?[A-Z0-9]{2,}[^)]*)\)/g, "")
      .replace(/\b[A-Z]{2,}[-\s]?[A-Z0-9]{3,}(?:[-\s]?[A-Z0-9]{1,})*\b/g, "")
      .replace(/\b[A-Z]-[A-Z0-9]{4,}\b/g, "")
      .replace(/\bH\s*[\u00d7x]\s*B\s*[\u00d7x]\s*T\b/gi, isGerman ? "Höhe, Breite, Tiefe" : "height, width, depth")
      .replace(/\bB\s*[\u00d7x]\s*T\b/gi, isGerman ? "Breite, Tiefe" : "width, depth")
      .replace(/([0-9]+(?:[,.][0-9]+)?)\s*[\u2013-]\s*([0-9]+(?:[,.][0-9]+)?)/g, `$1 ${isGerman ? "bis" : "to"} $2`)
      .replace(/([0-9]+(?:[,.][0-9]+)?)\s*[\u00d7x]\s*([0-9]+(?:[,.][0-9]+)?)\s*[\u00d7x]\s*([0-9]+(?:[,.][0-9]+)?)/g, `$1 ${isGerman ? "mal" : "by"} $2 ${isGerman ? "mal" : "by"} $3`)
      .replace(/([0-9]+(?:[,.][0-9]+)?)\s*[\u00d7x]\s*([0-9]+(?:[,.][0-9]+)?)/g, `$1 ${isGerman ? "mal" : "by"} $2`)
      .replace(/\bmm\b/gi, isGerman ? "Millimeter" : "millimeters")
      .replace(/\bdB\(A\)\b/g, isGerman ? "Dezibel A" : "decibels A")
      .replace(/\bdB\b/g, isGerman ? "Dezibel" : "decibels")
      .replace(/\u2014|\u2013/g, ", ")
      .replace(/\n+/g, ". ")
      .replace(/:\s*/g, ". ")
      .replace(/;\s*/g, ". ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\.{2,}/g, ".")
      .replace(/\.\s*\./g, ".")
      .trim();
  }

  function speakProductAssistantAnswer(text) {
    const answer = formatProductAssistantSpokenText(text);
    if (!answer) return;
    const hasTechnicalList = /\d+\s*(?:mal|by|bis|to)\s*\d+/i.test(answer)
      || /\b(?:millimeters?|millimeter|dezibel|decibels?|dB)\b/i.test(answer)
      || /\b(?:appliance dimensions|installation dimensions|cut-out dimensions|gerätemaße|einbaumaße|ausschnittmaße)\b/i.test(answer);

    speakAssistantTextWithTts(answer, {
      audioRef: productAssistantAudioRef,
      abortControllerRef: productAssistantTtsAbortControllerRef,
      language: getProductAssistantSpeechLanguage(),
      fallbackRate: 0.88,
      chunkLongText: true,
      ttsSpeed: hasTechnicalList ? 0.78 : 0.98,
    });
  }

  async function submitProductInfoQuestion(rawQuestion, options = {}) {
    const question = String(rawQuestion || "").trim();
    if (!question || productInfoIsLoading) return;
    if (!selectedProductAssistantContext?.itemIds?.length) return;

    const itemIds = [...new Set(selectedProductAssistantContext.itemIds)].slice(0, 10);

    setProductInfoIsLoading(true);
    setProductInfoError("");
    setProductInfoQuestion("");
    setProductAssistantMessages((current) => [...current, { role: "user", text: question }]);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 26000);

    try {
      const response = await fetch("/api/product-info/ask", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          question,
          contractNumber: customer.contractNumber || initialContractNumber,
          kitchenSlug,
          itemIds: [...new Set(itemIds)].slice(0, 10),
          conversationMessages: productAssistantMessages
            .filter((message) => message?.role && message?.text)
            .slice(-6)
            .map((message) => ({ role: message.role, text: message.text })),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || translate("configurator.productAssistantErrorUnavailable", "The product question could not be answered."));
      }

      const answer = payload.answer || translate("configurator.productAssistantNoInfo", "Product information will be available soon.");
      setProductAssistantMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: answer,
        },
      ]);
      if (options.speakAnswer) {
        speakProductAssistantAnswer(answer);
      }
    } catch (error) {
      const nextError =
        error?.name === "AbortError"
          ? translate("configurator.productAssistantErrorTimeout", "The response is taking longer than expected. Please try again.")
          : error instanceof Error
            ? error.message
            : translate("configurator.productAssistantErrorUnavailable", "The product question could not be answered.");
      setProductInfoError(nextError);
      setProductAssistantMessages((current) => [...current, { role: "assistant", text: nextError, tone: "error" }]);
    } finally {
      window.clearTimeout(timeout);
      setProductInfoIsLoading(false);
    }
  }

  async function handleProductInfoQuestionSubmit(event) {
    event.preventDefault();
    if (isProductAssistantListening) {
      productAssistantRecognitionRef.current?.stop?.();
      return;
    }
    const question = productInfoQuestion.trim();
    const lastVoiceSubmit = productAssistantLastVoiceSubmitRef.current;
    if (
      question
      && lastVoiceSubmit.text === question
      && Date.now() - lastVoiceSubmit.submittedAt < 4000
    ) {
      setProductInfoQuestion("");
      return;
    }
    await submitProductInfoQuestion(productInfoQuestion);
  }

  function toggleProductAssistantVoice() {
    if (isProductAssistantListening) {
      productAssistantRecognitionRef.current?.stop?.();
      setIsProductAssistantListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !window.speechSynthesis) {
      setProductAssistantVoiceError(
        translate("configurator.productAssistantVoiceUnsupported", "Voice chat is not available in your browser."),
      );
      return;
    }

    if (!selectedProductAssistantContext || productInfoIsLoading || !hasProductAssistantOptions) return;

    stopProductAssistantSpeech();
    const recognition = new SpeechRecognition();
    productAssistantRecognitionRef.current = recognition;
    recognition.lang = getProductAssistantSpeechLanguage();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setProductAssistantVoiceError("");
      setIsProductAssistantListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      let isFinal = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) {
          isFinal = true;
        }
      }

      const nextQuestion = transcript.trim();
      if (!nextQuestion) return;
      setProductInfoQuestion(nextQuestion);
      if (isFinal) {
        recognition.stop();
        productAssistantLastVoiceSubmitRef.current = { text: nextQuestion, submittedAt: Date.now() };
        setProductInfoQuestion("");
        submitProductInfoQuestion(nextQuestion, { speakAnswer: true });
      }
    };

    recognition.onerror = (event) => {
      const message =
        event?.error === "not-allowed"
          ? translate("configurator.productAssistantVoicePermission", "Please allow microphone access to use voice chat.")
          : translate("configurator.productAssistantVoiceError", "Voice input could not start. Please try again.");
      setProductAssistantVoiceError(message);
      setIsProductAssistantListening(false);
    };

    recognition.onend = () => {
      setIsProductAssistantListening(false);
    };

    recognition.start();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!grandTotal) {
      setStatus(translate("configurator.statusSelectItem", "Select at least one item first."));
      setStatusTone("error");
      return;
    }

    if (!customer.consent) {
      setStatus(translate("configurator.statusConfirmConsent", "Please confirm that you have read the privacy policy."));
      setStatusTone("error");
      return;
    }

    if (!customer.termsConsent) {
      setStatus(translate("configurator.statusConfirmTerms", "Please confirm that you have read and agree to the terms and conditions."));
      setStatusTone("error");
      return;
    }

    setIsSubmitting(true);
    setStatus(translate("configurator.statusSavingOrder", "Saving order..."));
    setStatusTone("idle");

    try {
      const { blobToBase64, generateOrderPdf } = await import("./kitchen-order-pdf");
      const paymentMethod = customer.paymentMethod || "card";
      const pdfOrderComponents = selectedComponents.map(buildOrderSubmissionItem);
      const pdfOrderAccessories = selectedAccessories.map(buildOrderSubmissionItem);
      const pdfOrderServices = selectedServices.map(buildOrderSubmissionItem);
      const pdfOrder = {
        orderNumber: new Date().toISOString().slice(0, 19).replace(/[-:T]/g, ""),
        createdAt: new Date().toLocaleString(language === "de" ? "de-DE" : "en-GB"),
        customer: {
          contractNumber: customer.contractNumber,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address1: customer.address1,
          address2: customer.address2,
          postalCode: customer.postalCode,
          city: customer.city,
          country: customer.country,
          preferredDeliveryDate: customer.preferredDeliveryDate,
          notes: customer.notes,
          paymentMethod,
        },
        components: pdfOrderComponents,
        accessories: pdfOrderAccessories,
        services: pdfOrderServices,
        total: grandTotal,
      };
      const pdf = await generateOrderPdf(pdfOrder);
      const pdfBase64 = await blobToBase64(pdf.blob);

      ensureJourneySession("FRG");
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kitchen_slug: kitchenConfig.kitchen.slug,
          order_payload: {
            customer: {
              contractNumber: customer.contractNumber,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              address1: customer.address1,
              address2: customer.address2,
              postalCode: customer.postalCode,
              city: customer.city,
              country: customer.country,
              preferredDeliveryDate: customer.preferredDeliveryDate,
              notes: customer.notes,
              paymentMethod,
              consent: customer.consent,
              termsConsent: customer.termsConsent,
            },
            addressVerification: addressVerification.verification,
            components: pdfOrderComponents,
            accessories: pdfOrderAccessories,
            services: pdfOrderServices,
          },
          pdf_base64: pdfBase64,
          pdf_filename: pdf.filename,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(translate("configurator.statusSaveFailed", "The order could not be saved."));
      }

      const emailIssue = payload.notifications?.emailError;
      const webhookIssue = payload.notifications?.webhookError;
      setSavedOrderNumber(payload.orderNumber || "");

      if (payload.checkoutUrl) {
        setStatus(translate(
          "configurator.statusRedirectingToPayment",
          "Redirecting to secure payment. After payment, please wait until Stripe sends you back to Fragmento.",
        ));
        clearConfiguratorDraft(draftStorageKey);
        window.location.assign(payload.checkoutUrl);
        return;
      }

      if (emailIssue || webhookIssue) {
        const notes = [emailIssue ? `E-Mail: ${emailIssue}` : "", webhookIssue ? `Webhook: ${webhookIssue}` : ""]
          .filter(Boolean)
          .join(" | ");
        setStatus(translate("configurator.statusSavedWithIssues", "Order number: {orderNumber}. Your order has been saved. Note: {notes}", {
          orderNumber: payload.orderNumber,
          notes,
        }));
      } else {
        setStatus(translate("configurator.statusSavedSuccess", "Order number: {orderNumber}. Your order has been saved.", {
          orderNumber: payload.orderNumber,
        }));
      }
      clearConfiguratorDraft(draftStorageKey);
      setStatusTone("success");
    } catch (error) {
      setStatus(error.message || translate("configurator.statusSaveFailed", "The order could not be saved."));
      setStatusTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const planSelectedComponentIds = selectedAccessoryCodes.includes("ACC-LIGHT-003")
    ? [...new Set([...selectedComponentIds, "component-under-cabinet-light"])]
    : selectedComponentIds;
  const { stage: planStageNode, legend: planLegendNode } = useKitchenSvgStage({
    svgMarkup,
    kitchenConfig,
    kitchenSlug,
    planViewport,
    fixedComponentIds,
    planLockedComponentIds,
    selectedComponentIds: planSelectedComponentIds,
    setSelectedComponentIds,
    onToggleComponent: toggleComponentSelection,
    onResetSelection: resetSelection,
  });

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topNav} aria-label="Page navigation">
          <div className={styles.topNavControls}>
            <Link href="/" className={styles.backLink}>
              {translate("common.back", "Back")}
            </Link>
            <PublicLanguageSwitcher />
          </div>
        </nav>
        <header className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.logoMark}>
              <img src="/img/fragmentologo.png" alt="Fragmento" />
            </span>
            <div className={styles.brandText}>
              <h1>{translate("configurator.headerTitle", "Customize your kitchen")}</h1>
            </div>
          </div>
          <div className={styles.pricePill}>
            <span>{translate("common.totalPrice", "Total price")}</span>
            <strong>{formatCurrency(grandTotal)}</strong>
          </div>
        </header>

        <section className={styles.contentGrid}>
          <div className={styles.planCatalogGroup}>
            <div className={styles.planColumn}>
              <div className={styles.planStickyPrice}>
                <span>{translate("common.totalPrice", "Total price")}</span>
                <strong>{formatCurrency(grandTotal)}</strong>
              </div>
              {planStageNode}
            </div>

            <div className={styles.planLegendColumn}>{planLegendNode}</div>

            <div className={styles.sideColumn}>
              <KitchenCatalogPanel
                kitchenConfig={kitchenConfig}
                kitchenSlug={kitchenSlug}
                visibleComponents={visibleComponents}
                selectedComponents={selectedComponents}
                selectedAccessories={selectedAccessories}
                selectedServices={selectedServices}
                selectedComponentIds={selectedComponentIds}
                selectedArticleVariants={selectedArticleVariants}
                selectedAccessoryCodes={selectedAccessoryCodes}
                selectedServiceCodes={selectedServiceCodes}
                selectedDisplayCount={selectedDisplayCount}
                orderLockedAccessoryCodes={fixedAccessoryCodes}
                orderLockedServiceCodes={orderLockedServiceCodes}
                onToggleComponent={toggleComponentSelection}
                onSelectArticleVariant={selectArticleVariant}
                onToggleAccessory={toggleAccessory}
                cutleryVariants={cutleryVariants}
                cutleryLines={cutleryLines}
                onToggleCutleryVariant={toggleCutleryVariant}
                onUpdateCutleryLineQuantity={updateCutleryLineQuantity}
                onToggleService={toggleService}
                onOpenProductInfo={openProductInfo}
                onOpenProductPhotos={openProductPhotos}
                onOpenProductAssistantFromItem={hasAnyAssistantProducts ? openProductAssistantForCatalogItem : undefined}
                serviceEligibility={serviceEligibility}
                deliveryMinEligible={deliveryMinEligible}
                deliveryMinAmount={deliveryMinAmount}
              />
            </div>
          </div>

          <div className={styles.summaryColumn}>
            <KitchenSelectionSummary
              kitchenSlug={kitchenSlug}
              selectedComponents={selectedComponents}
              selectedAccessories={selectedAccessories}
              selectedServices={selectedServices}
              defaultSelectedComponents={defaultSelectedComponents}
              confirmedSelectedComponents={confirmedSelectedComponents}
              optionalSelectedComponents={optionalSelectedComponents}
              grandTotal={grandTotal}
              onRemoveComponent={removeComponent}
              onRemoveAccessory={removeAccessory}
              onRemoveService={removeService}
              onOpenOrderSection={openOrderSection}
              onOpenProductInfo={openProductInfo}
            />
          </div>
        </section>

        {isOrderSectionOpen ? (
          <KitchenOrderForm
            orderSectionRef={orderSectionRef}
            customer={customer}
            contractAddress={initialContractAddress}
            isUsingContractAddress={useContractAddressForOrder}
            isSubmitting={isSubmitting}
            status={status}
            statusTone={statusTone}
            savedOrderNumber={savedOrderNumber}
            deliveryLeadTimeDays={deliveryLeadTimeDays}
            onSubmit={handleSubmit}
            onUpdateCustomer={updateCustomer}
            onToggleUseContractAddress={(nextChecked) => {
              if (nextChecked) {
                useContractAddress();
                return;
              }
              editOrderAddress();
            }}
          />
        ) : null}

        {pendingBlendeConfirmation ? (
          <div className={styles.blendeConfirmOverlay} role="presentation">
            <div
              className={styles.blendeConfirmDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="blende-confirm-title"
            >
              <div className={styles.blendeConfirmHeader}>
                <h2 id="blende-confirm-title">
                  {translate("configurator.blendeConfirmTitle", "Filler strip required")}
                </h2>
                <button
                  type="button"
                  className={styles.productInfoClose}
                  aria-label={translate("configurator.blendeConfirmCloseAria", "Close filler strip confirmation")}
                  onClick={cancelBlendeConfirmation}
                >
                  {translate("common.close", "Close")}
                </button>
              </div>

              <div className={styles.blendeConfirmBody}>
                <p className={styles.blendeConfirmLead}>
                  {translate(
                    "configurator.blendeConfirmLead",
                    "Attention: a filler strip is required for this cabinet. It is charged in addition to the cabinet price.",
                  )}
                </p>
                <p className={styles.blendeConfirmItemName}>{pendingBlendeConfirmation.itemName}</p>
                <div className={styles.blendeConfirmDetails}>
                  <div className={styles.blendeConfirmRow}>
                    <span>{translate("configurator.blendeConfirmCabinetPrice", "Cabinet")}</span>
                    <strong>{formatCurrency(pendingBlendeConfirmation.cabinetTotal)}</strong>
                  </div>
                  <div className={styles.blendeConfirmRow}>
                    <span>
                      {translate("configurator.blendeConfirmFillerPrice", "Filler strip")}
                      {pendingBlendeConfirmation.blendeLabel
                        ? `: ${pendingBlendeConfirmation.blendeLabel}`
                        : ""}
                    </span>
                    <strong>{formatCurrency(pendingBlendeConfirmation.blendeTotal)}</strong>
                  </div>
                  <div className={`${styles.blendeConfirmRow} ${styles.blendeConfirmTotalRow}`}>
                    <span>{translate("configurator.blendeConfirmTotal", "Total for this item")}</span>
                    <strong>{formatCurrency(pendingBlendeConfirmation.itemTotal)}</strong>
                  </div>
                </div>
                <p className={styles.blendeConfirmAsk}>
                  {translate(
                    "configurator.blendeConfirmAsk",
                    "Please confirm that you would like to add the filler strip.",
                  )}
                </p>
              </div>

              <div className={styles.blendeConfirmActions}>
                <button
                  type="button"
                  className={styles.blendeConfirmCancel}
                  onClick={cancelBlendeConfirmation}
                >
                  {translate("configurator.blendeConfirmCancel", "Cancel")}
                </button>
                <button
                  type="button"
                  className={styles.blendeConfirmAdd}
                  onClick={confirmBlendeConfirmation}
                >
                  {translate("configurator.blendeConfirmAdd", "Confirm and add")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {activeProductInfo ? (
          <div
            className={styles.productInfoOverlay}
            role="presentation"
            onClick={() => setActiveProductInfo(null)}
          >
            <div
              className={styles.productInfoDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-info-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.productInfoHeader}>
                <h2 id="product-info-title">{activeProductInfo.title}</h2>
                <button
                  type="button"
                  className={styles.productInfoClose}
                  aria-label={translate("configurator.productInfoCloseAria", "Close product information")}
                  onClick={() => setActiveProductInfo(null)}
                >
                  {translate("common.close", "Close")}
                </button>
              </div>

              <div className={styles.productInfoContent}>
                <div className={styles.productInfoPdfColumn}>
                  {activeProductInfo.productInfoDocuments?.length > 1 ? (
                    <div className={styles.productInfoToolbar}>
                      <div className={styles.productInfoDocumentTabs}>
                        {activeProductInfo.productInfoDocuments.map((document) => {
                          const isActive = document.href === activeProductInfo.activeProductInfoDocumentHref;
                          return (
                            <button
                              key={document.href}
                              type="button"
                              className={isActive ? styles.productInfoDocumentTabActive : styles.productInfoDocumentTab}
                              onClick={() => selectProductInfoDocument(document.href)}
                            >
                              {document.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.productInfoViewer}>
                    <iframe
                      src={activeProductInfo.activeProductInfoDocumentHref || activeProductInfo.infoPdfHref}
                      title={translate("configurator.productInfoTitle", "Product information {title}", { title: activeProductInfo.title })}
                      className={styles.productInfoFrame}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeProductPhotos ? (
          <div
            className={styles.productPhotoOverlay}
            role="presentation"
            onClick={() => setActiveProductPhotos(null)}
          >
            <div
              className={styles.productPhotoDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-photo-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.productInfoHeader}>
                <h2 id="product-photo-title">{activeProductPhotos.title}</h2>
                <button
                  type="button"
                  className={styles.productInfoClose}
                  aria-label={translate("configurator.productPhotosCloseAria", "Close product photos")}
                  onClick={() => setActiveProductPhotos(null)}
                >
                  {translate("common.close", "Close")}
                </button>
              </div>
              <div className={styles.productPhotoStage}>
                <button
                  type="button"
                  className={styles.productPhotoNav}
                  aria-label={translate("configurator.previousPhoto", "Previous photo")}
                  onClick={() => showProductPhoto(-1)}
                >
                  {"<"}
                </button>
                <img
                  src={activeProductPhotos.images[activeProductPhotos.index]}
                  alt={activeProductPhotos.title}
                  className={styles.productPhotoImage}
                  decoding="async"
                />
                <button
                  type="button"
                  className={styles.productPhotoNav}
                  aria-label={translate("configurator.nextPhoto", "Next photo")}
                  onClick={() => showProductPhoto(1)}
                >
                  {">"}
                </button>
              </div>
              <div className={styles.productPhotoFooter}>
                {activeProductPhotos.index + 1} / {activeProductPhotos.images.length}
              </div>
            </div>
          </div>
        ) : null}

        {hasAnyAssistantProducts ? (
          <div
            className={[
              styles.productAssistantDock,
              isProductAssistantOpen ? styles.productAssistantDockOpen : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isProductAssistantOpen ? (
              <div
                className={styles.productAssistantPanel}
                role="dialog"
                aria-modal="false"
                aria-labelledby="product-assistant-title"
              >
                <div className={styles.productAssistantHeader}>
                  <div className={styles.productAssistantTitleWrap}>
                    <span className={styles.productAssistantHeaderAvatar} aria-hidden="true">
                      <img src="/img/Untitled%20design%20(5).png" alt="" />
                    </span>
                    <div className={styles.productAssistantTitleBlock}>
                      <h2 id="product-assistant-title">
                        {selectedProductAssistantContext && selectedProductAssistantContext.type !== "all"
                          ? translate("configurator.productAssistantItemAgentTitle", "Product assistant: {name}", {
                            name: selectedProductAssistantContext.shortLabel || selectedProductAssistantContext.label,
                          })
                          : translate("configurator.productAssistantTitle", "Product assistant")}
                      </h2>
                      {hasProductAssistantOptions ? (
                        <div className={styles.productAssistantSectionLabel}>
                          {translate("configurator.productAssistantContextTitle", "Choose a product")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.productAssistantHeaderActions}>
                    <button
                      type="button"
                      className={styles.productAssistantMinimize}
                      aria-label={translate("configurator.productAssistantCloseAria", "Close product assistant")}
                      onClick={closeProductAssistant}
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                </div>

                {hasProductAssistantOptions ? (
                  <div className={styles.productAssistantContextSection}>
                    <div className={styles.productAssistantContextOptions}>
                      {productAssistantContextOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          className={[
                            styles.productAssistantContextButton,
                            option.type === "all" ? styles.productAssistantContextButtonDefault : styles.productAssistantContextButtonSecondary,
                            selectedProductAssistantContext?.key === option.key ? styles.productAssistantContextButtonActive : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => selectProductAssistantContext(option)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className={styles.productAssistantMessages} aria-live="polite">
                  {!hasProductAssistantOptions ? (
                    <div className={`${styles.productAssistantMessage} ${styles.productAssistantMessageAssistant}`}>
                      <span>
                        {translate(
                          "configurator.productAssistantNoInfo",
                          "Product information will be available soon.",
                        )}
                      </span>
                    </div>
                  ) : null}
                  {!selectedProductAssistantContext && hasProductAssistantOptions ? (
                    <div className={`${styles.productAssistantMessage} ${styles.productAssistantMessageAssistant}`}>
                      <span>{productAssistantPickerIntro}</span>
                    </div>
                  ) : null}
                  {productAssistantMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}-${message.text}`}
                      className={[
                        styles.productAssistantMessage,
                        message.role === "user" ? styles.productAssistantMessageUser : styles.productAssistantMessageAssistant,
                        message.tone === "error" ? styles.productAssistantMessageError : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{message.text}</span>
                    </div>
                  ))}
                  {productInfoIsLoading ? (
                    <div className={`${styles.productAssistantMessage} ${styles.productAssistantMessageAssistant}`}>
                      <span>{translate("configurator.productAssistantLoading", "Loading answer...")}</span>
                    </div>
                  ) : null}
                </div>

                <form className={styles.productAssistantComposer} onSubmit={handleProductInfoQuestionSubmit}>
                  <input
                    value={productInfoQuestion}
                    onChange={(event) => setProductInfoQuestion(event.target.value)}
                    maxLength={500}
                    placeholder={translate("configurator.productAssistantPlaceholder", "Ask about this product...")}
                    disabled={!selectedProductAssistantContext || productInfoIsLoading || !hasProductAssistantOptions}
                  />
                  <button
                    type="button"
                    className={[
                      styles.productAssistantVoiceButton,
                      isProductAssistantListening ? styles.productAssistantVoiceButtonActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={
                      isProductAssistantListening
                        ? translate("configurator.productAssistantVoiceStop", "Stop listening")
                        : translate("configurator.productAssistantVoiceStart", "Start voice chat")
                    }
                    aria-pressed={isProductAssistantListening}
                    title={
                      isProductAssistantListening
                        ? translate("configurator.productAssistantVoiceListening", "Listening...")
                        : translate("configurator.productAssistantVoiceStart", "Start voice chat")
                    }
                    onClick={toggleProductAssistantVoice}
                    disabled={
                      !isProductAssistantVoiceSupported
                      || productInfoIsLoading
                      || !selectedProductAssistantContext
                      || !hasProductAssistantOptions
                    }
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M12 14.5a3 3 0 0 0 3-3v-5a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
                      <path d="M18.5 11.5a6.5 6.5 0 0 1-13 0" />
                      <path d="M12 18v3" />
                      <path d="M9 21h6" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !productInfoQuestion.trim()
                      || productInfoIsLoading
                      || isProductAssistantListening
                      || !selectedProductAssistantContext
                      || !hasProductAssistantOptions
                    }
                  >
                    {translate("configurator.productAssistantSend", "Send")}
                  </button>
                </form>
                {isProductAssistantListening || productAssistantVoiceError ? (
                  <div className={styles.productAssistantVoiceStatus} role={productAssistantVoiceError ? "alert" : "status"}>
                    {productAssistantVoiceError || translate("configurator.productAssistantVoiceListening", "Listening...")}
                  </div>
                ) : null}
              </div>
            ) : null}

            {isProductAssistantLauncherDismissed && !isProductAssistantOpen ? (
              <button
                type="button"
                className={styles.productAssistantRestore}
                onClick={() => setIsProductAssistantLauncherDismissed(false)}
                aria-label={translate("configurator.productAssistantRestore", "Show assistant")}
              >
                <span aria-hidden="true">?</span>
                {translate("configurator.productAssistantRestore", "Show assistant")}
              </button>
            ) : (
            <button
              type="button"
              className={styles.productAssistantLauncher}
              style={productAssistantLauncherDragX || productAssistantLauncherDragY
                ? { transform: `translate(${productAssistantLauncherDragX}px, ${productAssistantLauncherDragY}px)` }
                : undefined}
              aria-expanded={isProductAssistantOpen}
              aria-label={translate("configurator.productAssistantLauncher", "Product assistant")}
              onPointerDown={startProductAssistantLauncherSwipe}
              onPointerMove={moveProductAssistantLauncherSwipe}
              onPointerUp={finishProductAssistantLauncherSwipe}
              onPointerCancel={() => {
                productAssistantLauncherSwipeRef.current = null;
                setProductAssistantLauncherDragX(0);
                setProductAssistantLauncherDragY(0);
              }}
              onClick={() => {
                if (suppressProductAssistantLauncherClickRef.current) {
                  suppressProductAssistantLauncherClickRef.current = false;
                  return;
                }
                if (isProductAssistantOpen) {
                  closeProductAssistant();
                  return;
                }
                openProductAssistant();
              }}
            >
              <span className={styles.productAssistantLauncherBubble}>
                <strong>{translate("configurator.productAssistantLauncherPrompt", "Ask a question")}</strong>
                <small className={styles.productAssistantLauncherSwipeHint}>
                  <span aria-hidden="true">→ ↓</span>
                  {translate("configurator.productAssistantLauncherSwipeHint", "Swipe to hide")}
                </small>
              </span>
              <span className={styles.productAssistantLauncherAvatar} aria-hidden="true">
                <img src="/img/Untitled%20design%20(4).png" alt="" />
              </span>
            </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

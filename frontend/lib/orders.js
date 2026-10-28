import { ItemType, OrderStatus, Prisma } from "@prisma/client";
import {
  getDeliveryLeadTimeWeeks,
  getDeliveryMinOrderSettings,
} from "./admin-settings";
import { forwardOrderWebhook, sendOrderConfirmationEmail } from "./email/order-notifications";
import {
  getServiceEligibility,
  SERVICE_CODE_MONTAGE,
  SERVICE_CODE_PICKUP,
} from "./service-eligibility";
import {
  mergeSinkAndWorktopItems,
  SINK_AND_WORKTOP_CODE,
} from "./order-item-display";
import { buildNextContractOrderNumber } from "./order-numbering";
import { getPreferredDeliveryDateAfterWeeks } from "./preferred-delivery.js";
import {
  CONTRACT_ERRORS,
  assertUsableKitchenContract,
  buildConfirmedItemCodeSets,
  contractValidationError,
  getContractOrderState,
  normalizeContractNumber,
} from "./kitchen-contracts";
import {
  ORDER_KIND_LIVE,
  getOrderDelegate,
  getOrderItemDelegate,
  getOrderKindForContractNumber,
} from "./order-kind";
import { prisma } from "./prisma";
import { orderStatusUpdateData } from "./order-confirmation-date.js";
import { assertContractAllowsRepurchase } from "./contract-repurchase-restrictions";
import { resolveProductInformation } from "./product-information";
import {
  getAvailableCutleryVariantsForComponents,
  getCutleryCatalogArticleNumbers,
  getCutleryVariant,
  BURGER_103898_CUTLERY_VARIANTS,
  isCutleryAccessoryCode,
  MAX_CUTLERY_QUANTITY,
  normalizeCutleryQuantity,
  parseCutleryLineFromOrderItem,
  resolveCutleryCatalogArticles,
} from "./cutlery-accessories";
import { normalizeArticleNumber, resolveAuszugVariantSelection } from "./auszug-variants";
import {
  allowsKitchenArticleNumberAlias,
  matchesConfiguredArticleNumber,
} from "./order-article-aliases";
import { getNotificationArticleNumber } from "./notification-article-number.js";
import { isStandaloneCatalogBlendeItem } from "./catalog-pricing.js";

const PAYMENT_METHOD_ALIASES = new Map([
  ["card", "card"],
  ["visa", "card"],
  ["mastercard", "card"],
  ["master card", "card"],
  ["paypal", "card"],
  ["klarna", "card"],
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DELIVERY_WEEK_OPTION_COUNT = 3;
const BURGER_103898_CATALOG_ARTICLE_OVERRIDES = [
  { itemCode: "CAB-WALL-BURGER103898-H5072", articleNumber: "H5072", price: 135 },
  { itemCode: "CAB-HOOD-BURGER103898-HFLH6072", articleNumber: "FH664621E+FWK124+HFLH6072", displayArticleNumber: "FH664621E + FWK124 + HFLH6072", price: 346 },
  { itemCode: "CAB-WALL-BURGER103898-H6072", articleNumber: "H6072", price: 146 },
  { itemCode: "CAB-WALL-BURGER103898-H3072", articleNumber: "H3072", price: 124 },
];

// These cabinets are part of the supplied Burger 103898 kitchen. Keep this
// server-side as well as in the configurator so their price cannot be restored
// by stale hosted KitchenItem rows or a modified client submission.
const BURGER_103898_INCLUDED_COMPONENT_CODES = new Set([
  "SINK-BASE-BURGER103898-600",
  "CAB-BASE-BURGER103898-US50",
  "CAB-BASE-BURGER103898-US60-UPE65",
  "CAB-BASE-BURGER103898-US30",
]);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function requireString(value, label) {
  if (!value || !String(value).trim()) {
    throw validationError(`${label} is required`);
  }
  return String(value).trim();
}

async function buildNextOrderNumberForContract(tx, kitchenContract, orderKind = ORDER_KIND_LIVE) {
  const orders = await getOrderDelegate(tx, orderKind).findMany({
    where: {
      kitchenContractId: kitchenContract.id,
      orderNumber: { startsWith: kitchenContract.contractNumber },
    },
    select: { orderNumber: true },
  });

  return buildNextContractOrderNumber(
    kitchenContract.contractNumber,
    orders.map((order) => order.orderNumber),
  );
}

function validateEmail(value) {
  const email = requireString(value, "Email").toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw validationError("Email is invalid");
  }
  return email;
}

function validatePaymentMethod(value) {
  const paymentMethod = requireString(value, "Payment method").toLowerCase();
  const normalizedPaymentMethod = PAYMENT_METHOD_ALIASES.get(paymentMethod);
  if (!normalizedPaymentMethod) {
    throw validationError("Payment method is invalid");
  }
  return normalizedPaymentMethod;
}

function normalizePreferredDeliveryDate(value) {
  const normalized = value ? String(value).trim() : "";
  if (!normalized) {
    throw validationError("Preferred delivery week is required");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw validationError("Selected delivery week is invalid.");
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw validationError("Selected delivery week is invalid.");
  }

  return date;
}

function getMinimumPreferredDeliveryDate(leadTimeDays = 0, now = new Date()) {
  const days = Math.max(0, Math.floor(Number(leadTimeDays) || 0));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

function assertPreferredDeliveryWeekOption(preferredDeliveryDate, deliveryLeadTimeWeeks) {
  if (!preferredDeliveryDate) return;

  const orderDate = getMinimumPreferredDeliveryDate(0);
  const allowedDates = new Set(
    Array.from(
      { length: DELIVERY_WEEK_OPTION_COUNT },
      (_, index) => deliveryLeadTimeWeeks + index,
    ).map((weeks) => getPreferredDeliveryDateAfterWeeks(weeks, orderDate)),
  );

  if (!allowedDates.has(preferredDeliveryDate.toISOString().slice(0, 10))) {
    throw validationError(
      `Preferred delivery week must be after ${deliveryLeadTimeWeeks}, ${deliveryLeadTimeWeeks + 1}, or ${deliveryLeadTimeWeeks + 2} weeks.`,
    );
  }
}

function validateConsent(value) {
  if (value !== true) {
    throw validationError("Consent is required");
  }
}

function normalizeSubmissionItems(items = []) {
  const merged = new Map();

  for (const item of items) {
    const code = item?.code ? String(item.code) : null;
    const name = item?.name ? String(item.name) : null;
    if (!code && !name) continue;

    const articleNumber = item?.articleNumber ? String(item.articleNumber).trim().toUpperCase() : null;
    const maxQuantity = isCutleryAccessoryCode(code) ? MAX_CUTLERY_QUANTITY : 99;
    const quantity = isCutleryAccessoryCode(code)
      ? normalizeCutleryQuantity(item?.quantity ?? 1)
      : Math.max(1, Math.min(maxQuantity, Math.floor(Number(item?.quantity || 1))));
    const price = item?.price != null && Number.isFinite(Number(item.price)) ? Number(item.price) : null;
    const key = articleNumber ? `${code || ""}|${articleNumber}` : (code || name);

    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.quantity = Math.min(maxQuantity, existing.quantity + quantity);
      continue;
    }

    merged.set(key, {
      code,
      name,
      articleNumber,
      price,
      quantity,
    });
  }

  return [...merged.values()];
}

export function mapCatalogItem(catalogItems, submittedItem, itemType, options = {}) {
  const matched =
    catalogItems.find((item) => item.itemType === itemType && item.code === submittedItem.code) ||
    catalogItems.find((item) => item.itemType === itemType && item.name === submittedItem.name) ||
    null;

  if (!matched) return null;
  const catalogArticle = matched.catalogArticleId ? matched.catalogArticle : null;
  const catalogService = matched.catalogServiceId ? matched.catalogService : null;
  const catalogBlende = matched.catalogBlendeId ? matched.catalogBlende : null;
  const catalogBlendeQuantity = Math.max(1, Number.parseInt(String(matched.catalogBlendeQuantity || 1), 10) || 1);
  const submittedArticleNumber = normalizeArticleNumber(submittedItem.articleNumber);
  const matchedKitchenArticleNumber = normalizeArticleNumber(matched.articleNumber);
  const matchedCatalogArticleNumber = normalizeArticleNumber(catalogArticle?.articleNumber);
  const matchesConfiguredArticle = matchesConfiguredArticleNumber({
    submittedArticleNumber,
    catalogArticleNumber: matchedCatalogArticleNumber,
    kitchenArticleNumber: matchedKitchenArticleNumber,
    allowKitchenArticleNumberAlias: options.allowKitchenArticleNumberAlias === true,
  });
  let selectedArticle = catalogArticle;
  let selectedComponentArticleNumber = "";

  if (
    itemType === ItemType.COMPONENT &&
    submittedArticleNumber &&
    !matchesConfiguredArticle
  ) {
    const selectedVariant = resolveAuszugVariantSelection(matched, submittedArticleNumber, options.auszugVariantArticles || []);
    if (selectedVariant.status !== "variant") {
      return null;
    }
    selectedArticle = selectedVariant.article;
    selectedComponentArticleNumber = selectedVariant.article.articleNumber;
  } else if (itemType === ItemType.COMPONENT && submittedArticleNumber) {
    selectedComponentArticleNumber = options.allowKitchenArticleNumberAlias === true
      && submittedArticleNumber === matchedKitchenArticleNumber
      ? matched.articleNumber
      : catalogArticle?.articleNumber || matched.articleNumber;
  }

  if (itemType === ItemType.ACCESSORY && isCutleryAccessoryCode(matched.code) && submittedArticleNumber) {
    selectedArticle = (options.cutleryVariantArticles || []).find(
      (article) => normalizeArticleNumber(article.articleNumber) === submittedArticleNumber,
    ) || null;
    if (!selectedArticle) return null;
  }

  const resolvePrice = (catalogEntry) => {
    if (!catalogEntry) return null;
    const programPrice = options.useProgramPrices === true
      ? catalogEntry.programPrices?.find(
        (entry) => entry.isActive !== false && entry.programmId === options.programmId,
      )?.price
      : null;
    const resolvedPrice = programPrice ?? catalogEntry.price;
    return resolvedPrice == null ? null : Number(resolvedPrice);
  };
  const catalogPrice = (() => {
    const servicePrice = resolvePrice(catalogService);
    if (servicePrice != null) return servicePrice;
    const articlePrice = resolvePrice(selectedArticle);
    if (articlePrice == null) return submittedItem.price != null ? submittedItem.price : matched.price;
    const blendePrice = resolvePrice(catalogBlende);
    const blendeTotal = blendePrice != null ? blendePrice * catalogBlendeQuantity : 0;
    return articlePrice + blendeTotal;
  })();

  return {
    ...matched,
    name: selectedArticle?.name || catalogService?.name || submittedItem.name || matched.name,
    nameDe: selectedArticle?.nameDe || catalogService?.nameDe || matched.nameDe || "",
    articleNumber: selectedComponentArticleNumber
      || selectedArticle?.articleNumber
      || submittedItem.articleNumber
      || matched.articleNumber,
    price: catalogPrice,
    quantity: submittedItem.quantity || 1,
  };
}

function getOrderItemEffectivePrice(item) {
  if (item?.isLocked || item?.isOrderLocked || item?.kitchenItem?.isLocked) {
    return 0;
  }
  const unitPrice = Number(item?.priceSnapshot ?? item?.price ?? 0);
  const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
  return unitPrice * quantity;
}

export function buildOrderForNotifications(orderRecord, { confirmedItems = [] } = {}) {
  const toNotificationItem = (item) => {
    const kitchenSlug = String(orderRecord.kitchen?.slug || "").trim().toLowerCase();
    const isBurger103898 = kitchenSlug === "burger-103898";
    // Old orders can outlive a reseeded KitchenItem row (the relation uses
    // onDelete: SetNull). Resolve its current catalog equivalent so plan PDFs
    // still have the componentKey needed to highlight the purchased element.
    const snapshotArticleNumber = normalizeArticleNumber(item.articleNumberSnapshot || item.articleNumber);
    const currentKitchenItem = (orderRecord.kitchen?.items || []).find((candidate) =>
      candidate.code === item.code || (
        snapshotArticleNumber &&
        normalizeArticleNumber(candidate.articleNumber || candidate.catalogArticle?.articleNumber) === snapshotArticleNumber
      ),
    ) || null;
    const kitchenItem = item.kitchenItem || currentKitchenItem;
    const catalogArticle = kitchenItem?.catalogArticleId ? kitchenItem.catalogArticle : null;
    const catalogService = kitchenItem?.catalogServiceId ? kitchenItem.catalogService : null;
    const catalogBlende = kitchenItem?.catalogBlendeId ? kitchenItem.catalogBlende : null;
    const standaloneCatalogBlende = isStandaloneCatalogBlendeItem(kitchenItem || item);
    const productInformation = resolveProductInformation({
      catalogArticleId: kitchenItem?.catalogArticleId || null,
      catalogArticle,
      productImagePath: kitchenItem?.productImagePath || item.productImagePath || "",
      productInfoPdfPath: kitchenItem?.productInfoPdfPath || item.productInfoPdfPath || "",
      productInfoSummary: kitchenItem?.productInfoSummary || item.productInfoSummary || "",
      productInfoKeyFacts: Array.isArray(kitchenItem?.productInfoKeyFacts)
        ? kitchenItem.productInfoKeyFacts
        : item.productInfoKeyFacts,
      productInfoExtractedText:
        kitchenItem?.productInfoExtractedText || item.productInfoExtractedText || "",
      productInfoUpdatedAt: kitchenItem?.productInfoUpdatedAt || null,
    });
    const catalogBlendeQuantity = catalogBlende
      ? Math.max(1, Number.parseInt(String(kitchenItem?.catalogBlendeQuantity || 1), 10) || 1)
      : Math.max(1, Number.parseInt(String(item.catalogBlendeQuantity || 1), 10) || 1);
    const cutleryLine = parseCutleryLineFromOrderItem({
      code: item.code,
      articleNumber: item.articleNumberSnapshot || item.articleNumber,
      name: item.nameSnapshot || item.name,
      nameSnapshot: item.nameSnapshot,
      quantity: item.quantity,
    });
    const cutleryVariant = cutleryLine
      ? getCutleryVariant(cutleryLine.articleNumber.replace(/^ZBE(\d{2,3})$/, "ZB$1SG"))
      : null;
    const burgerCutleryVariant = isBurger103898 && cutleryLine
      ? BURGER_103898_CUTLERY_VARIANTS.find((variant) => variant.widthCm === cutleryVariant?.widthCm)
      : null;

    const displayName = item.nameSnapshot || item.name || item.kitchenItem?.name || catalogArticle?.name || catalogService?.name || item.nameDe || item.kitchenItem?.nameDe || "";
    const displayNameDe = cutleryLine
      ? cutleryVariant?.nameDe || displayName
      : item.nameDeSnapshot || catalogArticle?.nameDe || catalogService?.nameDe || item.kitchenItem?.nameDe || item.nameDe || "";

    return {
      code: item.code,
      articleNumber: getNotificationArticleNumber({
        kitchenSlug,
        item,
        kitchenItem,
        catalogArticle,
        cutleryArticleNumber: cutleryLine?.articleNumber,
        burgerCutleryArticleNumber: burgerCutleryVariant?.supplierArticleNumber,
      }),
      name: displayName,
      nameDe: displayNameDe,
      price: burgerCutleryVariant
        ? burgerCutleryVariant.price * Math.max(1, Math.floor(Number(item.quantity || 1)))
        : getOrderItemEffectivePrice(item),
      quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
      isLocked: Boolean(kitchenItem?.isLocked || item.isLocked || item.isOrderLocked),
      iconKey: kitchenItem?.iconKey || item.iconKey || "",
      componentKey: kitchenItem?.componentKey || item.componentKey || "",
      widthMm: kitchenItem?.widthMm || item.widthMm || null,
      heightMm: kitchenItem?.heightMm || item.heightMm || null,
      productImagePath: productInformation.productImagePath,
      productInfoPdfPath: productInformation.productInfoPdfPath,
      productInfoSummary: productInformation.productInfoSummary,
      productInfoKeyFacts: productInformation.productInfoKeyFacts,
      productInfoExtractedText: productInformation.productInfoExtractedText,
      blendeCode: standaloneCatalogBlende ? "" : catalogBlende?.code || kitchenItem?.blendeCode || item.blendeCode || "",
      blendeLabel: standaloneCatalogBlende ? "" : catalogBlende?.nameDe || catalogBlende?.name || kitchenItem?.blendeLabel || item.blendeLabel || "",
      blendeName: standaloneCatalogBlende ? "" : catalogBlende?.name || item.blendeName || "",
      blendeNameDe: standaloneCatalogBlende ? "" : catalogBlende?.nameDe || item.blendeNameDe || "",
      catalogBlendeQuantity,
      blendePrice: standaloneCatalogBlende ? null : catalogBlende?.price != null
        ? Number(catalogBlende.price) * catalogBlendeQuantity
        : kitchenItem?.blendePrice != null
          ? Number(kitchenItem.blendePrice) * (kitchenItem?.catalogBlendeId ? catalogBlendeQuantity : 1)
        : (item.blendePrice != null ? Number(item.blendePrice) : null),
    };
  };
  const notificationItems = mergeSinkAndWorktopItems(orderRecord.items || [], (sinkItem, worktopItem) => ({
    ...toNotificationItem(sinkItem),
    itemType: sinkItem.itemType,
    code: SINK_AND_WORKTOP_CODE,
    name: "Arbeitsplatte",
    nameDe: "Arbeitsplatte",
    price: getOrderItemEffectivePrice(sinkItem) + getOrderItemEffectivePrice(worktopItem),
  }));
  const currentComponentCodes = new Set(
    (orderRecord.items || [])
      .filter((item) => item.itemType === ItemType.COMPONENT)
      .map((item) => item.code),
  );
  const purchasedKitchenItems = mergeSinkAndWorktopItems([
    ...(orderRecord.items || []),
    ...confirmedItems
      .filter((item) => item.itemType === ItemType.COMPONENT && !currentComponentCodes.has(item.code))
      .map((item) => ({ ...item, isOrderLocked: true })),
  ], (sinkItem, worktopItem) => ({
    ...sinkItem,
    itemType: sinkItem.itemType,
    code: SINK_AND_WORKTOP_CODE,
    name: "Arbeitsplatte",
    nameDe: "Arbeitsplatte",
    price: getOrderItemEffectivePrice(sinkItem) + getOrderItemEffectivePrice(worktopItem),
    isOrderLocked: Boolean(sinkItem.isOrderLocked || worktopItem.isOrderLocked),
  }));

  return {
    id: orderRecord.id,
    orderNumber: orderRecord.orderNumber,
    createdAt: orderRecord.createdAt.toISOString(),
    total: Number(orderRecord.totalPrice),
    kitchen: {
      id: orderRecord.kitchen.id,
      slug: orderRecord.kitchen.slug,
      name: orderRecord.kitchen.name,
    },
    customer: {
      contractNumber: orderRecord.contractNumber || "",
      firstName: orderRecord.firstName,
      lastName: orderRecord.lastName,
      email: orderRecord.email,
      phone: orderRecord.phone,
      address1: orderRecord.address1,
      address2: orderRecord.address2 || "",
      postalCode: orderRecord.postalCode,
      city: orderRecord.city,
      country: orderRecord.country || "",
      preferredDeliveryDate: orderRecord.preferredDeliveryDate
        ? orderRecord.preferredDeliveryDate.toISOString().slice(0, 10)
        : "",
      notes: orderRecord.notes || "",
      paymentMethod: orderRecord.paymentMethod || "",
    },
    components: notificationItems
      .filter((item) => item.itemType === ItemType.COMPONENT)
      .map(toNotificationItem),
    // The commercial confirmation contains only this order's new lines. The
    // kitchen sketch, however, must also show components confirmed by earlier
    // orders for the same contract; those are painted as locked/blue.
    purchasedKitchenComponents: purchasedKitchenItems
      .filter((item) => item.itemType === ItemType.COMPONENT)
      .map(toNotificationItem),
    accessories: notificationItems
      .filter((item) => item.itemType === ItemType.ACCESSORY)
      .map(toNotificationItem),
    services: notificationItems
      .filter((item) => item.itemType === ItemType.SERVICE)
      .map(toNotificationItem),
  };
}

export async function buildOrderForNotificationsWithConfirmedBaseline(
  orderRecord,
  orderKind = ORDER_KIND_LIVE,
) {
  const contractOrderState = orderRecord?.kitchenContractId
    ? await getContractOrderState(orderRecord.kitchenContractId, prisma, orderKind)
    : { confirmedItems: [] };
  const currentConfirmedIndex = contractOrderState.confirmedOrders?.findIndex(
    (order) => order.id === orderRecord.id,
  ) ?? -1;
  const relevantConfirmedOrderIds = currentConfirmedIndex >= 0
    ? new Set(
      contractOrderState.confirmedOrders
        .slice(0, currentConfirmedIndex + 1)
        .map((order) => order.id),
    )
    : null;
  const currentCreatedAt = orderRecord?.createdAt ? new Date(orderRecord.createdAt).getTime() : Number.POSITIVE_INFINITY;
  const confirmedItems = (contractOrderState.confirmedItems || []).filter((item) =>
    relevantConfirmedOrderIds
      ? relevantConfirmedOrderIds.has(item.sourceOrderId)
      : new Date(item.sourceOrderCreatedAt || 0).getTime() <= currentCreatedAt,
  );

  return buildOrderForNotifications(orderRecord, {
    confirmedItems,
  });
}

function readEmailOverrides(input = {}) {
  const subject = input?.subject ? String(input.subject).trim() : "";
  const bodyText = input?.bodyText ? String(input.bodyText) : "";
  const excludedAttachmentKeys = Array.isArray(input?.excludedAttachmentKeys)
    ? input.excludedAttachmentKeys.map((value) => String(value || "").trim()).filter(Boolean)
    : [];

  return {
    subject,
    bodyText,
    excludedAttachmentKeys,
  };
}

async function getOrderRecordForOperations(id, orderKind = ORDER_KIND_LIVE) {
  const order = await getOrderDelegate(prisma, orderKind).findUnique({
    where: { id },
    include: {
      kitchen: {
        include: {
          items: {
            include: { catalogArticle: true, catalogBlende: true, catalogService: true },
          },
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          kitchenItem: {
            include: {
              catalogArticle: true,
              catalogBlende: true,
              catalogService: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
}

async function processOrderNotifications({ order, pdfBase64, pdfFilename, runEmail = true, runWebhook = true }) {
  const results = {
    emailSent: false,
    webhookSent: false,
    emailError: "",
    webhookError: "",
  };

  if (runEmail) {
    try {
      await sendOrderConfirmationEmail({ order, pdfBase64, pdfFilename });
      results.emailSent = true;
    } catch (error) {
      results.emailError = error instanceof Error ? error.message : "Email sending failed";
    }
  }

  if (runWebhook) {
    try {
      await forwardOrderWebhook(order);
      results.webhookSent = true;
    } catch (error) {
      results.webhookError = error instanceof Error ? error.message : "Webhook forwarding failed";
    }
  }

  return results;
}

export function buildOrderItemSelectionKey(item) {
  const cutleryLine = isCutleryAccessoryCode(item?.code)
    ? parseCutleryLineFromOrderItem(item)
    : null;
  const articleNumber = String(cutleryLine?.articleNumber || item?.articleNumber || "").trim().toUpperCase();
  if (articleNumber && isCutleryAccessoryCode(item.code)) {
    return `${item.itemType}:${item.code}:${articleNumber}`;
  }
  return `${item.itemType}:${item.code}`;
}

function withoutConfirmedBaseline(items, confirmedItemSets) {
  return items.filter((item) => !confirmedItemSets[item.itemType]?.has(item.code));
}

function buildConfirmedBaselineSelectionItem(item) {
  const kitchenItem = item?.kitchenItem || {};
  const catalogArticle = kitchenItem.catalogArticleId ? kitchenItem.catalogArticle : null;
  const catalogService = kitchenItem.catalogServiceId ? kitchenItem.catalogService : null;
  const catalogBlende = kitchenItem.catalogBlendeId ? kitchenItem.catalogBlende : null;
  const catalogBlendeQuantity = catalogBlende
    ? Math.max(1, Number.parseInt(String(kitchenItem.catalogBlendeQuantity || 1), 10) || 1)
    : Math.max(1, Number.parseInt(String(item.catalogBlendeQuantity || 1), 10) || 1);

  return {
    ...kitchenItem,
    id: kitchenItem.id || item.kitchenItemId,
    kitchenItemId: item.kitchenItemId,
    itemType: item.itemType,
    code: item.code,
    name: item.nameSnapshot || kitchenItem.name || catalogArticle?.name || catalogService?.name || item.code,
    nameDe: item.nameDeSnapshot || catalogArticle?.nameDe || catalogService?.nameDe || kitchenItem.nameDe || item.nameDe || "",
    articleNumber: item.articleNumberSnapshot || catalogArticle?.articleNumber || kitchenItem.articleNumber || item.articleNumber || "",
    blendeCode: catalogBlende?.code || kitchenItem.blendeCode || item.blendeCode || "",
    blendeLabel: catalogBlende?.nameDe || catalogBlende?.name || kitchenItem.blendeLabel || item.blendeLabel || "",
    blendeName: catalogBlende?.name || item.blendeName || "",
    blendeNameDe: catalogBlende?.nameDe || item.blendeNameDe || "",
    catalogBlendeQuantity,
    price: Number(item.priceSnapshot || 0),
    priceSnapshot: Number(item.priceSnapshot || 0),
    quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
    isOrderLocked: true,
    kitchenItem,
  };
}

function withConfirmedBaselineSelection(selectedItems, confirmedItems) {
  const selectedKeys = new Set(selectedItems.map(buildOrderItemSelectionKey));
  const baselineItems = confirmedItems
    .map(buildConfirmedBaselineSelectionItem)
    .filter((item) => item.code && !selectedKeys.has(buildOrderItemSelectionKey(item)));

  return [...selectedItems, ...baselineItems];
}

export async function createOrderFromSubmission({ kitchenSlug, orderPayload, pdfBase64, pdfFilename }) {
  if (!kitchenSlug || !orderPayload || typeof orderPayload !== "object") {
    throw validationError("Order payload is invalid");
  }

  const kitchen = await prisma.kitchen.findUnique({
    where: { slug: kitchenSlug },
    include: {
      items: {
        where: { isActive: true },
        include: {
          catalogArticle: { include: { programPrices: true } },
          catalogBlende: { include: { programPrices: true } },
          catalogService: { include: { programPrices: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!kitchen || kitchen.status !== "ACTIVE") {
    throw new Error("Kitchen not found");
  }

  const [auszugVariantArticles, cutleryVariantArticles, burgerBlende, burgerArticles] = await Promise.all([
    prisma.catalogArticle.findMany({
      where: {
        itemType: ItemType.COMPONENT,
        // Burger's imported US2A rows are marked inactive in the shared
        // catalog but are valid supplier articles for this kitchen.
        ...(kitchen.slug === "burger-103898" ? {} : { isActive: true }),
        articleNumber: { startsWith: "US2A" },
      },
      include: { programPrices: true },
    }),
    prisma.catalogArticle.findMany({
      where: {
        itemType: ItemType.ACCESSORY,
        isActive: true,
        articleNumber: { in: getCutleryCatalogArticleNumbers(kitchen.slug, kitchen.programmId) },
      },
      include: { programPrices: true },
    }),
    kitchen.slug === "burger-103898"
      ? prisma.catalogBlende.findUnique({
        where: { code: "UPE65" },
        include: { programPrices: true },
      })
      : Promise.resolve(null),
    kitchen.slug === "burger-103898"
      ? prisma.catalogArticle.findMany({
        where: {
          articleNumber: {
            in: BURGER_103898_CATALOG_ARTICLE_OVERRIDES.map((override) => override.articleNumber),
          },
          isActive: true,
        },
        include: { programPrices: true },
      })
      : Promise.resolve([]),
  ]);
  const resolvedCutleryVariantArticles = resolveCutleryCatalogArticles(
    cutleryVariantArticles,
    kitchen.slug,
    kitchen.programmId,
  );

  // Burger uses supplier code UPE65. Existing 103898 rows may still point at
  // the shared Impuls UPEF65 record because an import with zero synced items
  // updates the catalog but intentionally does not relink kitchen items.
  const burgerCornerCabinet = kitchen.slug === "burger-103898"
    ? kitchen.items.find((item) => item.code === "CAB-BASE-BURGER103898-US60-UPE65")
    : null;
  if (burgerCornerCabinet) {
    const configuredBurgerPrice = Number(burgerCornerCabinet.blendePrice ?? 79);
    const resolvedBurgerBlende = burgerBlende?.isActive
      ? burgerBlende
      : {
        ...(burgerCornerCabinet.catalogBlende || {}),
        code: "UPE65",
        name: "Corner filler panel for Lower cabinet",
        nameDe: "Eckpassblende Unterschrank",
        price: configuredBurgerPrice,
        programPrices: [{
          programmId: kitchen.programmId,
          price: configuredBurgerPrice,
          isActive: true,
        }],
      };
    burgerCornerCabinet.catalogBlendeId = resolvedBurgerBlende.id
      || burgerCornerCabinet.catalogBlendeId
      || "burger-upe65";
    burgerCornerCabinet.catalogBlende = resolvedBurgerBlende;
    burgerCornerCabinet.blendeCode = "UPE65";
    burgerCornerCabinet.blendeLabel = resolvedBurgerBlende.nameDe || resolvedBurgerBlende.name;
  }

  const burgerArticleByNumber = new Map(
    burgerArticles.map((article) => [article.articleNumber, article]),
  );
  for (const override of kitchen.slug === "burger-103898"
    ? BURGER_103898_CATALOG_ARTICLE_OVERRIDES
    : []) {
    const kitchenItem = kitchen.items.find((item) => item.code === override.itemCode);
    if (!kitchenItem) continue;
    const catalogArticle = burgerArticleByNumber.get(override.articleNumber);
    const configuredBurgerPrice = Number(kitchenItem.price ?? override.price);
    const resolvedArticle = catalogArticle?.isActive
      ? catalogArticle
      : {
        ...(kitchenItem.catalogArticle || {}),
        articleNumber: override.articleNumber,
        price: configuredBurgerPrice,
        programPrices: [{
          programmId: kitchen.programmId,
          price: configuredBurgerPrice,
          isActive: true,
        }],
      };
    kitchenItem.catalogArticleId = resolvedArticle.id
      || kitchenItem.catalogArticleId
      || `burger-${override.articleNumber}`;
    kitchenItem.catalogArticle = resolvedArticle;
    kitchenItem.articleNumber = override.displayArticleNumber || override.articleNumber;
  }

  const customer = orderPayload?.customer || {};
  validateConsent(customer.consent);
  validateConsent(customer.termsConsent);
  const contractNumber = normalizeContractNumber(customer.contractNumber);
  if (!contractNumber) {
    throw validationError(CONTRACT_ERRORS.REQUIRED);
  }
  const validatedCustomer = {
    contractNumber,
    firstName: requireString(customer.firstName, "First name"),
    lastName: requireString(customer.lastName, "Last name"),
    email: validateEmail(customer.email),
    phone: requireString(customer.phone, "Phone"),
    address1: requireString(customer.address1, "Address"),
    address2: customer.address2 ? String(customer.address2).trim() : "",
    postalCode: requireString(customer.postalCode, "Postal code"),
    city: requireString(customer.city, "City"),
    country: customer.country ? String(customer.country).trim() : "",
    preferredDeliveryDate: normalizePreferredDeliveryDate(customer.preferredDeliveryDate),
    notes: customer.notes ? String(customer.notes).trim() : "",
    paymentMethod: validatePaymentMethod(customer.paymentMethod),
  };
  const deliveryLeadTimeWeeks = await getDeliveryLeadTimeWeeks();
  assertPreferredDeliveryWeekOption(validatedCustomer.preferredDeliveryDate, deliveryLeadTimeWeeks);
  const submittedGroups = {
    components: normalizeSubmissionItems(orderPayload?.components),
    accessories: normalizeSubmissionItems(orderPayload?.accessories),
    services: normalizeSubmissionItems(orderPayload?.services),
  };
  // These kitchens intentionally use supplier-facing display bundles on the
  // KitchenItem while pricing and validation remain linked to one canonical
  // catalog article. Accept either configured value for the matched item.
  const allowKitchenArticleNumberAlias = allowsKitchenArticleNumberAlias(kitchen.slug);
  const useProgramPrices = kitchen.programmId === "BURGER CINDY";
  const programPriceOptions = { useProgramPrices, programmId: kitchen.programmId };

  const selectedComponents = submittedGroups.components.map((item) => {
    const selectedItem = mapCatalogItem(kitchen.items, item, ItemType.COMPONENT, {
      auszugVariantArticles,
      allowKitchenArticleNumberAlias,
      ...programPriceOptions,
    });

    if (
      selectedItem
      && kitchen.slug === "burger-103898"
      && BURGER_103898_INCLUDED_COMPONENT_CODES.has(selectedItem.code)
    ) {
      return { ...selectedItem, isLocked: true };
    }

    return selectedItem;
  });
  const selectedAccessories = submittedGroups.accessories.map((item) =>
    mapCatalogItem(kitchen.items, item, ItemType.ACCESSORY, {
      cutleryVariantArticles: resolvedCutleryVariantArticles,
      ...programPriceOptions,
    }),
  );
  const selectedServices = submittedGroups.services.map((item) =>
    mapCatalogItem(kitchen.items, item, ItemType.SERVICE, programPriceOptions),
  );

  if ([...selectedComponents, ...selectedAccessories, ...selectedServices].some((item) => !item)) {
    throw validationError("One or more selected items are invalid or inactive");
  }

  assertContractAllowsRepurchase(validatedCustomer.contractNumber);
  const kitchenContract = await prisma.kitchenContract.findUnique({
    where: { contractNumber: validatedCustomer.contractNumber },
    include: { kitchen: true },
  });

  assertUsableKitchenContract(kitchenContract);
  if (kitchenContract.kitchenId !== kitchen.id) {
    throw contractValidationError(CONTRACT_ERRORS.KITCHEN_MISMATCH);
  }
  const orderKind = getOrderKindForContractNumber(kitchenContract.contractNumber);

  const contractOrderState = await getContractOrderState(kitchenContract.id, prisma, orderKind);
  const confirmedItemSets = buildConfirmedItemCodeSets(contractOrderState.confirmedItems);
  const submittedSelected = [...selectedComponents, ...selectedAccessories, ...selectedServices];
  const allSelected = withConfirmedBaselineSelection(submittedSelected, contractOrderState.confirmedItems);
  const allSelectedComponents = allSelected.filter((item) => item.itemType === ItemType.COMPONENT);
  const allSelectedAccessories = allSelected.filter((item) => item.itemType === ItemType.ACCESSORY);
  const allSelectedServices = allSelected.filter((item) => item.itemType === ItemType.SERVICE);
  const availableCutleryVariants = getAvailableCutleryVariantsForComponents(
    allSelectedComponents,
    useProgramPrices ? resolvedCutleryVariantArticles : undefined,
  );
  const availableCutleryByArticle = new Map(
    availableCutleryVariants.flatMap((variant) => [
      [variant.articleNumber, variant],
      ...(variant.sharedArticleNumber ? [[variant.sharedArticleNumber, variant]] : []),
    ]),
  );
  for (const item of allSelectedAccessories) {
    if (!isCutleryAccessoryCode(item?.code)) continue;

    const cutleryLine = parseCutleryLineFromOrderItem(item);
    const variant = cutleryLine ? availableCutleryByArticle.get(cutleryLine.articleNumber) : null;
    if (!variant) {
      throw validationError("Selected cutlery insert width is not available for this kitchen.");
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
    if (quantity > Math.max(1, Math.floor(Number(variant.maxQuantity || 1)))) {
      throw validationError("Selected cutlery insert quantity is not available for this kitchen.");
    }
  }
  const serviceEligibility = getServiceEligibility({
    selectedComponents: allSelectedComponents.map((item) => ({
      ...item,
      isLocked: Boolean(item.isLocked),
      isOrderLocked: confirmedItemSets[ItemType.COMPONENT].has(item.code),
    })),
    selectedAccessories: allSelectedAccessories,
  });
  const selectedServiceCodes = allSelectedServices.map((item) => item.code);

  if (
    selectedServiceCodes.includes(SERVICE_CODE_MONTAGE) &&
    selectedServiceCodes.includes(SERVICE_CODE_PICKUP)
  ) {
    throw validationError("Montage and pickup cannot both be selected");
  }

  if (selectedServiceCodes.includes(SERVICE_CODE_MONTAGE) && !serviceEligibility.montageEligible) {
    throw validationError("Montage conditions are not met");
  }

  if (selectedServiceCodes.includes(SERVICE_CODE_PICKUP) && !serviceEligibility.pickupEligible) {
    throw validationError("Pickup conditions are not met");
  }

  if (selectedServiceCodes.includes(SERVICE_CODE_MONTAGE)) {
    const deliveryMinSettings = await getDeliveryMinOrderSettings();
    if (deliveryMinSettings.enabled) {
      const orderTotal = allSelected.reduce(
        (sum, item) => sum + getOrderItemEffectivePrice(item),
        0,
      );
      if (orderTotal < deliveryMinSettings.amount) {
        throw validationError(
          `Delivery, Carry-in, Assembly and Installation requires a minimum order value of €${deliveryMinSettings.amount}.`,
        );
      }
    }
  }

  if (!allSelected.length) {
    throw validationError("At least one item must be selected");
  }

  let savedOrder = null;
  let savedNewItems = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      savedOrder = await prisma.$transaction(async (tx) => {
        const orderDelegate = getOrderDelegate(tx, orderKind);
        const orderItemDelegate = getOrderItemDelegate(tx, orderKind);
        const contractOrderState = await getContractOrderState(kitchenContract.id, tx, orderKind);
        const existingEditableOrder = contractOrderState.editableOrder;
        const confirmedItemSets = buildConfirmedItemCodeSets(contractOrderState.confirmedItems);
        const newSelectedItems = withoutConfirmedBaseline(allSelected, confirmedItemSets);
        const newSelectionKeys = new Set(newSelectedItems.map(buildOrderItemSelectionKey));
        const submittedKeys = new Set(allSelected.map(buildOrderItemSelectionKey));
        const missingBaselineItems = contractOrderState.confirmedItems.filter(
          (item) => !submittedKeys.has(buildOrderItemSelectionKey(item)),
        );

        if (missingBaselineItems.length) {
          throw validationError("Confirmed items cannot be removed from this contract.");
        }

        if (!newSelectedItems.length && !existingEditableOrder) {
          throw validationError("Select at least one new item for this contract.");
        }

        const totalPrice = newSelectedItems.reduce((sum, item) => sum + getOrderItemEffectivePrice(item), 0);
        const order = existingEditableOrder
          ? await orderDelegate.update({
              where: { id: existingEditableOrder.id },
              data: {
                firstName: validatedCustomer.firstName,
                lastName: validatedCustomer.lastName,
                email: validatedCustomer.email,
                phone: validatedCustomer.phone,
                address1: validatedCustomer.address1,
                address2: validatedCustomer.address2 || null,
                postalCode: validatedCustomer.postalCode,
                city: validatedCustomer.city,
                country: validatedCustomer.country || null,
                preferredDeliveryDate: validatedCustomer.preferredDeliveryDate,
                notes: validatedCustomer.notes || null,
                paymentMethod: validatedCustomer.paymentMethod,
                totalPrice,
                status: OrderStatus.NEW,
              },
            })
          : await orderDelegate.create({
              data: {
                orderNumber: await buildNextOrderNumberForContract(tx, kitchenContract, orderKind),
                kitchenId: kitchen.id,
                kitchenContractId: kitchenContract.id,
                status: OrderStatus.NEW,
                contractNumber: kitchenContract.contractNumber,
                firstName: validatedCustomer.firstName,
                lastName: validatedCustomer.lastName,
                email: validatedCustomer.email,
                phone: validatedCustomer.phone,
                address1: validatedCustomer.address1,
                address2: validatedCustomer.address2 || null,
                postalCode: validatedCustomer.postalCode,
                city: validatedCustomer.city,
                country: validatedCustomer.country || null,
                preferredDeliveryDate: validatedCustomer.preferredDeliveryDate,
                notes: validatedCustomer.notes || null,
                paymentMethod: validatedCustomer.paymentMethod,
                totalPrice,
              },
            });

        if (existingEditableOrder) {
          await orderItemDelegate.deleteMany({
            where: { orderId: order.id },
          });
        }

        if (newSelectedItems.length) {
          await orderItemDelegate.createMany({
            data: newSelectedItems.map((item) => ({
              orderId: order.id,
              kitchenItemId: item.id,
              itemType: item.itemType,
              code: item.code,
              nameSnapshot: item.name,
              nameDeSnapshot: item.nameDe || null,
              articleNumberSnapshot: item.articleNumber || null,
              priceSnapshot: Number(item.price),
              quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
            })),
          });
        }

        savedNewItems = newSelectedItems.filter((item) => newSelectionKeys.has(buildOrderItemSelectionKey(item)));

        return orderDelegate.findUnique({
          where: { id: order.id },
          include: {
            kitchen: true,
            items: {
              include: {
                kitchenItem: {
                  include: {
                    catalogArticle: true,
                    catalogBlende: true,
                    catalogService: true,
                  },
                },
              },
            },
          },
        });
      });
      break;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  if (!savedOrder) {
    throw new Error("Order could not be saved");
  }

  const orderForNotifications = buildOrderForNotifications(savedOrder, {
    confirmedItems: contractOrderState.confirmedItems,
  });
  const notificationResult = await processOrderNotifications({
    order: orderForNotifications,
    pdfBase64: null,
    pdfFilename: null,
    runEmail: false,
    runWebhook: false,
  });

  return {
    ...orderForNotifications,
    orderKind,
    newItemCount: savedNewItems.length,
    notifications: notificationResult,
  };
}

export async function resendOrderEmail(orderId, emailOverrides = {}) {
  const orderKind = emailOverrides.orderKind || ORDER_KIND_LIVE;
  const orderRecord = await getOrderRecordForOperations(orderId, orderKind);
  const order = await buildOrderForNotificationsWithConfirmedBaseline(orderRecord, orderKind);
  const { subject, bodyText, excludedAttachmentKeys } = readEmailOverrides(emailOverrides);

  await sendOrderConfirmationEmail({ order, subject, bodyText, excludedAttachmentKeys });

  return order;
}

export async function deleteAllOrders() {
  const [, deletedOrders] = await prisma.$transaction([
    prisma.orderItem.deleteMany({}),
    prisma.order.deleteMany({}),
  ]);

  return deletedOrders.count;
}

export async function deleteAllTestOrders() {
  const [, deletedOrders] = await prisma.$transaction([
    prisma.testOrderItem.deleteMany({}),
    prisma.testOrder.deleteMany({}),
  ]);

  return deletedOrders.count;
}

export async function retryOrderWebhook(orderId) {
  const orderRecord = await getOrderRecordForOperations(orderId);
  const order = buildOrderForNotifications(orderRecord);
  await forwardOrderWebhook(order);
  return order;
}

export async function updateOrderStatus(orderId, status, orderKind = ORDER_KIND_LIVE) {
  const nextStatus = Object.values(OrderStatus).includes(status) ? status : OrderStatus.NEW;
  const order = nextStatus === OrderStatus.CONFIRMED
    ? await getOrderDelegate(prisma, orderKind).findUnique({ where: { id: orderId }, select: { status: true, confirmedAt: true } }) : {};
  return getOrderDelegate(prisma, orderKind).update({
    where: { id: orderId },
    data: orderStatusUpdateData(nextStatus, order || {}),
  });
}

export async function updateOrderAs400Number(orderId, value) {
  const as400Number = String(value || "").trim();
  if (as400Number && !/^\d+$/.test(as400Number)) {
    throw validationError("AS 400 must contain numbers only.");
  }
  if (as400Number.length > 50) {
    throw validationError("AS 400 must be 50 digits or fewer.");
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { as400Number: as400Number || null },
  });
}

export async function deleteOrder(orderId, orderKind = ORDER_KIND_LIVE) {
  return getOrderDelegate(prisma, orderKind).delete({
    where: { id: orderId },
  });
}

export async function confirmOrder(orderId, emailOverrides = {}) {
  const orderKind = emailOverrides.orderKind || ORDER_KIND_LIVE;
  const orderRecord = await getOrderRecordForOperations(orderId, orderKind);
  if (orderRecord.status === OrderStatus.CONFIRMED) {
    return buildOrderForNotifications(orderRecord);
  }
  if (orderRecord.status === OrderStatus.CANCELLED) {
    throw validationError("Cancelled orders cannot be confirmed.");
  }

  const order = await buildOrderForNotificationsWithConfirmedBaseline(orderRecord, orderKind);
  const { subject, bodyText, excludedAttachmentKeys } = readEmailOverrides(emailOverrides);
  await sendOrderConfirmationEmail({ order, subject, bodyText, excludedAttachmentKeys });

  await getOrderDelegate(prisma, orderKind).update({
    where: { id: orderId },
    data: orderStatusUpdateData(OrderStatus.CONFIRMED, orderRecord),
  });

  return order;
}

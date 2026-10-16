import { KitchenStatus, ItemType, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { getAdminPagination } from "./admin-pagination.js";
import { getPriceBreakdown } from "./price-utils.js";
import { ORDER_KIND_LIVE, ORDER_KIND_TEST, getOrderDelegate } from "./order-kind.js";
import { applyDueScheduledCatalogPriceListImports } from "./catalog-price-list-import.js";
import { isMissingKitchenRegistrationTableError } from "./kitchen-registration-db.js";
import {
  CUTLERY_VARIANTS,
  getCutleryCatalogArticleNumbers,
  normalizeCutleryVariants,
  resolveCutleryCatalogArticles,
} from "./cutlery-accessories.js";
import { buildAuszugVariantMetadata } from "./auszug-variants.js";
import { isStandaloneCatalogBlendeItem } from "./catalog-pricing.js";
import {
  CATALOG_PRODUCT_INFORMATION_SELECT,
  resolveProductInformation,
} from "./product-information.js";
import { getBurger103898ProductInfo } from "./burger-103898-product-info.js";

const DEFAULT_KITCHEN_PROGRAMM_ID = "IP 2200";
const BURGER_103898_CATALOG_ARTICLE_OVERRIDES = [
  { itemCode: "CAB-WALL-BURGER103898-H5072", articleNumber: "H5072", price: 135 },
  { itemCode: "CAB-HOOD-BURGER103898-HFLH6072", articleNumber: "FH664621E+FWK124+HFLH6072", displayArticleNumber: "FH664621E + FWK124 + HFLH6072", price: 346 },
  { itemCode: "CAB-WALL-BURGER103898-H6072", articleNumber: "H6072", price: 146 },
  { itemCode: "CAB-WALL-BURGER103898-H3072", articleNumber: "H3072", price: 124 },
];

export const LOCKED_BASE_COLORS = ["springgreen", "red", "#7f001f", "#980026"];
export const MONTAGE_REQUIRED_CODES = [
  "CAB-BASE-030",
  "CAB-WALL-L-060",
  "CAB-WALL-R-060",
  "CAB-WALL-B-L-600",
  "CAB-WALL-B-ML-600",
  "CAB-HOOD-B-600",
  "CAB-WALL-B-MR-600",
  "CAB-WALL-B-R-600",
  "HOOD-B-FH664621E",
  "WM-B-EWA34660W",
  "SINKBASE-B-600",
  "DISH-B-600-STD",
  "OVEN-B-600-HOB",
  "CAB-BASE-B-STR",
  "HOOD-C-FH664621E",
  "CAB-COOK-C-L-600",
  "OVEN-C-600-HOB",
  "CAB-COOK-C-R-600",
  "CAB-WALL-C-L-600",
  "CAB-WALL-C-ML-600",
  "CAB-WALL-C-MR-600",
  "CAB-WALL-C-R-600",
  "WM-C-EWA34660W",
  "SINKBASE-C-600",
  "DISH-C-600-STD",
  "CAB-DRAWER-C-3D",
  "CAB-WALL-LS-400",
  "CAB-HOOD-LS-600",
  "CAB-WALL-LS-500",
  "CAB-WALL-LS-600",
  "HOOD-LS-FH664621E",
  "CAB-BASE-LS-400",
  "OVEN-LS-600-HOB",
  "CAB-BASE-LS-500",
  "SINKBASE-LS-600",
  "DISH-LS-600-STD",
  "CAB-DRAWER-LS-300",
  "T3D-CAB-WALL-01",
  "T3D-CAB-WALL-02",
  "T3D-CAB-WALL-03",
  "T3D-CAB-WALL-04",
  "T3D-CAB-WALL-05",
  "T3D-WASHER-001",
  "T3D-SINKBASE-001",
  "T3D-DISH-001",
  "T3D-OVEN-HOB-001",
  "T3D-CAB-STORAGE-001",
  "T3D-HOOD-001",
  "T3D-CAB-CORNER-001",
  "T3D-CAB-BASE-001",
  "T3D-CAB-DRAWERS-001",
];

/** Built-in appliances / standalone hoods: in `MONTAGE_REQUIRED_CODES` for legacy rules but not "cabinet" units for montage eligibility. */
export const MONTAGE_NON_CABINET_COMPONENT_CODES = [
  "WM-B-EWA34660W",
  "WM-C-EWA34660W",
  "DISH-B-600-STD",
  "DISH-C-600-STD",
  "OVEN-B-600-HOB",
  "OVEN-C-600-HOB",
  "OVEN-LS-600-HOB",
  "HOOD-B-FH664621E",
  "HOOD-C-FH664621E",
  "HOOD-LS-FH664621E",
  "DISH-LS-600-STD",
  "T3D-WASHER-001",
  "T3D-DISH-001",
  "T3D-OVEN-HOB-001",
  "T3D-HOOD-001",
];

export const MONTAGE_CABINET_CODES = MONTAGE_REQUIRED_CODES.filter(
  (code) => !MONTAGE_NON_CABINET_COMPONENT_CODES.includes(code),
);

export const LEGACY_ICON_KEYS = [
  "dishwasher",
  "extractor_hood",
  "wall_cabinet_single_light",
  "wall_cabinet_double_light",
  "wall_cabinet_plain",
  "washing_machine_base",
  "sink_base",
  "dishwasher_base",
  "oven_base",
  "drawer_base",
  "worktop",
  "drawer_base_two",
  "drawer_base_three",
  "tall_refrigerator",
  "extractor_hood_chimney",
  "wall_cabinet_standard",
  "under_cabinet_light",
  "sink_faucet",
  "waste_system",
  "cutlery_insert",
  "lighting_set",
  "delivery_assembly",
  "pickup",
];

const KITCHEN_SLUG_ALIASES = {
  "105845-modul-2": "ab-105845",
};

function resolveKitchenSlugAlias(slug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  return KITCHEN_SLUG_ALIASES[normalizedSlug] || slug;
}

function isMissingKitchenItemProductImagePath(error) {
  const message = String(error?.message || "");
  return (
    (error?.code === "P2022" || /column .* does not exist/i.test(message)) &&
    message.includes("KitchenItem.productImagePath")
  );
}

function isMissingKitchenItemNameDe(error) {
  const message = String(error?.message || "");
  return (
    (error?.code === "P2022" || /column .* does not exist/i.test(message)) &&
    message.includes("KitchenItem.nameDe")
  );
}

const KITCHEN_ITEM_BASE_SELECT_WITHOUT_PRODUCT_IMAGE_PATH = {
  id: true,
  kitchenId: true,
  itemType: true,
  code: true,
  articleNumber: true,
  name: true,
  price: true,
  widthMm: true,
  heightMm: true,
  depthMm: true,
  infoText: true,
  productInfoPdfPath: true,
  productInfoSummary: true,
  productInfoKeyFacts: true,
  productInfoExtractedText: true,
  productInfoUpdatedAt: true,
  iconKey: true,
  colorKey: true,
  componentKey: true,
  isLocked: true,
  isActive: true,
  sortOrder: true,
  blendeCode: true,
  blendeLabel: true,
  blendePrice: true,
  catalogArticleId: true,
  catalogArticle: {
    select: {
      id: true,
      articleNumber: true,
      name: true,
      nameDe: true,
      price: true,
      widthMm: true,
      heightMm: true,
      depthMm: true,
      ...CATALOG_PRODUCT_INFORMATION_SELECT,
    },
  },
  catalogBlendeId: true,
  catalogBlende: true,
  catalogBlendeQuantity: true,
  catalogServiceId: true,
  catalogService: {
    select: {
      code: true,
      name: true,
      nameDe: true,
      price: true,
    },
  },
  catalogPriceSyncMode: true,
  createdAt: true,
  updatedAt: true,
};

export async function getActiveKitchens() {
  return prisma.kitchen.findMany({
    where: { status: KitchenStatus.ACTIVE },
    orderBy: { name: "asc" },
  });
}

export async function getKitchenBySlug(slug) {
  const resolvedSlug = resolveKitchenSlugAlias(slug);
  await applyDueScheduledCatalogPriceListImports(prisma);
  const kitchenProgram = await prisma.kitchen.findUnique({
    where: { slug: resolvedSlug },
    select: { programmId: true },
  });
  const programmId = kitchenProgram?.programmId || DEFAULT_KITCHEN_PROGRAMM_ID;

  try {
    const kitchen = await prisma.kitchen.findUnique({
      where: { slug: resolvedSlug },
      include: {
        claimParts: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { partKey: "asc" }],
        },
        items: {
          where: { isActive: true },
          include: {
            catalogArticle: {
              select: {
                id: true,
                articleNumber: true,
                name: true,
                nameDe: true,
                price: true,
                widthMm: true,
                heightMm: true,
                depthMm: true,
                ...CATALOG_PRODUCT_INFORMATION_SELECT,
                programPrices: {
                  where: { programmId, isActive: true },
                  select: { price: true },
                  take: 1,
                },
              },
            },
            catalogBlende: {
              include: {
                programPrices: {
                  where: { programmId, isActive: true },
                  select: { price: true },
                  take: 1,
                },
              },
            },
            catalogService: {
              select: {
                code: true,
                name: true,
                nameDe: true,
                price: true,
                programPrices: {
                  where: { programmId, isActive: true },
                  select: { price: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
    return attachCutleryCatalogVariants(await attachBurger103898CatalogOverrides(kitchen, programmId));
  } catch (error) {
    if (!isMissingKitchenItemProductImagePath(error) && !isMissingKitchenItemNameDe(error)) {
      throw error;
    }

    // Compatibility fallback for databases that have not applied the productImagePath migration yet.
    const kitchen = await prisma.kitchen.findUnique({
      where: { slug: resolvedSlug },
      include: {
        claimParts: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { partKey: "asc" }],
        },
        items: {
          where: { isActive: true },
          orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
          select: KITCHEN_ITEM_BASE_SELECT_WITHOUT_PRODUCT_IMAGE_PATH,
        },
      },
    });
    return attachCutleryCatalogVariants(await attachBurger103898CatalogOverrides(kitchen, programmId));
  }
}

async function attachBurger103898CatalogOverrides(kitchen, programmId) {
  if (!kitchen || kitchen.slug !== "burger-103898") return kitchen;

  const cornerCabinet = kitchen.items?.find(
    (item) => item.code === "CAB-BASE-BURGER103898-US60-UPE65",
  );
  const configuredArticleOverrides = BURGER_103898_CATALOG_ARTICLE_OVERRIDES
    .map((override) => ({
      ...override,
      item: kitchen.items?.find((item) => item.code === override.itemCode),
    }))
    .filter((override) => override.item);

  const [burgerBlende, burgerArticles] = await Promise.all([
    cornerCabinet
      ? prisma.catalogBlende.findUnique({
        where: { code: "UPE65" },
        include: {
          programPrices: {
            where: { programmId, isActive: true },
            select: { price: true },
            take: 1,
          },
        },
      })
      : Promise.resolve(null),
    configuredArticleOverrides.length
      ? prisma.catalogArticle.findMany({
        where: {
          articleNumber: { in: configuredArticleOverrides.map((override) => override.articleNumber) },
          isActive: true,
        },
        include: {
          programPrices: {
            where: { programmId, isActive: true },
            select: { price: true },
            take: 1,
          },
        },
      })
      : Promise.resolve([]),
  ]);

  if (cornerCabinet) {
    const configuredBurgerPrice = Number(cornerCabinet.blendePrice ?? 79);
    const resolvedBurgerBlende = burgerBlende?.isActive
      ? burgerBlende
      : {
        ...(cornerCabinet.catalogBlende || {}),
        code: "UPE65",
        name: "Corner filler panel for Lower cabinet",
        nameDe: "Eckpassblende Unterschrank",
        price: configuredBurgerPrice,
        programPrices: [{ price: configuredBurgerPrice }],
      };

    cornerCabinet.catalogBlendeId = resolvedBurgerBlende.id || cornerCabinet.catalogBlendeId || "burger-upe65";
    cornerCabinet.catalogBlende = resolvedBurgerBlende;
    cornerCabinet.blendeCode = "UPE65";
    cornerCabinet.blendeLabel = resolvedBurgerBlende.nameDe || resolvedBurgerBlende.name;
    cornerCabinet.blendePrice = resolvedBurgerBlende.programPrices?.[0]?.price ?? resolvedBurgerBlende.price;
  }

  const burgerArticleByNumber = new Map(
    burgerArticles.map((article) => [article.articleNumber, article]),
  );
  for (const override of configuredArticleOverrides) {
    const catalogArticle = burgerArticleByNumber.get(override.articleNumber);
    const resolvedArticle = catalogArticle?.isActive
      ? catalogArticle
      : {
        ...(override.item.catalogArticle || {}),
        articleNumber: override.articleNumber,
        price: Number(override.item.price ?? override.price),
        programPrices: [{ price: Number(override.item.price ?? override.price) }],
      };
    override.item.catalogArticleId = resolvedArticle.id
      || override.item.catalogArticleId
      || `burger-${override.articleNumber}`;
    override.item.catalogArticle = resolvedArticle;
    override.item.articleNumber = override.displayArticleNumber || override.articleNumber;
  }

  return kitchen;
}

async function attachCutleryCatalogVariants(kitchen) {
  if (!kitchen) return kitchen;

  try {
    const [cutleryArticles, auszugVariantArticles] = await Promise.all([
      prisma.catalogArticle.findMany({
        where: {
          itemType: ItemType.ACCESSORY,
          isActive: true,
          articleNumber: {
            in: getCutleryCatalogArticleNumbers(kitchen.slug, kitchen.programmId),
          },
        },
        include: {
          programPrices: {
            where: { programmId: kitchen.programmId, isActive: true },
            select: { programmId: true, price: true, isActive: true },
            take: 1,
          },
        },
        orderBy: [{ widthMm: "asc" }, { articleNumber: "asc" }],
      }),
      prisma.catalogArticle.findMany({
        where: {
          itemType: ItemType.COMPONENT,
          // Burger's imported supplier list keeps US2A drawer rows marked
          // inactive globally; they are nevertheless valid for Burger 103898.
          ...(kitchen.slug === "burger-103898" ? {} : { isActive: true }),
          articleNumber: { startsWith: "US2A" },
        },
        include: {
          programPrices: {
            where: { programmId: kitchen.programmId, isActive: true },
            select: { price: true },
            take: 1,
          },
        },
        orderBy: [{ widthMm: "asc" }, { articleNumber: "asc" }],
      }),
    ]);

    return {
      ...kitchen,
      cutleryVariants: cutleryArticles.length
        ? normalizeCutleryVariants(
          resolveCutleryCatalogArticles(cutleryArticles, kitchen.slug, kitchen.programmId).map((article) => ({
            articleNumber: article.articleNumber,
            name: article.name,
            nameDe: article.nameDe || "",
            widthCm: article.widthMm ? Number(article.widthMm) / 10 : null,
            price: Number(article.programPrices?.[0]?.price ?? article.price),
          })),
        )
        : normalizeCutleryVariants(CUTLERY_VARIANTS),
      auszugVariantArticles,
    };
  } catch {
    return kitchen;
  }
}

export async function listKitchensForAdmin() {
  return prisma.kitchen.findMany({
    include: {
      _count: { select: { items: true, orders: true, contracts: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listKitchenItemCodeOptionsForAdmin() {
  return [
    { code: "CAB-WALL-600-01", label: "COMPONENT - Wall cabinet 600 mm. Use -02, -03 for repeats." },
    { code: "CAB-WALL-500-01", label: "COMPONENT - Wall cabinet 500 mm. Use -02, -03 for repeats." },
    { code: "CAB-WALL-400-01", label: "COMPONENT - Wall cabinet 400 mm. Use -02, -03 for repeats." },
    { code: "CAB-HOOD-600", label: "COMPONENT - Hood wall cabinet / extractor cabinet" },
    { code: "HOOD-600", label: "COMPONENT - Extractor hood appliance" },
    { code: "CAB-BASE-600", label: "COMPONENT - Base cabinet 600 mm" },
    { code: "CAB-BASE-500", label: "COMPONENT - Base cabinet 500 mm" },
    { code: "CAB-BASE-400", label: "COMPONENT - Base cabinet 400 mm" },
    { code: "CAB-DRAWER-600", label: "COMPONENT - Drawer base cabinet 600 mm" },
    { code: "CAB-DRAWER-300", label: "COMPONENT - Drawer base cabinet 300 mm" },
    { code: "SINKBASE-600", label: "COMPONENT - Sink base cabinet 600 mm" },
    { code: "DISH-600-STD", label: "COMPONENT - Dishwasher 600 mm" },
    { code: "WM-600-STD", label: "COMPONENT - Washing machine 600 mm" },
    { code: "OVEN-HOB-600", label: "COMPONENT - Oven and hob set 600 mm" },
    { code: "REF-545-1800", label: "COMPONENT - Tall refrigerator" },
    { code: "TOP-MAIN", label: "COMPONENT - Main worktop" },
    { code: "TOP-RETURN", label: "COMPONENT - Return worktop / L-shape worktop" },
    { code: "SINK-WASTE", label: "COMPONENT - Sink and waste system" },
    { code: "ACC-WASTE-001", label: "ACCESSORY - Waste separation system" },
    { code: "ACC-CUTLERY-ZB60SG", label: "ACCESSORY - Cutlery insert 60 cm" },
    { code: "ACC-LIGHT-003", label: "ACCESSORY - LED lighting set" },
    { code: "SVC-MONTAGE-001", label: "SERVICE - Delivery, Carry-in, Assembly and Installation" },
    { code: "SVC-PICKUP-001", label: "SERVICE - Pickup at logistics location" },
  ];
}

export async function getKitchenById(id) {
  let kitchen;
  try {
    kitchen = await prisma.kitchen.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true, orders: true, contracts: true } },
        contracts: {
          orderBy: [{ createdAt: "desc" }, { contractNumber: "asc" }],
        },
        items: {
          include: {
            catalogArticle: {
              select: {
                id: true,
                articleNumber: true,
                name: true,
                nameDe: true,
                price: true,
                widthMm: true,
                heightMm: true,
                depthMm: true,
                ...CATALOG_PRODUCT_INFORMATION_SELECT,
              },
            },
            catalogBlende: true,
            catalogService: {
              select: {
                code: true,
                name: true,
                nameDe: true,
                price: true,
              },
            },
          },
          orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
  } catch (error) {
    if (!isMissingKitchenItemProductImagePath(error) && !isMissingKitchenItemNameDe(error)) {
      throw error;
    }

    // Compatibility fallback for databases that have not applied the productImagePath migration yet.
    kitchen = await prisma.kitchen.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true, orders: true, contracts: true } },
        contracts: {
          orderBy: [{ createdAt: "desc" }, { contractNumber: "asc" }],
        },
        items: {
          orderBy: [{ itemType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
          select: KITCHEN_ITEM_BASE_SELECT_WITHOUT_PRODUCT_IMAGE_PATH,
        },
      },
    });
  }

  if (!kitchen) return null;
  return {
    ...kitchen,
    contracts: await attachHousingCompaniesToContracts(kitchen.contracts),
  };
}

export async function listPropertyOwnersForAdmin() {
  const companies = await prisma.$queryRaw`
    SELECT
      hc."id",
      hc."name",
      hc."address",
      hc."email",
      hc."phone",
      hc."notes",
      hc."createdAt",
      hc."updatedAt",
      COUNT(DISTINCT pobj."id")::int AS "objectCount",
      COUNT(kc."id")::int AS "contractCount"
    FROM "HousingCompany" hc
    LEFT JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
    LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    GROUP BY hc."id"
    ORDER BY hc."createdAt" DESC, hc."name" ASC
  `;

  const objects = await prisma.$queryRaw`
    SELECT
      pobj."id",
      pobj."name",
      pobj."housingCompanyId",
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      pobj."contactPhone",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      pobj."createdAt",
      pobj."updatedAt",
      COUNT(kc."id")::int AS "contractCount"
    FROM "PropertyObject" pobj
    LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    GROUP BY pobj."id", prj."id"
    ORDER BY pobj."createdAt" DESC, pobj."name" ASC
  `;

  const objectsByCompanyId = new Map();
  objects.forEach((object) => {
    const companyObjects = objectsByCompanyId.get(object.housingCompanyId) || [];
    companyObjects.push({
      id: object.id,
      name: object.name,
      housingCompanyId: object.housingCompanyId,
      projectId: object.projectId || null,
      projectName: object.projectName || null,
      projectCode: object.projectCode || null,
      projectStatus: object.projectStatus || "active",
      projectDescription: object.projectDescription || null,
      projectManagerName: object.projectManagerName || null,
      contactPhone: object.contactPhone,
      country: object.country,
      city: object.city,
      postalCode: object.postalCode,
      address1: object.address1,
      address2: object.address2,
      createdAt: object.createdAt,
      updatedAt: object.updatedAt,
      _count: { contracts: Number(object.contractCount || 0) },
    });
    objectsByCompanyId.set(object.housingCompanyId, companyObjects);
  });

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    address: company.address,
    email: company.email,
    phone: company.phone,
    notes: company.notes,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    propertyObjects: objectsByCompanyId.get(company.id) || [],
    _count: {
      propertyObjects: Number(company.objectCount || 0),
      contracts: Number(company.contractCount || 0),
    },
  }));
}

function normalizeLookupId(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

export async function getPropertyOwnerForAdmin(id) {
  const normalizedId = normalizeLookupId(id);
  const owners = await listPropertyOwnersForAdmin();
  return owners.find((owner) => owner.id === normalizedId || owner.id === id) || null;
}

export async function listPropertyObjectsForAdmin(filters = {}) {
  const whereParts = [];
  if (filters.housingCompanyId) whereParts.push(Prisma.sql`pobj."housingCompanyId" = ${filters.housingCompanyId}`);
  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;

  const rows = await prisma.$queryRaw`
    SELECT
      pobj."id",
      pobj."name",
      pobj."housingCompanyId",
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      pobj."contactPhone",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."name" AS "housingCompanyName",
      hc."email" AS "housingCompanyEmail",
      hc."phone" AS "housingCompanyPhone",
      COUNT(kc."id")::int AS "contractCount"
    FROM "PropertyObject" pobj
    JOIN "HousingCompany" hc ON hc."id" = pobj."housingCompanyId"
    LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    ${whereSql}
    GROUP BY pobj."id", hc."id", prj."id"
    ORDER BY hc."createdAt" DESC, pobj."createdAt" DESC, pobj."name" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    housingCompanyId: row.housingCompanyId,
    projectId: row.projectId || null,
    projectName: row.projectName || null,
    projectCode: row.projectCode || null,
    projectStatus: row.projectStatus || "active",
    projectDescription: row.projectDescription || null,
    projectManagerName: row.projectManagerName || null,
    contactPhone: row.contactPhone,
    country: row.country,
    city: row.city,
    postalCode: row.postalCode,
    address1: row.address1,
    address2: row.address2,
    housingCompany: {
      id: row.housingCompanyId,
      name: row.housingCompanyName,
      email: row.housingCompanyEmail,
      phone: row.housingCompanyPhone,
    },
    _count: { contracts: Number(row.contractCount || 0) },
  }));
}

export async function listProjectsForAdmin(filters = {}) {
  const whereParts = [];
  if (filters.housingCompanyId) whereParts.push(Prisma.sql`prj."housingCompanyId" = ${filters.housingCompanyId}`);
  if (filters.projectId) whereParts.push(Prisma.sql`prj."id" = ${filters.projectId}`);
  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;

  const rows = await prisma.$queryRaw`
    SELECT
      prj."id",
      prj."name",
      prj."projectCode",
      prj."status",
      prj."description",
      prj."managerName",
      prj."housingCompanyId",
      prj."propertyObjectId",
      prj."createdAt",
      prj."updatedAt",
      pobj."name" AS "propertyObjectName",
      pobj."contactPhone",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."name" AS "housingCompanyName",
      hc."email" AS "housingCompanyEmail",
      hc."phone" AS "housingCompanyPhone",
      COUNT(kc."id")::int AS "contractCount"
    FROM "Project" prj
    JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    ${whereSql}
    GROUP BY prj."id", pobj."id", hc."id"
    ORDER BY hc."createdAt" DESC, prj."createdAt" DESC, prj."name" ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    projectCode: row.projectCode || null,
    status: row.status || "active",
    description: row.description || null,
    managerName: row.managerName || null,
    housingCompanyId: row.housingCompanyId,
    propertyObjectId: row.propertyObjectId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    propertyObject: {
      id: row.propertyObjectId,
      name: row.propertyObjectName,
      contactPhone: row.contactPhone,
      country: row.country,
      city: row.city,
      postalCode: row.postalCode,
      address1: row.address1,
      address2: row.address2,
      housingCompanyId: row.housingCompanyId,
    },
    housingCompany: {
      id: row.housingCompanyId,
      name: row.housingCompanyName,
      email: row.housingCompanyEmail,
      phone: row.housingCompanyPhone,
    },
    _count: { contracts: Number(row.contractCount || 0) },
  }));
}

export async function listKitchenContractsForAdmin(filters = {}) {
  const whereParts = [];
  const havingParts = [];
  if (filters.contractId) whereParts.push(Prisma.sql`kc."id" = ${filters.contractId}`);
  if (filters.contractType === "ARC" || filters.contractType === "FRG") {
    whereParts.push(Prisma.sql`kc."contractType" = ${filters.contractType}`);
  }
  if (filters.kitchenId) whereParts.push(Prisma.sql`kc."kitchenId" = ${filters.kitchenId}`);
  if (filters.housingCompanyId || filters.ownerId) whereParts.push(Prisma.sql`hc."id" = ${filters.housingCompanyId || filters.ownerId}`);
  if (filters.projectId) whereParts.push(Prisma.sql`prj."id" = ${filters.projectId}`);
  if (filters.status === "active") whereParts.push(Prisma.sql`kc."isActive" = true`);
  if (filters.status === "inactive") whereParts.push(Prisma.sql`kc."isActive" = false`);
  if (filters.usage === "unused") havingParts.push(Prisma.sql`COUNT(o."id") = 0`);
  if (filters.usage === "used") havingParts.push(Prisma.sql`COUNT(o."id") >= 1`);
  if (filters.usage === "once") havingParts.push(Prisma.sql`COUNT(o."id") = 1`);
  if (filters.usage === "multiple") havingParts.push(Prisma.sql`COUNT(o."id") >= 2`);
  if (filters.query) {
    const query = `%${filters.query}%`;
    whereParts.push(Prisma.sql`(
      kc."contractNumber" ILIKE ${query}
      OR prj."name" ILIKE ${query}
      OR prj."projectCode" ILIKE ${query}
      OR prj."status" ILIKE ${query}
      OR prj."description" ILIKE ${query}
      OR prj."managerName" ILIKE ${query}
      OR pobj."name" ILIKE ${query}
      OR pobj."country" ILIKE ${query}
      OR pobj."city" ILIKE ${query}
      OR pobj."postalCode" ILIKE ${query}
      OR pobj."address1" ILIKE ${query}
      OR hc."name" ILIKE ${query}
      OR k."name" ILIKE ${query}
    )`);
  }

  const whereSql = whereParts.length ? Prisma.sql`WHERE ${Prisma.join(whereParts, " AND ")}` : Prisma.empty;
  const havingSql = havingParts.length ? Prisma.sql`HAVING ${Prisma.join(havingParts, " AND ")}` : Prisma.empty;
  const rows = await prisma.$queryRaw`
    SELECT
      kc."id",
      kc."contractNumber",
      kc."contractType",
      kc."kitchenId",
      kc."projectId",
      kc."claimPlanPdfPath",
      kc."claimPlanPreviewPath",
      kc."isActive",
      kc."usedAt",
      kc."building",
      kc."floor",
      kc."unitNumber",
      kc."notes",
      kc."createdAt",
      kc."updatedAt",
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      k."id" AS "kitchenRecordId",
      k."slug" AS "kitchenSlug",
      k."name" AS "kitchenName",
      pobj."id" AS "propertyObjectRecordId",
      pobj."name" AS "propertyObjectName",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."id" AS "housingCompanyRecordId",
      hc."name" AS "housingCompanyName",
      hc."email",
      hc."phone",
      hc."notes" AS "housingCompanyNotes",
      latest_order."firstName" AS "latestOrderFirstName",
      latest_order."lastName" AS "latestOrderLastName",
      latest_order."address1" AS "latestOrderAddress1",
      latest_order."address2" AS "latestOrderAddress2",
      latest_order."postalCode" AS "latestOrderPostalCode",
      latest_order."city" AS "latestOrderCity",
      latest_order."country" AS "latestOrderCountry",
      latest_order."createdAt" AS "latestOrderCreatedAt",
      asset."previewBytes" IS NOT NULL AS "hasUploadedClaimPlanPreview",
      asset."pdfBytes" IS NOT NULL AS "hasUploadedClaimPlanPdf",
      asset."previewFileName" AS "uploadedClaimPlanPreviewFileName",
      asset."pdfFileName" AS "uploadedClaimPlanPdfFileName",
      COUNT(o."id")::int AS "orderCount"
    FROM "KitchenContract" kc
    JOIN "Kitchen" k ON k."id" = kc."kitchenId"
    LEFT JOIN "Project" prj ON prj."id" = kc."projectId"
    LEFT JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    LEFT JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
    LEFT JOIN "Order" o ON o."kitchenContractId" = kc."id"
    LEFT JOIN "KitchenContractClaimPlanAsset" asset ON asset."kitchenContractId" = kc."id"
    LEFT JOIN LATERAL (
      SELECT
        oo."firstName",
        oo."lastName",
        oo."address1",
        oo."address2",
        oo."postalCode",
        oo."city",
        oo."country",
        oo."createdAt"
      FROM "Order" oo
      WHERE oo."kitchenContractId" = kc."id"
      ORDER BY oo."createdAt" DESC, oo."id" DESC
      LIMIT 1
    ) latest_order ON true
    ${whereSql}
    GROUP BY
      kc."id",
      prj."id",
      k."id",
      pobj."id",
      hc."id",
      asset."id",
      latest_order."firstName",
      latest_order."lastName",
      latest_order."address1",
      latest_order."address2",
      latest_order."postalCode",
      latest_order."city",
      latest_order."country",
      latest_order."createdAt"
    ${havingSql}
    ORDER BY kc."createdAt" DESC, kc."contractNumber" ASC
  `;

  const contracts = rows.map((row) => ({
    id: row.id,
    contractNumber: row.contractNumber,
    contractType: row.contractType === "ARC" ? "ARC" : "FRG",
    kitchenId: row.kitchenId,
    projectId: row.projectId || null,
    projectName: row.projectName || null,
    projectCode: row.projectCode || null,
    projectStatus: row.projectStatus || "active",
    projectDescription: row.projectDescription || null,
    projectManagerName: row.projectManagerName || null,
    claimPlanPdfPath: row.claimPlanPdfPath || null,
    claimPlanPreviewPath: row.claimPlanPreviewPath || null,
    hasUploadedClaimPlanPreview: Boolean(row.hasUploadedClaimPlanPreview),
    hasUploadedClaimPlanPdf: Boolean(row.hasUploadedClaimPlanPdf),
    uploadedClaimPlanPreviewFileName: row.uploadedClaimPlanPreviewFileName || null,
    uploadedClaimPlanPdfFileName: row.uploadedClaimPlanPdfFileName || null,
    housingCompanyId: row.housingCompanyRecordId,
    ownerId: row.housingCompanyRecordId,
    isActive: row.isActive,
    usedAt: row.usedAt,
    country: row.country,
    city: row.city,
    postalCode: row.postalCode,
    address1: row.address1,
    address2: row.address2,
    building: row.building,
    floor: row.floor,
    unitNumber: row.unitNumber,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    kitchen: {
      id: row.kitchenRecordId,
      slug: row.kitchenSlug,
      name: row.kitchenName,
    },
    propertyObject: row.propertyObjectRecordId
      ? {
          id: row.propertyObjectRecordId,
          name: row.propertyObjectName,
          projectId: row.projectId || null,
          projectName: row.projectName || null,
          projectCode: row.projectCode || null,
          projectStatus: row.projectStatus || "active",
          projectDescription: row.projectDescription || null,
          projectManagerName: row.projectManagerName || null,
          housingCompanyId: row.housingCompanyRecordId,
          country: row.country,
          city: row.city,
          postalCode: row.postalCode,
          address1: row.address1,
          address2: row.address2,
        }
      : null,
    project: row.projectId
      ? {
          id: row.projectId,
          name: row.projectName || "",
          projectCode: row.projectCode || null,
          status: row.projectStatus || "active",
          description: row.projectDescription || null,
          managerName: row.projectManagerName || null,
          housingCompanyId: row.housingCompanyRecordId,
          propertyObjectId: row.propertyObjectRecordId,
          propertyObject: row.propertyObjectRecordId
            ? {
                id: row.propertyObjectRecordId,
                name: row.propertyObjectName,
                housingCompanyId: row.housingCompanyRecordId,
                country: row.country,
                city: row.city,
                postalCode: row.postalCode,
                address1: row.address1,
                address2: row.address2,
              }
            : null,
        }
      : null,
    housingCompany: row.housingCompanyRecordId
      ? {
          id: row.housingCompanyRecordId,
          name: row.housingCompanyName,
          email: row.email,
          phone: row.phone,
          notes: row.housingCompanyNotes,
        }
      : null,
    owner: row.housingCompanyRecordId
      ? {
          id: row.housingCompanyRecordId,
          name: row.housingCompanyName,
          email: row.email,
          phone: row.phone,
          notes: row.housingCompanyNotes,
        }
      : null,
    latestOrderAddress: row.latestOrderAddress1
      ? {
          firstName: row.latestOrderFirstName,
          lastName: row.latestOrderLastName,
          address1: row.latestOrderAddress1,
          address2: row.latestOrderAddress2,
          postalCode: row.latestOrderPostalCode,
          city: row.latestOrderCity,
          country: row.latestOrderCountry,
          createdAt: row.latestOrderCreatedAt,
        }
      : null,
    _count: { orders: Number(row.orderCount || 0) },
  }));

  return attachOrdersToContracts(await attachRegistrationsToContracts(contracts));
}

export async function getKitchenContractForAdmin(id) {
  const contracts = await listKitchenContractsForAdmin({ contractId: id });
  const contract = contracts[0] || null;
  if (!contract) return null;

  const appliances = await prisma.contractAppliance.findMany({
    where: { kitchenContractId: contract.id },
    orderBy: [{ applianceType: "asc" }],
  });
  const inventoryState = await prisma.kitchenContract.findUnique({
    where: { id }, select: { appliancesConfigured: true },
  });
  return { ...contract, appliances, appliancesConfigured: inventoryState?.appliancesConfigured || false };
}

async function attachRegistrationsToContracts(contracts) {
  const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
  if (!contractIds.length) return contracts;

  let registrations = [];
  try {
    registrations = await prisma.kitchenRegistration.findMany({
      where: { kitchenContractId: { in: contractIds } },
      select: {
        id: true,
        kitchenContractId: true,
        fullName: true,
        email: true,
        phone: true,
        addressNote: true,
        isActive: true,
        registeredAt: true,
        deactivatedAt: true,
        verifiedAt: true,
        verificationExpiresAt: true,
      },
      orderBy: [
        { kitchenContractId: "asc" },
        { isActive: "desc" },
        { registeredAt: "desc" },
        { id: "desc" },
      ],
    });
  } catch (error) {
    if (!isMissingKitchenRegistrationTableError(error)) {
      throw error;
    }
  }

  const registrationsByContractId = new Map();
  registrations.forEach((registration) => {
    const contractRegistrations = registrationsByContractId.get(registration.kitchenContractId) || [];
    contractRegistrations.push(registration);
    registrationsByContractId.set(registration.kitchenContractId, contractRegistrations);
  });

  return contracts.map((contract) => {
    const contractRegistrations = registrationsByContractId.get(contract.id) || [];
    const activeRegistration = contractRegistrations.find((registration) => registration.isActive) || null;
    const previousRegistrations = contractRegistrations.filter(
      (registration) => !registration.isActive && registration.verifiedAt,
    );
    const pendingRegistrations = contractRegistrations.filter(
      (registration) => !registration.isActive && !registration.verifiedAt && !registration.deactivatedAt,
    );

    return {
      ...contract,
      activeRegistration,
      previousRegistrations,
      pendingRegistrations,
      registrations: contractRegistrations,
    };
  });
}

async function attachOrdersToContracts(contracts) {
  const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
  if (!contractIds.length) return contracts;

  const orders = await prisma.order.findMany({
    where: { kitchenContractId: { in: contractIds } },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalPrice: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      kitchenContractId: true,
    },
    orderBy: [{ kitchenContractId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const ordersByContractId = new Map();
  orders.forEach((order) => {
    const contractOrders = ordersByContractId.get(order.kitchenContractId) || [];
    contractOrders.push({
      ...order,
      totalPrice: Number(order.totalPrice || 0),
      contractOrderSequence: contractOrders.length + 1,
    });
    ordersByContractId.set(order.kitchenContractId, contractOrders);
  });

  return contracts.map((contract) => ({
    ...contract,
    orders: [...(ordersByContractId.get(contract.id) || [])].reverse(),
  }));
}

async function attachHousingCompaniesToContracts(contracts) {
  const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
  if (!contractIds.length) return contracts;

  const rows = await prisma.$queryRaw`
    SELECT
      kc."id" AS "contractId",
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      prj."propertyObjectId",
      pobj."id" AS "propertyObjectRecordId",
      pobj."name" AS "propertyObjectName",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."id" AS "housingCompanyRecordId",
      hc."name" AS "housingCompanyName",
      hc."email",
      hc."phone",
      hc."notes",
      hc."createdAt",
      hc."updatedAt"
    FROM "KitchenContract" kc
    LEFT JOIN "Project" prj ON prj."id" = kc."projectId"
    LEFT JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    LEFT JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
    WHERE kc."id" IN (${Prisma.join(contractIds)})
  `;
  const companyByContractId = new Map(
    rows.map((row) => [
      row.contractId,
      {
        projectId: row.projectId || null,
        projectName: row.projectName || null,
        projectCode: row.projectCode || null,
        projectStatus: row.projectStatus || "active",
        projectDescription: row.projectDescription || null,
        projectManagerName: row.projectManagerName || null,
        project: {
          id: row.projectId || null,
          name: row.projectName || null,
          projectCode: row.projectCode || null,
          status: row.projectStatus || "active",
          description: row.projectDescription || null,
          managerName: row.projectManagerName || null,
          housingCompanyId: row.housingCompanyRecordId || null,
          propertyObjectId: row.propertyObjectId || null,
          propertyObject: row.propertyObjectRecordId
            ? {
                id: row.propertyObjectRecordId,
                name: row.propertyObjectName,
                housingCompanyId: row.housingCompanyRecordId,
                country: row.country,
                city: row.city,
                postalCode: row.postalCode,
                address1: row.address1,
                address2: row.address2,
              }
            : null,
        },
        propertyObject: row.propertyObjectRecordId
          ? {
              id: row.propertyObjectRecordId,
              name: row.propertyObjectName,
              projectId: row.projectId || null,
              projectName: row.projectName || null,
              projectCode: row.projectCode || null,
              projectStatus: row.projectStatus || "active",
              projectDescription: row.projectDescription || null,
              projectManagerName: row.projectManagerName || null,
              housingCompanyId: row.housingCompanyRecordId,
              country: row.country,
              city: row.city,
              postalCode: row.postalCode,
              address1: row.address1,
              address2: row.address2,
            }
          : null,
        housingCompanyId: row.housingCompanyRecordId || null,
        housingCompany: row.housingCompanyRecordId
          ? {
              id: row.housingCompanyRecordId,
              name: row.housingCompanyName,
              email: row.email,
              phone: row.phone,
              notes: row.notes,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            }
          : null,
      },
    ]),
  );

  return contracts.map((contract) => ({
    ...contract,
    projectId: companyByContractId.get(contract.id)?.projectId || null,
    projectName: companyByContractId.get(contract.id)?.projectName || null,
    project: companyByContractId.get(contract.id)?.project || null,
    propertyObject: companyByContractId.get(contract.id)?.propertyObject || null,
    housingCompanyId: companyByContractId.get(contract.id)?.housingCompanyId || null,
    housingCompany: companyByContractId.get(contract.id)?.housingCompany || null,
    ownerId: companyByContractId.get(contract.id)?.housingCompanyId || null,
    owner: companyByContractId.get(contract.id)?.housingCompany || null,
    country: companyByContractId.get(contract.id)?.propertyObject?.country || null,
    city: companyByContractId.get(contract.id)?.propertyObject?.city || null,
    postalCode: companyByContractId.get(contract.id)?.propertyObject?.postalCode || null,
    address1: companyByContractId.get(contract.id)?.propertyObject?.address1 || null,
    address2: companyByContractId.get(contract.id)?.propertyObject?.address2 || null,
  }));
}

export function serializeKitchenForLegacy(kitchen) {
  const items = kitchen.items || [];
  const claimParts = kitchen.claimParts || [];
  const auszugVariantArticles = kitchen.auszugVariantArticles || [];
  const toClientItem = (item) => {
    const catalogArticle = item.catalogArticleId ? item.catalogArticle : null;
    const catalogService = item.catalogServiceId ? item.catalogService : null;
    const catalogBlende = item.catalogBlendeId ? item.catalogBlende : null;
    const standaloneCatalogBlende = isStandaloneCatalogBlendeItem({
      ...item,
      catalogArticle,
      catalogBlende,
    });
    const dimensionlessCatalogBlende = (standaloneCatalogBlende && catalogBlende?.code === "UPK20")
      || (!catalogArticle
        && (item.iconKey === "blende" || String(item.componentKey || "").endsWith("-blende"))
        && String(item.articleNumber || "").trim().toUpperCase() === "UPK20");
    const claimProducts = claimParts.filter(
      (part) => String(part?.sourceKitchenItemCode || "") === String(item.code || ""),
    );
    const resolvedProductInformation = resolveProductInformation({ ...item, claimProducts });
    const kitchenSpecificProductInformation = getBurger103898ProductInfo(kitchen.slug, item.code);
    const productInformation = kitchenSpecificProductInformation
      ? {
          ...resolvedProductInformation,
          ...kitchenSpecificProductInformation,
          productImagePath: kitchenSpecificProductInformation.productImagePaths?.[0] || "",
        }
      : resolvedProductInformation;
    const catalogBlendeQuantity = Math.max(1, Number.parseInt(String(item.catalogBlendeQuantity || 1), 10) || 1);
    const articlePrice = catalogArticle?.programPrices?.[0]?.price ?? catalogArticle?.price;
    const blendePrice = catalogBlende?.programPrices?.[0]?.price ?? catalogBlende?.price;
    const servicePrice = catalogService?.programPrices?.[0]?.price ?? catalogService?.price;
    const missingBurgerProgramPrice = kitchen.programmId === "BURGER CINDY" && (
      (catalogArticle && !catalogArticle.programPrices?.length)
      || (catalogBlende && !catalogBlende.programPrices?.length)
      || (catalogService && !catalogService.programPrices?.length)
    );
    const catalogPrice = (() => {
      // Explicit included equipment keeps its kitchen snapshot even when the
      // same article also has an optional-item price in the shared catalog.
      if (item.isLocked && item.catalogPriceSyncMode === "LOCKED_INCLUDED") {
        return Number(item.price);
      }
      // The shared catalog's base price belongs to Impuls. A Burger kitchen
      // without a Burger program price keeps its kitchen-specific snapshot.
      if (missingBurgerProgramPrice) {
        return Number(item.price);
      }
      if (servicePrice != null) {
        return Number(servicePrice);
      }
      if (standaloneCatalogBlende && blendePrice != null) {
        return Number(blendePrice);
      }
      if (articlePrice == null) {
        return Number(item.price);
      }
      const blendeTotal = blendePrice != null ? Number(blendePrice) * catalogBlendeQuantity : 0;
      return Number(articlePrice) + blendeTotal;
    })();

    const articleVariants = {};
    const auszugVariant = item.itemType === ItemType.COMPONENT
      ? buildAuszugVariantMetadata(item, auszugVariantArticles)
      : null;
    if (auszugVariant) {
      articleVariants[auszugVariant.key] = auszugVariant;
    }

    return {
      id: item.id,
      catalogArticleId: item.catalogArticleId || "",
      catalogServiceId: item.catalogServiceId || "",
      catalogBlendeId: item.catalogBlendeId || "",
      code: item.code,
      articleNumber: item.articleNumber
        || catalogArticle?.articleNumber
        || (standaloneCatalogBlende ? catalogBlende?.code : "")
        || "",
      name: catalogArticle?.name
        || catalogService?.name
        || (standaloneCatalogBlende ? catalogBlende?.name : item.name),
      nameDe: catalogArticle?.nameDe
        || catalogService?.nameDe
        || (standaloneCatalogBlende ? catalogBlende?.nameDe : item.nameDe)
        || "",
      price: catalogPrice,
      widthMm: dimensionlessCatalogBlende ? null : catalogArticle ? catalogArticle.widthMm ?? null : item.widthMm ?? null,
      heightMm: dimensionlessCatalogBlende ? null : catalogArticle ? catalogArticle.heightMm ?? null : item.heightMm ?? null,
      depthMm: dimensionlessCatalogBlende ? null : catalogArticle ? catalogArticle.depthMm ?? null : item.depthMm ?? null,
      infoText: item.infoText || "",
      productImagePath: productInformation.productImagePath,
      productImagePaths: productInformation.productImagePaths || [],
      productInfoPdfPath: productInformation.productInfoPdfPath,
      productInfoSummary: productInformation.productInfoSummary,
      productInfoKeyFacts: productInformation.productInfoKeyFacts,
      productInfoExtractedText: productInformation.productInfoExtractedText,
      productInfoUpdatedAt: productInformation.productInfoUpdatedAt instanceof Date
        ? productInformation.productInfoUpdatedAt.toISOString()
        : "",
      iconKey: item.iconKey || "",
      colorKey: item.colorKey || "",
      componentKey: item.componentKey || "",
      isLocked: item.isLocked,
      itemType: item.itemType.toLowerCase(),
      blendeCode: standaloneCatalogBlende ? "" : catalogBlende?.code || item.blendeCode || "",
      blendeLabel: standaloneCatalogBlende
        ? ""
        : catalogBlende?.nameDe || catalogBlende?.name || item.blendeLabel || "",
      blendeName: standaloneCatalogBlende ? "" : catalogBlende?.name || "",
      blendeNameDe: standaloneCatalogBlende ? "" : catalogBlende?.nameDe || "",
      blendePrice: standaloneCatalogBlende
        ? null
        : kitchen.programmId === "BURGER CINDY" && catalogBlende && !catalogBlende.programPrices?.length
          ? item.blendePrice != null ? Number(item.blendePrice) : null
        : blendePrice != null
          ? Number(blendePrice)
          : item.blendePrice != null
            ? Number(item.blendePrice)
            : null,
      catalogBlendeQuantity: standaloneCatalogBlende
        ? null
        : catalogBlende ? catalogBlendeQuantity : (item.catalogBlendeQuantity || null),
      articleVariants,
    };
  };

  return {
    kitchen: {
      id: kitchen.id,
      slug: kitchen.slug,
      name: kitchen.name,
      description: kitchen.description || "",
    },
    components: items.filter((item) => item.itemType === ItemType.COMPONENT).map(toClientItem),
    accessories: items.filter((item) => item.itemType === ItemType.ACCESSORY).map(toClientItem),
    services: items.filter((item) => item.itemType === ItemType.SERVICE).map(toClientItem),
    cutleryVariants: normalizeCutleryVariants(kitchen.cutleryVariants || []),
    lockedBaseColors: LOCKED_BASE_COLORS,
    montageRequiredCodes: MONTAGE_REQUIRED_CODES,
    montageCabinetCodes: [
      ...new Set([
        ...MONTAGE_CABINET_CODES,
        ...items
          .filter((item) => item.itemType === ItemType.COMPONENT && item.code?.startsWith("CAB-"))
          .map((item) => item.code),
      ]),
    ],
  };
}

function buildOrderAdminSearch(query) {
  const contains = { contains: query, mode: "insensitive" };

  return [
    { orderNumber: contains },
    { firstName: contains },
    { lastName: contains },
    { email: contains },
    { city: contains },
    { postalCode: contains },
    { country: contains },
    { address1: contains },
    { address2: contains },
    {
      kitchen: {
        name: contains,
      },
    },
    {
      kitchenContract: {
        is: {
          OR: [
            { contractNumber: contains },
            {
              project: {
                is: {
                  OR: [
                    { name: contains },
                    { projectCode: contains },
                    { status: contains },
                    { description: contains },
                    { managerName: contains },
                    {
                      propertyObject: {
                        is: {
                          OR: [
                            { name: contains },
                            { city: contains },
                            { country: contains },
                            { postalCode: contains },
                            { address1: contains },
                            { address2: contains },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
  ];
}

export async function getOrdersForAdmin(filters = {}) {
  return getOrdersForAdminByKind(filters, ORDER_KIND_LIVE);
}

export async function getTestOrdersForAdmin(filters = {}) {
  return getOrdersForAdminByKind(filters, ORDER_KIND_TEST);
}

function getAdminOrderWhere(filters = {}) {
  const where = {};

  if (filters.kitchenId) where.kitchenId = filters.kitchenId;
  if (filters.status && Object.values(OrderStatus).includes(filters.status)) where.status = filters.status;

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const endDate = new Date(filters.dateTo);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = endDate;
    }
  }

  const query = String(filters.q || "").trim();
  if (query) {
    where.OR = buildOrderAdminSearch(query);
  }

  return where;
}

export async function getOrdersPageForAdmin(filters = {}, requestedPage = 1, orderKind = ORDER_KIND_LIVE) {
  const where = getAdminOrderWhere(filters);
  const delegate = getOrderDelegate(prisma, orderKind);
  const groups = await delegate.groupBy({
    by: ["status"], where, _count: { _all: true }, _sum: { totalPrice: true },
  });
  const statusCounts = { NEW: 0, EMAILED: 0, CONFIRMED: 0, CANCELLED: 0 };
  let totalOrders = 0;
  let confirmedGross = 0;
  for (const group of groups) {
    totalOrders += group._count._all;
    statusCounts[group.status] = group._count._all;
    if (group.status === "CONFIRMED") confirmedGross = Number(group._sum.totalPrice || 0);
  }
  const pagination = getAdminPagination(totalOrders, requestedPage);
  const items = await getOrdersForAdminByKind(filters, orderKind, pagination);
  const breakdown = getPriceBreakdown(confirmedGross);
  return {
    pagination: { ...pagination, items },
    summary: { totalOrders, statusCounts, confirmedGross, confirmedNet: breakdown.net, confirmedVat: breakdown.vat },
  };
}

async function getOrdersForAdminByKind(filters = {}, orderKind = ORDER_KIND_LIVE, pagination = null) {
  const where = getAdminOrderWhere(filters);
  const orders = await getOrderDelegate(prisma, orderKind).findMany({
    where,
    ...(pagination ? { skip: (pagination.page - 1) * pagination.pageSize, take: pagination.pageSize } : {}),
    include: {
      kitchen: {
        select: { id: true, slug: true, name: true },
      },
      kitchenContract: { select: { id: true, contractNumber: true } },
      items: { select: { id: true, code: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const serializableOrders = orders.map((order) => ({
    ...order,
    totalPrice: Number(order.totalPrice || 0),
  }));

  return addContractOrderSequence(serializableOrders, orderKind);
}

export async function getOrderById(id) {
  return getOrderByIdByKind(id, ORDER_KIND_LIVE);
}

export async function getTestOrderById(id) {
  return getOrderByIdByKind(id, ORDER_KIND_TEST);
}

async function getOrderByIdByKind(id, orderKind = ORDER_KIND_LIVE) {
  const order = await getOrderDelegate(prisma, orderKind).findUnique({
    where: { id },
    include: {
      kitchen: true,
      kitchenContract: true,
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

  if (!order) return null;
  const [sequencedOrder] = await addContractOrderSequence(await attachHousingCompaniesToOrderContracts([order]), orderKind);
  return sequencedOrder;
}

async function attachHousingCompaniesToOrderContracts(orders) {
  const contracts = orders.map((order) => order.kitchenContract).filter(Boolean);
  const hydratedContracts = await attachHousingCompaniesToContracts(contracts);
  const contractById = new Map(hydratedContracts.map((contract) => [contract.id, contract]));

  return orders.map((order) => ({
    ...order,
    kitchenContract: order.kitchenContractId ? contractById.get(order.kitchenContractId) || order.kitchenContract : order.kitchenContract,
  }));
}

async function addContractOrderSequence(orders, orderKind = ORDER_KIND_LIVE) {
  const contractIds = [...new Set(orders.map((order) => order.kitchenContractId).filter(Boolean))];
  if (!contractIds.length) {
    return orders.map((order) => ({
      ...order,
      contractOrderSequence: null,
      contractOrderCount: null,
    }));
  }

  const allContractOrders = await getOrderDelegate(prisma, orderKind).findMany({
    where: {
      kitchenContractId: { in: contractIds },
    },
    select: {
      id: true,
      kitchenContractId: true,
      createdAt: true,
    },
    orderBy: [{ kitchenContractId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const sequenceByOrderId = new Map();
  const countByContractId = new Map();

  allContractOrders.forEach((order) => {
    const nextSequence = (countByContractId.get(order.kitchenContractId) || 0) + 1;
    countByContractId.set(order.kitchenContractId, nextSequence);
    sequenceByOrderId.set(order.id, nextSequence);
  });

  return orders.map((order) => ({
    ...order,
    contractOrderSequence: order.kitchenContractId ? sequenceByOrderId.get(order.id) || 1 : null,
    contractOrderCount: order.kitchenContractId ? countByContractId.get(order.kitchenContractId) || 1 : null,
  }));
}

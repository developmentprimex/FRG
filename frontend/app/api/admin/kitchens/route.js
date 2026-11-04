import { withAdminPermission } from "../../../../lib/auth";
import { ItemType } from "@prisma/client";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenInput } from "../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../lib/auth";
import { listKitchensForAdmin } from "../../../../lib/catalog";
import { prisma } from "../../../../lib/prisma";

const DEFAULT_KITCHEN_ITEMS = [
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-WASTE-001",
    articleNumber: "517467",
    name: "Waste separation system",
    nameDe: "Mülltrennsystem",
    price: "89.00",
    iconKey: "waste_system",
    sortOrder: 200,
    infoText: "Blanco Botton 517467",
    isActive: true,
  },
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-CUTLERY-ZB60SG",
    articleNumber: "ZB60SG",
    name: "Cutlery insert 60 cm",
    nameDe: "Besteckeinsatz 60 cm",
    price: "25.00",
    iconKey: "cutlery_insert",
    sortOrder: 210,
    infoText: "Cutlery insert 60 cm",
    isActive: true,
  },
  {
    itemType: ItemType.ACCESSORY,
    code: "ACC-LIGHT-003",
    articleNumber: "KALB KA220043_S3",
    name: "Beleuchtungsset 3 LED-Spots",
    nameDe: "Beleuchtungsset 3 LED-Spots",
    price: "69.00",
    iconKey: "lighting_set",
    sortOrder: 220,
    isActive: true,
  },
];

async function handleGET() {
  await requireAdminApi();
  return NextResponse.json(await listKitchensForAdmin());
}

async function handlePOST(request) {
  await requireAdminApi();
  try {
    const formData = await request.formData();
    const kitchen = await prisma.$transaction(async (tx) => {
      const input = validateKitchenInput(formData);
      const defaultItems = DEFAULT_KITCHEN_ITEMS.map((item) => {
        if (input.programmId !== "BURGER CINDY") return item;
        if (item.code === "ACC-CUTLERY-ZB60SG") return { ...item, articleNumber: "ZBE60", price: "20.00" };
        if (item.code === "ACC-WASTE-001") return { ...item, articleNumber: "Blanco Botton 517467" };
        return item;
      });
      const articleNumbers = defaultItems.map((item) => item.articleNumber);
      const articles = await tx.catalogArticle.findMany({
        where: {
          articleNumber: { in: articleNumbers },
          isActive: true,
          programPrices: { some: { programmId: input.programmId, isActive: true } },
        },
        include: {
          programPrices: {
            where: { programmId: input.programmId, isActive: true },
            take: 1,
          },
        },
      });
      const byArticleNumber = new Map(articles.map((article) => [article.articleNumber, article]));
      const missing = articleNumbers.filter((articleNumber) => !byArticleNumber.has(articleNumber));
      if (missing.length) {
        throw new Error(`Default items are missing from price list ${input.programmId}: ${missing.join(", ")}.`);
      }
      const createdKitchen = await tx.kitchen.create({
        data: input,
      });

      await tx.kitchenItem.createMany({
        data: defaultItems.map((item) => ({
          kitchenId: createdKitchen.id,
          ...item,
          catalogArticleId: byArticleNumber.get(item.articleNumber).id,
          catalogLinkStatus: "MATCHED",
          price: byArticleNumber.get(item.articleNumber).programPrices[0].price,
        })),
      });

      return createdKitchen;
    });

    return redirectWithFlash(request, `/admin/kitchens/${kitchen.id}`, "success", "Kitchen created with default catalog items.");
  } catch (error) {
    return redirectWithFlash(request, "/admin/kitchens", "error", mapAdminMutationError(error, "Kitchen"));
  }
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

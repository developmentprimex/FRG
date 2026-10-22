import { NextResponse } from "next/server";
import burgerCindyArticleCodes from "../../../../../lib/burger-cindy-article-codes.cjs";
import { mapAdminMutationError, redirectWithFlash, validateKitchenInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { getKitchenById } from "../../../../../lib/catalog";
import { prisma } from "../../../../../lib/prisma";
import { deleteKitchenForAdmin } from "../../../../../lib/admin-kitchen-delete";

export async function GET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const kitchen = await getKitchenById(id);
  if (!kitchen) {
    return NextResponse.json({ error: "Kitchen not found" }, { status: 404 });
  }
  return NextResponse.json(kitchen);
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  try {
    const formData = await request.formData();
    if (formData.get("intent") === "delete") {
      try {
        await deleteKitchenForAdmin(prisma, id);
        return redirectWithFlash(request, "/admin/kitchens", "success", "Kitchen deleted.");
      } catch (error) {
        const message = error.code === "P2003"
          ? "Kitchen cannot be deleted because it has linked records."
          : mapAdminMutationError(error, "Kitchen");
        return redirectWithFlash(request, "/admin/kitchens", "error", message);
      }
    }
    const existingKitchen = await prisma.kitchen.findUnique({
      where: { id },
      select: { slug: true, programmId: true },
    });

    if (!existingKitchen) {
      throw new Error("Kitchen not found.");
    }

    const input = validateKitchenInput(formData, { fallbackSlug: existingKitchen.slug });
    if (input.programmId !== existingKitchen.programmId) {
      const items = await prisma.kitchenItem.findMany({
        where: { kitchenId: id, isActive: true },
        include: {
          catalogArticle: {
            include: { programPrices: { where: { programmId: input.programmId, isActive: true }, take: 1 } },
          },
          catalogBlende: {
            include: { programPrices: { where: { programmId: input.programmId, isActive: true }, take: 1 } },
          },
          catalogService: {
            include: { programPrices: { where: { programmId: input.programmId, isActive: true }, take: 1 } },
          },
        },
      });
      const incompatible = items.filter((item) => {
        if (item.catalogArticle) {
          if (item.catalogArticle.programPrices.length === 0) return true;
          if (input.programmId === "BURGER CINDY"
            && burgerCindyArticleCodes.burgerCindyReplacement(item.catalogArticle.articleNumber)) return true;
        }
        if (item.catalogBlende && item.catalogBlende.programPrices.length === 0) return true;
        if (item.catalogService && item.catalogService.programPrices.length === 0) return true;
        return !item.catalogArticle && !item.catalogBlende && !item.catalogService;
      });
      if (incompatible.length) {
        throw new Error(`Price list ${input.programmId} does not cover ${incompatible.length} active kitchen item(s): ${incompatible.slice(0, 3).map((item) => item.code).join(", ")}. Relink their articles before changing the price list.`);
      }
    }

    await prisma.kitchen.update({
      where: { id },
      data: input,
    });

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Kitchen updated.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Kitchen"));
  }
}

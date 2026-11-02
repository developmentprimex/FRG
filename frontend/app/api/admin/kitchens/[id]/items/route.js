import { withAdminPermission } from "../../../../../../lib/auth";
import { NextResponse } from "next/server";
import { prepareKitchenItemMutation } from "../../../../../../lib/admin-kitchen-items";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  try {
    const formData = await request.formData();
    const kitchen = await prisma.kitchen.findUnique({
      where: { id },
      select: { id: true, slug: true, programmId: true },
    });

    if (!kitchen) {
      throw new Error("Kitchen not found.");
    }

    const data = await prepareKitchenItemMutation({
      formData,
      kitchen,
    });

    await prisma.kitchenItem.create({
      data: {
        kitchenId: id,
        ...data,
      },
    });

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Item created.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Item"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

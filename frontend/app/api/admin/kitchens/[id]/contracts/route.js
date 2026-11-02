import { withAdminPermission } from "../../../../../../lib/auth";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { getKitchenById } from "../../../../../../lib/catalog";
import { prisma } from "../../../../../../lib/prisma";

async function handleGET(_request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const kitchen = await getKitchenById(id);
  if (!kitchen) {
    return NextResponse.json({ error: "Kitchen not found" }, { status: 404 });
  }

  return NextResponse.json(kitchen.contracts || []);
}

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  try {
    const formData = await request.formData();
    const kitchen = await getKitchenById(id);
    if (!kitchen) {
      throw new Error("Kitchen not found.");
    }

    const data = validateKitchenContractInput(formData);
    if (data.housingCompanyId && data.projectId) {
      const [project] = await prisma.$queryRaw`
        SELECT "id"
        FROM "Project"
        WHERE "id" = ${data.projectId}
          AND "housingCompanyId" = ${data.housingCompanyId}
        LIMIT 1
      `;
      if (!project) {
        throw new Error("Select a valid project for the housing company.");
      }
    } else if (data.projectId) {
      const [project] = await prisma.$queryRaw`
        SELECT "id"
        FROM "Project"
        WHERE "id" = ${data.projectId}
        LIMIT 1
      `;
      if (!project) {
        throw new Error("Select a valid project.");
      }
    }

    await prisma.kitchenContract.create({
      data: {
        contractNumber: data.contractNumber,
        kitchenId: kitchen.id,
        projectId: data.projectId,
        isActive: true,
        building: data.building,
        floor: data.floor,
        unitNumber: data.unitNumber,
        notes: data.notes,
      },
    });

    return redirectWithFlash(request, `/admin/kitchens/${id}`, "success", "Contract number created.");
  } catch (error) {
    return redirectWithFlash(request, `/admin/kitchens/${id}`, "error", mapAdminMutationError(error, "Contract number"));
  }
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

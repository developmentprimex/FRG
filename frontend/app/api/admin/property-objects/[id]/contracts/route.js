import { withAdminPermission } from "../../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let detailPath = "/admin/property-owners";

  try {
    const formData = await request.formData();
    const kitchenId = String(formData.get("kitchenId") || "").trim();
    const contractNumber = String(formData.get("contractNumber") || "").trim();
    const building = String(formData.get("building") || "").trim() || null;
    const floor = String(formData.get("floor") || "").trim() || null;
    const unitNumber = String(formData.get("unitNumber") || "").trim() || null;
    const notes = String(formData.get("notes") || "").trim() || null;

    if (!kitchenId) {
      throw new Error("Kitchen is required.");
    }
    if (!contractNumber) {
      throw new Error("Contract number is required.");
    }

    const [propertyObject] = await prisma.$queryRaw`
      SELECT pobj."id", pobj."housingCompanyId", prj."id" AS "projectId"
      FROM "PropertyObject" pobj
      JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
      WHERE pobj."id" = ${id}
      LIMIT 1
    `;
    if (!propertyObject) {
      throw new Error("Property object not found.");
    }
    if (!propertyObject.projectId) {
      throw new Error("Project not found for property object.");
    }

    detailPath = `/admin/property-owners/${propertyObject.housingCompanyId}?openObject=${id}`;

    await prisma.kitchenContract.create({
      data: {
        contractNumber,
        kitchenId,
        projectId: propertyObject.projectId,
        isActive: true,
        building,
        floor,
        unitNumber,
        notes,
      },
    });

    return redirectWithFlash(request, detailPath, "success", "Contract number created.");
  } catch (error) {
    const errorPath = detailPath.includes("?")
      ? `${detailPath}&createContractFor=${id}`
      : `${detailPath}?createContractFor=${id}`;
    return redirectWithFlash(request, errorPath, "error", mapAdminMutationError(error, "Contract number"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

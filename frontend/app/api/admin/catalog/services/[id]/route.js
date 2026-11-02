import { withAdminPermission } from "../../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash, validateCatalogAddonInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import {
  catalogProgramPath,
  deleteProgramPriceOrMaster,
  requireCatalogProgramId,
  splitProgramPrice,
  syncCatalogProgramKitchenItemPrices,
} from "../../../../../../lib/catalog-program-admin";
import { prisma } from "../../../../../../lib/prisma";

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let programmId = "IP 2200";

  try {
    const formData = await request.formData();
    programmId = requireCatalogProgramId(formData);
    const intentValues = formData.getAll("_intent");
    const intent = String(intentValues[intentValues.length - 1] || "update");

    if (intent === "delete") {
      const result = await prisma.$transaction((tx) => deleteProgramPriceOrMaster(tx, {
        programmId,
        entityId: id,
        programPriceDelegate: tx.catalogServiceProgramPrice,
        programPriceDeleteWhere: { programmId, catalogServiceId: id },
        programPriceEntityWhere: { catalogServiceId: id },
        masterDelegate: tx.catalogService,
        linkedItemWhere: { catalogServiceId: id },
      }));
      if (result.linkedCount > 0) {
        return redirectWithFlash(request, catalogProgramPath(programmId), "error", `Service is linked to ${result.linkedCount} kitchen item(s) in this program. Remove those links before deleting it.`);
      }
      return redirectWithFlash(request, catalogProgramPath(programmId), "success", "Service removed from this catalog.");
    }

    const data = validateCatalogAddonInput(formData, "Service");
    const { masterData, price, isActive } = splitProgramPrice(data);

    const syncedCount = await prisma.$transaction(async (tx) => {
      const service = await tx.catalogService.update({
        where: { id },
        data: programmId === "IP 2200" ? data : masterData,
      });
      await tx.catalogServiceProgramPrice.upsert({
        where: { programmId_catalogServiceId: { programmId, catalogServiceId: id } },
        create: { programmId, catalogServiceId: id, code: service.code, price, isActive },
        update: { code: service.code, price, isActive },
      });
      await tx.kitchenItem.updateMany({
        where: { catalogServiceId: id },
        data: { name: service.name, nameDe: service.nameDe || null },
      });
      return syncCatalogProgramKitchenItemPrices(tx, {
        programmId,
        where: { catalogServiceId: id },
      });
    });

    return redirectWithFlash(request, catalogProgramPath(programmId), "success", `Service updated. ${syncedCount} linked kitchen item(s) synced.`);
  } catch (error) {
    return redirectWithFlash(request, catalogProgramPath(programmId), "error", mapAdminMutationError(error, "Service"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

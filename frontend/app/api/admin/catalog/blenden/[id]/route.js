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
        programPriceDelegate: tx.catalogBlendeProgramPrice,
        programPriceDeleteWhere: { programmId, catalogBlendeId: id },
        programPriceEntityWhere: { catalogBlendeId: id },
        masterDelegate: tx.catalogBlende,
        linkedItemWhere: { catalogBlendeId: id },
      }));
      if (result.linkedCount > 0) {
        return redirectWithFlash(request, catalogProgramPath(programmId), "error", `Blende is linked to ${result.linkedCount} kitchen item(s) in this program. Remove those links before deleting it.`);
      }
      return redirectWithFlash(request, catalogProgramPath(programmId), "success", "Blende removed from this catalog.");
    }

    const data = validateCatalogAddonInput(formData, "Blende");
    const { masterData, price, isActive } = splitProgramPrice(data);

    const syncedCount = await prisma.$transaction(async (tx) => {
      const blende = await tx.catalogBlende.update({
        where: { id },
        data: programmId === "IP 2200" ? data : masterData,
      });
      await tx.catalogBlendeProgramPrice.upsert({
        where: { programmId_catalogBlendeId: { programmId, catalogBlendeId: id } },
        create: { programmId, catalogBlendeId: id, code: blende.code, price, isActive },
        update: { code: blende.code, price, isActive },
      });

      await tx.kitchenItem.updateMany({
        where: {
          catalogBlendeId: id,
          catalogArticleId: null,
          iconKey: "blende",
        },
        data: {
          articleNumber: blende.code,
          name: blende.name,
          nameDe: blende.nameDe,
          price: blende.price,
          blendeCode: null,
          blendeLabel: null,
          blendePrice: null,
          catalogBlendeQuantity: 1,
        },
      });
      await tx.kitchenItem.updateMany({
        where: {
          catalogBlendeId: id,
          NOT: {
            catalogArticleId: null,
            iconKey: "blende",
          },
        },
        data: {
          blendeCode: blende.code,
          blendeLabel: blende.nameDe || blende.name,
        },
      });
      return syncCatalogProgramKitchenItemPrices(tx, {
        programmId,
        where: { catalogBlendeId: id },
        syncBlendePrice: true,
      });
    });

    return redirectWithFlash(request, catalogProgramPath(programmId), "success", `Blende updated. ${syncedCount} linked kitchen item(s) synced.`);
  } catch (error) {
    return redirectWithFlash(request, catalogProgramPath(programmId), "error", mapAdminMutationError(error, "Blende"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

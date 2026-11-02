import { withAdminPermission } from "../../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash, validateCatalogArticleInput } from "../../../../../../lib/admin-forms";
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
        programPriceDelegate: tx.catalogArticleProgramPrice,
        programPriceDeleteWhere: { programmId, catalogArticleId: id },
        programPriceEntityWhere: { catalogArticleId: id },
        masterDelegate: tx.catalogArticle,
        linkedItemWhere: { catalogArticleId: id },
      }));
      if (result.linkedCount > 0) {
        return redirectWithFlash(request, catalogProgramPath(programmId), "error", `Article is linked to ${result.linkedCount} kitchen item(s) in this program. Remove those links before deleting it.`);
      }
      return redirectWithFlash(request, catalogProgramPath(programmId), "success", "Article removed from this catalog.");
    }

    const data = validateCatalogArticleInput(formData);
    const { masterData, price, isActive } = splitProgramPrice(data);

    const updatedCount = await prisma.$transaction(async (tx) => {
      const article = await tx.catalogArticle.update({
        where: { id },
        data: programmId === "IP 2200" ? data : masterData,
      });
      await tx.catalogArticleProgramPrice.upsert({
        where: { programmId_catalogArticleId: { programmId, catalogArticleId: id } },
        create: { programmId, catalogArticleId: id, articleNumber: article.articleNumber, price, isActive },
        update: { articleNumber: article.articleNumber, price, isActive },
      });
      await tx.kitchenItem.updateMany({
        where: { catalogArticleId: id },
        data: {
          articleNumber: article.articleNumber,
          name: article.name,
          nameDe: article.nameDe || null,
          widthMm: article.widthMm ?? null,
          heightMm: article.heightMm ?? null,
          depthMm: article.depthMm ?? null,
        },
      });
      return syncCatalogProgramKitchenItemPrices(tx, {
        programmId,
        where: { catalogArticleId: id },
      });
    });

    return redirectWithFlash(request, catalogProgramPath(programmId), "success", `Article updated. ${updatedCount} linked kitchen item(s) synced.`);
  } catch (error) {
    return redirectWithFlash(request, catalogProgramPath(programmId), "error", mapAdminMutationError(error, "Article"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

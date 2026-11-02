import { withAdminPermission } from "../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash, validateCatalogArticleInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { catalogProgramPath, requireCatalogProgramId, splitProgramPrice } from "../../../../../lib/catalog-program-admin";
import { prisma } from "../../../../../lib/prisma";

async function handlePOST(request) {
  await requireAdminApi();
  let programmId = "IP 2200";

  try {
    const formData = await request.formData();
    const data = validateCatalogArticleInput(formData);
    programmId = requireCatalogProgramId(formData);
    const { masterData, price, isActive } = splitProgramPrice(data);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.catalogArticle.findUnique({ where: { articleNumber: data.articleNumber } });
      const article = existing
        ? await tx.catalogArticle.update({ where: { id: existing.id }, data: masterData })
        : await tx.catalogArticle.create({ data });
      await tx.catalogArticleProgramPrice.upsert({
        where: { programmId_catalogArticleId: { programmId, catalogArticleId: article.id } },
        create: { programmId, catalogArticleId: article.id, articleNumber: article.articleNumber, price, isActive },
        update: { articleNumber: article.articleNumber, price, isActive },
      });
    });

    return redirectWithFlash(request, catalogProgramPath(programmId), "success", "Article created.");
  } catch (error) {
    return redirectWithFlash(request, catalogProgramPath(programmId), "error", mapAdminMutationError(error, "Article"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

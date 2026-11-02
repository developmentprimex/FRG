import { withAdminPermission } from "../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash, validateCatalogAddonInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { catalogProgramPath, requireCatalogProgramId, splitProgramPrice } from "../../../../../lib/catalog-program-admin";
import { prisma } from "../../../../../lib/prisma";

async function handlePOST(request) {
  await requireAdminApi();
  let programmId = "IP 2200";

  try {
    const formData = await request.formData();
    const data = validateCatalogAddonInput(formData, "Service");
    programmId = requireCatalogProgramId(formData);
    const { masterData, price, isActive } = splitProgramPrice(data);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.catalogService.findUnique({ where: { code: data.code } });
      const service = existing
        ? await tx.catalogService.update({ where: { id: existing.id }, data: masterData })
        : await tx.catalogService.create({ data });
      await tx.catalogServiceProgramPrice.upsert({
        where: { programmId_catalogServiceId: { programmId, catalogServiceId: service.id } },
        create: { programmId, catalogServiceId: service.id, code: service.code, price, isActive },
        update: { code: service.code, price, isActive },
      });
    });

    return redirectWithFlash(request, catalogProgramPath(programmId), "success", "Service created.");
  } catch (error) {
    return redirectWithFlash(request, catalogProgramPath(programmId), "error", mapAdminMutationError(error, "Service"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

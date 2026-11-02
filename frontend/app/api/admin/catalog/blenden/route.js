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
    const data = validateCatalogAddonInput(formData, "Blende");
    programmId = requireCatalogProgramId(formData);
    const { masterData, price, isActive } = splitProgramPrice(data);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.catalogBlende.findUnique({ where: { code: data.code } });
      const blende = existing
        ? await tx.catalogBlende.update({ where: { id: existing.id }, data: masterData })
        : await tx.catalogBlende.create({ data });
      await tx.catalogBlendeProgramPrice.upsert({
        where: { programmId_catalogBlendeId: { programmId, catalogBlendeId: blende.id } },
        create: { programmId, catalogBlendeId: blende.id, code: blende.code, price, isActive },
        update: { code: blende.code, price, isActive },
      });
    });

    return redirectWithFlash(request, catalogProgramPath(programmId), "success", "Blende created.");
  } catch (error) {
    return redirectWithFlash(request, catalogProgramPath(programmId), "error", mapAdminMutationError(error, "Blende"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

import { withAdminPermission } from "../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

function requireProgramId(value) {
  const programmId = String(value || "").trim();
  if (!programmId) {
    throw new Error("Programm ID is required.");
  }
  return programmId;
}

async function handlePOST(request) {
  await requireAdminApi();

  try {
    const formData = await request.formData();
    const programmId = requireProgramId(formData.get("programmId"));
    const description = String(formData.get("description") || "").trim() || null;
    const returnTo = String(formData.get("returnTo") || "/admin/catalog/imports");

    await prisma.catalogProgram.upsert({
      where: { programmId },
      create: {
        programmId,
        name: programmId,
        description,
        isActive: true,
      },
      update: {
        name: programmId,
        description,
        isActive: true,
      },
    });

    return redirectWithFlash(request, returnTo, "success", `Programm ID "${programmId}" saved.`);
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/imports", "error", mapAdminMutationError(error, "Programm ID"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

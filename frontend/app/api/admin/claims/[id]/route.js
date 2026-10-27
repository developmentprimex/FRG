import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminClaimsApi } from "../../../../../lib/admin-claims-access";
import { prisma } from "../../../../../lib/prisma";
import { deleteServiceClaimAttachments } from "../../../../../lib/service-claim-attachments-storage";
import { NextResponse } from "next/server";
import { canAccessClaim } from "../../../../../lib/admin-roles";

export async function POST(request, { params }) {
  const admin = await requireAdminClaimsApi();
  const { id } = await params;
  const claim = await prisma.serviceClaim.findUnique({ where: { id }, select: { contractNumber: true } });
  if (claim && !canAccessClaim(admin, claim.contractNumber)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let returnPath = `/admin/claims/${id}`;

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "");

    if (intent === "delete") {
      returnPath = String(formData.get("_returnPath") || "") === "/admin/px-claims"
        ? "/admin/px-claims"
        : "/admin/claims";
      const deletedCount = await prisma.$executeRaw`
        DELETE FROM "ServiceClaim"
        WHERE "id" = ${id}
      `;

      if (!deletedCount) {
        return redirectWithFlash(request, returnPath, "error", "Die Reklamation konnte nicht gelöscht werden.");
      }

      await deleteServiceClaimAttachments(id).catch(() => {});
      return redirectWithFlash(request, returnPath, "success", "Reklamation gelöscht.");
    }

    return redirectWithFlash(request, returnPath, "error", "Aktion wird nicht unterstützt.");
  } catch (error) {
    return redirectWithFlash(request, returnPath, "error", mapAdminMutationError(error, "Reklamation"));
  }
}

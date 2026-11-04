import { withAdminPermission } from "../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash } from "../../../../lib/admin-forms";
import { prisma } from "../../../../lib/prisma";
import { deleteServiceClaimAttachments } from "../../../../lib/service-claim-attachments-storage";

async function handlePOST(request) {
  await requireAdminClaimsApi();

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "");

    if (intent !== "delete-all") {
      throw new Error("Unsupported PX claim action.");
    }

    const deletedClaims = await prisma.$queryRaw`
      DELETE FROM "ServiceClaim"
      WHERE REGEXP_REPLACE(COALESCE("contractNumber", ''), '[[:space:]]+', '', 'g') LIKE '111%'
      RETURNING "id"
    `;

    await Promise.all(
      deletedClaims.map((claim) => deleteServiceClaimAttachments(claim.id).catch(() => {})),
    );

    const deletedCount = deletedClaims.length;
    return redirectWithFlash(
      request,
      "/admin/px-claims",
      "success",
      `${deletedCount} PX-Reklamation${deletedCount === 1 ? "" : "en"} gelöscht.`,
    );
  } catch (error) {
    return redirectWithFlash(
      request,
      "/admin/px-claims",
      "error",
      mapAdminMutationError(error, "PX-Reklamation"),
    );
  }
}

export const POST = withAdminPermission("PX_ASC_MANAGE", handlePOST);

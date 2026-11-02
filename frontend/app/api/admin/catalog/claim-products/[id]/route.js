import { withAdminPermission } from "../../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash, validateClaimProductInput } from "../../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

function asKeyFacts(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
}

async function syncClaimProductInformationToKitchenItems(claimProducts) {
  const sources = [
    ...new Map(
      claimProducts
        .filter((part) => part.kitchenId && part.sourceKitchenItemCode)
        .map((part) => [`${part.kitchenId}:${part.sourceKitchenItemCode}`, {
          kitchenId: part.kitchenId,
          code: part.sourceKitchenItemCode,
        }]),
    ).values(),
  ];
  if (!sources.length) return;

  const parts = await prisma.kitchenClaimPart.findMany({
    where: {
      isActive: true,
      OR: sources.map((source) => ({
        kitchenId: source.kitchenId,
        sourceKitchenItemCode: source.code,
      })),
    },
    orderBy: [{ sortOrder: "asc" }, { partKey: "asc" }],
  });

  await Promise.all(sources.map((source) => {
    const sourceParts = parts.filter(
      (part) => part.kitchenId === source.kitchenId && part.sourceKitchenItemCode === source.code,
    );
    const infoParts = sourceParts.filter((part) => (
      part.productInfoPdfPath
      || part.productInfoSummary
      || asKeyFacts(part.productInfoKeyFacts).length
      || part.productInfoExtractedText
    ));
    const firstImage = infoParts.find((part) => part.productImagePath)?.productImagePath || null;
    const firstPdf = infoParts.find((part) => part.productInfoPdfPath)?.productInfoPdfPath || null;

    return prisma.kitchenItem.updateMany({
      where: { kitchenId: source.kitchenId, code: source.code },
      data: {
        productImagePath: firstImage,
        productInfoPdfPath: firstPdf,
        productInfoSummary: infoParts.map((part) => part.productInfoSummary).filter(Boolean).join("\n\n") || null,
        productInfoKeyFacts: infoParts.flatMap((part) => asKeyFacts(part.productInfoKeyFacts)),
        productInfoExtractedText: infoParts.map((part) => part.productInfoExtractedText).filter(Boolean).join("\n\n---\n\n") || null,
        productInfoUpdatedAt: infoParts.length ? new Date() : null,
      },
    });
  }));
}

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;

  try {
    const formData = await request.formData();
    const data = validateClaimProductInput(formData);
    // Source links are structural ASC metadata, not editable product fields.
    // The grouped catalog form intentionally does not submit them, so allowing
    // the validated null values through would detach every linked kitchen part.
    delete data.sourceKitchenItemCode;
    delete data.sourceComponentKey;
    const submittedIds = String(formData.get("claimProductIds") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const ids = submittedIds.includes(id) ? submittedIds : [id];
    if (ids.length > 1) {
      delete data.partKey;
    }

    const result = await prisma.kitchenClaimPart.updateMany({
      where: { id: { in: ids } },
      data,
    });

    if (!result.count) {
      throw new Error("Claim product was not found.");
    }
    const updatedClaimProducts = await prisma.kitchenClaimPart.findMany({
      where: { id: { in: ids } },
      select: {
        kitchenId: true,
        sourceKitchenItemCode: true,
      },
    });
    await syncClaimProductInformationToKitchenItems(updatedClaimProducts);

    return redirectWithFlash(
      request,
      "/admin/catalog/articles",
      "success",
      `Claim product updated for ${result.count} linked kitchen${result.count === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    return redirectWithFlash(request, "/admin/catalog/articles", "error", mapAdminMutationError(error, "Claim product"));
  }
}

export const POST = withAdminPermission("ASC_MANAGE", handlePOST);

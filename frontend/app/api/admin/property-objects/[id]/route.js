import { withAdminPermission } from "../../../../../lib/auth";
import { mapAdminMutationError, redirectWithFlash, validatePropertyObjectInput } from "../../../../../lib/admin-forms";
import { addressVerificationSnapshotKey, buildAddressVerificationSnapshot } from "../../../../../lib/address-verification";
import { isAddressVerificationRecordValid } from "../../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../../lib/auth";
import { upsertProjectForObject } from "../../../../../lib/property-projects";
import { prisma } from "../../../../../lib/prisma";

function getReturnPath(formData, fallback) {
  const rawPath = String(formData.get("returnTo") || "").trim();
  return rawPath.startsWith("/admin/") ? rawPath : fallback;
}

function parseAddressVerificationRecord(formData) {
  const rawValue = String(formData.get("addressVerification") || "").trim();
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  let detailPath = "/admin/property-owners";
  let existingObject = null;

  try {
    [existingObject] = await prisma.$queryRaw`
      SELECT "housingCompanyId", "name", "country", "city", "postalCode", "address1", "address2"
      FROM "PropertyObject"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    if (existingObject?.housingCompanyId) {
      detailPath = `/admin/property-owners/${existingObject.housingCompanyId}?openObject=${id}`;
    }

    const formData = await request.formData();
    detailPath = getReturnPath(formData, detailPath);
    const intent = String(formData.get("_intent") || "").trim();

    if (intent === "delete") {
      await prisma.$executeRaw`DELETE FROM "PropertyObject" WHERE "id" = ${id}`;
      return redirectWithFlash(request, detailPath, "success", "Property object deleted.");
    }

    const data = validatePropertyObjectInput(formData);
    const addressVerification = parseAddressVerificationRecord(formData);
    const submittedSnapshotKey = addressVerificationSnapshotKey(buildAddressVerificationSnapshot({
      contractNumber: data.name,
      address1: data.address1,
      address2: data.address2,
      postalCode: data.postalCode,
      city: data.city,
      country: data.country,
    }));
    const existingSnapshotKey = existingObject
      ? addressVerificationSnapshotKey(buildAddressVerificationSnapshot({
        contractNumber: existingObject.name,
        address1: existingObject.address1,
        address2: existingObject.address2,
        postalCode: existingObject.postalCode,
        city: existingObject.city,
        country: existingObject.country,
      }))
      : "";
    const hasUnchangedObjectAddress = submittedSnapshotKey === existingSnapshotKey;

    if (!hasUnchangedObjectAddress && !isAddressVerificationRecordValid(addressVerification, { ...data, contractNumber: data.name })) {
      throw new Error("Verify the object address before saving.");
    }
    if (!existingObject?.housingCompanyId) {
      throw new Error("Property object not found.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE "PropertyObject"
        SET
          "name" = ${data.name},
          "contactPhone" = ${data.contactPhone},
          "country" = ${data.country},
          "city" = ${data.city},
          "postalCode" = ${data.postalCode},
          "address1" = ${data.address1},
          "address2" = ${data.address2},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
      `;
      await upsertProjectForObject(tx, {
        housingCompanyId: existingObject.housingCompanyId,
        propertyObjectId: id,
        projectName: data.projectName,
        projectCode: data.projectCode,
        projectStatus: data.projectStatus,
        projectDescription: data.projectDescription,
        projectManagerName: data.projectManagerName,
      });
    });

    return redirectWithFlash(request, detailPath, "success", "Property object updated.");
  } catch (error) {
    return redirectWithFlash(request, detailPath, "error", mapAdminMutationError(error, "Property object"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

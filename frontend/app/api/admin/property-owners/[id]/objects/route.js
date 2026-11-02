import { withAdminPermission } from "../../../../../../lib/auth";
import { randomUUID } from "crypto";
import { mapAdminMutationError, redirectWithFlash, validatePropertyObjectInput } from "../../../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../../../lib/auth";
import { upsertProjectForObject } from "../../../../../../lib/property-projects";
import { prisma } from "../../../../../../lib/prisma";

function normalizeRouteId(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
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
  const { id: rawId } = await params;
  const id = normalizeRouteId(rawId);
  const detailPath = `/admin/property-owners/${id}`;

  try {
    const formData = await request.formData();
    const data = validatePropertyObjectInput(formData);
    const addressVerification = parseAddressVerificationRecord(formData);
    if (!isAddressVerificationRecordValid(addressVerification, { ...data, contractNumber: data.name })) {
      throw new Error("Verify the object address before saving.");
    }

    const [company] = await prisma.$queryRaw`
      SELECT "id" FROM "HousingCompany" WHERE "id" = ${id} LIMIT 1
    `;
    if (!company) {
      throw new Error("Housing company not found.");
    }

    const propertyObjectId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
      INSERT INTO "PropertyObject" ("id", "name", "housingCompanyId", "contactPhone", "country", "city", "postalCode", "address1", "address2", "createdAt", "updatedAt")
      VALUES (${propertyObjectId}, ${data.name}, ${id}, ${data.contactPhone}, ${data.country}, ${data.city}, ${data.postalCode}, ${data.address1}, ${data.address2}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
      await upsertProjectForObject(tx, {
        housingCompanyId: id,
        propertyObjectId,
        projectName: data.projectName,
        projectCode: data.projectCode,
        projectStatus: data.projectStatus,
        projectDescription: data.projectDescription,
        projectManagerName: data.projectManagerName,
      });
    });

    return redirectWithFlash(request, detailPath, "success", "Property object created.");
  } catch (error) {
    return redirectWithFlash(request, `${detailPath}?createObject=1`, "error", mapAdminMutationError(error, "Property object"));
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

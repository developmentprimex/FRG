import { withAdminPermission } from "../../../../lib/auth";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mapAdminMutationError, redirectWithFlash, validatePropertyObjectInput, validatePropertyOwnerInput } from "../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../lib/auth";
import { listPropertyOwnersForAdmin } from "../../../../lib/catalog";
import { upsertProjectForObject } from "../../../../lib/property-projects";
import { prisma } from "../../../../lib/prisma";

async function handleGET() {
  await requireAdminApi();
  return NextResponse.json(await listPropertyOwnersForAdmin());
}

function parseAddressVerificationRecord(rawValue) {
  const nextValue = String(rawValue || "").trim();
  if (!nextValue) return null;

  try {
    return JSON.parse(nextValue);
  } catch {
    return null;
  }
}

function objectFieldNames(index) {
  return {
    name: `objectName__${index}`,
    projectName: `projectName__${index}`,
    projectCode: `projectCode__${index}`,
    projectStatus: `projectStatus__${index}`,
    projectDescription: `projectDescription__${index}`,
    projectManagerName: `projectManagerName__${index}`,
    contactPhone: `objectContactPhone__${index}`,
    country: `objectCountry__${index}`,
    city: `objectCity__${index}`,
    postalCode: `objectPostalCode__${index}`,
    address1: `objectAddress1__${index}`,
    address2: `objectAddress2__${index}`,
    addressVerification: `objectAddressVerification__${index}`,
  };
}

function collectPropertyObjects(formData) {
  const indexes = new Set();
  for (const [key] of formData.entries()) {
    const match = /^objectName__(\d+)$/.exec(key);
    if (match) {
      indexes.add(Number(match[1]));
    }
  }

  return [...indexes]
    .sort((left, right) => left - right)
    .flatMap((index) => {
      const fields = objectFieldNames(index);
      const hasAnyValue = [
        fields.name,
        fields.projectName,
        fields.projectCode,
        fields.projectStatus,
        fields.projectDescription,
        fields.projectManagerName,
        fields.contactPhone,
        fields.country,
        fields.city,
        fields.postalCode,
        fields.address1,
        fields.address2,
      ].some((fieldName) => String(formData.get(fieldName) || "").trim());

      if (!hasAnyValue) {
        return [];
      }

      const data = validatePropertyObjectInput(formData, fields);
      const addressVerification = parseAddressVerificationRecord(formData.get(fields.addressVerification));
      if (!isAddressVerificationRecordValid(addressVerification, { ...data, contractNumber: data.name })) {
        throw new Error(`Verify the address for object "${data.name}" before saving.`);
      }

      return [data];
    });
}

async function handlePOST(request) {
  await requireAdminApi();
  try {
    const formData = await request.formData();
    const data = validatePropertyOwnerInput(formData);
    const objects = collectPropertyObjects(formData);
    const housingCompanyId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "HousingCompany" ("id", "name", "address", "email", "phone", "notes", "createdAt", "updatedAt")
        VALUES (${housingCompanyId}, ${data.name}, ${data.address}, ${data.email}, ${data.phone}, ${data.notes}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      for (const object of objects) {
        const propertyObjectId = randomUUID();
        await tx.$executeRaw`
          INSERT INTO "PropertyObject" ("id", "name", "housingCompanyId", "contactPhone", "country", "city", "postalCode", "address1", "address2", "createdAt", "updatedAt")
          VALUES (${propertyObjectId}, ${object.name}, ${housingCompanyId}, ${object.contactPhone}, ${object.country}, ${object.city}, ${object.postalCode}, ${object.address1}, ${object.address2}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await upsertProjectForObject(tx, {
          housingCompanyId,
          propertyObjectId,
          projectName: object.projectName,
          projectCode: object.projectCode,
          projectStatus: object.projectStatus,
          projectDescription: object.projectDescription,
          projectManagerName: object.projectManagerName,
        });
      }
    });

    const successMessage = objects.length
      ? `Housing company created with ${objects.length} object${objects.length === 1 ? "" : "s"}.`
      : "Housing company created.";
    return redirectWithFlash(request, "/admin/property-owners", "success", successMessage);
  } catch (error) {
    return redirectWithFlash(request, "/admin/property-owners?create=1", "error", mapAdminMutationError(error, "Housing company"));
  }
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

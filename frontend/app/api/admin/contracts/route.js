import { withAdminPermission } from "../../../../lib/auth";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput, validatePropertyObjectInput } from "../../../../lib/admin-forms";
import { isAddressVerificationRecordValid } from "../../../../lib/address-verification-server";
import { requireAdminApi } from "../../../../lib/auth";
import { listKitchenContractsForAdmin } from "../../../../lib/catalog";
import { upsertProjectForObject } from "../../../../lib/property-projects";
import { prisma } from "../../../../lib/prisma";
import { ensurePdfOnlyKitchen } from "../../../../lib/service-claim-reference-plan";
import {
  readContractClaimPlanUploads,
  upsertContractClaimPlanUploads,
} from "../../../../lib/contract-claim-plan-assets";
import { saveContractApplianceInventory } from "../../../../lib/contract-appliance-inventory";

async function handleGET(request) {
  await requireAdminApi();
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await listKitchenContractsForAdmin({
    kitchenId: searchParams.get("kitchenId") || "",
    housingCompanyId: searchParams.get("housingCompanyId") || searchParams.get("ownerId") || "",
    projectId: searchParams.get("projectId") || "",
    status: searchParams.get("status") || "",
    usage: searchParams.get("usage") || "",
    query: searchParams.get("q") || "",
  }));
}

function getReturnPath(formData, fallback) {
  const rawPath = String(formData.get("returnTo") || "").trim();
  return rawPath.startsWith("/admin/") ? rawPath : fallback;
}

function appendQueryParam(pathname, key, value) {
  const [basePath, existingQuery = ""] = String(pathname || "/").split("?");
  const searchParams = new URLSearchParams(existingQuery);
  searchParams.set(key, value);
  return `${basePath || "/"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
}

function normalizeContractType(value) {
  return String(value || "").trim().toUpperCase() === "ARC" ? "ARC" : "FRG";
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

function inlineObjectFieldNames() {
  return {
    name: "inlineObjectName",
    projectName: "inlineProjectName",
    projectCode: "inlineProjectCode",
    projectStatus: "inlineProjectStatus",
    projectDescription: "inlineProjectDescription",
    projectManagerName: "inlineProjectManagerName",
    contactPhone: "inlineObjectContactPhone",
    country: "inlineObjectCountry",
    city: "inlineObjectCity",
    postalCode: "inlineObjectPostalCode",
    address1: "inlineObjectAddress1",
    address2: "inlineObjectAddress2",
    addressVerification: "inlineObjectAddressVerification",
  };
}

function validateInlineObjectInput(formData) {
  const fields = inlineObjectFieldNames();
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
    return null;
  }

  const data = validatePropertyObjectInput(formData, fields);
  const addressVerification = parseAddressVerificationRecord(formData.get(fields.addressVerification));
  if (!isAddressVerificationRecordValid(addressVerification, { ...data, contractNumber: data.name })) {
    throw new Error("Verify the object address before saving.");
  }

  return data;
}

async function handlePOST(request) {
  await requireAdminApi();
  let returnPath = "/admin/contracts";

  try {
    const formData = await request.formData();
    returnPath = getReturnPath(formData, "/admin/contracts");
    const contractType = normalizeContractType(formData.get("contractType"));
    const isArcContract = contractType === "ARC";
    const requestedKitchenId = String(formData.get("kitchenId") || "").trim();
    const claimPlanUploads = await readContractClaimPlanUploads(formData);

    const inlineObject = isArcContract ? null : validateInlineObjectInput(formData);
    const data = validateKitchenContractInput(formData, {
      allowInlineObject: true,
      hasInlineObject: Boolean(inlineObject),
    });
    if (isArcContract && !claimPlanUploads.preview) {
      throw new Error("Upload a kitchen sketch for the ARC contract.");
    }
    if (
      !isArcContract
      &&
      !requestedKitchenId
      && !data.claimPlanPreviewPath
      && !claimPlanUploads.preview
    ) {
      throw new Error("Select a kitchen or upload a kitchen sketch.");
    }

    let projectId = isArcContract ? null : data.projectId;
    await prisma.$transaction(async (tx) => {
      const kitchenId = isArcContract
        ? (await ensurePdfOnlyKitchen(tx)).id
        : requestedKitchenId || (await ensurePdfOnlyKitchen(tx)).id;
      if (!isArcContract && data.housingCompanyId) {
        if (inlineObject) {
          const propertyObjectId = randomUUID();
          await tx.$executeRaw`
            INSERT INTO "PropertyObject" ("id", "name", "housingCompanyId", "contactPhone", "country", "city", "postalCode", "address1", "address2", "createdAt", "updatedAt")
            VALUES (${propertyObjectId}, ${inlineObject.name}, ${data.housingCompanyId}, ${inlineObject.contactPhone}, ${inlineObject.country}, ${inlineObject.city}, ${inlineObject.postalCode}, ${inlineObject.address1}, ${inlineObject.address2}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
          const project = await upsertProjectForObject(tx, {
            housingCompanyId: data.housingCompanyId,
            propertyObjectId,
            projectName: inlineObject.projectName,
            projectCode: inlineObject.projectCode,
            projectStatus: inlineObject.projectStatus,
            projectDescription: inlineObject.projectDescription,
            projectManagerName: inlineObject.projectManagerName,
          });
          projectId = project.id;
        } else if (projectId) {
          const [project] = await tx.$queryRaw`
            SELECT "id"
            FROM "Project"
            WHERE "id" = ${data.projectId}
              AND "housingCompanyId" = ${data.housingCompanyId}
            LIMIT 1
          `;
          if (!project) {
            throw new Error("Select a valid project for the housing company.");
          }
        }
      } else if (!isArcContract && projectId) {
        const [project] = await tx.$queryRaw`
          SELECT "id"
          FROM "Project"
          WHERE "id" = ${projectId}
          LIMIT 1
        `;
        if (!project) {
          throw new Error("Select a valid project.");
        }
      }

      const createdContract = await tx.kitchenContract.create({
        data: {
          contractNumber: data.contractNumber,
          contractType,
          kitchenId,
          projectId,
          claimPlanPdfPath: isArcContract ? null : data.claimPlanPdfPath,
          claimPlanPreviewPath: isArcContract ? null : data.claimPlanPreviewPath,
          isActive: true,
          building: isArcContract ? null : data.building,
          floor: isArcContract ? null : data.floor,
          unitNumber: isArcContract ? null : data.unitNumber,
          notes: isArcContract ? null : data.notes,
        },
      });
      await upsertContractClaimPlanUploads(
        tx,
        createdContract.id,
        isArcContract ? { preview: claimPlanUploads.preview, pdf: null } : claimPlanUploads,
      );
      await saveContractApplianceInventory(tx, createdContract, formData);
    });

    return redirectWithFlash(request, returnPath, "success", "Contract number created.");
  } catch (error) {
    const errorPath = returnPath.includes("/admin/property-owners/")
      ? appendQueryParam(returnPath, "createContract", "1")
      : returnPath;
    return redirectWithFlash(request, errorPath, "error", mapAdminMutationError(error, "Contract number"));
  }
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

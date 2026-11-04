import { withAdminPermission } from "../../../../../lib/auth";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validateKitchenContractInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { canViewTestContracts } from "../../../../../lib/admin-permissions";
import { isTestContractNumber } from "../../../../../lib/order-kind";
import { ensurePdfOnlyKitchen } from "../../../../../lib/service-claim-reference-plan";
import {
  readContractClaimPlanUploads,
  upsertContractClaimPlanUploads,
} from "../../../../../lib/contract-claim-plan-assets";
import { saveContractApplianceInventory } from "../../../../../lib/contract-appliance-inventory";

function getReturnPath(formData, fallback) {
  const rawPath = String(formData.get("returnTo") || "").trim();
  return rawPath.startsWith("/admin/") ? rawPath : fallback;
}

async function handleGET(_request, { params }) {
  const admin = await requireAdminApi();
  const { id } = await params;
  const contract = await prisma.kitchenContract.findUnique({
    where: { id },
    include: { kitchen: true },
  });

  if (!contract) {
    return NextResponse.json({ error: "Contract number not found" }, { status: 404 });
  }
  if (!canViewTestContracts(admin) && isTestContractNumber(contract.contractNumber)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [ownerRow] = await prisma.$queryRaw`
    SELECT
      prj."id" AS "projectId",
      prj."name" AS "projectName",
      prj."projectCode",
      prj."status" AS "projectStatus",
      prj."description" AS "projectDescription",
      prj."managerName" AS "projectManagerName",
      prj."propertyObjectId",
      pobj."id" AS "propertyObjectRecordId",
      pobj."name" AS "propertyObjectName",
      pobj."country",
      pobj."city",
      pobj."postalCode",
      pobj."address1",
      pobj."address2",
      hc."id" AS "housingCompanyRecordId",
      hc."name" AS "housingCompanyName",
      hc."email",
      hc."phone",
      hc."notes",
      hc."createdAt",
      hc."updatedAt"
    FROM "KitchenContract" kc
    LEFT JOIN "Project" prj ON prj."id" = kc."projectId"
    LEFT JOIN "PropertyObject" pobj ON pobj."id" = prj."propertyObjectId"
    LEFT JOIN "HousingCompany" hc ON hc."id" = prj."housingCompanyId"
    WHERE kc."id" = ${id}
    LIMIT 1
  `;

  return NextResponse.json({
    ...contract,
    projectId: ownerRow?.projectId || null,
    projectName: ownerRow?.projectName || null,
    project: ownerRow?.projectId
      ? {
          id: ownerRow.projectId,
          name: ownerRow.projectName,
          projectCode: ownerRow.projectCode || null,
          status: ownerRow.projectStatus || "active",
          description: ownerRow.projectDescription || null,
          managerName: ownerRow.projectManagerName || null,
          housingCompanyId: ownerRow.housingCompanyRecordId,
          propertyObjectId: ownerRow.propertyObjectId,
          propertyObject: ownerRow.propertyObjectRecordId
            ? {
                id: ownerRow.propertyObjectRecordId,
                name: ownerRow.propertyObjectName,
                country: ownerRow.country,
                city: ownerRow.city,
                postalCode: ownerRow.postalCode,
                address1: ownerRow.address1,
                address2: ownerRow.address2,
              }
            : null,
        }
      : null,
    propertyObject: ownerRow?.propertyObjectRecordId
      ? {
          id: ownerRow.propertyObjectRecordId,
          name: ownerRow.propertyObjectName,
          projectId: ownerRow.projectId || null,
          projectName: ownerRow.projectName || null,
          projectCode: ownerRow.projectCode || null,
          projectStatus: ownerRow.projectStatus || "active",
          projectDescription: ownerRow.projectDescription || null,
          projectManagerName: ownerRow.projectManagerName || null,
          country: ownerRow.country,
          city: ownerRow.city,
          postalCode: ownerRow.postalCode,
          address1: ownerRow.address1,
          address2: ownerRow.address2,
        }
      : null,
    housingCompanyId: ownerRow?.housingCompanyRecordId || null,
    ownerId: ownerRow?.housingCompanyRecordId || null,
    owner: ownerRow?.housingCompanyRecordId
      ? {
          id: ownerRow.housingCompanyRecordId,
          name: ownerRow.housingCompanyName,
          email: ownerRow.email,
          phone: ownerRow.phone,
          notes: ownerRow.notes,
          createdAt: ownerRow.createdAt,
          updatedAt: ownerRow.updatedAt,
        }
      : null,
  });
}

async function handlePOST(request, { params }) {
  const admin = await requireAdminApi();
  const { id } = await params;
  let kitchenId = "";
  let returnPath = "/admin/contracts";

  try {
    const formData = await request.formData();
    const claimPlanUploads = await readContractClaimPlanUploads(formData);
    const intent = String(formData.get("_intent") || "").trim();
    const contract = await prisma.kitchenContract.findUnique({
      where: { id },
      select: {
        id: true,
        kitchenId: true,
        contractType: true,
        contractNumber: true,
        claimPlanPreviewPath: true,
      },
    });

    if (!contract) {
      throw new Error("Contract number not found.");
    }
    if (!canViewTestContracts(admin) && isTestContractNumber(contract.contractNumber)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    kitchenId = contract.kitchenId;
    returnPath = getReturnPath(formData, `/admin/kitchens/${contract.kitchenId}`);

    if (intent === "update") {
      const data = validateKitchenContractInput(formData);
      const requestedKitchenId = String(formData.get("kitchenId") || "").trim();
      const isArcContract = contract.contractType === "ARC";

      if (isArcContract) {
        const [existingPlan] = await prisma.$queryRaw`
          SELECT asset."previewBytes" IS NOT NULL AS "hasUploadedPreview"
          FROM "KitchenContract" kitchen_contract
          LEFT JOIN "KitchenContractClaimPlanAsset" asset
            ON asset."kitchenContractId" = kitchen_contract."id"
          WHERE kitchen_contract."id" = ${id}
          LIMIT 1
        `;
        if (
          !claimPlanUploads.preview
          && !contract.claimPlanPreviewPath
          && !existingPlan?.hasUploadedPreview
        ) {
          throw new Error("Upload a kitchen sketch for the ARC contract.");
        }

        await prisma.$transaction(async (tx) => {
          const referenceKitchen = await ensurePdfOnlyKitchen(tx);
          await tx.kitchenContract.update({
            where: { id },
            data: {
              contractNumber: data.contractNumber,
              kitchenId: referenceKitchen.id,
              projectId: null,
              building: null,
              floor: null,
              unitNumber: null,
              notes: null,
            },
          });
          await upsertContractClaimPlanUploads(tx, id, {
            preview: claimPlanUploads.preview,
            pdf: null,
          });
          await saveContractApplianceInventory(tx, { ...contract, kitchenId: referenceKitchen.id }, formData);
        });

        return redirectWithFlash(request, returnPath, "success", "ARC contract updated.");
      }

      if (
        !requestedKitchenId
        && !data.claimPlanPreviewPath
        && !claimPlanUploads.preview
      ) {
        throw new Error("Select a kitchen or upload a kitchen sketch.");
      }
      if (data.housingCompanyId && data.projectId) {
        const [project] = await prisma.$queryRaw`
          SELECT "id"
          FROM "Project"
          WHERE "id" = ${data.projectId}
            AND "housingCompanyId" = ${data.housingCompanyId}
          LIMIT 1
        `;
        if (!project) {
          throw new Error("Select a valid project for the housing company.");
        }
      } else if (data.projectId) {
        const [project] = await prisma.$queryRaw`
          SELECT "id"
          FROM "Project"
          WHERE "id" = ${data.projectId}
          LIMIT 1
        `;
        if (!project) {
          throw new Error("Select a valid project.");
        }
      }

      await prisma.$transaction(async (tx) => {
        const resolvedKitchenId = requestedKitchenId || (await ensurePdfOnlyKitchen(tx)).id;
        await tx.kitchenContract.update({
          where: { id },
          data: {
            contractNumber: data.contractNumber,
            kitchenId: resolvedKitchenId,
            projectId: data.projectId,
            claimPlanPdfPath: data.claimPlanPdfPath,
            claimPlanPreviewPath: data.claimPlanPreviewPath,
            building: data.building,
            floor: data.floor,
            unitNumber: data.unitNumber,
            notes: data.notes,
          },
        });
        await upsertContractClaimPlanUploads(tx, id, claimPlanUploads);
        if (resolvedKitchenId !== contract.kitchenId) {
          await tx.contractAppliance.deleteMany({ where: { kitchenContractId: id } });
          await tx.kitchenContract.update({ where: { id }, data: { appliancesConfigured: false } });
        }
        await saveContractApplianceInventory(tx, { ...contract, contractNumber: data.contractNumber, kitchenId: resolvedKitchenId }, formData);
      });

      return redirectWithFlash(request, returnPath, "success", "Contract number updated.");
    }

    if (intent === "delete") {
      await prisma.kitchenContract.delete({
        where: { id },
      });

      return redirectWithFlash(request, returnPath, "success", "Contract number deleted.");
    }

    const isActive = intent === "reactivate";
    await prisma.kitchenContract.update({
      where: { id },
      data: { isActive },
    });

    return redirectWithFlash(
      request,
      returnPath,
      "success",
      isActive ? "Contract number reactivated." : "Contract number deactivated.",
    );
  } catch (error) {
    const pathname = returnPath || (kitchenId ? `/admin/kitchens/${kitchenId}` : "/admin/contracts");
    return redirectWithFlash(request, pathname, "error", mapAdminMutationError(error, "Contract number"));
  }
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

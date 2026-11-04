import { withAdminPermission } from "../../../../../lib/auth";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash, validatePropertyOwnerInput } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

function normalizeRouteId(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
}

async function handleGET(_request, { params }) {
  await requireAdminApi();
  const { id: rawId } = await params;
  const id = normalizeRouteId(rawId);
  const [owner] = await prisma.$queryRaw`
    SELECT
      hc."id",
      hc."name",
      hc."address",
      hc."email",
      hc."phone",
      hc."notes",
      hc."createdAt",
      hc."updatedAt",
      COUNT(DISTINCT pobj."id")::int AS "objectCount",
      COUNT(kc."id") FILTER (WHERE REGEXP_REPLACE(kc."contractNumber", '[[:space:]]', '', 'g') NOT LIKE '111%')::int AS "contractCount"
    FROM "HousingCompany" hc
    LEFT JOIN "PropertyObject" pobj ON pobj."housingCompanyId" = hc."id"
    LEFT JOIN "Project" prj ON prj."propertyObjectId" = pobj."id"
    LEFT JOIN "KitchenContract" kc ON kc."projectId" = prj."id"
    WHERE hc."id" = ${id}
    GROUP BY hc."id"
    LIMIT 1
  `;

  if (!owner) {
    return NextResponse.json({ error: "Housing company not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...owner,
    _count: {
      propertyObjects: Number(owner.objectCount || 0),
      contracts: Number(owner.contractCount || 0),
    },
  });
}

async function handlePOST(request, { params }) {
  await requireAdminApi();
  const { id: rawId } = await params;
  const id = normalizeRouteId(rawId);
  const detailPath = `/admin/property-owners/${id}`;

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "").trim();

    if (intent === "delete") {
      await prisma.$executeRaw`DELETE FROM "HousingCompany" WHERE "id" = ${id}`;
      return redirectWithFlash(request, "/admin/property-owners", "success", "Housing company deleted.");
    }

    const data = validatePropertyOwnerInput(formData);
    await prisma.$executeRaw`
      UPDATE "HousingCompany"
      SET
        "name" = ${data.name},
        "address" = ${data.address},
        "email" = ${data.email},
        "phone" = ${data.phone},
        "notes" = ${data.notes},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
    `;

    return redirectWithFlash(request, detailPath, "success", "Housing company updated.");
  } catch (error) {
    return redirectWithFlash(request, detailPath, "error", mapAdminMutationError(error, "Housing company"));
  }
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

import { withAdminPermission } from "../../../../../../lib/auth";
import { NextResponse } from "next/server";
import arcImportCore from "../../../../../../lib/arc-kitchen-import-core.cjs";
import { requireAdminApi } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";

const { buildImportPlan } = arcImportCore;

function errorResponse(error) {
  const status = Number(error?.status) || 400;
  return NextResponse.json({ error: error?.message || "ARC import plan failed." }, { status });
}

async function handlePOST(request) {
  try {
    await requireAdminApi();
    const payload = await request.json();
    const plan = await buildImportPlan(prisma, payload?.images, payload?.prefixes);
    return NextResponse.json(plan);
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST = withAdminPermission("FRG_MANAGE", handlePOST);

import { NextResponse } from "next/server";
import { requireAdminClaimsApi } from "../../../../../../lib/admin-claims-access";
import { prisma } from "../../../../../../lib/prisma";
import { queryServiceClaimById } from "../../../../../../lib/service-claim-admin-query";
import { getServiceClaimKitchenPlan } from "../../../../../../lib/service-claim-kitchen-plan";
import { buildClaimEmailPreview } from "../../../../../../lib/email/claim-email-preview";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  await requireAdminClaimsApi();
  const { id } = await params;
  const [claim] = await queryServiceClaimById(prisma, id);
  if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  const kitchenPlan = await getServiceClaimKitchenPlan(claim.contractNumber).catch(() => null);
  return NextResponse.json(buildClaimEmailPreview({ claim, kitchenPlan }), { headers: { "Cache-Control": "no-store" } });
}

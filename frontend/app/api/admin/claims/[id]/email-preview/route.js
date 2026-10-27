import { NextResponse } from "next/server";
import { requireAdminClaimsApi } from "../../../../../../lib/admin-claims-access";
import { canAccessClaim } from "../../../../../../lib/admin-roles";
import { prisma } from "../../../../../../lib/prisma";
import { queryServiceClaimById } from "../../../../../../lib/service-claim-admin-query";
import { getServiceClaimKitchenPlan } from "../../../../../../lib/service-claim-kitchen-plan";
import { buildClaimEmailPreview } from "../../../../../../lib/email/claim-email-preview";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const admin = await requireAdminClaimsApi();
  const { id } = await params;
  const [claim] = await queryServiceClaimById(prisma, id);
  if (!claim) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  if (!canAccessClaim(admin, claim.contractNumber)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const submissions = await prisma.serviceClaimSubmission.findMany({ where: { claimId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const submissionId = request.nextUrl.searchParams.get("submission");
  const submission = submissionId ? submissions.find(entry => entry.id === submissionId) : submissions[0];
  if (submissionId && !submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  const kitchenPlan = await getServiceClaimKitchenPlan(claim.contractNumber).catch(() => null);
  const preview = buildClaimEmailPreview({ claim, submission, isFollowUp: !!submission && submissions.indexOf(submission) > 0, kitchenPlan });
  return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
}

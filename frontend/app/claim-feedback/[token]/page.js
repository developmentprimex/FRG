import { prisma } from "../../../lib/prisma";
import { hashClaimFeedbackToken } from "../../../lib/claim-feedback";
import { ClaimFeedbackForm } from "../../../components/claim-feedback-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service bewerten | Fragmento", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ClaimFeedbackPage({ params }) {
  const { token } = await params;
  let state = "unavailable";
  if (/^[A-Za-z0-9_-]{43}$/.test(token || "")) {
    const invitation = await prisma.claimFeedbackInvitation.findUnique({ where: { tokenHash: hashClaimFeedbackToken(token) } });
    if (invitation?.status === "ANSWERED") state = "answered";
    else if (["SENT", "UNKNOWN", "SENDING"].includes(invitation?.status) && invitation.expiresAt > new Date()) {
      const processing = await prisma.workProcessing.findUnique({ where: { workType_workId: { workType: "CLAIM", workId: invitation.claimId } } });
      if (processing?.status === "DONE" && processing.version === invitation.completionVersion) state = "available";
    }
  }
  return <ClaimFeedbackForm token={token} state={state} />;
}

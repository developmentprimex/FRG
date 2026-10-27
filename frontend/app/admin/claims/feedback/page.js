import ClaimFeedbackPage from "../../px-claims/feedback/page";

export const dynamic = "force-dynamic";

export default function LiveClaimFeedbackPage({ searchParams = {} }) {
  return <ClaimFeedbackPage searchParams={searchParams} pxOnly={false} />;
}

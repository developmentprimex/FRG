CREATE TABLE "ClaimFeedbackInvitation" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "completionVersion" INTEGER NOT NULL,
  "recipientEmail" TEXT,
  "tokenHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "attemptedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "overallRating" INTEGER,
  "speedRating" INTEGER,
  "communicationRating" INTEGER,
  "resolved" TEXT,
  "comment" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClaimFeedbackInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClaimFeedbackInvitation_tokenHash_key" ON "ClaimFeedbackInvitation"("tokenHash");
CREATE UNIQUE INDEX "ClaimFeedbackInvitation_claimId_completionVersion_key" ON "ClaimFeedbackInvitation"("claimId", "completionVersion");
CREATE INDEX "ClaimFeedbackInvitation_claimId_createdAt_idx" ON "ClaimFeedbackInvitation"("claimId", "createdAt" DESC);
CREATE INDEX "ClaimFeedbackInvitation_status_createdAt_idx" ON "ClaimFeedbackInvitation"("status", "createdAt");

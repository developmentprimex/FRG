BEGIN;
CREATE TABLE "ServiceClaimSubmission" (
  "id" TEXT PRIMARY KEY,
  "claimId" TEXT NOT NULL REFERENCES "ServiceClaim"("id") ON DELETE CASCADE,
  "payload" JSONB NOT NULL,
  "attachmentStart" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ServiceClaimSubmission_claimId_createdAt_idx" ON "ServiceClaimSubmission"("claimId", "createdAt");
INSERT INTO "ServiceClaimSubmission" ("id", "claimId", "payload", "createdAt")
SELECT "id", "id", to_jsonb(sc), "createdAt" FROM "ServiceClaim" sc;
COMMIT;

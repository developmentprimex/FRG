CREATE TABLE "KitchenAbDocument" (
    "id" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "kitchenSlug" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REVIEW',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    CONSTRAINT "KitchenAbDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KitchenAbDocument_sha256_key" ON "KitchenAbDocument"("sha256");
CREATE INDEX "KitchenAbDocument_kitchenSlug_importedAt_idx" ON "KitchenAbDocument"("kitchenSlug", "importedAt");
CREATE TABLE "KitchenAbPublication" (
    "kitchenSlug" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KitchenAbPublication_pkey" PRIMARY KEY ("kitchenSlug"),
    CONSTRAINT "KitchenAbPublication_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KitchenAbDocument"("id") ON DELETE RESTRICT
);
CREATE TABLE "KitchenAbSyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "summary" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "KitchenAbSyncRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KitchenAbSyncRun_startedAt_idx" ON "KitchenAbSyncRun"("startedAt");

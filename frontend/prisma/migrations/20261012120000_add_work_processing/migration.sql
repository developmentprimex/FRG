CREATE TABLE "WorkProcessing" (
  "id" TEXT NOT NULL,
  "workType" TEXT NOT NULL CHECK ("workType" IN ('ORDER', 'TEST_ORDER', 'CLAIM')),
  "workId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'IN_PROGRESS', 'DONE')),
  "assignedTo" TEXT,
  "completedAt" TIMESTAMP(3),
  "completedBy" TEXT,
  "lastReminderAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkProcessing_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkProcessing_workType_workId_key" ON "WorkProcessing"("workType", "workId");
CREATE INDEX "WorkProcessing_status_lastReminderAt_idx" ON "WorkProcessing"("status", "lastReminderAt");

CREATE TABLE "WorkProcessingEvent" (
  "id" TEXT NOT NULL,
  "workType" TEXT NOT NULL,
  "workId" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "fromStatus" TEXT NOT NULL,
  "toStatus" TEXT NOT NULL,
  "fromAssignee" TEXT,
  "toAssignee" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkProcessingEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkProcessingEvent_workType_workId_createdAt_idx" ON "WorkProcessingEvent"("workType", "workId", "createdAt");

CREATE TABLE "WorkReminderBatch" (
  "id" TEXT NOT NULL,
  "dateKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENDING' CHECK ("status" IN ('SENDING', 'SENT', 'FAILED', 'UNKNOWN')),
  "items" JSONB NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "error" TEXT,
  "messageId" TEXT,
  CONSTRAINT "WorkReminderBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkReminderBatch_dateKey_key" ON "WorkReminderBatch"("dateKey");
CREATE INDEX "WorkReminderBatch_status_startedAt_idx" ON "WorkReminderBatch"("status", "startedAt");

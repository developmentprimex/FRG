CREATE TABLE "VisitJourneySession" (
    "id" UUID NOT NULL,
    "visitorId" UUID NOT NULL,
    "flow" TEXT NOT NULL,
    "contractNumber" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisitJourneySession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "VisitJourneyEvent" (
    "id" TEXT NOT NULL,
    "sessionId" UUID NOT NULL,
    "step" TEXT NOT NULL,
    "path" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VisitJourneyEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VisitJourneySession_flow_lastSeenAt_idx" ON "VisitJourneySession"("flow", "lastSeenAt");
CREATE INDEX "VisitJourneySession_visitorId_idx" ON "VisitJourneySession"("visitorId");
CREATE INDEX "VisitJourneyEvent_sessionId_occurredAt_idx" ON "VisitJourneyEvent"("sessionId", "occurredAt");
ALTER TABLE "VisitJourneyEvent" ADD CONSTRAINT "VisitJourneyEvent_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "VisitJourneySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

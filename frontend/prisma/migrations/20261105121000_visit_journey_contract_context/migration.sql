ALTER TABLE "VisitJourneySession" ADD COLUMN "contractVerifiedAt" TIMESTAMP(3);
ALTER TABLE "VisitJourneyEvent" ADD COLUMN "contractNumber" TEXT;

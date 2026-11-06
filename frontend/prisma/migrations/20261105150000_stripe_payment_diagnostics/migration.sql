ALTER TABLE "VisitJourneyEvent" ADD COLUMN "details" JSONB;
CREATE TABLE "StripePaymentEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "orderKind" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "step" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "errorCode" TEXT,
  "declineCode" TEXT,
  "stripeSessionId" TEXT,
  "paymentIntentId" TEXT,
  "journeySessionId" UUID,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "StripePaymentEvent_orderId_orderKind_occurredAt_idx" ON "StripePaymentEvent" ("orderId", "orderKind", "occurredAt");
CREATE INDEX "StripePaymentEvent_journeySessionId_occurredAt_idx" ON "StripePaymentEvent" ("journeySessionId", "occurredAt");

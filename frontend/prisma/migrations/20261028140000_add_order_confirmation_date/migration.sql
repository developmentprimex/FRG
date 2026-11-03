-- Historical dates are deliberately left unknown instead of inventing dates.
ALTER TABLE "Order" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "TestOrder" ADD COLUMN "confirmedAt" TIMESTAMP(3);

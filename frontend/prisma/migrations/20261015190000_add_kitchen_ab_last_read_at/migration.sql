-- Earlier imports did not record successful re-reads. Leave historical values
-- unknown instead of inventing a time from the PDF date or latest scan.
ALTER TABLE "KitchenAbDocument" ADD COLUMN "lastReadAt" TIMESTAMPTZ(3);
CREATE INDEX "KitchenAbDocument_lastReadAt_idx" ON "KitchenAbDocument" ("lastReadAt" DESC NULLS LAST);

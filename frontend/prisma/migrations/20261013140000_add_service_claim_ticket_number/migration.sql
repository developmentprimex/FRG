BEGIN;

-- Keep backfill and sequence initialization isolated from new submissions.
LOCK TABLE "ServiceClaim" IN ACCESS EXCLUSIVE MODE;
ALTER TABLE "ServiceClaim" ADD COLUMN "ticketNumber" INTEGER;

WITH ranked AS (
  SELECT "id", (999 + ROW_NUMBER() OVER (ORDER BY "createdAt", "id"))::INTEGER AS number
  FROM "ServiceClaim"
)
UPDATE "ServiceClaim" AS claim
SET "ticketNumber" = ranked.number
FROM ranked WHERE claim."id" = ranked."id";

CREATE SEQUENCE "ServiceClaim_ticketNumber_seq" AS INTEGER START WITH 1000 MINVALUE 1000;
ALTER SEQUENCE "ServiceClaim_ticketNumber_seq" OWNED BY "ServiceClaim"."ticketNumber";
SELECT setval('"ServiceClaim_ticketNumber_seq"',
  COALESCE((SELECT MAX("ticketNumber") FROM "ServiceClaim"), 999) + 1, false);

ALTER TABLE "ServiceClaim"
  ALTER COLUMN "ticketNumber" SET DEFAULT nextval('"ServiceClaim_ticketNumber_seq"'),
  ALTER COLUMN "ticketNumber" SET NOT NULL;
CREATE UNIQUE INDEX "ServiceClaim_ticketNumber_key" ON "ServiceClaim"("ticketNumber");

COMMIT;

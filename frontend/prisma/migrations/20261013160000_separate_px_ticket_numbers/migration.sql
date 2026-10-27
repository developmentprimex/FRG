BEGIN;
LOCK TABLE "ServiceClaim" IN ACCESS EXCLUSIVE MODE;
ALTER TABLE "ServiceClaim" ADD COLUMN "ticketSeries" TEXT NOT NULL DEFAULT 'live';
ALTER TABLE "ServiceClaim" ALTER COLUMN "ticketNumber" DROP DEFAULT;
DROP INDEX "ServiceClaim_ticketNumber_key";

UPDATE "ServiceClaim" SET "ticketSeries" = CASE
  WHEN REGEXP_REPLACE("contractNumber", '[[:space:]]+', '', 'g') LIKE '111%' THEN 'px'
  ELSE 'live' END;
WITH ranked AS (
  SELECT "id", (999 + ROW_NUMBER() OVER (PARTITION BY "ticketSeries" ORDER BY "createdAt", "id"))::INTEGER AS number
  FROM "ServiceClaim"
)
UPDATE "ServiceClaim" sc SET "ticketNumber" = ranked.number FROM ranked WHERE sc."id" = ranked."id";

CREATE SEQUENCE "ServiceClaim_pxTicketNumber_seq" AS INTEGER START WITH 1000 MINVALUE 1000;
SELECT setval('"ServiceClaim_ticketNumber_seq"', COALESCE((SELECT MAX("ticketNumber") FROM "ServiceClaim" WHERE "ticketSeries" = 'live'), 999) + 1, false);
SELECT setval('"ServiceClaim_pxTicketNumber_seq"', COALESCE((SELECT MAX("ticketNumber") FROM "ServiceClaim" WHERE "ticketSeries" = 'px'), 999) + 1, false);
CREATE UNIQUE INDEX "ServiceClaim_ticketSeries_ticketNumber_key" ON "ServiceClaim"("ticketSeries", "ticketNumber");

-- Assign only the selected series; a PX insert never consumes a live number.
CREATE FUNCTION assign_service_claim_ticket_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF REGEXP_REPLACE(NEW."contractNumber", '[[:space:]]+', '', 'g') LIKE '111%' THEN
    NEW."ticketSeries" := 'px';
    NEW."ticketNumber" := nextval('"ServiceClaim_pxTicketNumber_seq"');
  ELSE
    NEW."ticketSeries" := 'live';
    NEW."ticketNumber" := nextval('"ServiceClaim_ticketNumber_seq"');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER service_claim_ticket_number BEFORE INSERT ON "ServiceClaim"
FOR EACH ROW EXECUTE FUNCTION assign_service_claim_ticket_number();
COMMIT;

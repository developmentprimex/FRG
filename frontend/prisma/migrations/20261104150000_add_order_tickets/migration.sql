BEGIN;
LOCK TABLE "Order", "TestOrder" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE "OrderTicket" (
  "id" TEXT PRIMARY KEY,
  "ticketNumber" INTEGER NOT NULL,
  "ticketSeries" TEXT NOT NULL,
  "contractNumber" TEXT NOT NULL,
  "ticketSequence" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderTicket_series_check" CHECK ("ticketSeries" IN ('live', 'px')),
  CONSTRAINT "OrderTicket_sequence_check" CHECK ("ticketSequence" > 0)
);
CREATE UNIQUE INDEX "OrderTicket_ticketSeries_ticketNumber_key" ON "OrderTicket"("ticketSeries", "ticketNumber");
CREATE UNIQUE INDEX "OrderTicket_ticketSeries_contractNumber_ticketSequence_key" ON "OrderTicket"("ticketSeries", "contractNumber", "ticketSequence");
CREATE INDEX "OrderTicket_ticketSeries_createdAt_idx" ON "OrderTicket"("ticketSeries", "createdAt");
CREATE SEQUENCE "OrderTicket_liveNumber_seq" AS INTEGER START 1000 MINVALUE 1000;
CREATE SEQUENCE "OrderTicket_pxNumber_seq" AS INTEGER START 1000 MINVALUE 1000;
CREATE FUNCTION assign_order_ticket_number() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."ticketSeries" = 'px' THEN
    NEW."ticketNumber" := nextval('"OrderTicket_pxNumber_seq"');
  ELSIF NEW."ticketSeries" = 'live' THEN
    NEW."ticketNumber" := nextval('"OrderTicket_liveNumber_seq"');
  ELSE
    RAISE EXCEPTION 'Invalid order ticket series';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "OrderTicket_assign_number" BEFORE INSERT ON "OrderTicket" FOR EACH ROW EXECUTE FUNCTION assign_order_ticket_number();
CREATE TABLE "OrderTicketSubmission" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES "OrderTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "orderId" TEXT NOT NULL,
  "orderKind" TEXT NOT NULL CHECK ("orderKind" IN ('live', 'test')),
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OrderTicketSubmission_ticketId_createdAt_id_idx" ON "OrderTicketSubmission"("ticketId", "createdAt", "id");
CREATE INDEX "OrderTicketSubmission_orderKind_orderId_createdAt_idx" ON "OrderTicketSubmission"("orderKind", "orderId", "createdAt");

-- One initial open ticket per contract and series; preserve every existing order.
-- Older checkout edits cannot be recovered; the migration records current data.
CREATE TEMP TABLE order_ticket_backfill ON COMMIT DROP AS
SELECT 'live'::TEXT AS series, 'live'::TEXT AS kind, o."id", o."createdAt",
  REGEXP_REPLACE(COALESCE(NULLIF(o."contractNumber", ''), kc."contractNumber", o."orderNumber"), '[[:space:]]+', '', 'g') AS contract,
  (to_jsonb(o) - ARRAY['stripeCheckoutSessionId', 'stripePaymentIntentId', 'confirmationEmailDelivery']) ||
    jsonb_build_object('items', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i."createdAt", i."id") FROM "OrderItem" i WHERE i."orderId" = o."id"), '[]'::jsonb)) AS payload
FROM "Order" o LEFT JOIN "KitchenContract" kc ON kc."id" = o."kitchenContractId"
UNION ALL
SELECT 'px', 'test', o."id", o."createdAt",
  REGEXP_REPLACE(COALESCE(NULLIF(o."contractNumber", ''), kc."contractNumber", o."orderNumber"), '[[:space:]]+', '', 'g'),
  (to_jsonb(o) - ARRAY['stripeCheckoutSessionId', 'stripePaymentIntentId', 'confirmationEmailDelivery']) ||
    jsonb_build_object('items', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i."createdAt", i."id") FROM "TestOrderItem" i WHERE i."orderId" = o."id"), '[]'::jsonb))
FROM "TestOrder" o LEFT JOIN "KitchenContract" kc ON kc."id" = o."kitchenContractId";
INSERT INTO "OrderTicket" ("id", "ticketSeries", "contractNumber", "ticketSequence", "createdAt")
SELECT 'order-ticket-' || series || '-' || md5(contract), series, contract, 1, MIN("createdAt")
FROM order_ticket_backfill GROUP BY series, contract ORDER BY MIN("createdAt"), series, contract;
INSERT INTO "OrderTicketSubmission" ("id", "ticketId", "orderId", "orderKind", "payload", "createdAt")
SELECT 'order-ticket-submission-' || kind || '-' || "id", 'order-ticket-' || series || '-' || md5(contract), "id", kind, payload, "createdAt"
FROM order_ticket_backfill;
COMMIT;

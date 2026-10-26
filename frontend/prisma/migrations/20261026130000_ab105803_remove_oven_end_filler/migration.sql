-- Keep historical order references, but remove this filler from the live catalog.
UPDATE "KitchenItem" AS item
SET "isActive" = false,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-105803'
  AND item."code" = 'BLENDE-AB105803-UPK20'
  AND item."componentKey" = 'end-blende'
  AND item."isActive" = true;

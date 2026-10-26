-- Add the missing HPK2002 only to the H5002 in this exact layout family.
-- Existing prices retain their cabinet portion; repeated application is a no-op.
UPDATE "KitchenItem" AS item
SET "price" = item."price" + COALESCE(blende."price", 35.00),
    "blendeCode" = 'HPK2002',
    "blendeLabel" = COALESCE(blende."nameDe", blende."name", 'HPK2002 20 cm'),
    "blendePrice" = COALESCE(blende."price", 35.00),
    "catalogBlendeId" = blende."id",
    "catalogBlendeQuantity" = 1,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
LEFT JOIN "CatalogBlende" AS blende ON blende."code" = 'HPK2002'
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" IN ('ab-104968', 'ab-105734', 'ab-105737', 'ab-105740')
  AND item."code" = 'CAB-WALL-AB104968-H5002-R'
  AND item."componentKey" = 'wall-cabinet-1'
  AND item."blendeCode" IS NULL
  AND item."catalogBlendeId" IS NULL;

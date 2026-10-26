-- Only the right-hand US30 in 105803 loses its attached filler.
-- Keep its existing code/id so selections and order references remain valid.
UPDATE "KitchenItem" AS item
SET "price" = item."price" - COALESCE(item."blendePrice", 25.00),
    "blendeCode" = NULL,
    "blendeLabel" = NULL,
    "blendePrice" = NULL,
    "catalogBlendeId" = NULL,
    "catalogBlendeQuantity" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-105803'
  AND item."code" = 'CAB-BASE-AB105803-US30-UPK20'
  AND item."componentKey" = 'base-module-2'
  AND item."blendeCode" = 'UPK20';

-- Transfer the existing UPEF65 corner package from the dishwasher to US30.
-- Update both rows atomically, preserving the existing filler price/link.
WITH corner AS (
  SELECT dishwasher."id" AS "dishwasherId", cabinet."id" AS "cabinetId",
         COALESCE(dishwasher."blendePrice", 68.00) AS "price",
         dishwasher."blendeLabel", dishwasher."catalogBlendeId",
         COALESCE(dishwasher."catalogBlendeQuantity", 1) AS "quantity"
  FROM "KitchenItem" AS dishwasher, "Kitchen" AS kitchen, "KitchenItem" AS cabinet
  WHERE dishwasher."kitchenId" = kitchen."id"
    AND kitchen."slug" = 'ab-105803'
    AND dishwasher."code" = 'DISH-AB105803-600-UPEF65'
    AND dishwasher."componentKey" = 'dishwasher-base'
    AND dishwasher."blendeCode" = 'UPEF65'
    AND cabinet."kitchenId" = kitchen."id"
    AND cabinet."code" = 'CAB-BASE-AB105803-US30-UPK20'
    AND cabinet."componentKey" = 'base-module-2'
    AND cabinet."blendeCode" IS NULL
), moved_corner AS (
  UPDATE "KitchenItem" AS dishwasher
  SET "price" = dishwasher."price" - corner."price",
      "blendeCode" = NULL,
      "blendeLabel" = NULL,
      "blendePrice" = NULL,
      "catalogBlendeId" = NULL,
      "catalogBlendeQuantity" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
  FROM corner
  WHERE dishwasher."id" = corner."dishwasherId"
  RETURNING corner.*
)
UPDATE "KitchenItem" AS cabinet
SET "price" = cabinet."price" + moved_corner."price",
    "blendeCode" = 'UPEF65',
    "blendeLabel" = moved_corner."blendeLabel",
    "blendePrice" = moved_corner."price",
    "catalogBlendeId" = moved_corner."catalogBlendeId",
    "catalogBlendeQuantity" = moved_corner."quantity",
    "updatedAt" = CURRENT_TIMESTAMP
FROM moved_corner
WHERE cabinet."id" = moved_corner."cabinetId";

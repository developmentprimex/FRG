-- Preserve the item code/id so existing selections and order references remain valid.
-- Only the dishwasher in 105789 loses its attached UPEF65 and its surcharge.
UPDATE "KitchenItem" AS item
SET "price" = COALESCE(article."price", item."price" - COALESCE(item."blendePrice", 68.00)),
    "blendeCode" = NULL,
    "blendeLabel" = NULL,
    "blendePrice" = NULL,
    "catalogBlendeId" = NULL,
    "catalogBlendeQuantity" = NULL,
    "infoText" = 'Dishwasher incl. furniture front, without an attached filler',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen, "CatalogArticle" AS article
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-105789'
  AND item."code" = 'DISH-AB105789-600-UPEF65'
  AND item."componentKey" = 'dishwasher-base'
  AND article."id" = item."catalogArticleId"
  AND (item."blendeCode" IS NOT NULL OR item."catalogBlendeId" IS NOT NULL);

-- One UPEF65 belongs to the US30 on the oven leg, not the dishwasher.
-- Preserve item identity for saved selections and historical order references.
UPDATE "KitchenItem" AS item
SET "price" = article."price" + filler."price",
    "blendeCode" = filler."code",
    "blendeLabel" = COALESCE(filler."nameDe", filler."name"),
    "blendePrice" = filler."price",
    "catalogBlendeId" = filler."id",
    "catalogBlendeQuantity" = 1,
    "infoText" = 'US30 lower cabinet with one UPEF65 corner filler on the oven leg',
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Kitchen" AS kitchen, "CatalogArticle" AS article, "CatalogBlende" AS filler
WHERE item."kitchenId" = kitchen."id"
  AND kitchen."slug" = 'ab-105789'
  AND item."code" = 'CAB-BASE-AB105789-US30-UPK20-1'
  AND item."componentKey" = 'base-module-1'
  AND article."id" = item."catalogArticleId"
  AND filler."code" = 'UPEF65'
  AND item."blendeCode" IS DISTINCT FROM 'UPEF65';

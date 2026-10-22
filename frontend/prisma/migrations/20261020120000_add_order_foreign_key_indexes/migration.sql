-- Speeds up kitchen filters on orders and kitchen item joins on order items.
CREATE INDEX IF NOT EXISTS "Order_kitchenId_idx" ON "Order"("kitchenId");
CREATE INDEX IF NOT EXISTS "TestOrder_kitchenId_idx" ON "TestOrder"("kitchenId");
CREATE INDEX IF NOT EXISTS "OrderItem_kitchenItemId_idx" ON "OrderItem"("kitchenItemId");
CREATE INDEX IF NOT EXISTS "TestOrderItem_kitchenItemId_idx" ON "TestOrderItem"("kitchenItemId");

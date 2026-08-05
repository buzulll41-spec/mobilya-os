-- Satış Kaynağı ↔ Fiziksel/Stok Lokasyon ayrımı.
-- Depo artık satış kaynağı DEĞİL: WAREHOUSE satış kaynağı kaldırılır,
-- fiziksel lokasyon (physicalLocation) ayrı bağımsız eksen olur.

-- products: alan yeniden adlandırma
ALTER TABLE "products" RENAME COLUMN "sourceType" TO "salesSourceType";
ALTER TABLE "products" RENAME COLUMN "displayLocation" TO "displayFloor";
ALTER TABLE "products" ADD COLUMN "physicalLocation" TEXT;

-- Eski WAREHOUSE satış kaynağı → STOCK_ITEM (satış) + Depo Katı (fiziksel)
UPDATE "products"
  SET "physicalLocation" = 'WAREHOUSE_FLOOR'
  WHERE "salesSourceType" = 'WAREHOUSE' OR "warehouseLocation" IS NOT NULL;
UPDATE "products"
  SET "salesSourceType" = 'STOCK_ITEM'
  WHERE "salesSourceType" = 'WAREHOUSE';

ALTER TABLE "products" DROP COLUMN "warehouseLocation";
ALTER INDEX "products_sourceType_idx" RENAME TO "products_salesSourceType_idx";

-- order_lines: satış kaleminde yalnızca satış kaynağı snapshot'ı kalır
ALTER TABLE "order_lines" RENAME COLUMN "soldSourceType" TO "soldSalesSourceType";
ALTER TABLE "order_lines" RENAME COLUMN "soldDisplayLocation" TO "soldDisplayFloor";

UPDATE "order_lines"
  SET "soldSalesSourceType" = 'STOCK_ITEM'
  WHERE "soldSalesSourceType" = 'WAREHOUSE';

ALTER TABLE "order_lines" DROP COLUMN "soldWarehouseLocation";
ALTER INDEX "order_lines_soldSourceType_idx" RENAME TO "order_lines_soldSalesSourceType_idx";

-- Ürün Kaynağı / Sergi Katı / Depo / Dış Tedarik sınıflandırması.
-- Additive ve nullable: mevcut kayıtlar NULL kalır (backfill yok → raporlarda "Bilinmeyen").

-- Product master sınıflandırma alanları
ALTER TABLE "products" ADD COLUMN "sourceType" TEXT;
ALTER TABLE "products" ADD COLUMN "displayLocation" TEXT;
ALTER TABLE "products" ADD COLUMN "warehouseLocation" TEXT;
ALTER TABLE "products" ADD COLUMN "externalSupplyType" TEXT;
CREATE INDEX "products_sourceType_idx" ON "products"("sourceType");

-- Sipariş kalemi satış anı snapshot alanları
ALTER TABLE "order_lines" ADD COLUMN "soldSourceType" TEXT;
ALTER TABLE "order_lines" ADD COLUMN "soldDisplayLocation" TEXT;
ALTER TABLE "order_lines" ADD COLUMN "soldWarehouseLocation" TEXT;
ALTER TABLE "order_lines" ADD COLUMN "soldExternalSupplyType" TEXT;
ALTER TABLE "order_lines" ADD COLUMN "soldUnitCost" DECIMAL(14,2);
CREATE INDEX "order_lines_soldSourceType_idx" ON "order_lines"("soldSourceType");

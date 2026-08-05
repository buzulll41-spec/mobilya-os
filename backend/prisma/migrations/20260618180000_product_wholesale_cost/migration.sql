-- Ürün toptan fiyat / iskonto + sipariş maliyet snapshot + cari ürün başlığı
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "wholesalePrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "wholesaleDiscountRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

UPDATE "products"
SET "wholesalePrice" = "purchasePrice"
WHERE "wholesalePrice" = 0 AND "purchasePrice" > 0;

ALTER TABLE "order_lines"
  ADD COLUMN IF NOT EXISTS "soldWholesalePrice" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "soldWholesaleDiscountRate" DECIMAL(5,2);

ALTER TABLE "supplier_ledger_entries"
  ADD COLUMN IF NOT EXISTS "productTitleSnapshot" TEXT;

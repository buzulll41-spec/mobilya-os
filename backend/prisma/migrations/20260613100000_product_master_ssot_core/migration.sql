-- Faz A — Product Master SSOT çekirdek alanları (geriye uyumlu, additive)
ALTER TABLE "products" ADD COLUMN "productType" TEXT NOT NULL DEFAULT 'SIMPLE';
ALTER TABLE "products" ADD COLUMN "collectionCode" TEXT;
ALTER TABLE "products" ADD COLUMN "seasonCode" TEXT;
ALTER TABLE "products" ADD COLUMN "weightKg" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN "packageWidthCm" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN "packageDepthCm" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN "packageHeightCm" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN "packageCount" INTEGER;
ALTER TABLE "products" ADD COLUMN "assemblyType" TEXT;
ALTER TABLE "products" ADD COLUMN "coating" TEXT;
ALTER TABLE "products" ADD COLUMN "mechanism" TEXT;
ALTER TABLE "products" ADD COLUMN "technicalAttributes" JSONB;
ALTER TABLE "products" ADD COLUMN "colorOptions" JSONB;
ALTER TABLE "products" ADD COLUMN "fabricOptions" JSONB;
ALTER TABLE "products" ADD COLUMN "tags" JSONB;
ALTER TABLE "products" ADD COLUMN "relatedProductIds" JSONB;

CREATE INDEX "products_productType_idx" ON "products"("productType");
CREATE INDEX "products_collectionCode_idx" ON "products"("collectionCode");

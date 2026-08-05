-- FAZ 3 — WooCommerce sync omurgası
ALTER TABLE "products" ADD COLUMN "wooProductId" INTEGER;
ALTER TABLE "products" ADD COLUMN "wooStatus" TEXT NOT NULL DEFAULT 'NOT_READY';
ALTER TABLE "products" ADD COLUMN "wooLastSyncAt" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "wooLastError" TEXT;
ALTER TABLE "products" ADD COLUMN "wooSyncRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "wooCategoryId" INTEGER;

ALTER TABLE "product_variants" ADD COLUMN "wooVariationId" INTEGER;

CREATE INDEX "products_wooStatus_idx" ON "products"("wooStatus");

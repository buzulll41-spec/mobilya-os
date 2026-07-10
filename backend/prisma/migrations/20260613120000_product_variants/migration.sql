-- Faz B — Product Variant model
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantCode" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "attributes" JSONB,
    "priceDelta" DECIMAL(14,2),
    "costDelta" DECIMAL(14,2),
    "salePrice" DECIMAL(14,2),
    "purchasePrice" DECIMAL(14,2),
    "stockQuantity" INTEGER,
    "stockStatus" TEXT,
    "widthCm" DECIMAL(10,2),
    "depthCm" DECIMAL(10,2),
    "heightCm" DECIMAL(10,2),
    "color" TEXT,
    "fabric" TEXT,
    "sizeLabel" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_variants_variantCode_key" ON "product_variants"("variantCode");
CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

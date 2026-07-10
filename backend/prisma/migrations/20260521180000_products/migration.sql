-- Ürün kartı master v1
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "suiteType" TEXT,
    "defaultSalePrice" DECIMAL(14,2) NOT NULL,
    "minSalePrice" DECIMAL(14,2) NOT NULL,
    "purchasePrice" DECIMAL(14,2) NOT NULL,
    "defaultSupplierId" TEXT,
    "deliveryDays" INTEGER NOT NULL DEFAULT 14,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stockType" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_productCode_key" ON "products"("productCode");
CREATE INDEX "products_productName_idx" ON "products"("productName");
CREATE INDEX "products_category_idx" ON "products"("category");
CREATE INDEX "products_isActive_idx" ON "products"("isActive");
CREATE INDEX "products_defaultSupplierId_idx" ON "products"("defaultSupplierId");

ALTER TABLE "products" ADD CONSTRAINT "products_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_lines" ADD COLUMN "productId" TEXT;
CREATE INDEX "order_lines_productId_idx" ON "order_lines"("productId");
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incoming_goods_records" ADD COLUMN "productId" TEXT;
CREATE INDEX "incoming_goods_records_productId_idx" ON "incoming_goods_records"("productId");
ALTER TABLE "incoming_goods_records" ADD CONSTRAINT "incoming_goods_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

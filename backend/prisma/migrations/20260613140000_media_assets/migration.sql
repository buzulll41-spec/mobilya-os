-- FAZ 2 — Media Merkezi omurgası
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'LOCAL',
    "storageKey" TEXT NOT NULL,
    "cdnUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_media_links" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "media_assets_mimeType_idx" ON "media_assets"("mimeType");
CREATE INDEX "media_assets_uploadedAt_idx" ON "media_assets"("uploadedAt");
CREATE INDEX "product_media_links_productId_role_sortOrder_idx" ON "product_media_links"("productId", "role", "sortOrder");
CREATE INDEX "product_media_links_assetId_idx" ON "product_media_links"("assetId");
CREATE UNIQUE INDEX "product_media_links_productId_assetId_role_key" ON "product_media_links"("productId", "assetId", "role");

ALTER TABLE "product_media_links" ADD CONSTRAINT "product_media_links_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_media_links" ADD CONSTRAINT "product_media_links_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

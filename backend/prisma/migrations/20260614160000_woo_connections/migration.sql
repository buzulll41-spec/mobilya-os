-- FAZ 4A — WooCommerce API foundation
CREATE TABLE "woo_connections" (
    "id" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "storeUrl" TEXT NOT NULL,
    "consumerKey" TEXT NOT NULL,
    "consumerSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastConnectionCheck" TIMESTAMP(3),
    "lastConnectionStatus" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "woo_connections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "woo_connections_isActive_idx" ON "woo_connections"("isActive");

-- CreateTable
CREATE TABLE "order_missing_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "supplierNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "order_missing_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_missing_items_orderId_idx" ON "order_missing_items"("orderId");

-- CreateIndex
CREATE INDEX "order_missing_items_orderId_status_idx" ON "order_missing_items"("orderId", "status");

-- AddForeignKey
ALTER TABLE "order_missing_items" ADD CONSTRAINT "order_missing_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_missing_items" ADD CONSTRAINT "order_missing_items_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "order_lines" ADD COLUMN "qtyReceived" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "incoming_goods_records" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "receivedAt" DATE NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productGroup" TEXT,
    "qty" DECIMAL(14,2) NOT NULL,
    "unitPurchasePrice" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "purpose" TEXT NOT NULL,
    "orderLineId" TEXT,
    "salesOrderId" TEXT,
    "invoiceNo" TEXT,
    "documentNo" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incoming_goods_records_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "incomingGoodsRecordId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "supplier_ledger_entries_incomingGoodsRecordId_key" ON "supplier_ledger_entries"("incomingGoodsRecordId");

-- CreateIndex
CREATE INDEX "incoming_goods_records_supplierId_receivedAt_idx" ON "incoming_goods_records"("supplierId", "receivedAt");

-- CreateIndex
CREATE INDEX "incoming_goods_records_receivedAt_idx" ON "incoming_goods_records"("receivedAt");

-- CreateIndex
CREATE INDEX "incoming_goods_records_purpose_idx" ON "incoming_goods_records"("purpose");

-- CreateIndex
CREATE INDEX "incoming_goods_records_orderLineId_idx" ON "incoming_goods_records"("orderLineId");

-- CreateIndex
CREATE INDEX "incoming_goods_records_salesOrderId_idx" ON "incoming_goods_records"("salesOrderId");

-- AddForeignKey
ALTER TABLE "incoming_goods_records" ADD CONSTRAINT "incoming_goods_records_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incoming_goods_records" ADD CONSTRAINT "incoming_goods_records_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_ledger_entries" ADD CONSTRAINT "supplier_ledger_entries_incomingGoodsRecordId_fkey" FOREIGN KEY ("incomingGoodsRecordId") REFERENCES "incoming_goods_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

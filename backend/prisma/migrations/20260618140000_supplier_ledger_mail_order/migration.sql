-- Mail order tedarikçi cari takibi
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "paymentTransactionId" TEXT;
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "salesOrderId" TEXT;
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "customerNameSnapshot" TEXT;
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "source" TEXT;
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "reversesEntryId" TEXT;

CREATE UNIQUE INDEX "supplier_ledger_entries_paymentTransactionId_key" ON "supplier_ledger_entries"("paymentTransactionId");
CREATE INDEX "supplier_ledger_entries_supplierId_status_idx" ON "supplier_ledger_entries"("supplierId", "status");
CREATE INDEX "supplier_ledger_entries_salesOrderId_idx" ON "supplier_ledger_entries"("salesOrderId");

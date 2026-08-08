-- Financial safety: explicit idempotency and reversal traceability
ALTER TABLE "payment_transactions" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "payment_transactions" ADD COLUMN "reversalSourcePaymentId" TEXT;
ALTER TABLE "supplier_ledger_entries" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "payment_transactions_salesOrderId_idempotencyKey_key"
  ON "payment_transactions"("salesOrderId", "idempotencyKey");

CREATE UNIQUE INDEX "payment_transactions_reversalSourcePaymentId_key"
  ON "payment_transactions"("reversalSourcePaymentId");

CREATE UNIQUE INDEX "supplier_ledger_entries_supplierId_idempotencyKey_key"
  ON "supplier_ledger_entries"("supplierId", "idempotencyKey");

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_reversalSourcePaymentId_fkey"
  FOREIGN KEY ("reversalSourcePaymentId") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

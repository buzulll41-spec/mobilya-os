-- Mail order tahsilatlarında tedarikçi takibi
ALTER TABLE "payment_transactions" ADD COLUMN "mailOrderSupplierId" TEXT;
ALTER TABLE "payment_transactions" ADD COLUMN "mailOrderSupplierNameSnapshot" TEXT;

CREATE INDEX "payment_transactions_mailOrderSupplierId_idx" ON "payment_transactions"("mailOrderSupplierId");

ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_mailOrderSupplierId_fkey"
  FOREIGN KEY ("mailOrderSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

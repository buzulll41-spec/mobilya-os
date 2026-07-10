-- Tedarik emri + depo girişi durum alanları (OrderLine)
ALTER TABLE "order_lines" ADD COLUMN "supplyStatus" TEXT NOT NULL DEFAULT 'NOT_SENT';
ALTER TABLE "order_lines" ADD COLUMN "supplyChannel" TEXT;
ALTER TABLE "order_lines" ADD COLUMN "supplySentAt" TIMESTAMP(3);
ALTER TABLE "order_lines" ADD COLUMN "supplySentByUserId" TEXT;
ALTER TABLE "order_lines" ADD COLUMN "supplySentByName" TEXT;
ALTER TABLE "order_lines" ADD COLUMN "warehouseEntryStatus" TEXT NOT NULL DEFAULT 'NOT_SENT';

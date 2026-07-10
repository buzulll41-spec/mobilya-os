-- Core commerce stabilization: yapısal finans + sipariş satırı ticari snapshot
-- Prisma default column names (camelCase)

-- Partial failed apply cleanup (snake_case attempt)
ALTER TABLE "sales_orders" DROP COLUMN IF EXISTS "subtotal_amount";
ALTER TABLE "sales_orders" DROP COLUMN IF EXISTS "discount_amount";
ALTER TABLE "sales_orders" DROP COLUMN IF EXISTS "discount_type";
ALTER TABLE "sales_orders" DROP COLUMN IF EXISTS "discount_percent";
ALTER TABLE "sales_orders" DROP COLUMN IF EXISTS "discount_fixed_amount";
ALTER TABLE "sales_orders" DROP COLUMN IF EXISTS "discount_note";
ALTER TABLE "sales_orders" DROP COLUMN IF EXISTS "remaining_amount";

ALTER TABLE "order_lines" DROP COLUMN IF EXISTS "unit_price";
ALTER TABLE "order_lines" DROP COLUMN IF EXISTS "line_total";
ALTER TABLE "order_lines" DROP COLUMN IF EXISTS "product_title_snapshot";
ALTER TABLE "order_lines" DROP COLUMN IF EXISTS "product_group_snapshot";
ALTER TABLE "order_lines" DROP COLUMN IF EXISTS "supplier_id";
ALTER TABLE "order_lines" DROP COLUMN IF EXISTS "supplier_name_snapshot";
ALTER TABLE "order_lines" DROP COLUMN IF EXISTS "configuration_summary";

ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "subtotalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountType" TEXT,
  ADD COLUMN IF NOT EXISTS "discountPercent" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "discountFixedAmount" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "discountNote" TEXT,
  ADD COLUMN IF NOT EXISTS "remainingAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

UPDATE "sales_orders"
SET
  "subtotalAmount" = "totalAmount",
  "discountAmount" = 0,
  "discountType" = 'NONE',
  "remainingAmount" = GREATEST(0, "totalAmount" - "paidAmount")
WHERE "subtotalAmount" = 0 AND "totalAmount" > 0;

ALTER TABLE "order_lines"
  ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "lineTotal" DECIMAL(14,2),
  ADD COLUMN IF NOT EXISTS "productTitleSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "productGroupSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "supplierId" TEXT,
  ADD COLUMN IF NOT EXISTS "supplierNameSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "configurationSummary" JSONB;

UPDATE "order_lines" ol
SET
  "productTitleSnapshot" = ol."title",
  "unitPrice" = COALESCE(
    ol."unitPrice",
    CASE
      WHEN ol."qtyOrdered" > 0 AND so."totalAmount" > 0 THEN so."totalAmount" / ol."qtyOrdered"
      ELSE 0
    END
  ),
  "lineTotal" = COALESCE(
    ol."lineTotal",
    CASE
      WHEN ol."qtyOrdered" > 0 AND so."totalAmount" > 0 THEN so."totalAmount"
      ELSE 0
    END
  )
FROM "sales_orders" so
WHERE so."id" = ol."salesOrderId"
  AND (ol."unitPrice" IS NULL OR ol."lineTotal" IS NULL OR ol."productTitleSnapshot" IS NULL);

CREATE INDEX IF NOT EXISTS "order_lines_supplier_id_idx" ON "order_lines"("supplierId");

ALTER TABLE "order_lines"
  ADD CONSTRAINT "order_lines_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

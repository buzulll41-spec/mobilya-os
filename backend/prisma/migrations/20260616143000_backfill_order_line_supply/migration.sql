-- Pilot verisi: supplyStatus/warehouseEntryStatus migration sonrası NOT_SENT kalmış satırları
-- legacy sipariş displayStatus + qtyReceived ile hizalar (mockOrderLineBootstrap ile aynı kural).

-- 1) Gelen adet kaydı olan satırlar → tedarik verildi + depo durumu miktardan
UPDATE "order_lines"
SET
  "supplyStatus" = 'SENT',
  "warehouseEntryStatus" = CASE
    WHEN "qtyReceived" <= 0 THEN 'WAITING'
    WHEN "qtyReceived" >= "qtyOrdered" THEN 'ARRIVED'
    ELSE 'PARTIAL_ARRIVED'
  END
WHERE "qtyReceived" > 0;

-- 2) Aktif operasyon siparişleri — tedarik bekleyen satırlar
UPDATE "order_lines" AS ol
SET
  "supplyStatus" = 'SENT',
  "warehouseEntryStatus" = 'WAITING'
FROM "sales_orders" AS so
WHERE ol."salesOrderId" = so."id"
  AND ol."supplyStatus" = 'NOT_SENT'
  AND so."displayStatus" IN ('Üretimde', 'Eksik Var', 'Bekleniyor', 'Kısmi Geldi');

-- 3) Depo geldi / hazır siparişler
UPDATE "order_lines" AS ol
SET
  "supplyStatus" = 'SENT',
  "warehouseEntryStatus" = 'ARRIVED'
FROM "sales_orders" AS so
WHERE ol."salesOrderId" = so."id"
  AND ol."supplyStatus" = 'NOT_SENT'
  AND so."displayStatus" IN ('Geldi', 'Hazır', 'Sevke Hazır');

-- 4) Teslim edildi — kapalı sipariş satırları
UPDATE "order_lines" AS ol
SET
  "supplyStatus" = 'SENT',
  "warehouseEntryStatus" = 'ARRIVED'
FROM "sales_orders" AS so
WHERE ol."salesOrderId" = so."id"
  AND ol."supplyStatus" = 'NOT_SENT'
  AND so."displayStatus" = 'Teslim Edildi';

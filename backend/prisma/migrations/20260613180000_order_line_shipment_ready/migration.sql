-- Sevke hazır işareti — depo girişinden ayrı, kullanıcı onayı ile set edilir
ALTER TABLE "order_lines" ADD COLUMN "shipmentReady" BOOLEAN NOT NULL DEFAULT false;

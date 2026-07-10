# Pilot mağaza — 1 günlük gerçek kullanım hazırlığı

## Altyapı

- [ ] Docker Desktop çalışıyor
- [ ] `cd backend && docker compose up -d` (PostgreSQL)
- [ ] `npx prisma migrate deploy` (şema güncel)
- [ ] `npm run db:seed` — **canlı pilot verisini silmez** (mevcut sipariş varsa demo sipariş atlanır)
- [ ] Demo veriyi sıfırlamak için: `npm run db:reset-demo` (`SEED_RESET=1` — kullanıcılar korunur)
- [ ] `npm run dev` — backend `http://localhost:4000`
- [ ] `cd client && npm run dev` — frontend `http://localhost:5173`

## API modu & güvenlik

- [ ] `client/.env` → `VITE_API_BASE_URL=http://localhost:4000`
- [ ] `AUTH_JWT_SECRET` backend `.env` içinde set (production’da güçlü secret)
- [ ] Pilot kullanıcı ile login (seed: `admin@mobilya.local` / `admin123`, `sales@mobilya.local` / `sales123`, …)
- [ ] Uygulama açılışında veri kaynağı göstergesi **API** olmalı
- [ ] `GET /health` → `{ ok: true, database: "up" }`
- [ ] Endpoint RBAC aktif — yetkisiz işlem **403**, oturumsuz **401**
- [ ] ADMIN/MANAGER → **Kullanıcılar** ekranından hesap açma / pasifleştirme / şifre sıfırlama

## Yedekleme (öneri — pilot günü)

Pilot günü öncesi ve gün sonunda:

```bash
# Örnek (container adını docker ps ile doğrulayın)
docker exec -t mobilya-os-postgres-1 pg_dump -U postgres mobilya > backup-pilot-YYYYMMDD.sql
```

- [ ] `pg_dump` veya Docker volume snapshot alındı
- [ ] `.env` ve `client/.env` repo dışında güvenli yerde
- [ ] `npm run db:seed` ile `npm run db:reset-demo` karıştırılmadı (reset yalnızca demo sıfırlama)

## Operasyon doğrulama (15 dk)

- [ ] Yeni sipariş oluştur (SALES) → listede görünür
- [ ] Sözleşme yazdır → timeline’da **Sözleşme yazdırıldı** + `operationActor` gerçek kullanıcı
- [ ] Kapora ödemesi gir (SALES) → audit’te **Ödeme tahsil edildi** + actor
- [ ] Sevk planla (OPERATION; gerekirse `allowReceivingRisk`) → audit + policy override actor
- [ ] Gelen ürün kaydı (WAREHOUSE) → domain event `incoming_goods.recorded`
- [ ] Görev panelinde **Tamamla / Ertele / Gizle** — API modunda kullanıcı bazlı DB overlay
- [ ] JWT süresi dolunca login ekranı + Türkçe mesaj; logout sonrası görev cache temiz

## Rol özeti (API + UI)

| Rol | Özet |
|-----|------|
| ADMIN / MANAGER | Tüm endpointler + kullanıcı yönetimi |
| SALES | Sipariş oluştur/listele, tahsilat, ürün kartı, sözleşme event; sevk/gelen/tedarik ödemesi yok |
| OPERATION | Sipariş görüntüle, durum, sevk, SSH; ödeme yok |
| WAREHOUSE | Gelen ürün, tedarik görüntüleme, sevk hazırlık (okuma), ürün kartı; satış/ödeme yok |

## Manuel operasyon checklist (gün sonu)

- [ ] Açık SSH kayıtları kapandı mı?
- [ ] Teslim edildi + bakiye açık siparişler tahsil edildi mi?
- [ ] Sevk planı olmayan “Geldi/Hazır” siparişler planlandı mı?
- [ ] Mail order ödemeleri tedarikçi caride doğrulandı mı?

## Bilinen sınırlar (pilot sonrası production)

- Davet e-postası / OAuth yok — mağaza içi kullanıcı + geçici şifre
- JWT stateless — uzun oturum için refresh token yok
- Genel `updateOrder` API yok (durum/termin/ödeme ayrı endpoint)
- Çoklu mağaza (tenant) yok

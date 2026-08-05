# MOBILYA OS — Backend Foundation v1 (Stable Checkpoint)

**Etiket:** Backend Foundation v1 Stable  
**Kapsam:** `backend/` READ API slice — Fastify, PostgreSQL, Prisma, `GET /health`, `GET /v1/orders`, seed verisi ve istemcinin gerçek API ile sipariş listesi okuması.  
**İlişkili:** [Client Foundation v1](./FOUNDATION_V1.md) · [Manuel smoke (client)](./FOUNDATION_V1_SMOKE_TEST.md)

Bu doküman, Backend Foundation v1’in **resmi checkpoint** tanımıdır. Davranış değişikliği bu etiket altında yeni özellik eklenmeden yapılmamalıdır; sonraki işler mutation, auth veya ek endpoint’ler için yeni checkpoint’lerde tanımlanır.

---

## 1. Backend stack

| Katman | Teknoloji | Not |
|--------|-----------|-----|
| HTTP | [Fastify](https://fastify.dev/) 5 | `src/server.ts` |
| ORM | [Prisma](https://www.prisma.io/) 6 | `prisma/schema.prisma` |
| Veritabanı | PostgreSQL 16 | Docker veya yerel |
| Çalışma zamanı | Node 20+ | `tsx` (dev), `tsc` + `node` (prod) |
| CORS | `@fastify/cors` | `CORS_ORIGIN` (varsayılan `http://localhost:5173`) |

**Kasıtlı olarak yok:** kimlik doğrulama, yazma (POST/PUT/PATCH/DELETE), WebSocket, rate limiting, çok kiracılık.

---

## 2. PostgreSQL ve Docker

`backend/docker-compose.yml` yalnızca Postgres servisini tanımlar:

- Görüntü: `postgres:16-alpine`
- Port: `5432:5432`
- Kullanıcı / şifre / DB: `mobilya` / `mobilya` / `mobilya`
- Kalıcı volume: `mobilya_pg`

**Önkoşul:** Docker Desktop (veya eşdeğer daemon) çalışır durumda olmalıdır.

```bash
cd backend
docker compose up -d postgres
```

Yerel PostgreSQL kullanılıyorsa `backend/.env` içindeki `DATABASE_URL` buna göre ayarlanır; Docker zorunlu değildir.

Örnek `DATABASE_URL` (`.env.example` ile uyumlu):

```
postgresql://mobilya:mobilya@localhost:5432/mobilya?schema=public
```

---

## 3. Prisma migration

Migration’lar `backend/prisma/migrations/` altındadır. Foundation v1’de tek başlangıç migration’ı vardır:

- `20260514170000_init` — `sales_orders`, ilişkili tablolar, `domain_events`

**İlk kurulum veya temiz DB:**

```bash
cd backend
cp .env.example .env   # Windows: copy .env.example .env
npm install
npx prisma migrate deploy
```

Geliştirici ortamında yeni migration üretmek (DB gerekir):

```bash
npm run db:migrate:dev
```

Şema inceleme: `npm run db:studio`

---

## 4. Seed data

Seed: `backend/prisma/seed.ts` — `npm run db:seed` veya `prisma db seed`.

Demo siparişleri (örnek id’ler):

| Id | Amaç |
|----|------|
| `S-DEMO-PAYMENT` | Kısmi tahsilat, düşük risk |
| `S-DEMO-PARTIAL` | Kısmi sevk + gecikmiş bakiye → HIGH risk |
| `S-DEMO-EKSIK` | Operasyon durumu «Eksik Var» → HIGH risk |
| `S-DEMO-DELIVERED` | Teslim edilmiş, tam ödeme |

Seed, `domain_events` ve ilişkili satır / ödeme / sevkiyat kayıtlarını da yükler.

---

## 5. HTTP API

### `GET /health`

Yanıt: `{ "ok": true }` — süreç ayakta, JSON döner.

### `GET /v1/orders`

- **Davranış:** Tüm satış siparişlerini `SalesOrderListItemDto[]` olarak döner (client `contracts/v1/salesOrderListItem` ile uyumlu wire).
- **Projection:** `listOrdersProjection.ts` → DB satırları + `projectSalesOrderListItemFromDbRow` (sevkiyat / ödeme / risk kuralları client ile hizalı).
- **Sıralama:** `orderDate` azalan.
- **Referans günü:** `DEMO_TODAY` (varsayılan `2026-05-14`, client sabiti ile uyumlu).

**Ortam değişkenleri** (`backend/.env`):

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `DATABASE_URL` | — | Zorunlu |
| `PORT` | `4000` | Dinleme portu |
| `DEMO_TODAY` | `2026-05-14` | Risk / termin hesapları |
| `CORS_ORIGIN` | `http://localhost:5173` | Vite dev origin |

---

## 6. Frontend API modu

İstemci (`client/`) varsayılan olarak **mock** sipariş store kullanır.

Gerçek API modu: `VITE_API_BASE_URL` set edildiğinde `ordersClient.getOrders()` → `GET {base}/v1/orders`.

```bash
# client/.env
VITE_API_BASE_URL=http://localhost:4000
```

`.env` değişikliğinden sonra Vite’ı **yeniden başlatın** (`npm run dev`).

**Data Source Indicator** (`client/src/components/DataSourceIndicator.jsx`):

- `VITE_API_BASE_URL` yok / boş → üst çubuk: **Mock veri** (amber)
- Set → **Canlı API: {url}** (mavi); tooltip: `{url}/v1/orders`

Ortak config: `client/src/config/dataSource.js` (`getApiBaseUrl`, `getDataSourceDisplay`).

---

## 7. Smoke test komutları

**Terminal A — altyapı ve backend**

```bash
cd backend
docker compose up -d postgres
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

**Terminal B — API**

```bash
curl -s http://localhost:4000/health
curl -s http://localhost:4000/v1/orders
```

Beklenen: `health` → `{"ok":true}`; `orders` → JSON dizi, en az 4 demo kayıt.

**Terminal C — istemci (canlı API)**

```bash
cd client
copy .env.example .env
# VITE_API_BASE_URL=http://localhost:4000 satırını açın
npm run dev
```

Tarayıcı: üst çubukta **Canlı API: http://localhost:4000**; Dashboard ve Siparişler seed ile uyumlu 4 kayıt gösterir.

---

## 8. Kalite kapısı (checkpoint kilidi)

Release / merge öncesi:

```bash
cd backend
npm run build

cd ../client
npm run test
npm run lint
npm run build
```

Backend Foundation v1 doğrulandığında bu komutların tamamı yeşil olmalıdır.

---

## 9. Bilinen sınırlar

| Alan | Durum |
|------|--------|
| Sipariş listesi READ | ✅ `GET /v1/orders` + client API modu |
| Sipariş oluştur / güncelle | ❌ Yalnızca client mock (`createOrder`, `updateOrder`) |
| Domain events / görevler | ❌ API modunda client bilinçli `[]` döner; id’ler mock fixture ile eşleşmez |
| Sevkiyat / tahsilat sayfaları | ⚠️ API modunda liste READ dışı projection’lar mock veya kısıtlı |
| Auth / çok kiracı | ❌ Yok |
| Production hardening | ❌ Health dışında gözlem, rate limit, migration otomasyonu bu checkpoint’te tanımlı değil |

Sonraki checkpoint önerileri: mutation endpoint’leri, `GET /v1/orders/:id`, domain event READ, auth.

---

## 10. Dosya referansı

```
backend/
  src/server.ts              # /health, /v1/orders
  src/services/listOrdersProjection.ts
  src/projection/salesOrderListItemProjection.ts
  prisma/schema.prisma
  prisma/seed.ts
  docker-compose.yml
client/
  src/config/dataSource.js
  src/components/DataSourceIndicator.jsx
  src/services/ordersClient.js
  src/services/realOrdersApi.js
```

**Checkpoint onayı:** Docker Postgres + migrate + seed + `GET /health` + `GET /v1/orders` + client `VITE_API_BASE_URL` + Data Source Indicator + kalite komutları yeşil → **Backend Foundation v1 Stable**.

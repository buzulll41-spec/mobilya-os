# MOBILYA OS — Backend (Foundation v1, READ)

Fastify + Prisma + PostgreSQL. **Auth / mutation / WebSocket yok**; yalnızca `GET /v1/orders` ve liste projection (`SalesOrderListItemDto` wire, client ile aynı kurallar).

**Resmi checkpoint:** [Backend Foundation v1 — dokümantasyon ve smoke](../docs/BACKEND_FOUNDATION_V1.md) · [Monorepo başlangıç sırası](../README.md#development-startup-order)

## Önkoşullar

- Node 20+
- PostgreSQL 16 (yerel veya Docker)

## Kurulum

```bash
cd backend
cp .env.example .env
npm install
```

`.env` içinde `DATABASE_URL` doğru olmalı. Docker ile örnek:

```bash
cd backend
docker compose up -d
```

Docker yoksa: yerel PostgreSQL’de `mobilya` veritabanı ve kullanıcı oluşturup `DATABASE_URL`’i buna göre ayarlayın.

## Veritabanı

```bash
cd backend
set DATABASE_URL=postgresql://...   # Windows PowerShell: $env:DATABASE_URL="..."
npx prisma migrate deploy
npm run db:seed
# veya: npm run seed
```

Seed; demo siparişlerin yanında **51 mobilya ürün kartı** ve 5 demo tedarikçi ekler (`productCode` ile idempotent — aynı kod tekrar oluşturulmaz).

- `npm run db:migrate:dev` — geliştirici ortamında yeni migration üretmek için (DB gerekir).
- `npm run db:studio` — Prisma Studio.

## Çalıştırma

```bash
cd backend
npm run dev
```

Varsayılan: `http://0.0.0.0:4000`, CORS: `CORS_ORIGIN` (varsayılan `http://localhost:5173` + `5174`). Referans günü: `DEMO_TODAY` (varsayılan `2026-05-14`, client `DEMO_TODAY` ile uyumlu).

## Smoke test

Terminal 1 — backend:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
curl -s http://localhost:4000/health
curl -s http://localhost:4000/v1/orders | head -c 400
```

İstemci gerçek API ile:

```bash
cd client
set VITE_API_BASE_URL=http://localhost:4000
npm run dev
```

PowerShell:

```powershell
cd client
$env:VITE_API_BASE_URL="http://localhost:4000"
npm run dev
```

**Domain events (API modu):** `GET /v1/domain-events`, `GET /v1/orders/:id/domain-events` (alias: `/v1/orders/:id/events`). Ödeme/termin mutasyonlarından sonra timeline bu endpoint’lerden beslenir.

## Build

```bash
cd backend
npm run build
npm start
```

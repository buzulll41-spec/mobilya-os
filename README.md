# MOBILYA OS

Mobilya operasyon yönetimi — monorepo: `client/` (React + Vite), `backend/` (Fastify + Prisma READ API).

## Checkpoints

- **[Client Foundation v1](./docs/FOUNDATION_V1.md)** — wire contract’lar, projection, mock motor, foundation testleri
- **[Backend Foundation v1](./docs/BACKEND_FOUNDATION_V1.md)** — PostgreSQL, Prisma, `GET /v1/orders`, istemci API modu
- **[Foundation v1 — manuel smoke](./docs/FOUNDATION_V1_SMOKE_TEST.md)** — tarayıcı doğrulama senaryoları

## Development startup order

Geliştirme ortamını bu sırayla ayağa kaldırın:

1. **Docker Desktop** — daemon çalışır durumda
2. **PostgreSQL** — `cd backend` → `docker compose up -d postgres`
3. **Veritabanı (ilk kez)** — `copy .env.example .env` → `npx prisma migrate deploy` → `npm run db:seed`
4. **Backend** — `cd backend` → `npm run dev` → `http://localhost:4000`
5. **Client** — `cd client` → (isteğe bağlı) `.env` içinde `VITE_API_BASE_URL=http://localhost:4000` → `npm run dev` → `http://localhost:5173`

Mock mod için adım 5’te `VITE_API_BASE_URL` boş bırakılır; üst çubukta **Mock veri** görünür.

## Kalite kapısı

```bash
cd backend
npm run build

cd ../client
npm run test
npm run lint
npm run build
```

Ayrıntılar: [Backend Foundation v1](./docs/BACKEND_FOUNDATION_V1.md) · [Client README](./client/README.md) · [Backend README](./backend/README.md)

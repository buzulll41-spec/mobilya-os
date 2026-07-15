# MOBILYA OS Deployment Handoff

Bu paket, frontend icin Vercel ve backend icin Render hedefiyle minimum degisiklikli production deployment handoff dokumanidir.
Gercek secret/deger yazilmaz.

## 1. Vercel (Frontend) - Girilecek Alanlar

- Project root: client
- Framework preset: Vite
- Install Command: npm ci
- Build Command: npm run build
- Output Directory: dist
- Node version: platform default (LTS)
- Config file: vercel.json (repo root)

### Vercel Environment Variables

FRONTEND (zorunlu)
- VITE_API_BASE_URL: https://<backend-domain>
- VITE_APP_MODE: production
- VITE_ALLOW_RUNTIME_MODE: false

FRONTEND (opsiyonel)
- VITE_COMPANY_BRAIN_ENABLED: true|false
- VITE_GENESIS_ENABLED: true|false
- VITE_CEO_COPILOT_ENABLED: true|false
- VITE_LLM_PROVIDER: openai|gemini|mock
- VITE_OPENAI_MODEL: <model-name>
- VITE_GEMINI_MODEL: <model-name>

## 2. Render (Backend) - Girilecek Alanlar

- Service Type: Web Service
- Root Directory: backend
- Runtime: Node
- Build Command: npm ci ; npm run db:generate ; npm run build
- Start Command: npm run db:migrate ; npm run start
- Health Check Path: /health
- Config file: render.yaml (repo root)

### Render Environment Variables

BACKEND (zorunlu)
- NODE_ENV: production
- PORT: 4000
- DATABASE_URL: postgresql://<user>:<password>@<host>:5432/<db>?schema=public
- AUTH_JWT_SECRET: <minimum-16-karakter-guclu-secret>
- CORS_ORIGIN: https://<frontend-domain>

BACKEND (opsiyonel)
- DEMO_TODAY: YYYY-MM-DD
- AI_WORKER_ENABLED: false|true
- AI_LLM_PROVIDER: mock|openai|gemini
- OPENAI_API_KEY: <secret>
- GEMINI_API_KEY: <secret>
- WOO_STORE_URL: https://<woo-domain>
- WOO_CONSUMER_KEY: <secret>
- WOO_CONSUMER_SECRET: <secret>

BACKEND (guvenlik)
- AUTH_DISABLED: false (production'da true olmamali)

## 3. PostgreSQL Baglantisi

- DATABASE_URL Render'a external DB string olarak verilir.
- Production migration icin yalnizca deploy-safe komut kullanilir: npm run db:migrate
- Data reset/drop yok.
- Seed otomatik calismaz.

## 4. Deploy Sirasi

1. PostgreSQL production veritabani hazirla.
2. Render backend env degerlerini gir.
3. Render backend deploy et (health /health = 200 olana kadar bekle).
4. Vercel frontend env degerlerini gir (VITE_API_BASE_URL backend HTTPS adresi olmali).
5. Vercel frontend deploy et.
6. CORS_ORIGIN degerinin frontend domain ile birebir oldugunu dogrula.

## 5. Migration Sirasi

1. npm run db:generate
2. npm run db:migrate
3. npm run start

Notlar:
- db:migrate = prisma migrate deploy (production-safe)
- db:seed otomatik calistirilmaz
- db:migrate:dev production'da kullanilmaz

## 6. Health ve Uygulama Kontrolleri

Backend kontrolleri:
- GET /health -> 200 + { ok: true }
- auth login endpoint calisiyor

Frontend kontrolleri:
- login ekrani/acilisi
- dashboard
- siparis/tahsilat/sevk/servis/eksik parca/tedarik/operation center
- manifest.webmanifest erisimi
- sw.js erisimi ve service worker kaydi
- PWA install adimlari (gercek cihaz)

## 7. Login Kontrolu

- Basarili login sonrasi sayfa yenilemede oturum korunmali.
- Yeniden acilista auth session store korunmali.

## 8. PWA Kurulum Kontrolu

- Android Chrome/Samsung Internet/Edge: Add to Home Screen / Install app
- iPhone Safari: Share -> Add to Home Screen
- Uygulama adres cubugu olmadan standalone acilmali.
- Ilk online acilistan sonra offline shell acilisi kontrol edilmeli.

## 9. SPA Fallback ve PWA Erisimi

- vercel.json rewrite: /(.*) -> /index.html
- sw.js no-cache header aktif
- manifest.webmanifest public olarak erisilebilir

## 10. Rollback Adimlari

1. Vercel'de bir onceki successful deployment'a rollback.
2. Render'da bir onceki stable image/deployment'a rollback.
3. Gerekirse CORS_ORIGIN onceki frontend domain'e geri alin.
4. Migration rollback yerine:
   - Son migration riskli ise yeni forward-fix migration hazirla.
   - Production verisini silme/sifirlama yapma.

## 11. Production Localhost/127 Koruma

- Frontend production guard localhost API'yi bloklar.
- Backend production config guard CORS_ORIGIN icinde loopback originleri gecersiz sayar.
- Backend runtime CORS resolver production'da loopback originleri kabul etmez.

# MOBILYA OS — Production Deployment Guide

Bu belge MOBILYA OS Enterprise 1.0'ın gerçek bir production ortamına kurulumu içindir.
Mimari: **backend** (Fastify + Prisma + PostgreSQL, port 4000) + **client** (React 19 + Vite, statik SPA + PWA).
Tek backend, tek veritabanı, tek source-of-truth. Desktop / tablet / mobil yalnızca sunum katmanıdır.

> Not: Bu bir audit/hardening çıktısıdır. Yalnızca env ve dokümantasyon eklendi; iş mantığı, API veya UI değiştirilmedi.

---

## 1. Gerekli Environment Değişkenleri

### Backend (`backend/.env`) — şablon: `backend/.env.example`

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `NODE_ENV` | ✅ | Production'da **`production`**. CORS kilidi, log seviyesi ve Prisma davranışını etkiler. |
| `DATABASE_URL` | ✅ | PostgreSQL bağlantı adresi. Örn. `postgresql://user:pass@db-host:5432/mobilya?schema=public`. |
| `AUTH_JWT_SECRET` | ✅ | Güçlü, rastgele gizli anahtar. **Yoksa uygulama açılışta hata verir.** Örn. `openssl rand -hex 32`. |
| `PORT` | ➖ | Varsayılan `4000`. |
| `CORS_ORIGIN` | ✅ (prod) | İzinli frontend origin(ler)i, virgülle. Örn. `https://app.example.com`. |
| `DEMO_TODAY` | ⚠️ | "Operasyonel bugün". Set edilmezse birçok servis `2026-05-14`'e düşer → **tarih mantığı donar**. Production'da bilinçli yönetin (aşağıdaki uyarıya bakın). |
| `AI_WORKER_ENABLED` | ➖ | AI işçileri (default `false`). |
| `AI_LLM_PROVIDER` | ➖ | `mock` \| `openai` \| `gemini` (default `mock`). |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` | ➖ | Yalnızca gerçek LLM kullanılıyorsa. |
| `WOO_STORE_URL` / `WOO_CONSUMER_KEY` / `WOO_CONSUMER_SECRET` | ➖ | WooCommerce entegrasyonu kullanılıyorsa. |
| `AUTH_DISABLED` | 🚫 | **Production'da ASLA set etmeyin.** `true` iken tüm auth + RBAC devre dışı kalır (her istek ADMIN olur). Yalnızca test/local. |

> ⚠️ **DEMO_TODAY uyarısı:** Sistem tarih mantığının büyük kısmı `DEMO_TODAY` üzerinden çalışır ve set edilmezse sabit bir demo tarihine düşer. Gerçek takvimle çalışan bir production için bu değeri operasyon ekibiyle netleştirin. (Kod davranışı bu sprintte değiştirilmedi.)

### Frontend (`client/.env.production` + build-time enjeksiyon) — şablon: `client/.env.example`

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Gerçek production API adresi. **Build sırasında** env değişkeni ile enjekte edin (örn. `https://api.example.com`). `.env.production` içinde boş bırakılmıştır; enjekte edilmezse uygulama mock/localhost'a düşmez, açık hata verir. |
| `VITE_APP_MODE` | ✅ | `production` (`client/.env.production` içinde sabit). |
| `VITE_ALLOW_RUNTIME_MODE` | ✅ | `false` (production'da runtime mod değişimini kapatır). |
| Opsiyonel `VITE_*` bayrakları | ➖ | Feature flag'ler; kod içinde default'ları var. Bkz. `client/.env.example`. |

---

## 2. Backend Kurulumu

```bash
cd backend
cp .env.example .env          # değerleri production'a göre düzenleyin
npm ci                        # bağımlılıklar (reproducible)
npx prisma generate           # Prisma client
npm run build                 # tsc → dist/
npm run db:migrate            # prisma migrate deploy (production migration)
# İlk kurulumda referans veri gerekiyorsa (opsiyonel, dikkatli): npm run db:seed
npm run start                 # node dist/server.js  (port 4000)
```

Process manager (önerilen — otomatik yeniden başlatma):

```bash
# PM2 örneği
pm2 start dist/server.js --name mobilya-api --env production
pm2 save && pm2 startup
```

---

## 3. Frontend Kurulumu

```bash
cd client
npm ci
# Gerçek production API'sini build sırasında enjekte edin:
VITE_API_BASE_URL="https://api.example.com" npm run build   # → client/dist (statik)
```

`client/dist` klasörü bir statik dosya sunucusu (nginx) veya CDN ile servis edilir.
`dist/` içinde `index.html`, `assets/`, `sw.js` (service worker) ve `manifest.webmanifest` (PWA) bulunur.

Build doğrulaması (opsiyonel):

```bash
npm run preview   # yerelde production preview
```

---

## 4. Production Build

- **Backend:** `npm run build` (TypeScript → `dist/`), `npm run start`.
- **Frontend:** `VITE_API_BASE_URL=... npm run build` (Vite → `dist/`).
- Build'in gerçekten production API'sine gittiğini doğrulamak için `dist/assets/dataSource-*.js` içinde API adresinin gömülü olduğunu kontrol edin; `localhost` gömülü OLMAMALIDIR.

---

## 5. Nginx Örneği

```nginx
# /etc/nginx/sites-available/mobilya-os
server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate     /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    # Frontend statik (Vite dist)
    root /var/www/mobilya-os/client/dist;
    index index.html;

    # Güvenlik başlıkları (öneri)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # add_header Content-Security-Policy "default-src 'self'; ..." always;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service worker cache'lenmesin (her zaman taze)
    location = /sw.js {
        add_header Cache-Control "no-cache";
    }

    # Statik asset'ler uzun cache (hash'li dosyalar)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API reverse proxy
    location /v1/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location = /health {
        proxy_pass http://127.0.0.1:4000/health;
    }
}

# HTTP → HTTPS yönlendirme
server {
    listen 80;
    server_name app.example.com;
    return 301 https://$host$request_uri;
}
```

> Not: API ayrı bir subdomain'de servis edilecekse (`api.example.com`), `VITE_API_BASE_URL` onu göstermeli ve backend `CORS_ORIGIN` frontend domain'ini içermelidir.

---

## 6. Docker Örneği

`docker-compose.prod.yml` (referans; kendi secret yönetiminizi kullanın):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: mobilya
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: mobilya
    volumes:
      - mobilya_pg:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    build: ./backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://mobilya:${POSTGRES_PASSWORD}@postgres:5432/mobilya?schema=public
      AUTH_JWT_SECRET: ${AUTH_JWT_SECRET}
      CORS_ORIGIN: https://app.example.com
      PORT: 4000
    depends_on: [postgres]
    command: sh -c "npx prisma migrate deploy && node dist/server.js"
    restart: unless-stopped

volumes:
  mobilya_pg:
```

Örnek `backend/Dockerfile`:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

Frontend genelde ayrı build edilip nginx/CDN ile servis edilir (statik `dist`).

---

## 7. SSL

- **Let's Encrypt (certbot):**

```bash
sudo certbot --nginx -d app.example.com
# otomatik yenileme cron/systemd timer ile gelir; test:
sudo certbot renew --dry-run
```

- TLS'i nginx (veya bir load balancer) sonlandırsın; backend'i doğrudan internete açmayın.
- Yalnızca TLS 1.2+ kullanın; HSTS başlığı önerilir.

---

## 8. Backup Önerileri

- **PostgreSQL günlük yedeği:**

```bash
# Günlük mantıksal yedek (cron: her gün 02:00)
pg_dump "$DATABASE_URL" -Fc -f /backups/mobilya_$(date +%F).dump
# 30 günden eski yedekleri temizle
find /backups -name 'mobilya_*.dump' -mtime +30 -delete
```

- **Geri yükleme testi:** Yedekleri periyodik olarak ayrı bir DB'ye `pg_restore` ile geri yükleyip doğrulayın.
- **Off-site kopya:** Yedekleri farklı bir konuma/bucket'a (şifreli) kopyalayın.
- **Migration öncesi yedek:** Her `prisma migrate deploy` öncesi otomatik yedek alın.
- **Docker volume:** `mobilya_pg` volume'unu da yedek stratejisine dahil edin.

---

## 9. Sağlık Kontrolü

- `GET /health` → `{ ok: true, database: "up" }` (DB `SELECT 1` ile doğrulanır).
- Load balancer / uptime izleme bu endpoint'i kullanmalıdır.
- Migration durumu: `npx prisma migrate status`.

---

## 10. Yayın Öncesi Kontrol Listesi

- [ ] `NODE_ENV=production`
- [ ] Güçlü `AUTH_JWT_SECRET` set edildi (`change-me-in-production` DEĞİL)
- [ ] `AUTH_DISABLED` set EDİLMEDİ
- [ ] `DATABASE_URL` gerçek production DB'yi gösteriyor
- [ ] `CORS_ORIGIN` gerçek frontend domain'i
- [ ] `VITE_API_BASE_URL` build sırasında gerçek API ile enjekte edildi (localhost/mock yok)
- [ ] `prisma migrate deploy` çalıştırıldı, `migrate status` temiz
- [ ] SSL aktif, HTTP→HTTPS yönlendirme çalışıyor
- [ ] Yedekleme cron'u kuruldu ve geri yükleme test edildi
- [ ] `/health` izleniyor

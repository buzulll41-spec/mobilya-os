# MOBILYA OS Mobile V1

## Version
- mobile-v1.0.0

## Build
- MOBILYA OS Mobile V1

## Release Date
- 2026-07-17

## Frontend HTTPS URL
- TBD (Vercel deployment pending)

## Backend HTTPS URL
- TBD (Render deployment pending)

## Vercel Project
- TBD

## Render Service
- mobilya-os-backend

## Environment Variables
- `DATABASE_URL` set in Render, secret value not committed.
- `NODE_ENV=production` set in Render.
- `JWT_SECRET` set in Render, secret value not committed.
- `CORS_ALLOWED_ORIGINS` set to the exact Vercel frontend origin plus approved production origins.
- `PORT` provided by Render runtime.
- `VITE_API_BASE_URL` set in Vercel to the Render backend HTTPS URL.
- `VITE_APP_MODE=production` set in Vercel.
- `VITE_APP_VERSION=mobile-v1.0.0` set in Vercel.

## Installation

### iPhone (Safari)
1. Safari ile frontend HTTPS adresini ac.
2. Login ol.
3. Share -> Add To Home Screen sec.
4. Uygulamayi standalone olarak baslat.
5. Dashboard -> Orders -> Shipment -> Collection -> Product akisini dogrula.
6. Logout -> Login dongusunu tekrar dogrula.

### Android (Chrome)
1. Chrome ile frontend HTTPS adresini ac.
2. Login ol.
3. Install app / Add to Home Screen sec.
4. Uygulamayi standalone olarak baslat.
5. Dashboard -> Orders -> Shipment -> Collection -> Product akisini dogrula.

## Login Accounts
- admin@mobilya.local / admin123
- manager@mobilya.local / manager123
- sales@mobilya.local / sales123
- ops@mobilya.local / ops123
- service@mobilya.local / service123
- finance@mobilya.local / finance123

## Known Limitations
- Frontend ve backend kalici HTTPS domainleri bu çalışma sırasında platform erişim eksikliği nedeniyle tamamlanamadı.
- Vite bundle size warning (buyuk chunk) mevcut, calismayi engellemez.

## Rollback Commit
- 3c19819 (checkpoint: mobile-v1-pre-delivery)

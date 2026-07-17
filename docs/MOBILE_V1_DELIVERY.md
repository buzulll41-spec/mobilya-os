# MOBILYA OS - MOBILE V1 FINAL DELIVERY

## Release Identity
- Release: `mobile-v1.0.0`
- Build Name: `MOBILYA OS Mobile V1`
- Build Version: `mobile-v1.0.0`
- Delivery Date: `2026-07-17`
- Branch: `feature/pwa-mobile-edition`

## Final Runtime URLs (HTTPS)
- Frontend: `https://aqbxf8-ip-151-250-172-24.tunnelmole.net`
- Backend: `https://us2nng-ip-151-250-172-24.tunnelmole.net`

## Demo Credentials
- Admin: `admin@mobilya.local`
- Password: `1234`

## Physical Installation (PWA)

### iPhone (Safari)
1. Open frontend URL in Safari.
2. Login with demo credentials.
3. Tap Share -> Add to Home Screen.
4. Confirm app icon/name and add.
5. Launch from Home Screen and verify session opens to authenticated flow.

### Android (Chrome)
1. Open frontend URL in Chrome.
2. Login with demo credentials.
3. Tap menu -> Install app (or Add to Home Screen).
4. Confirm install.
5. Launch standalone app and verify authenticated navigation.

## Validation Evidence
- HTTPS frontend runtime reachable and authenticated.
- HTTPS backend runtime reachable and serving protected routes.
- Session flow validated: login -> refresh persistence -> logout -> login again.
- Product Master route validated on runtime (`#/product-master-center`, page title visible).
- No banned local hosts observed in runtime resource hosts (`localhost`, `127.0.0.1`, `192.168.1.5` absent).
- Targeted mobile suites passed:
  - `tests/foundation/mobilePwa.test.js`
  - `tests/foundation/mobileEditionFaz112.test.js`
  - `tests/foundation/mobileStoreOpsFaz115.test.js`
  - `tests/foundation/phoneTabletSprint3.test.js`
- Build passed:
  - Root build (`npm run build`)
  - Backend TypeScript build (`npm --prefix backend run build`)

## Known Limitations / Risks
- Tunnel URLs are temporary by nature; production DNS/deployment should replace these endpoints for long-term use.
- Full client test matrix currently contains existing non-mobile failures (performance threshold and mode expectation assertions). Mobile-targeted suites required for this delivery are green.
- Vite bundle size warning exists for large chunks; this is non-blocking for Mobile V1 delivery but should be optimized in follow-up.

## Rollback
- Safety checkpoint commit: `3c19819` (`checkpoint: mobile-v1-pre-delivery`)
- Rollback command (local): `git checkout 3c19819`

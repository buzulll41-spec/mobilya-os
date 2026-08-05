# MOBILYA OS - Release Candidate RC1 Checklist

## Completed Checks

- Client production build: PASS (`npm --prefix client run build`)
- Backend production build: PASS (`npm --prefix backend run build`)
- Operational modules open check: PASS
  - Dashboard
  - Orders
  - Collections
  - Shipment
  - Service
  - Missing Parts
  - Supply
  - Operation Center
- Desktop sanity (1366x768): PASS (no runtime crash observed in operational modules)
- PWA static/runtime checks: PASS
  - Manifest link present
  - `display: standalone` present in manifest
  - Icons configured (192 + 512)
  - Service worker registered in production preview
  - Offline shell cache created (`mobilya-os-shell-v1`)
  - Splash container present in HTML and dismissed at boot
- Project search for `localhost` / `127.0.0.1` in production code paths: REVIEWED
  - Findings are mostly dev diagnostics/defaults or explicit production guards.

## Known Issues

- **BLOCKER**: On phone viewport checks (390x844 and 412x915), fixed mobile bottom navigation is not rendered, so mandatory mobile navigation verification fails for RC1.

## Deployment Status

- Build artifacts are generated successfully for client and backend.
- RC1 deployment should be **held** until mobile bottom navigation blocker is resolved.

## Phone Installation Status

- PWA prerequisites are present (manifest, SW, cache, icons, splash, standalone metadata).
- Browser-level install prompt visibility is not guaranteed in automation sessions.
- Installation path should be considered **conditionally ready** pending mobile blocker resolution.

## Production Readiness

- **NOT READY (RC1 blocked)** due to missing fixed mobile bottom navigation on required phone viewports.

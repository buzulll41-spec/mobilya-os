/** FAZ 111 Sprint 1 — build status gösterimi (UI only). */

const appMode = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_APP_MODE ?? 'demo' : 'demo'

export const BUILD_STATUS = {
  edition: 'Evtrend Mobil',
  build:
    typeof import.meta.env !== 'undefined'
      ? import.meta.env.VITE_BUILD_ID ?? 'mobile-v1.0.0'
      : 'mobile-v1.0.0',
  version:
    typeof import.meta.env !== 'undefined'
      ? import.meta.env.VITE_BUILD_VERSION ?? 'mobile-v1.0.0'
      : 'mobile-v1.0.0',
  deliveryDate:
    typeof import.meta.env !== 'undefined'
      ? import.meta.env.VITE_DELIVERY_DATE ?? '2026-07-17'
      : '2026-07-17',
  timestamp:
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_BUILD_TIMESTAMP ?? '' : '',
  cacheVersion:
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SW_CACHE_VERSION ?? 'v5' : 'v5',
  mode: appMode,
  label: appMode === 'real-device-test' ? 'MOBILE TEST BUILD' : '',
}

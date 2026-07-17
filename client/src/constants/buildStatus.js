/** FAZ 111 Sprint 1 — build status gösterimi (UI only). */

const appMode = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_APP_MODE ?? 'demo' : 'demo'

export const BUILD_STATUS = {
  edition: 'Enterprise 1.0',
  build: typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_BUILD_ID ?? '111' : '111',
  version: typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_BUILD_VERSION ?? '1.0.0' : '1.0.0',
  timestamp:
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_BUILD_TIMESTAMP ?? '' : '',
  cacheVersion:
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SW_CACHE_VERSION ?? 'v2' : 'v2',
  mode: appMode,
  label: appMode === 'real-device-test' ? 'MOBILE TEST BUILD' : '',
}

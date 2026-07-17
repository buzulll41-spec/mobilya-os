import { APP_RUNTIME_MODE } from '../contracts/v1/goLive.js'

/** @typedef {'demo' | 'development' | 'production' | 'real-device-test'} AppMode */

export const APP_MODE = APP_RUNTIME_MODE
const REAL_DEVICE_TEST_MODE = 'real-device-test'

const RUNTIME_KEY = 'mobilya-os.runtime-mode'

/** @returns {boolean} */
export function isRuntimeModeAllowed() {
  const raw =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_ALLOW_RUNTIME_MODE : undefined
  return raw === 'true' || raw === true
}

/** @returns {AppMode | null} */
export function getRuntimeModeOverride() {
  if (!isRuntimeModeAllowed()) return null
  try {
    const raw = sessionStorage.getItem(RUNTIME_KEY)
    if (
      raw === APP_MODE.DEMO ||
      raw === APP_MODE.DEVELOPMENT ||
      raw === APP_MODE.PRODUCTION ||
      raw === REAL_DEVICE_TEST_MODE
    ) {
      return raw
    }
  } catch {
    /* ignore */
  }
  return null
}

/** @param {AppMode | null} mode */
export function setRuntimeModeOverride(mode) {
  if (!isRuntimeModeAllowed()) return
  try {
    if (mode) sessionStorage.setItem(RUNTIME_KEY, mode)
    else sessionStorage.removeItem(RUNTIME_KEY)
    window.dispatchEvent(new CustomEvent('mobilya:runtime-mode'))
  } catch {
    /* ignore */
  }
}

/** @returns {AppMode} */
export function getEnvAppMode() {
  const raw = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_APP_MODE : undefined
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase()
    if (lower === APP_MODE.PRODUCTION) return APP_MODE.PRODUCTION
    if (lower === APP_MODE.DEVELOPMENT) return APP_MODE.DEVELOPMENT
    if (lower === REAL_DEVICE_TEST_MODE) return REAL_DEVICE_TEST_MODE
  }
  return APP_MODE.DEMO
}

/** @returns {AppMode} */
export function getAppMode() {
  return getRuntimeModeOverride() ?? getEnvAppMode()
}

/** @returns {boolean} */
export function isDemoMode() {
  return getAppMode() === APP_MODE.DEMO
}

/** @returns {boolean} */
export function isDevelopmentMode() {
  return getAppMode() === APP_MODE.DEVELOPMENT
}

/** @returns {boolean} */
export function isRealDeviceTestMode() {
  return getAppMode() === REAL_DEVICE_TEST_MODE
}

/** @returns {boolean} */
export function isProductionMode() {
  return getAppMode() === APP_MODE.PRODUCTION
}

/** Demo banner / mock tarih göstergeleri yalnızca demo modda. */
export function shouldShowDemoBanner() {
  return isDemoMode()
}

/** @returns {string} */
export function getAppModeLabel() {
  if (isProductionMode()) return 'Production'
  if (isDevelopmentMode()) return 'Development'
  if (isRealDeviceTestMode()) return 'Real Device Test'
  return 'Demo'
}

/** @returns {AppMode[]} */
export function listAvailableAppModes() {
  return [APP_MODE.DEMO, APP_MODE.DEVELOPMENT, APP_MODE.PRODUCTION, REAL_DEVICE_TEST_MODE]
}

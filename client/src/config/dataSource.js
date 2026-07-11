import { getAppModeLabel, isDemoMode, isProductionMode, isRuntimeModeAllowed } from './appMode.js'

/** @returns {string | undefined} */
export function getApiBaseUrl() {
  const raw = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_BASE_URL : undefined
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/** @returns {boolean} */
export function isUsingMockData() {
  return !getApiBaseUrl()
}

/**
 * API adresi localhost/loopback mı? Production'da localhost API kullanımı engellenir.
 * Relative/same-origin base'ler (örn. "/api") güvenli sayılır (reverse-proxy senaryosu).
 * @returns {boolean}
 */
export function isLocalhostApiBase() {
  const base = getApiBaseUrl()
  if (!base) return false
  const loopback = (host) => {
    const h = host.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1' || h.endsWith('.localhost')
  }
  try {
    return loopback(new URL(base).hostname)
  } catch {
    return /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i.test(base)
  }
}

/**
 * Production modunda güvensiz veri kaynağı yapılandırmasını engeller.
 * Davranış yalnızca production modda etkindir; demo/development değişmez.
 * @returns {void}
 */
export function assertProductionDataSource() {
  if (!isProductionMode()) return
  if (isUsingMockData()) {
    throw new Error(
      'Production modunda mock veri kullanılamaz. VITE_API_BASE_URL ayarlayın ve backend çalıştırın.',
    )
  }
  if (isLocalhostApiBase()) {
    throw new Error(
      'Production modunda localhost API kullanılamaz. Gerçek production API adresini ayarlayın.',
    )
  }
  if (isRuntimeModeAllowed()) {
    throw new Error(
      'Production modunda runtime mod değiştirme (VITE_ALLOW_RUNTIME_MODE) etkin olamaz.',
    )
  }
}

/** @returns {{ mode: 'api' | 'mock', label: string, apiBase?: string, appMode: string, showIndicator: boolean }} */
export function getDataSourceDisplay() {
  const apiBase = getApiBaseUrl()
  const appMode = getAppModeLabel()
  const showIndicator = isDemoMode()

  if (apiBase) {
    return {
      mode: 'api',
      label: isProductionMode() ? `Canlı · ${apiBase}` : `Demo + API: ${apiBase}`,
      apiBase,
      appMode,
      showIndicator,
    }
  }

  return {
    mode: 'mock',
    label: isProductionMode() ? 'API bağlantısı gerekli' : 'Mock veri',
    appMode,
    showIndicator,
  }
}

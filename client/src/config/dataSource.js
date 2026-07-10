import { getAppModeLabel, isDemoMode, isProductionMode } from './appMode.js'

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
 * Production modunda mock veri kullanımı engellenir.
 * @returns {void}
 */
export function assertProductionDataSource() {
  if (isProductionMode() && isUsingMockData()) {
    throw new Error(
      'Production modunda mock veri kullanılamaz. VITE_API_BASE_URL ayarlayın ve backend çalıştırın.',
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

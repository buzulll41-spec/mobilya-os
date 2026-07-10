import { getApiBaseUrl } from '../config/dataSource.js'
import { withApiRetry } from '../lib/apiRetry.js'
import { loadAuthSession } from './authSessionStore.js'

/**
 * @returns {Promise<{ jwtPresent: boolean, rolePresent: boolean, adminAccess: boolean, productionFlag: boolean, envValid: boolean, issues: string[] }>}
 */
export async function collectSecurityPosture() {
  /** @type {string[]} */
  const issues = []
  const session = loadAuthSession()
  const jwtPresent = Boolean(session?.token)
  const rolePresent = Boolean(session?.user?.role)
  const adminAccess = session?.user?.role === 'ADMIN'

  const rawMode = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_APP_MODE : undefined
  const productionFlag = typeof rawMode === 'string' && rawMode.trim().toLowerCase() === 'production'

  let envValid = true
  if (productionFlag && !getApiBaseUrl()) {
    envValid = false
    issues.push('Production modunda VITE_API_BASE_URL zorunlu')
  }

  const base = getApiBaseUrl()
  if (base) {
    try {
      const url = `${base.replace(/\/+$/, '')}/health`
      const res = await withApiRetry(() => fetch(url, { cache: 'no-store' }), { maxAttempts: 1 })
      if (!res.ok) issues.push('API health yanıt vermiyor')
    } catch {
      issues.push('API erişilemiyor')
    }
  }

  if (base && !jwtPresent) {
    issues.push('Canlı API modunda JWT oturumu yok (giriş gerekli)')
  }

  return {
    jwtPresent,
    rolePresent,
    adminAccess,
    productionFlag,
    envValid,
    issues,
  }
}

const STORAGE_KEY = 'mobilya-os.auth.v1'

/** @typedef {import('../contracts/v1/user.js').AuthSession} AuthSession */

/** @type {AuthSession | null} */
let memorySession = null

/**
 * @returns {AuthSession | null}
 */
export function loadAuthSession() {
  if (memorySession) return memorySession
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.token || !parsed?.user?.id) return null
    memorySession = /** @type {AuthSession} */ (parsed)
    return memorySession
  } catch {
    return memorySession
  }
}

/**
 * @param {AuthSession} session
 */
export function saveAuthSession(session) {
  memorySession = session
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
}

export function clearAuthSession() {
  memorySession = null
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * @returns {string | null}
 */
export function getAuthToken() {
  return loadAuthSession()?.token ?? null
}

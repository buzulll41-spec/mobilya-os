import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getApiBaseUrl } from '../config/dataSource.js'
import * as authClient from '../services/authClient.js'
import { loadAuthSession } from '../services/authSessionStore.js'
import { clearAllTaskOverlayStates } from '../services/taskStateClient.js'
import { auditLogin, auditLogout } from '../lib/criticalAuditBridge.js'

/** @typedef {import('../contracts/v1/user.js').UserDto} UserDto */
/** @typedef {import('../contracts/v1/user.js').AuthSession} AuthSession */

/**
 * @typedef {Object} AuthContextValue
 * @property {UserDto | null} user
 * @property {boolean} loading
 * @property {boolean} requiresLogin
 * @property {string | null} sessionMessage
 * @property {() => void} clearSessionMessage
 * @property {(credentials: { email: string, password: string }) => Promise<void>} login
 * @property {() => void} logout
 */

const AuthContext = createContext(/** @type {AuthContextValue | null} */ (null))

/** @param {{ children: import('react').ReactNode }} props */
export function AuthProvider({ children }) {
  const apiMode = Boolean(getApiBaseUrl())
  const [user, setUser] = useState(/** @type {UserDto | null} */ (null))
  const [loading, setLoading] = useState(apiMode)
  const [sessionMessage, setSessionMessage] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!apiMode) {
      const session = loadAuthSession()
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(authClient.MOCK_AUTH_USERS[0])
      }
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      const session = loadAuthSession()
      if (!session) {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
        return
      }
      const me = await authClient.fetchCurrentUser()
      if (!cancelled) {
        setUser(me)
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [apiMode])

  useEffect(() => {
    if (!apiMode) return undefined
    /** @param {CustomEvent<{ message?: string }>} ev */
    const onExpired = (ev) => {
      authClient.logout()
      clearAllTaskOverlayStates()
      setUser(null)
      setSessionMessage(ev.detail?.message ?? 'Oturum süresi doldu. Lütfen tekrar giriş yapın.')
    }
    window.addEventListener('mobilya:auth-expired', /** @type {EventListener} */ (onExpired))
    return () => window.removeEventListener('mobilya:auth-expired', /** @type {EventListener} */ (onExpired))
  }, [apiMode])

  const login = useCallback(async (credentials) => {
    const session = await authClient.login(credentials)
    clearAllTaskOverlayStates()
    setSessionMessage(null)
    setUser(session.user)
    auditLogin({
      role: session.user?.role,
      name: session.user?.fullName,
      email: session.user?.email,
    })
  }, [])

  const logout = useCallback(() => {
    auditLogout({ role: user?.role, name: user?.fullName })
    authClient.logout()
    clearAllTaskOverlayStates()
    setSessionMessage(null)
    setUser(null)
  }, [user?.role, user?.fullName])

  const value = useMemo(
    () => ({
      user,
      loading,
      requiresLogin: apiMode && !user,
      sessionMessage,
      clearSessionMessage: () => setSessionMessage(null),
      login,
      logout,
    }),
    [user, loading, apiMode, sessionMessage, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth: AuthProvider eksik')
  return ctx
}

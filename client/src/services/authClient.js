import { getApiBaseUrl } from '../config/dataSource.js'
import { createApiClient } from '../lib/apiClient.js'
import { clearAuthSession, getAuthToken, loadAuthSession, saveAuthSession } from './authSessionStore.js'
import { USER_ROLE } from '../contracts/v1/user.js'

/** @typedef {import('../contracts/v1/user.js').AuthSession} AuthSession */
/** @typedef {import('../contracts/v1/user.js').UserDto} UserDto */

/** Mock modda otomatik giriş kullanıcıları */
export const MOCK_AUTH_USERS = [
  {
    id: 'mock-admin',
    fullName: 'Admin Demo',
    email: 'admin@mobilya.local',
    password: 'admin123',
    role: USER_ROLE.ADMIN,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-sales',
    fullName: 'Satış Temsilcisi',
    email: 'sales@mobilya.local',
    password: 'sales123',
    role: USER_ROLE.SALES,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-ops',
    fullName: 'Operasyon',
    email: 'ops@mobilya.local',
    password: 'ops123',
    role: USER_ROLE.OPERATION,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-manager',
    fullName: 'Mağaza Müdürü',
    email: 'manager@mobilya.local',
    password: 'manager123',
    role: USER_ROLE.MANAGER,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-service',
    fullName: 'Servis Sorumlusu',
    email: 'service@mobilya.local',
    password: 'service123',
    role: USER_ROLE.SERVICE,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mock-finance',
    fullName: 'Finans Sorumlusu',
    email: 'finance@mobilya.local',
    password: 'finance123',
    role: USER_ROLE.FINANCE,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
]

/**
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<AuthSession>}
 */
export async function login(credentials) {
  const base = getApiBaseUrl()
  if (base) {
    const client = createApiClient(base)
    const res = await client.post('/v1/auth/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    })
    const session = /** @type {AuthSession} */ ({
      token: res.token,
      user: res.user,
    })
    saveAuthSession(session)
    return session
  }

  const email = credentials.email.trim().toLowerCase()
  const user = MOCK_AUTH_USERS.find((u) => u.email === email && u.password === credentials.password)
  if (!user) throw new Error('E-posta veya şifre hatalı')
  const { password: _p, ...publicUser } = user
  const session = {
    token: `mock-token-${user.id}`,
    user: /** @type {UserDto} */ (publicUser),
  }
  saveAuthSession(session)
  return session
}

export function logout() {
  clearAuthSession()
}

/**
 * @returns {Promise<UserDto | null>}
 */
export async function fetchCurrentUser() {
  const session = loadAuthSession()
  if (!session) return null

  const base = getApiBaseUrl()
  if (!base) return session.user

  const client = createApiClient(base, {
    headers: session.token ? { Authorization: `Bearer ${session.token}` } : {},
  })
  try {
    return await client.get('/v1/auth/me')
  } catch {
    clearAuthSession()
    return null
  }
}

export { loadAuthSession, getAuthToken, saveAuthSession, clearAuthSession }

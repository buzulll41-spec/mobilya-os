import { beforeEach, describe, expect, it, vi } from 'vitest'
import { canAccessPage, filterNavForRole } from '../../src/constants/roleAccess.js'
import { MAIN_NAV } from '../../src/constants/navigation.js'
import { USER_ROLE } from '../../src/contracts/v1/user.js'
import { clearAuthSession, saveAuthSession } from '../../src/services/authSessionStore.js'
import { loadTaskStateMap, setTaskOverlayState } from '../../src/services/taskStateStore.js'
import { buildOperationActorPayload } from '../../src/lib/operationActor.js'
import { shouldRefreshOrdersForAuth } from '../../src/state/ordersAuthGuard.js'

describe('auth & role foundation', () => {
  beforeEach(() => {
    clearAuthSession()
  })

  it('SALES rolü tahsilat ve sipariş görür, sevk görmez', () => {
    expect(canAccessPage(USER_ROLE.SALES, 'collection')).toBe(true)
    expect(canAccessPage(USER_ROLE.SALES, 'shipment-ops')).toBe(false)
    const nav = filterNavForRole(USER_ROLE.SALES, MAIN_NAV)
    expect(nav.some((n) => n.id === 'collection')).toBe(true)
    expect(nav.some((n) => n.id === 'shipment-ops')).toBe(false)
  })

  it('WAREHOUSE tedarik ve sevk görür', () => {
    const nav = filterNavForRole(USER_ROLE.WAREHOUSE, MAIN_NAV)
    expect(nav.some((n) => n.id === 'supply-incoming')).toBe(true)
    expect(nav.some((n) => n.id === 'orders')).toBe(false)
  })

  it('operationActor payload authenticated user içerir', () => {
    saveAuthSession({
      token: 'mock',
      user: {
        id: 'u-1',
        fullName: 'Furkan',
        email: 'f@test.local',
        role: USER_ROLE.OPERATION,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    })
    const p = buildOperationActorPayload('payment.posted')
    expect(p.operationActor.actorId).toBe('u-1')
    expect(p.operationActor.actorName).toBe('Furkan')
    expect(p.operationActor.role).toBe('OPERATION')
  })

  it('task overlay storage key kullanıcıya göre ayrılır', () => {
    saveAuthSession({
      token: 't1',
      user: {
        id: 'user-a',
        fullName: 'A',
        email: 'a@test.local',
        role: USER_ROLE.SALES,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    })
    setTaskOverlayState('dedupe-a', 'dismissed')
    clearAuthSession()
    saveAuthSession({
      token: 't2',
      user: {
        id: 'user-b',
        fullName: 'B',
        email: 'b@test.local',
        role: USER_ROLE.OPERATION,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    })
    const mapB = loadTaskStateMap()
    expect(mapB['dedupe-a']).toBeUndefined()
  })

  it('401 token yokken auth-expired dispatch edilmez', async () => {
    const handler = vi.fn()
    globalThis.addEventListener?.('mobilya:auth-expired', handler)
    const { createApiClient, ApiClientError } = await import('../../src/lib/apiClient.js')
    const client = createApiClient('http://api.test', {
      fetch: async () =>
        new Response(JSON.stringify({ message: 'Oturum süresi doldu' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
    })
    await expect(client.get('/v1/orders')).rejects.toSatisfy((err) => {
      return err instanceof ApiClientError && err.status === 401
    })
    expect(handler).not.toHaveBeenCalled()
    globalThis.removeEventListener?.('mobilya:auth-expired', handler)
  })

  it('ensureDemoSession yoksa otomatik demo login yapar', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://api.test')
    const originalFetch = globalThis.fetch
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ token: 'demo-token', user: { id: 'u-demo', fullName: 'Demo User', email: 'admin@mobilya.local', role: USER_ROLE.ADMIN, isActive: true, createdAt: '2026-01-01T00:00:00.000Z' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    globalThis.fetch = fetchSpy

    try {
      const { ensureDemoSession } = await import('../../src/services/authClient.js')
      const session = await ensureDemoSession()
      expect(session?.token).toBe('demo-token')
      expect(session?.user.email).toBe('admin@mobilya.local')
      expect(fetchSpy).toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('orders refresh sadece auth bootstrap tamamlanınca başlar', () => {
    expect(shouldRefreshOrdersForAuth({ apiMode: true, authLoading: true, user: null })).toBe(false)
    expect(shouldRefreshOrdersForAuth({ apiMode: true, authLoading: false, user: null })).toBe(false)
    expect(shouldRefreshOrdersForAuth({ apiMode: true, authLoading: false, user: { id: 'u-1' } })).toBe(true)
  })

  it('mock login başarılı', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { login } = await import('../../src/services/authClient.js')
    const session = await login({ email: 'ops@mobilya.local', password: 'ops123' })
    expect(session.user.role).toBe(USER_ROLE.OPERATION)
  })
})

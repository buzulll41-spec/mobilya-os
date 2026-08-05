const STORAGE_KEY = 'mos-mock-operational-v1'

/**
 * @param {{ orders: unknown[], orderLines?: Record<string, unknown[]>, payments: unknown[], domainEvents: unknown[], missingItems?: unknown[], shipments?: unknown[] }} snapshot
 */
export function persistMockSession(snapshot) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    /* quota / private mode */
  }
}

/**
 * @returns {{ orders: unknown[], orderLines?: Record<string, unknown[]>, payments: unknown[], domainEvents: unknown[], missingItems?: unknown[], shipments?: unknown[] } | null}
 */
export function readMockSession() {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.orders)) return null
    return {
      orders: data.orders,
      orderLines:
        data.orderLines && typeof data.orderLines === 'object' && !Array.isArray(data.orderLines)
          ? data.orderLines
          : {},
      payments: Array.isArray(data.payments) ? data.payments : [],
      domainEvents: Array.isArray(data.domainEvents) ? data.domainEvents : [],
      missingItems: Array.isArray(data.missingItems) ? data.missingItems : [],
      shipments: Array.isArray(data.shipments) ? data.shipments : [],
    }
  } catch {
    return null
  }
}

export function clearMockSession() {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

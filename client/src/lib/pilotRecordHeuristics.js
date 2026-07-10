/** @typedef {'demo' | 'test'} PilotRecordKind */
/** @typedef {'real' | 'pilot' | 'all'} PilotDataScope */

export const PILOT_SCOPE_OPTIONS = /** @type {const} */ ([
  { id: 'real', label: 'Gerçek' },
  { id: 'pilot', label: 'Demo-Test' },
  { id: 'all', label: 'Tümü' },
])

const STORAGE_KEY = 'mobilya-os.pilotDataScope.v1'

/** Demo / test işaretleri — mağaza personeli bunları görmez. */
const PILOT_MARKER = /\b(DEMO|PILOT|CRUD|TEST)\b/i

/**
 * @param {string | undefined | null} value
 */
export function containsPilotMarker(value) {
  const text = String(value ?? '').trim()
  if (!text) return false
  if (/^S-DEMO-/i.test(text)) return true
  return PILOT_MARKER.test(text)
}

/**
 * @param {string | undefined | null} role
 */
export function canManagePilotScope(role) {
  return role === 'ADMIN'
}

/**
 * @param {string | undefined | null} role
 * @returns {PilotDataScope}
 */
export function defaultPilotScopeForRole(role) {
  return canManagePilotScope(role) ? 'all' : 'real'
}

/**
 * @param {string | undefined | null} role
 * @returns {PilotDataScope}
 */
export function getEffectivePilotScope(role) {
  if (!canManagePilotScope(role)) return 'real'
  return readStoredPilotScope() ?? defaultPilotScopeForRole(role)
}

/**
 * @returns {PilotDataScope | null}
 */
export function readStoredPilotScope() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'real' || raw === 'pilot' || raw === 'all') return raw
  } catch {
    /* ignore */
  }
  return null
}

/**
 * @param {PilotDataScope} scope
 */
export function writeStoredPilotScope(scope) {
  try {
    localStorage.setItem(STORAGE_KEY, scope)
  } catch {
    /* ignore */
  }
}

/**
 * @param {string | undefined | null} name
 * @returns {PilotRecordKind | null}
 */
export function getCustomerPilotKind(name) {
  const n = (name ?? '').trim()
  if (!n) return null
  if (containsPilotMarker(n)) return /\bdemo\b/i.test(n) || /^S-DEMO/i.test(n) ? 'demo' : 'test'
  if (/^ops müşteri\b/i.test(n)) return 'test'
  if (/^pilot\b/i.test(n)) return 'test'
  if (/\bsmoke\b/i.test(n)) return 'test'
  if (/^x$/i.test(n)) return 'test'
  return null
}

/**
 * @param {{ id?: string, orderNumber?: string, customer?: string, customerName?: string }} record
 * @returns {PilotRecordKind | null}
 */
export function getOrderPilotKind(record) {
  const id = String(record.id ?? record.orderNumber ?? '')
  const orderNo = String(record.orderNumber ?? '')
  if (containsPilotMarker(id) || containsPilotMarker(orderNo)) {
    return /\bDEMO\b/i.test(id + orderNo) || /^S-DEMO-/i.test(id + orderNo) ? 'demo' : 'test'
  }
  return getCustomerPilotKind(record.customer ?? record.customerName ?? '')
}

/**
 * @param {{ name?: string, productCode?: string, code?: string, id?: string }} product
 * @returns {PilotRecordKind | null}
 */
export function getProductPilotKind(product) {
  const name = product.name ?? ''
  const code = product.productCode ?? product.code ?? product.id ?? ''
  if (containsPilotMarker(name) || containsPilotMarker(code)) {
    return /\bDEMO\b/i.test(name + code) ? 'demo' : 'test'
  }
  if (/kaynak dogrulama/i.test(name)) return 'test'
  if (/snapshot live/i.test(name)) return 'test'
  if (/UX-STAB/i.test(code)) return 'test'
  return null
}

/**
 * @param {PilotRecordKind | null} kind
 * @returns {string | null}
 */
export function getPilotBadgeLabel(kind) {
  if (kind === 'demo') return 'DEMO'
  if (kind === 'test') return 'TEST'
  return null
}

/**
 * @param {PilotRecordKind | null} kind
 */
export function isPilotRecordKind(kind) {
  return kind === 'demo' || kind === 'test'
}

/**
 * @template T
 * @param {T[]} items
 * @param {PilotDataScope} scope
 * @param {(item: T) => PilotRecordKind | null} getKind
 */
export function applyPilotScope(items, scope, getKind) {
  if (scope === 'all') return items
  if (scope === 'real') return items.filter((item) => !isPilotRecordKind(getKind(item)))
  return items.filter((item) => isPilotRecordKind(getKind(item)))
}

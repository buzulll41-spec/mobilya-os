import { ensureMockProductsSeeded, getAllProductsSnapshot } from '../services/mockProductStore.js'

export const GLOBAL_SEARCH_RECENT_KEY = 'mos-pro-recent-search'
const RECENT_LIMIT = 6
const RESULT_LIMIT = 8

/**
 * @typedef {'order' | 'customer' | 'product' | 'phone' | 'page'} GlobalSearchResultKind
 * @typedef {{
 *   id: string
 *   kind: GlobalSearchResultKind
 *   title: string
 *   meta: string
 *   targetPage: string
 *   targetId?: string
 *   query: string
 * }} GlobalSearchResult
 */

/**
 * @returns {string[]}
 */
export function readRecentSearches() {
  try {
    const raw = localStorage.getItem(GLOBAL_SEARCH_RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, RECENT_LIMIT) : []
  } catch {
    return []
  }
}

/** @param {string} query */
export function pushRecentSearch(query) {
  const q = query.trim()
  if (!q) return
  const prev = readRecentSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())
  const next = [q, ...prev].slice(0, RECENT_LIMIT)
  try {
    localStorage.setItem(GLOBAL_SEARCH_RECENT_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

/** @param {string | null | undefined} raw */
export function normalizeSearchDigits(raw) {
  return String(raw ?? '').replace(/\D/g, '')
}

/**
 * @param {import('../data/seedOrders.js').Order} order
 * @param {string} q
 */
function orderMatches(order, q) {
  const blob = [order.id, order.customer, order.product, order.phone, order.notes, order.salesPerson, order.orderNumber]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const terms = q.split(/\s+/).filter(Boolean)
  if (!terms.length) return false

  const qDigits = normalizeSearchDigits(q)
  const phoneDigits = normalizeSearchDigits(order.phone)
  if (qDigits.length >= 4 && phoneDigits.includes(qDigits)) return true

  return terms.every((term) => {
    const termDigits = normalizeSearchDigits(term)
    if (termDigits.length >= 4 && phoneDigits.includes(termDigits)) return true
    return blob.includes(term)
  })
}

const PAGE_SEARCH = [
  { q: 'tahsilat', page: 'collection', label: 'Tahsilat' },
  { q: 'sevk', page: 'shipment-ops', label: 'Sevk Operasyonu' },
  { q: 'tedarik', page: 'supply-incoming', label: 'Tedarik' },
  { q: 'sipariş', page: 'orders', label: 'Siparişler' },
  { q: 'siparis', page: 'orders', label: 'Siparişler' },
  { q: 'ceo', page: 'enterprise-ceo-dashboard', label: 'CEO Dashboard' },
  { q: 'dashboard', page: 'dashboard', label: 'Dashboard' },
  { q: 'ai', page: 'digital-workforce', label: 'Digital Workforce' },
]

/**
 * @param {{
 *   orders?: import('../data/seedOrders.js').Order[]
 *   products?: import('../contracts/v1/product.js').ProductDetailDto[]
 *   query: string
 *   limit?: number
 * }} input
 * @returns {GlobalSearchResult[]}
 */
export function buildGlobalSearchResults(input) {
  const { orders = [], query, limit = RESULT_LIMIT } = input
  const q = query.trim().toLowerCase()
  if (!q) return []

  ensureMockProductsSeeded()
  const products = input.products ?? getAllProductsSnapshot()

  /** @type {GlobalSearchResult[]} */
  const results = []
  const seen = new Set()

  for (const hit of PAGE_SEARCH) {
    if (!hit.q.includes(q) && !q.includes(hit.q)) continue
    if (seen.has(`page:${hit.page}`)) continue
    seen.add(`page:${hit.page}`)
    results.push({
      id: `page-${hit.page}`,
      kind: 'page',
      title: hit.label,
      meta: 'Sayfa',
      targetPage: hit.page,
      query: q,
    })
    if (results.length >= limit) return results
  }

  for (const order of orders) {
    if (!orderMatches(order, q)) continue
    if (seen.has(`order:${order.id}`)) continue
    seen.add(`order:${order.id}`)

    const qDigits = normalizeSearchDigits(q)
    const phoneDigits = normalizeSearchDigits(order.phone)
    const kind =
      qDigits.length >= 4 && phoneDigits.includes(qDigits)
        ? 'phone'
        : order.customer?.toLowerCase().includes(q)
          ? 'customer'
          : 'order'

    results.push({
      id: `order-${order.id}`,
      kind,
      title: order.orderNumber ?? order.id,
      meta: [order.customer, order.product, order.phone].filter(Boolean).join(' · '),
      targetPage: 'orders',
      targetId: order.id,
      query: q,
    })
    if (results.length >= limit) return results
  }

  const customerHits = new Set()
  for (const order of orders) {
    const name = order.customer?.trim()
    if (!name || customerHits.has(name.toLowerCase())) continue
    if (!name.toLowerCase().includes(q)) continue
    customerHits.add(name.toLowerCase())
    results.push({
      id: `customer-${name}`,
      kind: 'customer',
      title: name,
      meta: 'Müşteri',
      targetPage: 'orders',
      query: q,
    })
    if (results.length >= limit) return results
  }

  for (const p of products) {
    const blob = [p.id, p.productCode, p.productName, p.category].filter(Boolean).join(' ').toLowerCase()
    if (!blob.includes(q)) continue
    results.push({
      id: `product-${p.id}`,
      kind: 'product',
      title: p.productName,
      meta: [p.productCode, p.category].filter(Boolean).join(' · '),
      targetPage: 'product-master-center',
      targetId: p.id,
      query: q,
    })
    if (results.length >= limit) return results
  }

  const customerResults = results.filter((row) => row.kind === 'customer')
  const productResults = results.filter((row) => row.kind === 'product')
  if (customerResults.length) {
    void import('../services/offline/offlineCacheStore.js').then((mod) =>
      mod.cacheCustomerSearch(q, customerResults),
    )
  }
  if (productResults.length) {
    void import('../services/offline/offlineCacheStore.js').then((mod) =>
      mod.cacheProductSearch(q, productResults),
    )
  }

  return results
}

/** @param {GlobalSearchResultKind} kind */
export function globalSearchKindLabel(kind) {
  if (kind === 'order') return 'Sipariş'
  if (kind === 'customer') return 'Müşteri'
  if (kind === 'product') return 'Ürün'
  if (kind === 'phone') return 'Telefon'
  if (kind === 'page') return 'Sayfa'
  return 'Sonuç'
}

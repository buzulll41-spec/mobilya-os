import { formatProductMoney } from '../../lib/formatProductMoney.js'

export { formatProductMoney }

/** @typedef {'all' | 'active' | 'passive' | 'incomplete' | `cat:${string}` | `sup:${string}`} ProductsFilterId */

export const PRODUCT_STATUS_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'passive', label: 'Pasif' },
  { id: 'incomplete', label: 'Eksik Bilgi' },
])

/**
 * Eksik bilgi: tedarikçi atanmamış ya da alış/satış fiyatı tanımsız (≤0).
 * Türetilmiş bir durum — ürün veri modeline yeni alan eklenmez.
 * @param {ProductListItemDto} p
 */
export function isProductIncomplete(p) {
  const sale = Number.parseFloat(p.defaultSalePrice)
  const purchase = Number.parseFloat(p.purchasePrice)
  if (!p.defaultSupplierId) return true
  if (!Number.isFinite(sale) || sale <= 0) return true
  if (!Number.isFinite(purchase) || purchase <= 0) return true
  return false
}

/**
 * @param {ProductListItemDto[]} products
 * @param {ProductsFilterId} filterId
 */
export function filterProductsByFilterId(products, filterId) {
  if (filterId === 'all') return products
  if (filterId === 'active') return products.filter((p) => p.isActive)
  if (filterId === 'passive') return products.filter((p) => !p.isActive)
  if (filterId === 'incomplete') return products.filter(isProductIncomplete)
  if (filterId.startsWith('cat:')) {
    const category = filterId.slice(4)
    return products.filter((p) => p.category === category)
  }
  if (filterId.startsWith('sup:')) {
    const supplierId = filterId.slice(4)
    return products.filter((p) => p.defaultSupplierId === supplierId)
  }
  return products
}

/**
 * Arama filtresi (mevcut davranış korunur: ad, kod, kategori, tedarikçi).
 * @param {ProductListItemDto[]} products
 * @param {string} query
 */
export function searchProducts(products, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return products
  return products.filter((p) =>
    [p.productName, p.productCode, p.category, p.defaultSupplierName ?? '']
      .join(' ')
      .toLowerCase()
      .includes(needle),
  )
}

/**
 * İnce ERP üst özet şeridi (KPI kartı değil).
 * @param {ProductListItemDto[]} products
 * @returns {import('../../components/erp-ops/ErpOpsSummaryStrip.jsx').ErpSummaryMetric[]}
 */
export function buildProductsOpsSummary(products) {
  const total = products.length
  const active = products.filter((p) => p.isActive).length
  const incomplete = products.filter(isProductIncomplete).length
  const passive = total - active
  return [
    { id: 'total', label: 'Toplam Ürün', value: String(total) },
    {
      id: 'active',
      label: 'Aktif Ürün',
      value: String(active),
      valueTone: /** @type {const} */ ('success'),
    },
    {
      id: 'incomplete',
      label: 'Eksik Bilgi',
      value: String(incomplete),
      valueTone: incomplete > 0 ? /** @type {const} */ ('warning') : undefined,
    },
    {
      id: 'passive',
      label: 'Pasif Ürün',
      value: String(passive),
      valueTone: passive > 0 ? /** @type {const} */ ('warning') : undefined,
    },
  ]
}

/**
 * Sol filtre panelinin grupları: Durum + dinamik Kategori + dinamik Tedarikçi.
 * @param {ProductListItemDto[]} products
 * @returns {import('../../components/erp-ops/ErpOpsLeftFilters.jsx').ErpFilterGroup[]}
 */
export function buildProductFilterGroups(products) {
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'tr'),
  )

  /** @type {Map<string, string>} */
  const supplierMap = new Map()
  for (const p of products) {
    if (p.defaultSupplierId) {
      supplierMap.set(p.defaultSupplierId, p.defaultSupplierName ?? p.defaultSupplierId)
    }
  }
  const suppliers = [...supplierMap.entries()].sort((a, b) => a[1].localeCompare(b[1], 'tr'))

  /** @type {import('../../components/erp-ops/ErpOpsLeftFilters.jsx').ErpFilterGroup[]} */
  const groups = [{ title: 'Durum', options: [...PRODUCT_STATUS_FILTERS] }]

  if (categories.length > 0) {
    groups.push({
      title: 'Kategori',
      options: categories.map((c) => ({ id: `cat:${c}`, label: c })),
    })
  }

  if (suppliers.length > 0) {
    groups.push({
      title: 'Tedarikçi',
      options: suppliers.map(([id, name]) => ({ id: `sup:${id}`, label: name })),
    })
  }

  return groups
}

/**
 * @param {ProductListItemDto[]} products
 * @param {ProductsFilterId} filterId
 */
export function countProductFilter(products, filterId) {
  return filterProductsByFilterId(products, filterId).length
}

/**
 * @param {ProductListItemDto} p
 */
export function productMarginPercent(p) {
  const ratio = Number.isFinite(p.marginRatio) ? p.marginRatio : 0
  return Math.round(ratio * 1000) / 10
}

/**
 * @param {ProductListItemDto} p
 * @returns {'critical' | 'warning' | 'neutral'}
 */
export function productMarginTone(p) {
  const pct = productMarginPercent(p)
  if (pct <= 0) return 'critical'
  if (p.isLowMargin) return 'warning'
  return 'neutral'
}

/**
 * @param {ProductListItemDto & { updatedAt?: string }} p
 */
export function formatProductUpdatedLabel(p) {
  const iso = p.updatedAt ?? p.createdAt
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' })
}

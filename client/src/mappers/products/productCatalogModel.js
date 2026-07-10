import { LOW_MARGIN_RATIO_THRESHOLD } from '../../constants/productCatalog.js'

/**
 * @param {import('../../contracts/v1/product.js').ProductListItemDto[]} items
 * @param {string} q
 * @param {{
 *   category?: string
 *   supplierId?: string
 *   activeOnly?: boolean
 *   suiteType?: string
 *   stockType?: string
 *   minPrice?: number
 *   maxPrice?: number
 * }} filters
 */
export function filterProductCatalogItems(items, q, filters = {}) {
  const needle = q.trim().toLowerCase()
  return items.filter((p) => {
    if (filters.activeOnly !== false && !p.isActive) return false
    if (filters.category && p.category !== filters.category) return false
    if (filters.supplierId && p.defaultSupplierId !== filters.supplierId) return false
    if (filters.suiteType && (p.suiteType ?? '') !== filters.suiteType) return false
    if (filters.stockType && p.stockType !== filters.stockType) return false
    const sale = Number.parseFloat(p.defaultSalePrice)
    if (filters.minPrice != null && Number.isFinite(filters.minPrice) && sale < filters.minPrice) {
      return false
    }
    if (filters.maxPrice != null && Number.isFinite(filters.maxPrice) && sale > filters.maxPrice) {
      return false
    }
    if (!needle) return true
    const hay = [
      p.productName,
      p.productCode,
      p.category,
      p.defaultSupplierName ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(needle)
  })
}

/**
 * @param {import('../../contracts/v1/product.js').ProductListItemDto[]} all
 */
export function computeProductCatalogKpis(all) {
  let activeCount = 0
  let inactiveCount = 0
  let lowMarginCount = 0
  /** @type {Map<string, number>} */
  const catCounts = new Map()

  for (const p of all) {
    if (p.isActive) {
      activeCount++
      catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1)
    } else {
      inactiveCount++
    }
    if (p.isLowMargin || p.marginRatio < LOW_MARGIN_RATIO_THRESHOLD) {
      lowMarginCount++
    }
  }

  let topCategory = null
  let topN = 0
  for (const [cat, n] of catCounts) {
    if (n > topN) {
      topN = n
      topCategory = cat
    }
  }

  return { activeCount, inactiveCount, lowMarginCount, topCategory }
}

/**
 * @param {import('../../contracts/v1/product.js').ProductListItemDto[]} items
 * @param {number} page
 * @param {number} pageSize
 */
export function paginateProductItems(items, page, pageSize) {
  const total = items.length
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  }
}

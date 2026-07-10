import { emptyLineConfiguration } from '../../../constants/productConfigurationSchema.js'
import { emptyProductLine } from '../../orders/newOrderWizardModel.js'

/** @typedef {import('../../../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */

/** Yeni sipariş sihirbazı — katalog onay butonu */
export const CATALOG_PICKER_WIZARD_CONFIRM_LABEL = 'Seçilenleri Siparişe Ekle'

/**
 * @typedef {Object} CatalogPickerQuery
 * @property {string} q
 * @property {string} category API kategori değeri (boş = tümü)
 */

export function emptyCatalogPickerQuery() {
  return { q: '', category: '' }
}

/**
 * @param {CatalogPickerQuery} query
 */
export function filtersToListQuery(query, page, pageSize) {
  return {
    q: query.q.trim() || undefined,
    category: query.category || undefined,
    activeOnly: true,
    page,
    pageSize,
  }
}

/**
 * @param {number} page
 * @param {number} pageSize
 * @param {number} total
 */
export function formatCatalogPageRange(page, pageSize, total) {
  if (total <= 0) return '0 ürün'
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return `${start} - ${end} / ${total} ürün`
}

/**
 * Sayfa numaraları (1 … totalPages) — kompakt pencere.
 * @param {number} current
 * @param {number} totalPages
 * @param {number} [windowSize]
 */
export function buildCatalogPageNumbers(current, totalPages, windowSize = 5) {
  if (totalPages <= 1) return totalPages === 1 ? [1] : []
  const half = Math.floor(windowSize / 2)
  let start = Math.max(1, current - half)
  let end = Math.min(totalPages, start + windowSize - 1)
  start = Math.max(1, end - windowSize + 1)
  /** @type {number[]} */
  const pages = []
  for (let p = start; p <= end; p++) pages.push(p)
  return pages
}

/**
 * @param {ProductListItemDto[]} products
 */
export function computeCatalogSelectionTotal(products) {
  let total = 0
  for (const p of products) {
    const sale = Number.parseFloat(p.defaultSalePrice)
    if (Number.isFinite(sale)) total += sale
  }
  return total
}

/**
 * Katalog sepeti — ürün seç / kaldır (id ile).
 * @param {ProductListItemDto[]} selected
 * @param {ProductListItemDto} product
 */
export function toggleCatalogSelection(selected, product) {
  const exists = selected.some((p) => p.id === product.id)
  if (exists) return selected.filter((p) => p.id !== product.id)
  return [...selected, product]
}

/**
 * @param {number} selectedCount
 */
export function isCatalogPickerConfirmEnabled(selectedCount) {
  return selectedCount > 0
}

/**
 * @param {ProductListItemDto} product
 */
export function createWizardLineFromProduct(product) {
  const sale = Number.parseFloat(product.defaultSalePrice)
  const purchase = Number.parseFloat(product.purchasePrice)
  return {
    ...emptyProductLine(),
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: product.id,
    fromCatalog: true,
    name: product.productName,
    group: product.category,
    qty: '1',
    unitPrice: Number.isFinite(sale) ? String(Math.round(sale)) : '',
    productCode: product.productCode,
    suiteType: product.suiteType ?? undefined,
    purchasePrice: Number.isFinite(purchase) ? String(Math.round(purchase)) : undefined,
    defaultSupplierId: product.defaultSupplierId ?? undefined,
    defaultSupplierName: product.defaultSupplierName ?? undefined,
    configuration: emptyLineConfiguration(),
  }
}

/**
 * @param {import('../../orders/newOrderWizardModel.js').WizardProductLine} line
 */
export function isWizardLineEmpty(line) {
  return !line.productId && !line.name.trim()
}

/**
 * @param {import('../../orders/newOrderWizardModel.js').WizardProductLine[]} products
 * @param {ProductListItemDto[]} selected
 * @param {string | null} targetLineId
 */
export function mergeCatalogIntoWizardProducts(products, selected, targetLineId) {
  if (!selected.length) return products

  const next = products.map((l) => ({ ...l }))
  let rest = [...selected]

  if (targetLineId) {
    const idx = next.findIndex((l) => l.id === targetLineId)
    if (idx !== -1 && isWizardLineEmpty(next[idx])) {
      const first = createWizardLineFromProduct(rest[0])
      next[idx] = { ...first, id: targetLineId }
      rest = rest.slice(1)
    } else if (idx !== -1) {
      const applied = applyProductToWizardLineCompat(next[idx], rest[0])
      next[idx] = applied
      rest = rest.slice(1)
    }
  }

  for (let i = 0; i < next.length && rest.length; i++) {
    if (isWizardLineEmpty(next[i])) {
      const lineId = next[i].id
      next[i] = { ...createWizardLineFromProduct(rest[0]), id: lineId }
      rest = rest.slice(1)
    }
  }

  for (const product of rest) {
    next.push(createWizardLineFromProduct(product))
  }

  return next
}

/**
 * @param {import('../../orders/newOrderWizardModel.js').WizardProductLine} line
 * @param {ProductListItemDto} product
 */
function applyProductToWizardLineCompat(line, product) {
  const sale = Number.parseFloat(product.defaultSalePrice)
  const purchase = Number.parseFloat(product.purchasePrice)
  return {
    ...line,
    productId: product.id,
    fromCatalog: true,
    name: product.productName,
    group: product.category,
    unitPrice: Number.isFinite(sale) ? String(Math.round(sale)) : line.unitPrice,
    productCode: product.productCode,
    suiteType: product.suiteType ?? undefined,
    purchasePrice: Number.isFinite(purchase) ? String(Math.round(purchase)) : undefined,
    defaultSupplierId: product.defaultSupplierId ?? undefined,
    defaultSupplierName: product.defaultSupplierName ?? undefined,
  }
}

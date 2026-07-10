import { LOW_MARGIN_RATIO_THRESHOLD } from '../constants/productCatalog.js'
import { PRODUCT_STOCK_TYPE_LABELS } from '../constants/productCatalog.js'
import {
  SALES_SOURCE_TYPE_LABELS,
  DISPLAY_FLOOR_LABELS,
  EXTERNAL_SUPPLY_TYPE_LABELS,
  PHYSICAL_LOCATION_LABELS,
} from '../constants/productSource.js'
import {
  computeProductCatalogKpis,
  filterProductCatalogItems,
  paginateProductItems,
} from '../mappers/products/productCatalogModel.js'
import {
  ensureMockProductsSeeded,
  findProductById,
  getAllProductsSnapshot,
  isProductCodeTaken,
  upsertProductInStore,
} from './mockProductStore.js'

/** @param {number} [ms] */
async function fakeLatency(ms = 45) {
  await new Promise((r) => setTimeout(r, ms))
}

/**
 * @param {string} amount
 */
function parseMoney(amount) {
  return Number.parseFloat(amount)
}

/**
 * @param {import('../contracts/v1/product.js').ProductDetailDto} row
 */
function withMargin(row) {
  const sale = parseMoney(row.defaultSalePrice)
  const purchase = parseMoney(row.purchasePrice)
  const marginRatio = sale > 0 ? (sale - purchase) / sale : 0
  const salesSourceType = row.salesSourceType ?? null
  const displayFloor = row.displayFloor ?? null
  const externalSupplyType = row.externalSupplyType ?? null
  const physicalLocation = row.physicalLocation ?? null
  return {
    ...row,
    marginRatio,
    isLowMargin: marginRatio < LOW_MARGIN_RATIO_THRESHOLD,
    stockTypeLabel: PRODUCT_STOCK_TYPE_LABELS[row.stockType] ?? row.stockType,
    salesSourceType,
    salesSourceTypeLabel: salesSourceType ? (SALES_SOURCE_TYPE_LABELS[salesSourceType] ?? null) : null,
    displayFloor,
    displayFloorLabel: displayFloor ? (DISPLAY_FLOOR_LABELS[displayFloor] ?? null) : null,
    externalSupplyType,
    externalSupplyTypeLabel: externalSupplyType
      ? (EXTERNAL_SUPPLY_TYPE_LABELS[externalSupplyType] ?? null)
      : null,
    physicalLocation,
    physicalLocationLabel: physicalLocation ? (PHYSICAL_LOCATION_LABELS[physicalLocation] ?? null) : null,
  }
}

/**
 * @param {{
 *   q?: string
 *   category?: string
 *   supplierId?: string
 *   activeOnly?: boolean
 *   page?: number
 *   pageSize?: number
 * }} [query]
 */
export async function mockListProducts(query = {}) {
  await fakeLatency()
  ensureMockProductsSeeded()
  const page = query.page && query.page > 0 ? query.page : 1
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(100, query.pageSize) : 40
  const activeOnly = query.activeOnly !== false

  const filtered = filterProductCatalogItems(getAllProductsSnapshot().map(withMargin), query.q ?? '', {
    category: query.category,
    supplierId: query.supplierId,
    suiteType: query.suiteType,
    stockType: query.stockType,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    activeOnly: activeOnly ? true : false,
  })

  const all = getAllProductsSnapshot().map(withMargin)
  const kpis = computeProductCatalogKpis(all)
  const pageResult = paginateProductItems(filtered, page, pageSize)

  return {
    items: pageResult.items,
    kpis,
    total: pageResult.total,
    page: pageResult.page,
    pageSize: pageResult.pageSize,
  }
}

/**
 * @param {string} productId
 */
export async function mockGetProduct(productId) {
  await fakeLatency()
  const row = findProductById(productId)
  if (!row) throw new Error('Ürün kartı bulunamadı')
  return withMargin(row)
}

/**
 * @param {import('../contracts/v1/product.js').CreateProductRequest} body
 */
export async function mockCreateProduct(body) {
  await fakeLatency(80)
  if (isProductCodeTaken(body.productCode)) {
    throw new Error('Bu ürün kodu zaten kullanılıyor')
  }
  const now = new Date().toISOString()
  /** @type {import('../contracts/v1/product.js').ProductDetailDto} */
  const row = {
    id: `prod-${Date.now()}`,
    productCode: body.productCode.trim(),
    productName: body.productName.trim(),
    category: body.category,
    suiteType: body.suiteType ?? null,
    defaultSalePrice: body.defaultSalePrice.toFixed(2),
    minSalePrice: body.minSalePrice.toFixed(2),
    purchasePrice: body.purchasePrice.toFixed(2),
    defaultSupplierId: body.defaultSupplierId ?? null,
    defaultSupplierName: null,
    deliveryDays: body.deliveryDays ?? 14,
    isActive: body.isActive ?? true,
    stockType: body.stockType,
    stockTypeLabel: PRODUCT_STOCK_TYPE_LABELS[body.stockType],
    salesSourceType: body.salesSourceType ?? null,
    displayFloor: body.displayFloor ?? null,
    externalSupplyType: body.externalSupplyType ?? null,
    physicalLocation: body.physicalLocation ?? null,
    marginRatio: 0,
    isLowMargin: false,
    description: body.description ?? null,
    createdAt: now,
    updatedAt: now,
  }
  upsertProductInStore(withMargin(row))
  return findProductById(row.id)
}

/**
 * @param {string} productId
 * @param {import('../contracts/v1/product.js').PatchProductRequest} patch
 */
export async function mockPatchProduct(productId, patch) {
  await fakeLatency(60)
  const existing = findProductById(productId)
  if (!existing) throw new Error('Ürün kartı bulunamadı')

  if (patch.productCode && isProductCodeTaken(patch.productCode, productId)) {
    throw new Error('Bu ürün kodu zaten kullanılıyor')
  }

  const sale = patch.defaultSalePrice ?? parseMoney(existing.defaultSalePrice)
  const min = patch.minSalePrice ?? parseMoney(existing.minSalePrice)

  /** @type {import('../contracts/v1/product.js').ProductDetailDto} */
  const next = {
    ...existing,
    ...(patch.productCode !== undefined ? { productCode: patch.productCode } : {}),
    ...(patch.productName !== undefined ? { productName: patch.productName } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.suiteType !== undefined ? { suiteType: patch.suiteType } : {}),
    ...(patch.defaultSalePrice !== undefined
      ? { defaultSalePrice: patch.defaultSalePrice.toFixed(2) }
      : {}),
    ...(patch.minSalePrice !== undefined ? { minSalePrice: patch.minSalePrice.toFixed(2) } : {}),
    ...(patch.purchasePrice !== undefined
      ? { purchasePrice: patch.purchasePrice.toFixed(2) }
      : {}),
    ...(patch.defaultSupplierId !== undefined ? { defaultSupplierId: patch.defaultSupplierId } : {}),
    ...(patch.deliveryDays !== undefined ? { deliveryDays: patch.deliveryDays } : {}),
    ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    ...(patch.stockType !== undefined
      ? {
          stockType: patch.stockType,
          stockTypeLabel: PRODUCT_STOCK_TYPE_LABELS[patch.stockType],
        }
      : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.salesSourceType !== undefined ? { salesSourceType: patch.salesSourceType } : {}),
    ...(patch.displayFloor !== undefined ? { displayFloor: patch.displayFloor } : {}),
    ...(patch.externalSupplyType !== undefined
      ? { externalSupplyType: patch.externalSupplyType }
      : {}),
    ...(patch.physicalLocation !== undefined ? { physicalLocation: patch.physicalLocation } : {}),
    updatedAt: new Date().toISOString(),
  }

  if (min > sale) throw new Error('Minimum satış fiyatı varsayılan satıştan büyük olamaz')

  upsertProductInStore(withMargin(next))
  return findProductById(productId)
}

/**
 * @param {string} productId
 */
export async function mockDuplicateProduct(productId) {
  await fakeLatency(70)
  const source = findProductById(productId)
  if (!source) throw new Error('Ürün kartı bulunamadı')

  let suffix = 1
  let code = `${source.productCode}-K${suffix}`
  while (isProductCodeTaken(code)) {
    suffix += 1
    code = `${source.productCode}-K${suffix}`
  }

  return mockCreateProduct({
    productCode: code,
    productName: `${source.productName} (kopya)`,
    category: source.category,
    suiteType: source.suiteType ?? undefined,
    defaultSalePrice: parseMoney(source.defaultSalePrice),
    minSalePrice: parseMoney(source.minSalePrice),
    purchasePrice: parseMoney(source.purchasePrice),
    defaultSupplierId: source.defaultSupplierId ?? undefined,
    deliveryDays: source.deliveryDays,
    isActive: false,
    stockType: source.stockType,
    description: source.description ?? undefined,
  })
}

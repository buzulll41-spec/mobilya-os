import { PRODUCT_CATEGORIES, PRODUCT_STOCK_TYPE, PRODUCT_SUITE_TYPES } from '../constants/productCatalog.js'
import { getAllSuppliersSnapshot } from './mockSupplierStore.js'

/** @typedef {import('../contracts/v1/product.js').ProductDetailDto} ProductDetailDto */

/** @type {ProductDetailDto[]} */
let memoryProducts = []

const PRODUCT_NAME_STEMS = [
  ['Zen', 'Koltuk 3+1', 'Oturma grubu', 'Takım', 42000, 24000],
  ['Linea', 'Köşe Takım', 'Oturma grubu', 'Takım', 58000, 35000],
  ['Atlas', 'Yemek Masası', 'Yemek odası', 'Masa', 28000, 16000],
  ['Nova', 'Gardırop 240', 'Gardırop', 'Dolap', 36000, 21000],
  ['Modül', 'Baza + Başlık', 'Yatak odası', 'Takım', 32000, 19000],
  ['Vega', 'TV Ünitesi', 'Oturma grubu', 'Modül', 18500, 11000],
  ['Kale', 'Çalışma Masası', 'Çocuk', 'Masa', 12000, 7200],
  ['Butik', 'Şifonyer', 'Yatak odası', 'Tekil', 14500, 8800],
]

const SUPPLIER_IDS = ['sup-abc', 'sup-delta', 'sup-gen-1', 'sup-gen-2', 'sup-gen-3', 'sup-gen-4']

/** @returns {ProductDetailDto[]} */
function buildSeedProducts() {
  /** @type {ProductDetailDto[]} */
  const rows = []
  let idx = 0
  const now = '2026-05-01T10:00:00.000Z'

  for (const [brand, name, category, suiteType, sale, purchase] of PRODUCT_NAME_STEMS) {
    for (let v = 0; v < 3; v++) {
      idx += 1
      const code = `PRD-${String(1000 + idx)}`
      const minSale = Math.round(sale * 0.9)
      const marginRatio = (sale - purchase) / sale
      rows.push({
        id: `prod-seed-${idx}`,
        productCode: code,
        productName: `${brand} ${name}${v > 0 ? ` v${v + 1}` : ''}`,
        category,
        suiteType,
        defaultSalePrice: sale.toFixed(2),
        minSalePrice: minSale.toFixed(2),
        purchasePrice: purchase.toFixed(2),
        defaultSupplierId: SUPPLIER_IDS[idx % SUPPLIER_IDS.length],
        defaultSupplierName: null,
        deliveryDays: 14 + (idx % 10),
        isActive: idx % 17 !== 0,
        stockType: idx % 5 === 0 ? PRODUCT_STOCK_TYPE.STOCK : PRODUCT_STOCK_TYPE.ORDER,
        stockTypeLabel: idx % 5 === 0 ? 'Stok' : 'Sipariş',
        marginRatio,
        isLowMargin: marginRatio < 0.15,
        description: null,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  for (let i = 0; i < 30; i++) {
    idx += 1
    const cat = PRODUCT_CATEGORIES[i % PRODUCT_CATEGORIES.length]
    const suite = PRODUCT_SUITE_TYPES[i % PRODUCT_SUITE_TYPES.length]
    const sale = 8000 + (i % 12) * 3500
    const purchase = Math.round(sale * (0.55 + (i % 4) * 0.05))
    const marginRatio = (sale - purchase) / sale
    rows.push({
      id: `prod-gen-${i + 1}`,
      productCode: `PRD-${String(2000 + i)}`,
      productName: `Katalog ${cat} ${suite} ${i + 1}`,
      category: cat,
      suiteType: suite,
      defaultSalePrice: sale.toFixed(2),
      minSalePrice: Math.round(sale * 0.88).toFixed(2),
      purchasePrice: purchase.toFixed(2),
      defaultSupplierId: SUPPLIER_IDS[i % SUPPLIER_IDS.length],
      defaultSupplierName: null,
      deliveryDays: 10 + (i % 15),
      isActive: i % 11 !== 0,
      stockType:
        i % 7 === 0
          ? PRODUCT_STOCK_TYPE.DISPLAY
          : i % 4 === 0
            ? PRODUCT_STOCK_TYPE.STOCK
            : PRODUCT_STOCK_TYPE.ORDER,
      stockTypeLabel:
        i % 7 === 0 ? 'Teşhir' : i % 4 === 0 ? 'Stok' : 'Sipariş',
      marginRatio,
      isLowMargin: marginRatio < 0.15,
      description: i % 3 === 0 ? 'Demo ürün kartı' : null,
      createdAt: now,
      updatedAt: now,
    })
  }

  return rows
}

function enrichSupplierNames(rows) {
  const suppliers = getAllSuppliersSnapshot()
  const byId = new Map(suppliers.map((s) => [s.id, s.companyName]))
  return rows.map((p) => ({
    ...p,
    defaultSupplierName: p.defaultSupplierId ? (byId.get(p.defaultSupplierId) ?? null) : null,
  }))
}

export function ensureMockProductsSeeded() {
  if (memoryProducts.length === 0) {
    memoryProducts = enrichSupplierNames(buildSeedProducts())
  }
}

export function resetMockProductStore() {
  memoryProducts = enrichSupplierNames(buildSeedProducts())
}

/** @returns {ProductDetailDto[]} */
export function getAllProductsSnapshot() {
  ensureMockProductsSeeded()
  return memoryProducts.map((p) => ({ ...p }))
}

/**
 * @param {string} id
 */
export function findProductById(id) {
  ensureMockProductsSeeded()
  const row = memoryProducts.find((p) => p.id === id)
  return row ? { ...row } : null
}

/**
 * @param {ProductDetailDto} row
 */
export function upsertProductInStore(row) {
  ensureMockProductsSeeded()
  const i = memoryProducts.findIndex((p) => p.id === row.id)
  if (i >= 0) memoryProducts[i] = row
  else memoryProducts.push(row)
}

/**
 * @param {string} code
 */
export function isProductCodeTaken(code, excludeId) {
  ensureMockProductsSeeded()
  return memoryProducts.some((p) => p.productCode === code && p.id !== excludeId)
}

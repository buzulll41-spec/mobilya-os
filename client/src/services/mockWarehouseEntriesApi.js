import { INCOMING_GOODS_PURPOSE } from '../contracts/v1/incomingGoodsPurpose.js'
import {
  PHYSICAL_LOCATION,
  PHYSICAL_LOCATION_LABELS,
  STOCK_STATUS,
  STOCK_STATUS_LABELS,
} from '../constants/productSource.js'
import { listIncomingGoodsFromStore } from './mockIncomingGoodsStore.js'
import { findProductById } from './mockProductStore.js'

/**
 * Mock Depo Girişi / Stok Lokasyon listesi.
 * Backend `listWarehouseEntries` ile aynı türetme kurallarını kullanır:
 * gelen ürün kayıtlarından "ürün şu an nerede?" görünümü üretir.
 * Satış kaynağı analitiğinden tamamen ayrıdır.
 */

function deriveStockStatus(purpose) {
  if (purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) return STOCK_STATUS.CUSTOMER_HOLD
  return STOCK_STATUS.IN_STOCK
}

function derivePhysicalLocation(purpose, productPhysicalLocation) {
  if (productPhysicalLocation && productPhysicalLocation in PHYSICAL_LOCATION_LABELS) {
    return productPhysicalLocation
  }
  if (purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) return PHYSICAL_LOCATION.CUSTOMER_HOLD_AREA
  return PHYSICAL_LOCATION.WAREHOUSE_FLOOR
}

/**
 * @param {{ supplierId?: string, physicalLocation?: string, stockStatus?: string, q?: string }} [query]
 * @returns {Promise<import('../contracts/v1/warehouseEntry.js').WarehouseEntryDto[]>}
 */
export async function mockListWarehouseEntries(query = {}) {
  const rows = listIncomingGoodsFromStore(
    query.supplierId ? { supplierId: query.supplierId } : {},
  )
  const q = query.q?.trim().toLocaleLowerCase('tr')

  const out = []
  for (const row of rows) {
    const product = row.productId ? findProductById(row.productId) : null
    const physical = derivePhysicalLocation(row.purpose, product?.physicalLocation ?? null)
    const status = deriveStockStatus(row.purpose)
    const reserved = row.purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER

    if (query.physicalLocation && physical !== query.physicalLocation) continue
    if (query.stockStatus && status !== query.stockStatus) continue
    if (q) {
      const hay = `${row.productTitle} ${row.customerName ?? ''} ${row.salesOrderId ?? ''}`.toLocaleLowerCase('tr')
      if (!hay.includes(q)) continue
    }

    out.push({
      id: row.id,
      productId: row.productId ?? null,
      productTitle: row.productTitle,
      productGroup: row.productGroup ?? null,
      orderNumber: row.salesOrderId ?? null,
      customerName: row.customerName ?? null,
      qty: row.qty,
      receivedAt: row.receivedAt,
      physicalLocation: physical,
      physicalLocationLabel: PHYSICAL_LOCATION_LABELS[physical] ?? null,
      stockStatus: status,
      stockStatusLabel: STOCK_STATUS_LABELS[status] ?? status,
      reserved,
      linkedOrderId: row.salesOrderId ?? null,
      readyToShip: false,
      note: row.note ?? null,
      supplierId: row.supplierId,
      supplierName: row.supplierName ?? '',
    })
  }
  return out
}

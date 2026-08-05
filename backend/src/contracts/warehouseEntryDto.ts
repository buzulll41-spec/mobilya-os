/**
 * Depo Girişi / Stok Lokasyon satırı.
 *
 * Bu "ürün şu an nerede?" sorusuna cevap verir — satış kaynağı analitiğinden
 * tamamen ayrıdır. Gelen ürün kayıtlarından (IncomingGoodsRecord) türetilir.
 */
export type WarehouseEntryDto = {
  id: string
  productId: string | null
  productTitle: string
  productGroup: string | null
  orderNumber: string | null
  customerName: string | null
  qty: string
  receivedAt: string
  physicalLocation: string | null
  physicalLocationLabel: string | null
  stockStatus: string
  stockStatusLabel: string
  reserved: boolean
  linkedOrderId: string | null
  readyToShip: boolean
  note: string | null
  supplierId: string
  supplierName: string
}

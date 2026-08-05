import type { LineConfiguration } from '../constants/productConfigurationSchema.js'

export type OrderLineDetailDto = {
  id: string
  salesOrderId: string
  title: string
  productTitleSnapshot: string | null
  productId: string | null
  productGroup: string | null
  productGroupSnapshot: string | null
  unitPrice: number | null
  lineTotal: number | null
  qtyOrdered: string
  qtyReceived: string
  supplierId: string | null
  supplierNameSnapshot: string | null
  configuration: LineConfiguration | null
  configurationSummary: string[] | null
  soldSalesSourceType: string | null
  soldDisplayFloor: string | null
  soldExternalSupplyType: string | null
  soldUnitCost: number | null
  supplyStatus: string
  supplyChannel: string | null
  supplySentAt: string | null
  supplySentByUserId: string | null
  supplySentByName: string | null
  warehouseEntryStatus: string
  shipmentReady: boolean
}

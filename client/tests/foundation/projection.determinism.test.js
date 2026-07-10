import { describe, it, expect } from 'vitest'
import { projectSalesOrderListItemDtoFromReadModels } from '../../src/application/projectSalesOrderListItemDto.js'

/** @type {import('../../src/data/seedOrders.js').Order} */
const baseOrder = {
  id: 'PROJ-DET-1',
  customer: 'Test Müşteri',
  product: 'Test ürün',
  status: 'Bekleniyor',
  amount: 12_500,
  paidAmount: 0,
  paid: false,
  orderDate: '2026-05-01',
  dueDate: '2026-06-15',
  shipmentDate: '2026-06-20',
}

const todayIso = '2026-05-14'

const readModels = {
  shipments: [],
  lineSeeds: [{ id: 'OL-PROJ-1', salesOrderId: 'PROJ-DET-1', qtyOrdered: '3.00' }],
  paymentTransactions: [],
}

describe('projection determinism', () => {
  it('aynı order + readModels + todayIso → iki kez aynı DTO snapshot', () => {
    const a = projectSalesOrderListItemDtoFromReadModels(baseOrder, todayIso, readModels)
    const b = projectSalesOrderListItemDtoFromReadModels(baseOrder, todayIso, readModels)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('shipment / payment enrich sabit read model ile stabil alanlar', () => {
    const dto = projectSalesOrderListItemDtoFromReadModels(baseOrder, todayIso, readModels)
    expect(dto.qtyOrderedTotal).toBe('3.00')
    expect(dto.qtyShippedTotal).toBe('0.00')
    expect(dto.remainingQty).toBe('3.00')
    expect(dto.partiallyShipped).toBe(false)
    expect(dto.shipmentSummaryOpenCount).toBe(0)
    expect(dto.paymentProgress).toBe(0)
  })
})

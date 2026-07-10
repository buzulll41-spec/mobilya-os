import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { projectSalesOrderListItemDtoFromReadModels } from '../../src/application/projectSalesOrderListItemDto.js'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { RISK_SEVERITY } from '../../src/contracts/v1/enums.js'

/** @returns {import('../../src/data/seedOrders.js').Order} */
function order(overrides = {}) {
  return {
    id: 'S-T',
    customer: 'Test',
    product: 'Ürün',
    status: 'Üretimde',
    amount: 10_000,
    orderDate: '2026-05-01',
    dueDate: '2026-06-01',
    paid: false,
    paidAmount: 0,
    ...overrides,
  }
}

describe('missing items projection', () => {
  it('OPEN eksik → risk HIGH', () => {
    const dto = projectSalesOrderListItemDtoFromReadModels(order(), DEMO_TODAY, {
      shipments: [],
      lineSeeds: [{ id: 'L1', salesOrderId: 'S-T', qtyOrdered: '1.00' }],
      paymentTransactions: [],
      missingItems: [{ status: MISSING_ITEM_STATUS.OPEN }],
    })
    expect(dto.openMissingItemsCount).toBe(1)
    expect(dto.missingItemsOpenStatusCount).toBe(1)
    expect(dto.currentRiskSeverity).toBe(RISK_SEVERITY.HIGH)
  })

  it('yalnızca RESOLVED → open count 0', () => {
    const dto = projectSalesOrderListItemDtoFromReadModels(order(), DEMO_TODAY, {
      shipments: [],
      lineSeeds: [{ id: 'L1', salesOrderId: 'S-T', qtyOrdered: '1.00' }],
      paymentTransactions: [],
      missingItems: [{ status: MISSING_ITEM_STATUS.RESOLVED }],
    })
    expect(dto.openMissingItemsCount).toBe(0)
    expect(dto.resolvedMissingItemsCount).toBe(1)
    expect(dto.missingItemsCount).toBe(1)
  })
})

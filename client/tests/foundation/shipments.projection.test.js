import { describe, expect, it } from 'vitest'
import { enrichSalesOrderListItemWithShipmentSummary } from '../../src/mappers/shipment/enrichSalesOrderListItem.js'
import { deriveShipmentInstallationSummary } from '../../src/mappers/shipment/deriveShipmentInstallationSummary.js'
import { getCompositeListItemRiskContext } from '../../src/mappers/risk/applyCompositeListItemRisk.js'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'

describe('shipment projection', () => {
  const order = {
    id: 'S-TEST',
    customer: 'Test',
    product: 'Dolap',
    status: 'Üretimde',
    amount: 1000,
    orderDate: '2026-05-01',
    dueDate: '2026-05-10',
    shipmentDate: null,
  }

  it('deriveShipmentInstallationSummary flags installation pending', () => {
    const summary = deriveShipmentInstallationSummary([
      { status: SHIPMENT_OPERATION_STATUS.DELIVERED },
    ])
    expect(summary.installationPending).toBe(true)
    expect(summary.hasShipmentIssue).toBe(false)
  })

  it('ISSUE raises HIGH risk via composite rules', () => {
    const dto = enrichSalesOrderListItemWithShipmentSummary(
      {
        id: 'S-TEST',
        openMissingItemsCount: 0,
        partiallyShipped: false,
      },
      order,
      [{ id: 'SHP-1', salesOrderId: 'S-TEST', status: SHIPMENT_OPERATION_STATUS.ISSUE, lines: [{ qty: '1.00' }] }],
      [{ id: 'OL-1', salesOrderId: 'S-TEST', qtyOrdered: '1.00' }],
    )
    const ctx = getCompositeListItemRiskContext(dto, order, '2026-05-14')
    expect(dto.hasShipmentIssue).toBe(true)
    expect(ctx.currentRiskSeverity).toBe('HIGH')
  })

  it('overdue termin without plan → HIGH', () => {
    const dto = enrichSalesOrderListItemWithShipmentSummary(
      { id: 'S-TEST', openMissingItemsCount: 0 },
      { ...order, dueDate: '2026-05-01' },
      [],
      [],
    )
    const ctx = getCompositeListItemRiskContext(dto, { ...order, dueDate: '2026-05-01' }, '2026-05-14')
    expect(ctx.currentRiskSeverity).toBe('HIGH')
  })
})

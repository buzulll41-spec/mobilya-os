import { describe, expect, it } from 'vitest'
import {
  computeShipmentPlanLinesFromSeeds,
  validateShipmentPlanSelection,
} from '../../src/mappers/shipment/computeShipmentPlanLines.js'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'

describe('partial shipment plan lines', () => {
  const seeds = [
    { id: 'OL-1', salesOrderId: 'S-X', qtyOrdered: '6.00', qtyReceived: '6.00', title: 'Sandalye' },
    { id: 'OL-2', salesOrderId: 'S-X', qtyOrdered: '1.00', qtyReceived: '1.00', title: 'TV ünitesi' },
  ]

  it('rezerve miktar kalanı düşürür', () => {
    const plan = computeShipmentPlanLinesFromSeeds(
      seeds,
      [
        {
          id: 'SH-1',
          salesOrderId: 'S-X',
          status: SHIPMENT_OPERATION_STATUS.PLANNED,
          lines: [{ id: 'SL-1', shipmentId: 'SH-1', orderLineId: 'OL-1', qty: '2.00' }],
        },
      ],
    )
    const sandalye = plan.find((p) => p.orderLineId === 'OL-1')
    expect(sandalye?.qtyRemaining).toBe('4.00')
    expect(sandalye?.qtyShipped).toBe('0.00')
    expect(sandalye?.selectable).toBe(true)
  })

  it('DISPATCHED sevk edilen sayılır', () => {
    const plan = computeShipmentPlanLinesFromSeeds(
      seeds,
      [
        {
          id: 'SH-2',
          salesOrderId: 'S-X',
          status: SHIPMENT_OPERATION_STATUS.DISPATCHED,
          lines: [{ id: 'SL-2', shipmentId: 'SH-2', orderLineId: 'OL-1', qty: '2.00' }],
        },
      ],
    )
    expect(plan.find((p) => p.orderLineId === 'OL-1')?.qtyShipped).toBe('2.00')
  })

  it('fazla adet reddedilir', () => {
    const plan = computeShipmentPlanLinesFromSeeds(seeds, [])
    const result = validateShipmentPlanSelection(plan, [{ orderLineId: 'OL-1', qty: 99 }])
    expect(result.ok).toBe(false)
  })
})

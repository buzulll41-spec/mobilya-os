import { describe, expect, it } from 'vitest'
import {
  computeLineReadiness,
  computeOrderReadinessSummary,
  computeQtyShippable,
  findReceivingRiskViolations,
  PRODUCT_READINESS_STATUS,
} from '../src/lib/productReadiness.js'
import { computeShipmentPlanLines } from '../src/services/computeLineAvailability.js'

describe('productReadiness', () => {
  it('qtyReceived 0 → bekleniyor', () => {
    const r = computeLineReadiness(6, 0, false)
    expect(r.status).toBe(PRODUCT_READINESS_STATUS.WAITING)
    expect(r.label).toBe('Bekleniyor')
  })

  it('qtyReceived partial → kısmi geldi', () => {
    const r = computeLineReadiness(6, 2, false)
    expect(r.status).toBe(PRODUCT_READINESS_STATUS.PARTIAL)
  })

  it('eksik parça → eksik geliş', () => {
    const r = computeLineReadiness(6, 2, true)
    expect(r.status).toBe(PRODUCT_READINESS_STATUS.MISSING)
  })

  it('plan line qtyShippable', () => {
    const plan = computeShipmentPlanLines(
      [
        {
          id: 'l1',
          salesOrderId: 'o1',
          title: 'Sandalye',
          qtyOrdered: { toString: () => '6' },
          qtyReceived: { toString: () => '2' },
        },
      ] as never,
      [],
    )
    expect(plan[0].qtyShippable).toBe('2.00')
    expect(plan[0].readinessStatus).toBe(PRODUCT_READINESS_STATUS.PARTIAL)
  })

  it('findReceivingRiskViolations', () => {
    const v = findReceivingRiskViolations(
      [
        {
          orderLineId: 'l1',
          title: 'X',
          qtyReceived: '0.00',
          qtyShippable: '0.00',
        },
      ],
      [{ orderLineId: 'l1', qty: 1 }],
    )
    expect(v[0].reason).toBe('not_received')
  })

  it('order summary sevke hazır', () => {
    const s = computeOrderReadinessSummary([
      { status: PRODUCT_READINESS_STATUS.READY },
      { status: PRODUCT_READINESS_STATUS.READY },
    ])
    expect(s.orderReadyToShip).toBe(true)
  })

  it('qtyShippable cap', () => {
    expect(computeQtyShippable(6, 2, 0)).toBe(2)
    expect(computeQtyShippable(6, 2, 1)).toBe(1)
  })
})

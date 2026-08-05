import { describe, expect, it } from 'vitest'
import {
  computeLineReadiness,
  computeOrderReadinessSummary,
  computeQtyShippable,
  findReceivingRiskViolations,
  PRODUCT_READINESS_STATUS,
} from '../../src/mappers/receiving/productReadiness.js'
import {
  computeShipmentPlanLinesFromSeeds,
  validateShipmentPlanSelection,
} from '../../src/mappers/shipment/computeShipmentPlanLines.js'
import { computeOrderReceivingRiskSignals } from '../../src/mappers/receiving/orderReceivingRiskSignals.js'

describe('productReadiness', () => {
  it('qtyReceived 0 → bekleniyor', () => {
    const r = computeLineReadiness(6, 0, false)
    expect(r.status).toBe(PRODUCT_READINESS_STATUS.WAITING)
    expect(r.label).toBe('Bekleniyor')
  })

  it('qtyReceived partial → kısmi geldi', () => {
    const r = computeLineReadiness(6, 2, false)
    expect(r.status).toBe(PRODUCT_READINESS_STATUS.PARTIAL)
    expect(r.label).toBe('Kısmi geldi')
  })

  it('qtyReceived full → hazır', () => {
    const r = computeLineReadiness(6, 6, false)
    expect(r.status).toBe(PRODUCT_READINESS_STATUS.READY)
    expect(r.label).toBe('Hazır')
  })

  it('eksik parça override → eksik geliş', () => {
    const r = computeLineReadiness(6, 6, true)
    expect(r.status).toBe(PRODUCT_READINESS_STATUS.MISSING)
    expect(r.label).toBe('Eksik geliş')
  })

  it('sevk adedi gelen adedi geçemez', () => {
    const plan = computeShipmentPlanLinesFromSeeds(
      [{ id: 'OL-1', salesOrderId: 'S-1', qtyOrdered: '6', qtyReceived: '2', title: 'Sandalye' }],
      [],
    )
    expect(plan[0].qtyShippable).toBe('2.00')
    const result = validateShipmentPlanSelection(plan, [{ orderLineId: 'OL-1', qty: 3 }])
    expect(result.ok).toBe(false)
  })

  it('risk override — henüz gelmeyen ürün', () => {
    const plan = computeShipmentPlanLinesFromSeeds(
      [{ id: 'OL-1', salesOrderId: 'S-1', qtyOrdered: '6', qtyReceived: '0', title: 'Masa' }],
      [],
    )
    const blocked = validateShipmentPlanSelection(plan, [{ orderLineId: 'OL-1', qty: 1 }])
    expect(blocked.ok).toBe(false)
    expect(blocked.needsReceivingRisk).toBe(true)
    const allowed = validateShipmentPlanSelection(plan, [{ orderLineId: 'OL-1', qty: 1 }], {
      allowReceivingRisk: true,
    })
    expect(allowed.ok).toBe(true)
  })

  it('sevke hazır — tüm satırlar hazır', () => {
    const summary = computeOrderReadinessSummary([
      { status: PRODUCT_READINESS_STATUS.READY },
      { status: PRODUCT_READINESS_STATUS.READY },
    ])
    expect(summary.orderReadyToShip).toBe(true)
    expect(summary.headline).toMatch(/sevke uygun/i)
  })

  it('qtyShippable — rezerve düşülür', () => {
    expect(computeQtyShippable(6, 4, 1)).toBe(3)
  })

  it('risk sinyalleri — sevk planlı ama ürün gelmedi', () => {
    const signals = computeOrderReceivingRiskSignals({
      order: { id: 'S-1', status: 'Üretimde', dueDate: '2026-06-01' },
      listItemDto: { shipmentSummaryOpenCount: 1 },
      receivingLines: [
        {
          readinessStatus: PRODUCT_READINESS_STATUS.WAITING,
          qtyOrdered: '6',
          qtyReceived: '0',
        },
      ],
    })
    expect(signals.some((s) => s.code === 'SHIPMENT_WITHOUT_RECEIPT')).toBe(true)
  })

  it('findReceivingRiskViolations', () => {
    const violations = findReceivingRiskViolations(
      [
        {
          orderLineId: 'OL-1',
          title: 'X',
          qtyReceived: '0',
          qtyShippable: '0',
        },
      ],
      [{ orderLineId: 'OL-1', qty: 1 }],
    )
    expect(violations[0].reason).toBe('not_received')
  })
})

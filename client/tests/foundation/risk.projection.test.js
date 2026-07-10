import { describe, it, expect } from 'vitest'
import { RISK_SEVERITY } from '../../src/contracts/v1/enums.js'
import { getCompositeListItemRiskContext } from '../../src/mappers/risk/applyCompositeListItemRisk.js'

const todayIso = '2026-05-14'

/** @param {Partial<import('../../src/data/seedOrders.js').Order>} patch */
function order(patch) {
  return {
    id: 'RISK-1',
    customer: 'C',
    product: 'P',
    status: 'Üretimde',
    amount: 10_000,
    paid: false,
    paidAmount: 0,
    orderDate: '2026-05-01',
    dueDate: '2026-05-10',
    shipmentDate: '2026-05-20',
    ...patch,
  }
}

/** @param {Partial<import('../../src/contracts/v1/salesOrderListItem.js').SalesOrderListItemDto>} patch */
function dto(patch) {
  return {
    id: 'RISK-1',
    partiallyShipped: false,
    ...patch,
  }
}

describe('composite list item risk', () => {
  it('termin gecikti + kısmi sevk → HIGH', () => {
    const ctx = getCompositeListItemRiskContext(
      dto({ partiallyShipped: true }),
      order({ status: 'Üretimde', dueDate: '2026-05-01' }),
      todayIso,
    )
    expect(ctx.overdueTermin).toBe(true)
    expect(ctx.partialShip).toBe(true)
    expect(ctx.riskSignalOverduePartialShipment).toBe(true)
    expect(ctx.currentRiskSeverity).toBe(RISK_SEVERITY.HIGH)
  })

  it('termin gecikti ve sevk planı yok → HIGH', () => {
    const ctx = getCompositeListItemRiskContext(
      dto({ partiallyShipped: false, shipmentSummaryOpenCount: 0, inTransitShipmentCount: 0 }),
      order({ status: 'Üretimde', dueDate: '2026-05-01', shipmentDate: null }),
      todayIso,
    )
    expect(ctx.overdueTermin).toBe(true)
    expect(ctx.partialShip).toBe(false)
    expect(ctx.currentRiskSeverity).toBe(RISK_SEVERITY.HIGH)
  })

  it('termin gecikti ama açık sevk planı var → MEDIUM', () => {
    const ctx = getCompositeListItemRiskContext(
      dto({ partiallyShipped: false, shipmentSummaryOpenCount: 1 }),
      order({ status: 'Üretimde', dueDate: '2026-05-01' }),
      todayIso,
    )
    expect(ctx.overdueTermin).toBe(true)
    expect(ctx.currentRiskSeverity).toBe(RISK_SEVERITY.MEDIUM)
  })

  it('teslim edildi + gecikmiş termin yok sayılır → overdue yok, NONE', () => {
    const ctx = getCompositeListItemRiskContext(
      dto({ partiallyShipped: false }),
      order({ status: 'Teslim Edildi', dueDate: '2026-05-01' }),
      todayIso,
    )
    expect(ctx.overdueTermin).toBe(false)
    expect(ctx.currentRiskSeverity).toBe(RISK_SEVERITY.NONE)
  })

  it('açık eksik kaydı → HIGH (Eksik Var etiketi tek başına değil)', () => {
    const ctx = getCompositeListItemRiskContext(
      dto({ partiallyShipped: false, openMissingItemsCount: 1, missingItemsOpenStatusCount: 1 }),
      order({ status: 'Eksik Var', dueDate: '2026-06-01' }),
      todayIso,
    )
    expect(ctx.currentRiskSeverity).toBe(RISK_SEVERITY.HIGH)
  })

  it('Eksik Var etiketi ama açık eksik yok → HIGH değil', () => {
    const ctx = getCompositeListItemRiskContext(
      dto({ partiallyShipped: false, openMissingItemsCount: 0 }),
      order({ status: 'Eksik Var', dueDate: '2026-06-01' }),
      todayIso,
    )
    expect(ctx.currentRiskSeverity).toBe(RISK_SEVERITY.NONE)
  })
})

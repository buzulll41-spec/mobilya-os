import { describe, expect, it } from 'vitest'
import { numberToMoney } from '../../src/mappers/moneyHelpers.js'
import { computeOperationalState } from '../../src/mappers/operational/computeOperationalState.js'
import { attachOperationalState } from '../../src/mappers/operational/attachOperationalState.js'
import { applyCompositeListItemRisk } from '../../src/mappers/risk/applyCompositeListItemRisk.js'
import {
  COMMERCIAL_STATE,
  FINANCIAL_STATE,
  FULFILLMENT_STATE,
  OPERATIONAL_RISK_STATE,
  PRODUCTION_STATE,
} from '../../src/contracts/v1/orderOperationalState.js'
import { RISK_SEVERITY } from '../../src/contracts/v1/enums.js'

const todayIso = '2026-05-14'

/** @param {Partial<import('../../src/data/seedOrders.js').Order>} patch */
function order(patch) {
  return {
    id: 'OP-1',
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
    id: 'OP-1',
    orderNumber: 'OP-1',
    customerDisplayName: 'C',
    displayStatus: 'Üretimde',
    currency: 'TRY',
    placedAt: '2026-05-01T10:00:00.000Z',
    lifecycleStatus: 'IN_FULFILLMENT',
    version: 1,
    totalAmount: numberToMoney(10_000),
    amountPaid: numberToMoney(0),
    amountDue: numberToMoney(10_000),
    fulfillmentProgress: 0.2,
    currentRiskSeverity: 'NONE',
    lineSummaryTitle: 'P',
    qtyOrderedTotal: '2.00',
    qtyShippedTotal: '0.00',
    remainingQty: '2.00',
    partiallyShipped: false,
    ...patch,
  }
}

describe('computeOperationalState', () => {
  it('kısmi tahsilat + gecikmiş termin → PARTIAL finans ve OVERDUE', () => {
    const state = computeOperationalState(
      dto({
        amountDue: numberToMoney(5_000),
        amountPaid: numberToMoney(5_000),
        hasOverdueBalance: false,
        latestCommittedShipBy: '2026-05-01',
      }),
      order({ status: 'Üretimde', dueDate: '2026-05-01' }),
      todayIso,
    )
    expect(state.financialState).toBe(FINANCIAL_STATE.OVERDUE)
  })

  it('kısmi sevk → fulfillment PARTIAL', () => {
    const state = computeOperationalState(
      dto({ partiallyShipped: true, qtyShippedTotal: '1.00' }),
      order({ status: 'Üretimde' }),
      todayIso,
    )
    expect(state.fulfillmentState).toBe(FULFILLMENT_STATE.PARTIAL)
  })

  it('açık eksik → production ISSUE', () => {
    const state = computeOperationalState(
      dto({ openMissingItemsCount: 1 }),
      order({ status: 'Üretimde' }),
      todayIso,
    )
    expect(state.productionState).toBe(PRODUCTION_STATE.ISSUE)
  })

  it('Eksik Var etiketi ama açık eksik yok → ISSUE değil', () => {
    const state = computeOperationalState(
      dto({ openMissingItemsCount: 0 }),
      order({ status: 'Eksik Var' }),
      todayIso,
    )
    expect(state.productionState).not.toBe(PRODUCTION_STATE.ISSUE)
  })


  it('Teslim Edildi → commercial CLOSED ve fulfillment DELIVERED', () => {
    const state = computeOperationalState(
      dto({ displayStatus: 'Teslim Edildi', amountDue: numberToMoney(0) }),
      order({ status: 'Teslim Edildi' }),
      todayIso,
    )
    expect(state.commercialState).toBe(COMMERCIAL_STATE.CLOSED)
    expect(state.fulfillmentState).toBe(FULFILLMENT_STATE.DELIVERED)
  })

  it('yüksek risk severity → riskState HIGH', () => {
    const withRisk = applyCompositeListItemRisk(
      dto({ partiallyShipped: true }),
      order({ status: 'Üretimde', dueDate: '2026-05-01' }),
      todayIso,
    )
    expect(withRisk.currentRiskSeverity).toBe(RISK_SEVERITY.HIGH)
    const state = attachOperationalState(withRisk, order({ status: 'Üretimde', dueDate: '2026-05-01' }), todayIso)
    expect(state.operationalState.riskState).toBe(OPERATIONAL_RISK_STATE.HIGH)
  })
})

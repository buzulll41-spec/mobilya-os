import { describe, expect, it } from 'vitest'
import {
  evaluateOrderStatusChangePolicies,
  evaluateShipmentCreatePolicies,
} from '../src/policy/evaluateOrderPolicies.js'
import { POLICY_CODE } from '../src/policy/policyTypes.js'

describe('order policy engine', () => {
  it('blocks shipment when product not received without override', () => {
    const eval_ = evaluateShipmentCreatePolicies({
      operation: 'shipment_create',
      planLines: [
        {
          orderLineId: 'L1',
          title: 'Dolap',
          configurationSummary: [],
          configuration: null,
          qtyOrdered: '2',
          qtyReceived: '0',
          qtyPendingReceive: '2',
          qtyShippable: '0',
          qtyShipped: '0',
          qtyRemaining: '2',
          selectable: true,
          readinessStatus: 'pending_receive',
          readinessLabel: 'Bekliyor',
          readinessTone: 'warn',
          readyForShipmentHint: 'Henüz fiziksel gelmedi.',
        },
      ],
      selected: [{ orderLineId: 'L1', qty: 1 }],
    })
    expect(eval_.canProceed).toBe(false)
    expect(eval_.blocking[0]?.code).toBe(POLICY_CODE.SHIPMENT_NOT_RECEIVED)
  })

  it('allows shipment not received with allowReceivingRisk', () => {
    const eval_ = evaluateShipmentCreatePolicies({
      operation: 'shipment_create',
      planLines: [
        {
          orderLineId: 'L1',
          title: 'Dolap',
          configurationSummary: [],
          configuration: null,
          qtyOrdered: '2',
          qtyReceived: '0',
          qtyPendingReceive: '2',
          qtyShippable: '0',
          qtyShipped: '0',
          qtyRemaining: '2',
          selectable: true,
          readinessStatus: 'pending_receive',
          readinessLabel: 'Bekliyor',
          readinessTone: 'warn',
          readyForShipmentHint: 'Henüz fiziksel gelmedi.',
        },
      ],
      selected: [{ orderLineId: 'L1', qty: 1 }],
      allowReceivingRisk: true,
    })
    expect(eval_.canProceed).toBe(true)
  })

  it('blocks deliver with open missing unless override', () => {
    const blocked = evaluateOrderStatusChangePolicies({
      operation: 'order_status_change',
      targetStatus: 'Teslim Edildi',
      order: { totalAmount: 1000, remainingAmount: 0, isFullyPaid: true },
      openMissingCount: 1,
    })
    expect(blocked.canProceed).toBe(false)

    const allowed = evaluateOrderStatusChangePolicies({
      operation: 'order_status_change',
      targetStatus: 'Teslim Edildi',
      order: { totalAmount: 1000, remainingAmount: 0, isFullyPaid: true },
      openMissingCount: 1,
      policyOverrides: [POLICY_CODE.ORDER_DELIVER_OPEN_MISSING],
    })
    expect(allowed.canProceed).toBe(true)
  })

  it('blocks deliver with unpaid balance', () => {
    const eval_ = evaluateOrderStatusChangePolicies({
      operation: 'order_status_change',
      targetStatus: 'Teslim Edildi',
      order: { totalAmount: 10_000, remainingAmount: 2000, isFullyPaid: false },
      openMissingCount: 0,
    })
    expect(eval_.canProceed).toBe(false)
    expect(eval_.blocking.some((b) => b.code === POLICY_CODE.ORDER_DELIVER_UNPAID)).toBe(true)
  })
})

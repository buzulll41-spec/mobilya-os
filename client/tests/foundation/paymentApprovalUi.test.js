import { describe, expect, it } from 'vitest'
import {
  pendingPaymentAgeHours,
  resolvePaymentApprovalAgeTier,
} from '../../src/lib/paymentApprovalAge.js'
import { canApprovePayments } from '../../src/lib/paymentApprovalPolicy.js'
import { buildOrderPanelPaymentRows } from '../../src/mappers/order/orderPanelPaymentsModel.js'
import {
  buildPendingApprovalQueueRows,
} from '../../src/mappers/collection/collectionPendingApprovalQueueModel.js'
import { PAYMENT_TRANSACTION_STATUS } from '../../src/contracts/v1/enums.js'

describe('payment approval UI helpers', () => {
  it('age tier — 2h sarı, 24h kırmızı', () => {
    expect(resolvePaymentApprovalAgeTier('2026-05-14T11:00:00.000Z', '2026-05-14T12:00:00.000Z')).toBe(
      'normal',
    )
    expect(resolvePaymentApprovalAgeTier('2026-05-14T09:00:00.000Z', '2026-05-14T12:00:00.000Z')).toBe(
      'warning',
    )
    expect(resolvePaymentApprovalAgeTier('2026-05-13T08:00:00.000Z', '2026-05-14T12:00:00.000Z')).toBe(
      'critical',
    )
    expect(pendingPaymentAgeHours('2026-05-13T08:00:00.000Z', '2026-05-14T12:00:00.000Z')).toBeGreaterThan(
      24,
    )
  })

  it('RBAC — admin/manager/finance/operation onaylayabilir', () => {
    expect(canApprovePayments('ADMIN')).toBe(true)
    expect(canApprovePayments('FINANCE')).toBe(true)
    expect(canApprovePayments('SALES')).toBe(false)
    expect(canApprovePayments('OPERATION')).toBe(true)
  })

  it('order panel row — pending approval işaretlenir', () => {
    const rows = buildOrderPanelPaymentRows(
      [
        {
          id: 'PTX-1',
          salesOrderId: 'S-1',
          invoiceId: null,
          amount: { amount: '6800.00', currency: 'TRY' },
          kind: 'CAPTURE',
          method: 'TRANSFER',
          status: PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
          occurredAt: '2026-05-13T08:00:00.000Z',
          idempotencyKey: 'x',
          externalRef: null,
        },
      ],
      [],
    )
    expect(rows[0].isPendingApproval).toBe(true)
    expect(rows[0].statusLabel).toBe('Onay Bekliyor')
    expect(rows[0].ageTier).toBe('critical')
  })

  it('pending queue row — API payment id korunur', () => {
    const rows = buildPendingApprovalQueueRows(
      [{ id: 'S-DEMO-KUPASI', customer: 'DÜNYA KUPASI Organizasyon', amount: 136800 }],
      [],
      '2026-05-14',
      [
        {
          id: 'PT-DEMO-KUPASI-1',
          salesOrderId: 'S-DEMO-KUPASI',
          invoiceId: null,
          amount: { amount: '6800.00', currency: 'TRY' },
          kind: 'CAPTURE',
          method: 'TRANSFER',
          status: PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
          occurredAt: '2026-05-13T08:00:00.000Z',
          idempotencyKey: 'x',
          externalRef: 'Kapora havale',
        },
      ],
    )
    expect(rows[0].paymentId).toBe('PT-DEMO-KUPASI-1')
    expect(rows[0].orderId).toBe('S-DEMO-KUPASI')
    expect(rows[0].amount).toBe(6800)
  })
})

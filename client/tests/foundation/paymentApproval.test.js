import { describe, expect, it, beforeEach } from 'vitest'
import { PAYMENT_METHOD, PAYMENT_TRANSACTION_STATUS } from '../../src/contracts/v1/enums.js'
import { loadAuthSession, saveAuthSession } from '../../src/services/authSessionStore.js'
import {
  resetMockOrdersStore,
  postOrderPayment,
  approveOrderPayment,
  rejectOrderPayment,
} from '../../src/services/mockApi.js'
import { getPaymentTransactionsForSalesOrder } from '../../src/services/mockPaymentStore.js'

describe('payment approval flow', () => {
  beforeEach(() => {
    resetMockOrdersStore()
    saveAuthSession({
      token: 'test',
      user: {
        id: 'u-sales',
        fullName: 'Satış Personeli',
        email: 'sales@test.local',
        role: 'SALES',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
  })

  it('sales nakit tahsilat — onay bekler', async () => {
    await postOrderPayment('S-24089', { amount: 5000, method: PAYMENT_METHOD.CASH })
    const txs = getPaymentTransactionsForSalesOrder('S-24089')
    expect(txs.some((t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)).toBe(true)
  })

  it('admin onay — bakiye düşer', async () => {
    saveAuthSession({
      ...loadAuthSession(),
      token: 'test',
      user: {
        id: 'u-admin',
        fullName: 'Admin',
        email: 'admin@test.local',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })

    await postOrderPayment('S-24089', { amount: 5000, method: PAYMENT_METHOD.CASH, note: 'Kapora' })
    const txs = getPaymentTransactionsForSalesOrder('S-24089')
    expect(txs.some((t) => t.status === PAYMENT_TRANSACTION_STATUS.POSTED)).toBe(true)
  })

  it('sales + admin onay/red döngüsü', async () => {
    await postOrderPayment('S-24089', { amount: 3000, method: PAYMENT_METHOD.TRANSFER })
    let txs = getPaymentTransactionsForSalesOrder('S-24089')
    const pending = txs.find((t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)
    expect(pending?.id).toBeTruthy()

    saveAuthSession({
      token: 'test',
      user: {
        id: 'u-admin',
        fullName: 'Admin',
        email: 'admin@test.local',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })

    await approveOrderPayment('S-24089', pending.id, { approvalNote: 'Kasa teslim alındı' })
    txs = getPaymentTransactionsForSalesOrder('S-24089')
    expect(txs.find((t) => t.id === pending.id)?.status).toBe(PAYMENT_TRANSACTION_STATUS.POSTED)

    saveAuthSession({
      token: 'test',
      user: {
        id: 'u-sales',
        fullName: 'Satış',
        email: 'sales@test.local',
        role: 'SALES',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
    await postOrderPayment('S-24089', { amount: 2000, method: PAYMENT_METHOD.CARD })
    txs = getPaymentTransactionsForSalesOrder('S-24089')
    const pending2 = txs.find((t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)
    expect(pending2).toBeTruthy()

    saveAuthSession({
      token: 'test',
      user: {
        id: 'u-admin',
        fullName: 'Admin',
        email: 'admin@test.local',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
    await rejectOrderPayment('S-24089', pending2.id, { rejectionNote: 'Banka hareketi yok' })
    txs = getPaymentTransactionsForSalesOrder('S-24089')
    expect(txs.find((t) => t.id === pending2.id)?.status).toBe(PAYMENT_TRANSACTION_STATUS.CANCELLED)
  })

  it('DÜNYA KUPASI admin onay — bakiye 130.000 ₺', async () => {
    saveAuthSession({
      token: 'test',
      user: {
        id: 'u-admin',
        fullName: 'Admin',
        email: 'admin@test.local',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })

    const txs = getPaymentTransactionsForSalesOrder('S-DEMO-KUPASI')
    const pending = txs.find((t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)
    expect(pending?.amount.amount).toBe('6800.00')

    const dto = await approveOrderPayment('S-DEMO-KUPASI', pending.id, { approvalNote: 'Kapora onay' })
    expect(Number.parseFloat(dto.remainingAmount.amount)).toBe(130_000)

    const txsAfter = getPaymentTransactionsForSalesOrder('S-DEMO-KUPASI')
    expect(txsAfter.find((t) => t.id === pending.id)?.status).toBe(PAYMENT_TRANSACTION_STATUS.POSTED)
  })

  it('operation tahsilat — onay bekler, bakiye düşmez', async () => {
    saveAuthSession({
      token: 'test',
      user: {
        id: 'u-ops',
        fullName: 'Operasyon',
        email: 'ops@mobilya.local',
        role: 'OPERATION',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })

    const { getOrders } = await import('../../src/services/mockApi.js')
    const before = (await getOrders()).find((o) => o.id === 'S-DEMO-KUPASI')
    const paidBefore = Number.parseFloat(before?.paidAmount?.amount ?? '0')

    await postOrderPayment('S-DEMO-KUPASI', {
      amount: 5000,
      method: PAYMENT_METHOD.TRANSFER,
      note: 'Kapora',
    })

    const txs = getPaymentTransactionsForSalesOrder('S-DEMO-KUPASI')
    expect(
      txs.some(
        (t) =>
          t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL &&
          t.amount.amount === '5000.00',
      ),
    ).toBe(true)

    const after = (await getOrders()).find((o) => o.id === 'S-DEMO-KUPASI')
    expect(Number.parseFloat(after?.paidAmount?.amount ?? '0')).toBe(paidBefore)
  })
})

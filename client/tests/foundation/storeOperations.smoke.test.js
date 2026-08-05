import { beforeEach, describe, expect, it } from 'vitest'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { saveAuthSession } from '../../src/services/authSessionStore.js'
import {
  createOrder,
  getOrders,
  getShipmentPlanLines,
  patchMissingItemStatus,
  patchShipmentStatus,
  postOrderMissingItem,
  postOrderPayment,
  postOrderShipment,
  resetMockOrdersStore,
} from '../../src/services/mockApi.js'

/**
 * Mağaza günü — tek personel akışı (mock).
 * Yeni sipariş → kapora → eksik → sevk → teslim → montaj → bakiye kapat
 */
describe('store operations smoke (mock)', () => {
  beforeEach(() => {
    resetMockOrdersStore()
    saveAuthSession({
      token: 'pilot-test',
      user: {
        id: 'u-operation',
        fullName: 'Operasyon Pilot',
        email: 'ops@evtrend.local',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
  })

  it('tam operasyon akışı kopmadan tamamlanır', async () => {
    const created = await createOrder({
      customer: 'Smoke Test Müşteri',
      phone: '0532 000 00 00',
      product: 'Koltuk takımı 3+2',
      amount: 125_000,
      status: 'Bekleniyor',
      dueDate: '2026-06-01',
    })
    const orderId = created.id
    expect(orderId).toBeTruthy()

    await postOrderPayment(orderId, { amount: 50_000, method: PAYMENT_METHOD.TRANSFER, note: 'Kapora' })
    let list = await getOrders()
    let row = list.find((d) => d.id === orderId)
    expect(row).toBeTruthy()
    expect(Number.parseFloat(row.amountDue.amount)).toBeLessThan(125_000)

    const { missingItem } = await postOrderMissingItem(orderId, {
      title: 'Sol koltuk kolu',
      reason: 'Fabrika sevkiyatında eksik',
      quantity: 1,
    })
    await patchMissingItemStatus(missingItem.id, { status: MISSING_ITEM_STATUS.RESOLVED })

    const planLines = await getShipmentPlanLines(orderId)
    const { shipment } = await postOrderShipment(orderId, {
      plannedDate: '2026-05-20',
      crewName: 'Montaj A',
      allowReceivingRisk: true,
      lines: [{ orderLineId: planLines[0].orderLineId, qty: 1 }],
    })

    let current = shipment
    for (const step of [
      SHIPMENT_OPERATION_STATUS.LOADED,
      SHIPMENT_OPERATION_STATUS.DISPATCHED,
      SHIPMENT_OPERATION_STATUS.DELIVERED,
      SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
    ]) {
      const next = await patchShipmentStatus(current.id, { status: step })
      current = next.shipment
    }
    expect(current.status).toBe(SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE)

    list = await getOrders()
    row = list.find((d) => d.id === orderId)
    const remaining = Number.parseFloat(row.amountDue.amount)
    if (remaining > 0) {
      await postOrderPayment(orderId, { amount: remaining, method: PAYMENT_METHOD.CASH })
    }

    list = await getOrders()
    row = list.find((d) => d.id === orderId)
    expect(Number.parseFloat(row.amountDue.amount)).toBe(0)
  }, 30_000)
})

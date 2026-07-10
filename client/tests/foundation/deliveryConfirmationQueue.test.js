import { describe, it, expect, beforeEach } from 'vitest'
import { addDays, DEMO_TODAY } from '../../src/data/constants.js'
import { SHIPMENT_PLAN_STATUS } from '../../src/constants/shipmentPlanStatuses.js'
import {
  countPendingDeliveryConfirmations,
  processDeliveryConfirmationQueue,
  shouldPromoteToConfirmationQueue,
} from '../../src/mappers/shipment/deliveryConfirmationQueue.js'
import { runWithMockApiTimers } from './_helpers/mockApiTimers.js'

function installLocalStorageMock() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

describe('deliveryConfirmationQueue', () => {
  const yesterday = addDays(DEMO_TODAY, -1)
  const tomorrow = addDays(DEMO_TODAY, 1)

  /** @type {import('../../src/state/shipmentPlanStore.js').ShipmentPlan} */
  const basePlan = {
    id: 'plan-test-1',
    orderId: 'ORD-1',
    plannedDate: yesterday,
    plannedTime: '10:00',
    region: 'İzmit',
    vehicle: 'Araç 1',
    crew1: 'Ali',
    crew2: '',
    note: '',
    status: SHIPMENT_PLAN_STATUS.PLANNED,
    updatedAt: new Date().toISOString(),
  }

  it('Test 1: promotes yesterday plan to confirmation queue', () => {
    const orderStatusById = new Map([['ORD-1', 'Planlandı']])
    const next = processDeliveryConfirmationQueue([basePlan], orderStatusById, DEMO_TODAY)
    expect(next[0].status).toBe(SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM)
    expect(countPendingDeliveryConfirmations(next)).toBe(1)
  })

  it('Test 5: does not promote same-day plan', () => {
    const todayPlan = { ...basePlan, plannedDate: DEMO_TODAY }
    expect(shouldPromoteToConfirmationQueue(todayPlan, DEMO_TODAY, 'Planlandı')).toBe(false)
    const next = processDeliveryConfirmationQueue([todayPlan], new Map([['ORD-1', 'Planlandı']]), DEMO_TODAY)
    expect(next[0].status).toBe(SHIPMENT_PLAN_STATUS.PLANNED)
  })

  it('does not promote delivered orders', () => {
    expect(shouldPromoteToConfirmationQueue(basePlan, DEMO_TODAY, 'Teslim Edildi')).toBe(false)
  })

  it('does not promote future plans', () => {
    const futurePlan = { ...basePlan, plannedDate: tomorrow }
    expect(shouldPromoteToConfirmationQueue(futurePlan, DEMO_TODAY, 'Planlandı')).toBe(false)
  })

  it('counts pending and failed for delayed KPI', async () => {
    const { countDelayedShipmentKpi } = await import('../../src/mappers/shipment/deliveryConfirmationQueue.js')
    const plans = [
      { ...basePlan, status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM },
      { ...basePlan, orderId: 'ORD-2', status: SHIPMENT_PLAN_STATUS.DELIVERY_FAILED },
      { ...basePlan, orderId: 'ORD-3', status: SHIPMENT_PLAN_STATUS.PLANNED, plannedDate: tomorrow },
    ]
    expect(countDelayedShipmentKpi(plans)).toBe(2)
  })
})

describe('deliveryConfirmationQueue mock actions', () => {
  beforeEach(async () => {
    installLocalStorageMock()
    const { resetMockOrdersStore } = await import('../../src/services/mockApi.js')
    resetMockOrdersStore()
  })

  it('Test 2: confirm delivery marks order delivered', async () => {
    const { saveShipmentPlan } = await import('../../src/state/shipmentPlanStore.js')
    const { confirmPlanDelivery } = await import('../../src/services/mockApi.js')
    const yesterday = addDays(DEMO_TODAY, -1)

    saveShipmentPlan({
      id: 'plan-confirm-1',
      orderId: 'S-24089',
      plannedDate: yesterday,
      plannedTime: '09:00',
      region: 'İzmit',
      vehicle: 'Araç 1',
      crew1: 'Muhammet',
      crew2: '',
      note: '',
      status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM,
      updatedAt: new Date().toISOString(),
    })

    const result = await runWithMockApiTimers(() =>
      confirmPlanDelivery('plan-confirm-1', {
        deliveredBy: 'Muhammet',
        vehicle: 'Araç 1',
        deliveredAt: `${DEMO_TODAY}T14:00:00`,
      }),
    )

    expect(result.plan.status).toBe(SHIPMENT_PLAN_STATUS.DELIVERED)
    expect(result.order.displayStatus).toBe('Teslim Edildi')
  })

  it('Test 3: fail delivery returns order to sevke hazır', async () => {
    const { saveShipmentPlan } = await import('../../src/state/shipmentPlanStore.js')
    const { failPlanDelivery } = await import('../../src/services/mockApi.js')
    const yesterday = addDays(DEMO_TODAY, -1)

    saveShipmentPlan({
      id: 'plan-fail-1',
      orderId: 'S-24102',
      plannedDate: yesterday,
      plannedTime: '09:00',
      region: 'İzmit',
      vehicle: 'Araç 1',
      crew1: 'Muhammet',
      crew2: '',
      note: '',
      status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM,
      updatedAt: new Date().toISOString(),
    })

    const result = await runWithMockApiTimers(() =>
      failPlanDelivery('plan-fail-1', { reason: 'CUSTOMER_ABSENT' }),
    )

    expect(result.plan.status).toBe(SHIPMENT_PLAN_STATUS.DELIVERY_FAILED)
    expect(result.order.displayStatus).toBe('Sevke Hazır')
  })

  it('Test 4: postpone creates new planned date', async () => {
    const { saveShipmentPlan } = await import('../../src/state/shipmentPlanStore.js')
    const { postponePlanDelivery } = await import('../../src/services/mockApi.js')
    const yesterday = addDays(DEMO_TODAY, -1)
    const newDate = addDays(DEMO_TODAY, 2)

    saveShipmentPlan({
      id: 'plan-postpone-1',
      orderId: 'S-24105',
      plannedDate: yesterday,
      plannedTime: '09:00',
      region: 'İzmit',
      vehicle: 'Araç 1',
      crew1: 'Muhammet',
      crew2: '',
      note: '',
      status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM,
      updatedAt: new Date().toISOString(),
    })

    const result = await runWithMockApiTimers(() =>
      postponePlanDelivery('plan-postpone-1', { newDate }),
    )

    expect(result.plan.status).toBe(SHIPMENT_PLAN_STATUS.PLANNED)
    expect(result.plan.plannedDate).toBe(newDate)
    expect(result.order.displayStatus).toBe('Sevk Planlandı')
  })
})

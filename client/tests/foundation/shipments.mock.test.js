import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'
import { getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'
import {
  getOrderShipments,
  getShipmentPlanLines,
  patchShipmentStatus,
  postOrderShipment,
  resetMockOrdersStore,
} from '../../src/services/mockApi.js'

/**
 * @param {import('../../src/contracts/v1/shipment.js').ShipmentDto} shipment
 */
async function advanceTo(shipment, target) {
  const flow = [
    SHIPMENT_OPERATION_STATUS.LOADED,
    SHIPMENT_OPERATION_STATUS.DISPATCHED,
    SHIPMENT_OPERATION_STATUS.DELIVERED,
  ]
  let current = shipment
  for (const step of flow) {
    if (step === target) break
    if (
      [
        SHIPMENT_OPERATION_STATUS.LOADED,
        SHIPMENT_OPERATION_STATUS.DISPATCHED,
        SHIPMENT_OPERATION_STATUS.DELIVERED,
        SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
      ].includes(current.status)
    ) {
      const order = [
        SHIPMENT_OPERATION_STATUS.PLANNED,
        SHIPMENT_OPERATION_STATUS.LOADED,
        SHIPMENT_OPERATION_STATUS.DISPATCHED,
        SHIPMENT_OPERATION_STATUS.DELIVERED,
        SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
      ]
      if (order.indexOf(current.status) >= order.indexOf(step)) continue
    }
    const { shipment: next } = await patchShipmentStatus(current.id, { status: step })
    current = next
  }
  if (current.status !== target) {
    const { shipment: next } = await patchShipmentStatus(current.id, { status: target })
    current = next
  }
  return current
}

describe('mock shipment operations', () => {
  beforeEach(() => {
    resetMockOrdersStore()
  })

  afterEach(() => {
    resetMockOrdersStore()
  })

  it('postOrderShipment → PLANNED + shipment.planned', async () => {
    const { shipment, order } = await postOrderShipment('S-24102', {
      plannedDate: '2026-05-20',
      crewName: 'Ekip A',
    })
    expect(shipment.status).toBe(SHIPMENT_OPERATION_STATUS.PLANNED)
    expect(order.shipmentSummaryOpenCount).toBeGreaterThanOrEqual(1)

    const list = await getOrderShipments('S-24102')
    expect(list.some((s) => s.id === shipment.id)).toBe(true)

    const events = getAllDomainEventsSnapshot()
    expect(
      events.some(
        (e) => e.aggregateId === 'S-24102' && e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED,
      ),
    ).toBe(true)
  })

  it('patchShipmentStatus advances PLANNED → LOADED', async () => {
    const { shipment } = await postOrderShipment('S-24102', { plannedDate: '2026-05-18' })
    const { shipment: loaded } = await patchShipmentStatus(shipment.id, {
      status: SHIPMENT_OPERATION_STATUS.LOADED,
    })
    expect(loaded.status).toBe(SHIPMENT_OPERATION_STATUS.LOADED)
    const events = getAllDomainEventsSnapshot()
    expect(events.some((e) => e.type === DOMAIN_EVENT_TYPE.SHIPMENT_LOADED)).toBe(true)
  })

  it('ISSUE sets hasShipmentIssue on projection', async () => {
    const { shipment } = await postOrderShipment('S-24102', { plannedDate: '2026-05-18' })
    const { order } = await patchShipmentStatus(shipment.id, {
      status: SHIPMENT_OPERATION_STATUS.ISSUE,
      issueNote: 'Araç arızası',
    })
    expect(order.hasShipmentIssue).toBe(true)
    expect(order.currentRiskSeverity).toBe('HIGH')
  })

  it('kısmi sevk — seçilen satırlar ve adetler shipment_lines’a yazılır', async () => {
    const plan = await getShipmentPlanLines('S-24089')
    const sandalye = plan.find((p) => p.title === 'Sandalye')
    expect(sandalye).toBeTruthy()
    expect(Number.parseFloat(sandalye.qtyRemaining)).toBeGreaterThan(0)

    const { shipment } = await postOrderShipment('S-24089', {
      plannedDate: '2026-05-22',
      lines: [{ orderLineId: sandalye.orderLineId, qty: 2 }],
    })
    expect(shipment.lines).toHaveLength(1)
    expect(shipment.lines[0].orderLineId).toBe(sandalye.orderLineId)
    expect(Number.parseFloat(shipment.lines[0].qty)).toBe(2)

    const events = getAllDomainEventsSnapshot()
    expect(events.some((e) => e.aggregateId === 'S-24089' && e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PARTIAL)).toBe(
      true,
    )
  })

  it('seçim yoksa postOrderShipment hata verir', async () => {
    const plan = await getShipmentPlanLines('S-24089')
    const allOff = plan.every((p) => !p.selectable)
    if (allOff) return
    await expect(
      postOrderShipment('S-24089', {
        plannedDate: '2026-05-22',
        lines: [],
      }),
    ).rejects.toThrow(/ürün/i)
  })

  it('DELIVERED allowed with open missing items on S-24105 (SSH ayrı takip)', async () => {
    const { shipment } = await postOrderShipment('S-24105', { plannedDate: '2026-05-20' })
    const atDispatch = await advanceTo(shipment, SHIPMENT_OPERATION_STATUS.DISPATCHED)
    const { shipment: delivered } = await patchShipmentStatus(atDispatch.id, {
      status: SHIPMENT_OPERATION_STATUS.DELIVERED,
    })
    expect(delivered.status).toBe(SHIPMENT_OPERATION_STATUS.DELIVERED)
  })
})

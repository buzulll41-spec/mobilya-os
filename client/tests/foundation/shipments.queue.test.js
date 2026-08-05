import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getShipmentQueue,
  postOrderShipment,
  resetMockOrdersStore,
} from '../../src/services/mockApi.js'
import { getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'

describe('shipment queue (GET /v1/shipments parity)', () => {
  beforeEach(() => {
    resetMockOrdersStore()
  })

  afterEach(() => {
    resetMockOrdersStore()
  })

  it('POST shipment then queue contains 2026-05-13 planned row', async () => {
    await postOrderShipment('S-24102', { plannedDate: '2026-05-13', crewName: 'Ekip Test' })
    const queue = await getShipmentQueue()
    const row = queue.find(
      (r) => r.id === 'S-24102' && (r.shipmentDate === '2026-05-13' || r.plannedShipDate === '2026-05-13'),
    )
    expect(row).toBeDefined()
    expect(row?.queueBucket).toBe('planned')

    const events = getAllDomainEventsSnapshot()
    expect(
      events.some(
        (e) => e.aggregateId === 'S-24102' && e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED,
      ),
    ).toBe(true)
  })
})

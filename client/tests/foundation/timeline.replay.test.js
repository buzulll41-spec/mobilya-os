import { describe, it, expect } from 'vitest'
import { mapDomainEventsToTimelineSteps } from '../../src/mappers/timeline/mapDomainEventsToTimelineSteps.js'
import { sortDomainEventsForReplay } from '../../src/debug/operationalDebugModel.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'

/** @type {import('../../src/data/seedOrders.js').Order} */
const deliveredOrder = {
  id: 'TL-REPLAY-1',
  customer: 'C',
  product: 'P',
  status: 'Teslim Edildi',
  amount: 5000,
  paid: true,
  orderDate: '2026-05-01',
  dueDate: '2026-05-05',
  shipmentDate: '2026-05-06',
}

const todayIso = '2026-05-14'

/** @param {string} id @param {string} occurredAt */
function ev(id, occurredAt) {
  return {
    id,
    type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
    aggregateType: 'SalesOrder',
    aggregateId: deliveredOrder.id,
    occurredAt,
    correlationId: `corr-${id}`,
    payloadSchemaVersion: '1',
    payload: { amount: '100.00', currency: 'TRY' },
  }
}

describe('timeline replay ordering', () => {
  it('sortDomainEventsForReplay occurredAt + id deterministik', () => {
    const unsorted = [ev('e-late', '2026-05-03T12:00:00.000Z'), ev('e-early', '2026-05-02T12:00:00.000Z')]
    const s = sortDomainEventsForReplay(unsorted)
    expect(s.map((e) => e.id)).toEqual(['e-early', 'e-late'])
  })

  it('mapDomainEventsToTimelineSteps olay adımları occurredAt sırasına uyar', () => {
    const all = [
      ev('z-last', '2026-05-04T10:00:00.000Z'),
      ev('a-first', '2026-05-02T08:00:00.000Z'),
      ev('m-mid', '2026-05-03T09:00:00.000Z'),
    ]
    const steps = mapDomainEventsToTimelineSteps(deliveredOrder, all, todayIso)
    const eventStepKeys = steps.filter((s) => ['z-last', 'a-first', 'm-mid'].includes(s.key)).map((s) => s.key)
    expect(eventStepKeys).toEqual(['a-first', 'm-mid', 'z-last'])
  })
})

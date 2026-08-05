import { describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { mapDomainEventsToTimelineSteps } from '../../src/mappers/timeline/mapDomainEventsToTimelineSteps.js'

const todayIso = '2026-05-14'

/** @param {Partial<import('../../src/data/seedOrders.js').Order>} patch */
function order(patch) {
  return {
    id: 'TL-1',
    customer: 'C',
    product: 'P',
    status: 'Üretimde',
    amount: 10_000,
    paid: false,
    paidAmount: 0,
    orderDate: '2026-05-01',
    dueDate: '2026-05-20',
    ...patch,
  }
}

describe('timeline — operasyon eventleri', () => {
  it('payment.posted ve termin değişikliği adımlarda görünür', () => {
    const steps = mapDomainEventsToTimelineSteps(
      order({}),
      [
        {
          id: 'e-pay',
          type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
          aggregateType: 'SalesOrder',
          aggregateId: 'TL-1',
          occurredAt: '2026-05-05T10:00:00.000Z',
          correlationId: 'c-pay',
          payloadSchemaVersion: '1',
          payload: { amount: '2500.00', currency: 'TRY' },
        },
        {
          id: 'e-term',
          type: DOMAIN_EVENT_TYPE.ORDER_LINE_COMMITTED_SHIP_BY_CHANGED,
          aggregateType: 'SalesOrder',
          aggregateId: 'TL-1',
          occurredAt: '2026-05-06T11:00:00.000Z',
          correlationId: 'c-term',
          payloadSchemaVersion: '1',
          payload: { oldDate: '2026-05-20', newDate: '2026-06-01', reason: 'Gecikme' },
        },
      ],
      todayIso,
    )

    const labels = steps.map((s) => s.label).join(' | ')
    expect(labels).toMatch(/Tahsilat alındı/)
    expect(labels).toMatch(/Termin tarihi güncellendi/)
    expect(labels).toMatch(/2026-05-20.*2026-06-01/)
  })
})

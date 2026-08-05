import { describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { mapDomainEventsToTimelineSteps } from '../../src/mappers/timeline/mapDomainEventsToTimelineSteps.js'

const todayIso = '2026-05-14'

describe('timeline — sevk operasyon dili', () => {
  it('shipment event detayında teknik enum yerine Türkçe durum', () => {
    const steps = mapDomainEventsToTimelineSteps(
      {
        id: 'S-1',
        customer: 'Test',
        product: 'Dolap',
        status: 'Üretimde',
        amount: 1000,
        paid: false,
        paidAmount: 0,
        orderDate: '2026-05-01',
      },
      [
        {
          id: 'e-sh',
          type: DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED,
          aggregateType: 'SalesOrder',
          aggregateId: 'S-1',
          occurredAt: '2026-05-05T10:00:00.000Z',
          correlationId: 'c1',
          payloadSchemaVersion: '1',
          payload: { fromStatus: 'LOADED', toStatus: 'DISPATCHED' },
        },
      ],
      todayIso,
    )

    const label = steps.find((s) => s.key === 'e-sh')?.label ?? ''
    expect(label).toMatch(/Yola çıktı|Sevk|yüklendi/i)
    expect(label).not.toMatch(/LOADED/)
    expect(label).not.toMatch(/DISPATCHED/)
  })
})

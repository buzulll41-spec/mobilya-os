import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockOrdersStore } from '../../src/services/mockApi.js'
import { appendDomainEvent, getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'

describe('domain event append idempotency', () => {
  beforeEach(() => {
    resetMockOrdersStore()
  })

  it('aynı id ile ikinci append store uzunluğunu artırmaz', () => {
    const baseLen = getAllDomainEventsSnapshot().length
    const evt = {
      id: 'test-idem-evt-1',
      type: DOMAIN_EVENT_TYPE.ORDER_PLACED,
      aggregateType: 'SalesOrder',
      aggregateId: 'ZZ-IDEM',
      occurredAt: '2026-05-14T10:00:00.000Z',
      correlationId: 'corr-test-idem-1',
      payloadSchemaVersion: '1',
      payload: { source: 'test' },
    }
    appendDomainEvent(evt)
    appendDomainEvent({ ...evt, payload: { source: 'test-dup' } })
    expect(getAllDomainEventsSnapshot().length).toBe(baseLen + 1)
    const found = getAllDomainEventsSnapshot().filter((e) => e.id === 'test-idem-evt-1')
    expect(found.length).toBe(1)
  })

  it('aynı type + aggregateId + correlationId ile ikinci append eklenmez', () => {
    const baseLen = getAllDomainEventsSnapshot().length
    const a = {
      id: 'test-corr-a',
      type: DOMAIN_EVENT_TYPE.PAYMENT_PENDING,
      aggregateType: 'SalesOrder',
      aggregateId: 'ZZ-CORR',
      occurredAt: '2026-05-14T11:00:00.000Z',
      correlationId: 'corr-uni-zz-1',
      payloadSchemaVersion: '1',
      payload: { x: 1 },
    }
    const b = {
      ...a,
      id: 'test-corr-b',
      occurredAt: '2026-05-14T12:00:00.000Z',
      payload: { x: 2 },
    }
    appendDomainEvent(a)
    appendDomainEvent(b)
    expect(getAllDomainEventsSnapshot().length).toBe(baseLen + 1)
  })
})

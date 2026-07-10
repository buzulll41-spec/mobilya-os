import { describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import {
  auditCategoryLabelTr,
  mapDomainEventsToAuditFeed,
} from '../../src/mappers/audit/mapDomainEventsToAuditFeed.js'

describe('mapDomainEventsToAuditFeed (V9 Türkçe)', () => {
  it('ödeme olayını TRY ve Türkçe yöntemle gösterir', () => {
    const items = mapDomainEventsToAuditFeed(
      [
        {
          id: 'e1',
          aggregateId: 'S-1',
          type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
          occurredAt: '2026-05-14T10:30:00.000Z',
          payload: { amount: 25000, method: PAYMENT_METHOD.TRANSFER },
        },
      ],
      'S-1',
    )
    expect(items).toHaveLength(1)
    expect(items[0].category).toBe('payment')
    expect(items[0].categoryLabel).toBe('Ödeme')
    expect(items[0].title).toBe('Tahsilat alındı')
    expect(items[0].description).toContain('Havale / EFT')
    expect(items[0].description).not.toContain('TRANSFER')
  })

  it('kategori etiketleri Türkçe', () => {
    expect(auditCategoryLabelTr('payment')).toBe('Ödeme')
    expect(auditCategoryLabelTr('shipment')).toBe('Sevk')
    expect(auditCategoryLabelTr('ssh')).toBe('SSH')
  })
})

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'
import { getMissingItemsForOrder } from '../../src/services/mockMissingItemStore.js'
import {
  getOrderMissingItems,
  patchMissingItemStatus,
  postOrderMissingItem,
  resetMockOrdersStore,
} from '../../src/services/mockApi.js'

describe('mock missing items operations', () => {
  beforeEach(() => {
    resetMockOrdersStore()
  })

  afterEach(() => {
    resetMockOrdersStore()
  })

  it('postOrderMissingItem → OPEN kayıt + missing_item.created', async () => {
    const { missingItem, order } = await postOrderMissingItem('S-24105', {
      title: 'Ray',
      quantity: 2,
      reason: 'Paket eksik',
    })
    expect(missingItem.status).toBe(MISSING_ITEM_STATUS.OPEN)
    expect(order.openMissingItemsCount).toBeGreaterThanOrEqual(1)

    const list = await getOrderMissingItems('S-24105')
    expect(list.some((m) => m.id === missingItem.id)).toBe(true)

    const events = getAllDomainEventsSnapshot()
    expect(
      events.some(
        (e) => e.aggregateId === 'S-24105' && e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED,
      ),
    ).toBe(true)
  })

  it('patchMissingItemStatus → ORDERED event', async () => {
    const open = getMissingItemsForOrder('S-24105').find((m) => m.status === MISSING_ITEM_STATUS.OPEN)
    expect(open).toBeDefined()
    await patchMissingItemStatus(open.id, { status: MISSING_ITEM_STATUS.ORDERED })
    const updated = getMissingItemsForOrder('S-24105').find((m) => m.id === open.id)
    expect(updated?.status).toBe(MISSING_ITEM_STATUS.ORDERED)
    const events = getAllDomainEventsSnapshot()
    expect(events.some((e) => e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED)).toBe(true)
  })
})

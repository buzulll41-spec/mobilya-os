import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { executePatchMissingItemStatusFlow } from '../../src/application/orderOperationsOrchestration.js'
import { getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'
import { getMissingItemsForOrder } from '../../src/services/mockMissingItemStore.js'
import { resetMockOrdersStore } from '../../src/services/mockApi.js'

describe('missing items drawer flow (mock orchestration)', () => {
  /** @type {string | undefined} */
  let prevApiBase

  beforeEach(() => {
    prevApiBase = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = ''
    resetMockOrdersStore()
  })

  afterEach(() => {
    import.meta.env.VITE_API_BASE_URL = prevApiBase
    resetMockOrdersStore()
  })

  it('PATCH status sonrası missingItem güncel + liste projection + timeline', async () => {
    const orderId = 'S-24105'
    const open = getMissingItemsForOrder(orderId).find((m) => m.status === MISSING_ITEM_STATUS.OPEN)
    expect(open).toBeDefined()

    const result = await executePatchMissingItemStatusFlow(orderId, open.id, {
      status: MISSING_ITEM_STATUS.ORDERED,
    })

    expect(result.missingItem.status).toBe(MISSING_ITEM_STATUS.ORDERED)

    const stored = getMissingItemsForOrder(orderId).find((m) => m.id === open.id)
    expect(stored?.status).toBe(MISSING_ITEM_STATUS.ORDERED)

    const dto = result.salesOrderListItemDtos.find((d) => d.id === orderId)
    expect(dto?.missingItemsOpenStatusCount).toBe(0)
    expect(dto?.openMissingItemsCount).toBe(1)

    const events = getAllDomainEventsSnapshot()
    expect(events.some((e) => e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED)).toBe(true)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { executePostMissingItemFlow } from '../../src/application/orderOperationsOrchestration.js'
import * as ordersClient from '../../src/services/ordersClient.js'
import { resetMockOrdersStore } from '../../src/services/mockApi.js'

describe('missing items POST flow', () => {
  /** @type {string | undefined} */
  let prevApiBase

  beforeEach(() => {
    prevApiBase = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = ''
    resetMockOrdersStore()
  })

  afterEach(() => {
    import.meta.env.VITE_API_BASE_URL = prevApiBase
    vi.restoreAllMocks()
    resetMockOrdersStore()
  })

  it('POST sonrası orchestration missingItem OPEN + getOrders + domain events', async () => {
    const getMissingSpy = vi.spyOn(ordersClient, 'getOrderMissingItems')
    const getOrdersSpy = vi.spyOn(ordersClient, 'getOrders')

    const result = await executePostMissingItemFlow('S-24089', {
      title: 'Test menteşe',
      quantity: 2,
      reason: 'Sevkiyat eksik',
    })

    expect(result.missingItem.status).toBe(MISSING_ITEM_STATUS.OPEN)
    expect(result.missingItem.id).toMatch(/^OMI-/)

    const dto = result.salesOrderListItemDtos.find((d) => d.id === 'S-24089')
    expect(dto?.openMissingItemsCount).toBeGreaterThan(0)

    expect(getOrdersSpy).toHaveBeenCalled()
    expect(getMissingSpy).not.toHaveBeenCalled()
  })
})

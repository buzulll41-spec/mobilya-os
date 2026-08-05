import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resetMockOrdersStore } from '../../src/services/mockApi.js'
import { executeRefreshOrdersFlow } from '../../src/application/orderMutationOrchestration.js'

describe('mock store reset determinism', () => {
  /** @type {string | undefined} */
  let prevApiBase

  beforeEach(() => {
    prevApiBase = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = ''
    resetMockOrdersStore()
  })

  afterEach(() => {
    import.meta.env.VITE_API_BASE_URL = prevApiBase
  })

  it('ardışık reset + refresh aynı sipariş id sırasını üretir', async () => {
    resetMockOrdersStore()
    const a = await executeRefreshOrdersFlow()
    const idsA = a.salesOrderListItemDtos.map((d) => d.id).join(',')
    resetMockOrdersStore()
    const b = await executeRefreshOrdersFlow()
    const idsB = b.salesOrderListItemDtos.map((d) => d.id).join(',')
    expect(idsB).toBe(idsA)
  })
})

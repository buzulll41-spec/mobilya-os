import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { executeUpdateOrderFlow } from '../../src/application/orderOperationsOrchestration.js'
import { getMissingItemsForOrder } from '../../src/services/mockMissingItemStore.js'
import {
  postOrderMissingItem,
  resetMockOrdersStore,
  updateOrder,
} from '../../src/services/mockApi.js'

describe('order status — teslim kuralları (mock)', () => {
  beforeEach(() => {
    import.meta.env.VITE_API_BASE_URL = ''
    resetMockOrdersStore()
  })

  afterEach(() => {
    resetMockOrdersStore()
  })

  it('açık eksik varken de Teslim Edildi yapılabilir (SSH ayrı takip)', async () => {
    const orderId = 'S-24105'
    const open = getMissingItemsForOrder(orderId).find((m) => m.status !== MISSING_ITEM_STATUS.RESOLVED)
    expect(open).toBeDefined()

    const updated = await updateOrder(orderId, { status: 'Teslim Edildi' })
    expect(updated.status).toBe('Teslim Edildi')
  })

  it('tüm eksikler RESOLVED ise Teslim Edildi izinli', async () => {
    const create = await postOrderMissingItem('S-24089', {
      title: 'Test parça',
      quantity: 1,
      reason: 'Eksik test',
    })
    const missingId = create.missingItem.id

    const { patchMissingItemStatus } = await import('../../src/services/mockApi.js')
    for (const status of ['ORDERED', 'ARRIVED', 'RESOLVED']) {
      await patchMissingItemStatus(missingId, {
        status,
        ...(status === 'RESOLVED' ? { resolutionNote: 'Geldi' } : {}),
      })
    }

    const result = await executeUpdateOrderFlow('S-24089', { status: 'Teslim Edildi' })
    expect(result.updated.status).toBe('Teslim Edildi')
    const dto = result.salesOrderListItemDtos.find((d) => d.id === 'S-24089')
    expect(dto?.displayStatus).toBe('Teslim Edildi')
    expect(dto?.openMissingItemsCount).toBe(0)
  })
})

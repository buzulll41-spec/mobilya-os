import { describe, expect, it } from 'vitest'
import {
  buildDrawerQueue,
  canNavigateQueueNext,
  canNavigateQueuePrev,
  navigateQueueOrder,
  normalizeQueueContext,
} from '../../src/application/orderDrawerOrchestration.js'

describe('orderDrawerOrchestration queue', () => {
  it('buildDrawerQueue resolves active index from order id', () => {
    const q = buildDrawerQueue({
      queueId: 'orders:all',
      rowIds: ['a', 'b', 'c'],
      activeOrderId: 'b',
      source: 'orders',
    })
    expect(q.activeIndex).toBe(1)
  })

  it('navigates next and prev within queue bounds', () => {
    const queue = buildDrawerQueue({
      queueId: 'collection:critical',
      rowIds: ['x', 'y', 'z'],
      activeOrderId: 'y',
      source: 'collection',
    })
    expect(canNavigateQueuePrev(queue)).toBe(true)
    expect(canNavigateQueueNext(queue)).toBe(true)
    const next = navigateQueueOrder(queue, 1)
    expect(next?.orderId).toBe('z')
    expect(next?.nextQueue.activeIndex).toBe(2)
    expect(canNavigateQueueNext(next?.nextQueue ?? null)).toBe(false)
  })

  it('normalizeQueueContext fills index when missing', () => {
    const q = normalizeQueueContext('b', {
      queue: {
        queueId: 'orders:all',
        rowIds: ['a', 'b', 'c'],
        activeIndex: Number.NaN,
        filterSnapshot: {},
        sort: 'default',
      },
    })
    expect(q?.activeIndex).toBe(1)
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetMockOrdersStore } from '../../src/services/mockApi.js'
import {
  executeCreateOrderFlow,
  executeRefreshOrdersFlow,
  executeRollbackOrdersState,
  executeUpdateOrderFlow,
} from '../../src/application/orderMutationOrchestration.js'
import { runWithMockApiTimers } from './_helpers/mockApiTimers.js'
import { authenticateTestAdmin } from './_helpers/testAuth.js'

describe('orderMutationOrchestration', () => {
  /** @type {string | undefined} */
  let prevApiBase

  beforeEach(() => {
    prevApiBase = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = ''
    resetMockOrdersStore()
    authenticateTestAdmin()
  })

  afterEach(() => {
    import.meta.env.VITE_API_BASE_URL = prevApiBase
  })

  it('executeRefreshOrdersFlow liste ve snapshot döner', async () => {
    const r = await runWithMockApiTimers(() => executeRefreshOrdersFlow())
    expect(Array.isArray(r.salesOrderListItemDtos)).toBe(true)
    expect(r.salesOrderListItemDtos.length).toBeGreaterThan(0)
    expect(Array.isArray(r.domainEvents)).toBe(true)
    expect(Array.isArray(r.operationalTasks)).toBe(true)
  })

  it('executeRollbackOrdersState getOrders + snapshot birleşir', async () => {
    const r = await runWithMockApiTimers(() => executeRollbackOrdersState())
    expect(r.salesOrderListItemDtos.length).toBeGreaterThan(0)
    expect(Array.isArray(r.domainEvents)).toBe(true)
    expect(Array.isArray(r.operationalTasks)).toBe(true)
  })

  it('executeCreateOrderFlow oluşturur + snapshot', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-14T12:00:00.000Z'))
    try {
      const p = executeCreateOrderFlow({
        customerName: 'Orch Test',
        productTitle: 'Ürün',
        totalAmount: 8000,
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [{ title: 'Ürün', quantity: 1, unitPrice: 8000, sortOrder: 0 }],
      })
      await vi.runAllTimersAsync()
      const r = await p
      expect(r.created.id).toMatch(/^S-/)
      expect(r.optimisticDto.id).toBe(r.created.id)
      expect(r.domainEvents.length).toBeGreaterThan(0)
      expect(Array.isArray(r.operationalTasks)).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('executeUpdateOrderFlow lifecycle append + snapshot', async () => {
    const r = await runWithMockApiTimers(() =>
      executeUpdateOrderFlow('S-24089', { status: 'Hazır' }),
    )
    expect(r.updated.status).toBe('Hazır')
    expect(Array.isArray(r.salesOrderListItemDtos)).toBe(true)
    expect(Array.isArray(r.domainEvents)).toBe(true)
  })
})

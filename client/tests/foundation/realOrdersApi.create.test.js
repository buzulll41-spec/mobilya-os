import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOrderInApi } from '../../src/services/realOrdersApi.js'

describe('createOrderInApi', () => {
  /** @type {typeof fetch | undefined} */
  let originalFetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('POST /v1/orders yanıtını normalize eder', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'S-NEW-1',
          orderNumber: 'S-NEW-1',
          customerDisplayName: 'Test',
          displayStatus: 'Bekleniyor',
          totalAmount: { amount: '1000.00', currency: 'TRY' },
          amountPaid: { amount: '0.00', currency: 'TRY' },
          amountDue: { amount: '1000.00', currency: 'TRY' },
          placedAt: '2026-05-14T10:00:00.000Z',
          lifecycleStatus: 'CONFIRMED',
          channel: 'STORE',
          currency: 'TRY',
          customerId: 'C-1',
          lineSummaryTitle: 'Dolap',
          fulfillmentProgress: 0.15,
          currentRiskSeverity: 'NONE',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const result = await createOrderInApi('http://localhost:4000', {
      customerName: 'Test',
      productTitle: 'Dolap',
      totalAmount: 1000,
      paidAmount: 0,
      status: 'Bekleniyor',
    })

    expect(result.id).toBe('S-NEW-1')
    expect(result.customerDisplayName).toBe('Test')
    expect(result.totalAmount.amount).toBe('1000.00')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/orders',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

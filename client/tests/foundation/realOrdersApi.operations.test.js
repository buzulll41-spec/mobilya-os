import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchDomainEventsForOrderFromApi,
  fetchDomainEventsFromApi,
  getDomainEvents,
  patchOrderTerminInApi,
  patchMissingItemStatusInApi,
  postOrderPaymentInApi,
} from '../../src/services/realOrdersApi.js'

describe('realOrdersApi operations', () => {
  /** @type {typeof fetch | undefined} */
  let originalFetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('postOrderPaymentInApi POST /v1/orders/:id/payments', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'S-1',
          orderNumber: 'S-1',
          customerDisplayName: 'A',
          displayStatus: 'Üretimde',
          totalAmount: { amount: '10000.00', currency: 'TRY' },
          amountPaid: { amount: '5000.00', currency: 'TRY' },
          amountDue: { amount: '5000.00', currency: 'TRY' },
          placedAt: '2026-05-14T10:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const dto = await postOrderPaymentInApi('http://localhost:4000', 'S-1', {
      amount: 5000,
      method: 'TRANSFER',
    })
    expect(dto.amountPaid.amount).toBe('5000.00')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/orders/S-1/payments',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('patchOrderTerminInApi PATCH /v1/orders/:id/termin', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'S-1',
          orderNumber: 'S-1',
          customerDisplayName: 'A',
          displayStatus: 'Üretimde',
          totalAmount: { amount: '10000.00', currency: 'TRY' },
          amountPaid: { amount: '0.00', currency: 'TRY' },
          amountDue: { amount: '10000.00', currency: 'TRY' },
          placedAt: '2026-05-14T10:00:00.000Z',
          earliestCommittedShipBy: '2026-07-01',
          latestCommittedShipBy: '2026-07-01',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const dto = await patchOrderTerminInApi('http://localhost:4000', 'S-1', {
      committedShipBy: '2026-07-01',
      reason: 'Müşteri',
    })
    expect(dto.latestCommittedShipBy).toBe('2026-07-01')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/orders/S-1/termin',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('getDomainEvents alias GET /v1/domain-events', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await getDomainEvents('http://localhost:4000')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/domain-events',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('fetchDomainEventsForOrderFromApi GET /v1/orders/:id/domain-events', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'e1',
            type: 'payment.posted',
            aggregateType: 'SalesOrder',
            aggregateId: 'S-1',
            occurredAt: '2026-05-14T12:00:00.000Z',
            correlationId: 'c1',
            payloadSchemaVersion: '1',
            payload: { amount: '50.00' },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const events = await fetchDomainEventsForOrderFromApi('http://localhost:4000', 'S-1')
    expect(events[0].type).toBe('payment.posted')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/orders/S-1/domain-events',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('fetchDomainEventsFromApi GET /v1/domain-events', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'e1',
            type: 'payment.posted',
            aggregateType: 'SalesOrder',
            aggregateId: 'S-1',
            occurredAt: '2026-05-14T12:00:00.000Z',
            correlationId: 'c1',
            payloadSchemaVersion: '1',
            payload: { amount: '100.00' },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const events = await fetchDomainEventsFromApi('http://localhost:4000')
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('payment.posted')
  })

  it('patchMissingItemStatusInApi PATCH /v1/missing-items/:id/status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          missingItem: {
            id: 'OMI-1',
            orderId: 'S-1',
            lineId: null,
            title: 'Kapak',
            quantity: '1.00',
            reason: 'Kırık',
            status: 'ORDERED',
            supplierNote: null,
            createdAt: '2026-05-15T10:00:00.000Z',
            resolvedAt: null,
          },
          order: {
            id: 'S-1',
            orderNumber: 'S-1',
            customerDisplayName: 'A',
            displayStatus: 'Eksik Var',
            totalAmount: { amount: '10000.00', currency: 'TRY' },
            amountPaid: { amount: '0.00', currency: 'TRY' },
            amountDue: { amount: '10000.00', currency: 'TRY' },
            placedAt: '2026-05-14T10:00:00.000Z',
            openMissingItemsCount: 1,
            missingItemsOpenStatusCount: 0,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const result = await patchMissingItemStatusInApi('http://localhost:4000', 'OMI-1', {
      status: 'ORDERED',
    })
    expect(result.missingItem.status).toBe('ORDERED')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/missing-items/OMI-1/status',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})

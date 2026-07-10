import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { mapDomainEventsToTimelineSteps } from '../../src/mappers/timeline/mapDomainEventsToTimelineSteps.js'
import { mergeDomainEventsById } from '../../src/utils/mergeDomainEvents.js'

describe('domain events API sync', () => {
  /** @type {typeof fetch | undefined} */
  let originalFetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:4000'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    import.meta.env.VITE_API_BASE_URL = ''
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('ordersClient.getDomainEvents runtime API base ile GET /v1/domain-events çağırır', async () => {
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
            payload: { amount: '100.00', currency: 'TRY' },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const { getDomainEvents } = await import('../../src/services/ordersClient.js')
    const events = await getDomainEvents()
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('payment.posted')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/domain-events',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('POST ödeme sonrası sipariş event endpoint payment.posted içerir ve timeline gösterir', async () => {
    const paymentEvent = {
      id: 'e-pay',
      type: 'payment.posted',
      aggregateType: 'SalesOrder',
      aggregateId: 'S-OPS',
      occurredAt: '2026-05-14T14:00:00.000Z',
      correlationId: 'c-pay',
      payloadSchemaVersion: '1',
      payload: { amount: '2500.00', currency: 'TRY', method: 'TRANSFER' },
    }

    const listRow = {
      id: 'S-OPS',
      orderNumber: 'S-OPS',
      customerDisplayName: 'A',
      displayStatus: 'Üretimde',
      totalAmount: { amount: '10000.00', currency: 'TRY' },
      amountPaid: { amount: '2500.00', currency: 'TRY' },
      amountDue: { amount: '7500.00', currency: 'TRY' },
      placedAt: '2026-05-14T10:00:00.000Z',
      lifecycleStatus: 'IN_FULFILLMENT',
      channel: 'STORE',
      currency: 'TRY',
      lineSummaryTitle: 'P',
    }

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(listRow), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([listRow]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([paymentEvent]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([paymentEvent]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([listRow]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([paymentEvent]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    const { executePostPaymentFlow } = await import('../../src/application/orderOperationsOrchestration.js')
    const result = await executePostPaymentFlow('S-OPS', { amount: 2500, method: 'TRANSFER' })

    expect(result.dto.amountPaid.amount).toBe('2500.00')
    expect(result.salesOrderListItemDtos.find((d) => d.id === 'S-OPS')?.amountDue.amount).toBe('7500.00')
    expect(result.domainEvents.some((e) => e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED)).toBe(true)

    const steps = mapDomainEventsToTimelineSteps(
      {
        id: 'S-OPS',
        customer: 'A',
        product: 'P',
        status: 'Üretimde',
        amount: 10_000,
        paid: false,
        paidAmount: 2500,
        orderDate: '2026-05-01',
        dueDate: '2026-05-20',
      },
      result.domainEvents,
      '2026-05-14',
    )
    expect(steps.some((s) => s.label.includes('Tahsilat alındı'))).toBe(true)
  })

  it('mergeDomainEventsById global ve sipariş listesini birleştirir', () => {
    const merged = mergeDomainEventsById(
      [{ id: 'a', type: 'order.placed', aggregateType: 'SalesOrder', aggregateId: 'S-1', occurredAt: '2026-05-01T10:00:00.000Z', correlationId: 'c', payloadSchemaVersion: '1', payload: {} }],
      [{ id: 'b', type: 'payment.posted', aggregateType: 'SalesOrder', aggregateId: 'S-1', occurredAt: '2026-05-02T10:00:00.000Z', correlationId: 'c2', payloadSchemaVersion: '1', payload: { amount: '1.00' } }],
    )
    expect(merged).toHaveLength(2)
    expect(merged[1].type).toBe('payment.posted')
  })
})

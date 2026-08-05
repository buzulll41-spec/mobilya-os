import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOrderInApi, fetchOrdersListFromApi } from '../../src/services/realOrdersApi.js'
import { mapListItemToRowVM } from '../../src/mappers/mapListItemToRowVM.js'
import { listItemDtoToLegacyOrder } from '../../src/mappers/listItemDtoToLegacyOrder.js'

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

  it('create -> read -> projection zincirinde refresh sonrası UI modeline aynı telefonu taşır', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (input, init) => {
      const url = String(input)
      const method = String(init?.method ?? 'GET').toUpperCase()

      if (url.endsWith('/v1/orders') && method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'S-CHAIN-1',
            orderNumber: 'S-CHAIN-1',
            customerDisplayName: 'Zincir Müşteri',
            customerPhone: '0555 123 45 67',
            displayStatus: 'Bekleniyor',
            totalAmount: { amount: '3500.00', currency: 'TRY' },
            amountPaid: { amount: '0.00', currency: 'TRY' },
            amountDue: { amount: '3500.00', currency: 'TRY' },
            placedAt: '2026-05-14T10:00:00.000Z',
            lifecycleStatus: 'CONFIRMED',
            channel: 'STORE',
            currency: 'TRY',
            customerId: 'C-CHAIN-1',
            lineSummaryTitle: 'Telefonlu Ürün',
            fulfillmentProgress: 0.1,
            currentRiskSeverity: 'NONE',
            notesSnapshot:
              'Adres: Kadıköy\\n--- Müşteri ek ---\\nTel 2: 0212 999 88 77\\n--- /Müşteri ek ---',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (url.endsWith('/v1/orders') && method === 'GET') {
        return new Response(
          JSON.stringify([
            {
              id: 'S-CHAIN-1',
              orderNumber: 'S-CHAIN-1',
              customerDisplayName: 'Zincir Müşteri',
              customerPhone: '0555 123 45 67',
              displayStatus: 'Bekleniyor',
              totalAmount: { amount: '3500.00', currency: 'TRY' },
              amountPaid: { amount: '0.00', currency: 'TRY' },
              amountDue: { amount: '3500.00', currency: 'TRY' },
              placedAt: '2026-05-14T10:00:00.000Z',
              lifecycleStatus: 'CONFIRMED',
              channel: 'STORE',
              currency: 'TRY',
              customerId: 'C-CHAIN-1',
              lineSummaryTitle: 'Telefonlu Ürün',
              fulfillmentProgress: 0.1,
              currentRiskSeverity: 'NONE',
              notesSnapshot:
                'Adres: Kadıköy\\n--- Müşteri ek ---\\nTel 2: 0212 999 88 77\\n--- /Müşteri ek ---',
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify({ message: `unexpected ${method} ${url}` }), { status: 500 })
    })

    const created = await createOrderInApi('http://localhost:4000', {
      customerName: 'Zincir Müşteri',
      productTitle: 'Telefonlu Ürün',
      totalAmount: 3500,
      paidAmount: 0,
      status: 'Bekleniyor',
      phone: '0555 123 45 67',
      phone2: '0212 999 88 77',
      notes: 'Adres: Kadıköy',
    })
    expect(created.customerPhone).toBe('0555 123 45 67')

    const refreshedList = await fetchOrdersListFromApi('http://localhost:4000')
    expect(refreshedList).toHaveLength(1)

    const rowVm = mapListItemToRowVM(refreshedList[0])
    const legacyOrder = listItemDtoToLegacyOrder(refreshedList[0])

    expect(rowVm.phone).toBe('0555 123 45 67')
    expect(legacyOrder.phone).toBe('0555 123 45 67')

    expect({
      created: {
        id: created.id,
        customerPhone: created.customerPhone,
      },
      refreshedRowVm: {
        id: rowVm.id,
        phone: rowVm.phone,
        status: rowVm.status,
        notesHasPhone2Block: Boolean(rowVm.notes?.includes('Tel 2: 0212 999 88 77')),
      },
      refreshedLegacy: {
        id: legacyOrder.id,
        phone: legacyOrder.phone,
      },
    }).toMatchInlineSnapshot(`
      {
        "created": {
          "customerPhone": "0555 123 45 67",
          "id": "S-CHAIN-1",
        },
        "refreshedLegacy": {
          "id": "S-CHAIN-1",
          "phone": "0555 123 45 67",
        },
        "refreshedRowVm": {
          "id": "S-CHAIN-1",
          "notesHasPhone2Block": true,
          "phone": "0555 123 45 67",
          "status": "Bekleniyor",
        },
      }
    `)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/orders',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/v1/orders',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

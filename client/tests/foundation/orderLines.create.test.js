import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockOrdersStore, createOrder } from '../../src/services/mockApi.js'
import { getLineSeedsForSalesOrder } from '../../src/services/mockShipmentStore.js'
import { hasOrderLinesInStore } from '../../src/services/mockOrderLineStore.js'
import {
  computeTotalFromLines,
  formatProductSummaryFromLines,
} from '../../src/domain/order/orderLineCreate.js'
import { normalizeCreateOrderRequest } from '../../src/domain/order/normalizeCreateOrder.js'
import { mapWizardProductsToLines, mapWizardToCreateOrderRequest } from '../../src/features/orders/newOrderWizardModel.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { computeShipmentPlanLinesFromSeeds } from '../../src/mappers/shipment/computeShipmentPlanLines.js'
import { runWithMockApiTimers } from './_helpers/mockApiTimers.js'
import { authenticateTestAdmin } from './_helpers/testAuth.js'

describe('order lines create (FAZ A1)', () => {
  beforeEach(() => {
    resetMockOrdersStore()
    authenticateTestAdmin()
  })

  it('multi-line create persists real order_lines in mock store', async () => {
    const body = normalizeCreateOrderRequest({
      customerName: 'Çok Satırlı',
      paidAmount: 0,
      status: 'Bekleniyor',
      lines: [
        { title: 'Dolap', quantity: 2, unitPrice: 5000, sortOrder: 0 },
        { title: 'Komodin', quantity: 1, unitPrice: 3000, sortOrder: 1 },
      ],
    })
    expect(body.totalAmount).toBe(13_000)

    const order = await runWithMockApiTimers(() => createOrder(body))
    expect(hasOrderLinesInStore(order.id)).toBe(true)

    const seeds = getLineSeedsForSalesOrder(order.id)
    expect(seeds).toHaveLength(2)
    expect(seeds[0].id).toBe(`OL-${order.id}-1`)
    expect(seeds[1].id).toBe(`OL-${order.id}-2`)
    expect(seeds[0].qtyOrdered).toBe('2.00')
    expect(seeds[1].qtyOrdered).toBe('1.00')
    expect(seeds[0].id).not.toMatch(/synthetic/i)
  })

  it('wizard request includes lines and projection uses real qty', async () => {
    const form = {
      customer: 'Wizard Müşteri',
      phone: '',
      city: '',
      district: '',
      neighborhood: '',
      address: '',
      customerNote: '',
      salesPerson: 'Ali',
      products: [
        { id: 'a', name: 'Masa', group: 'Yemek odası', qty: '3', unitPrice: '1000', note: '' },
        { id: 'b', name: 'Sandalye', group: 'Yemek odası', qty: '6', unitPrice: '500', note: '' },
      ],
      kapora: '0',
      paymentMethod: 'TRANSFER',
      dueDate: '2026-06-01',
      status: 'Bekleniyor',
    }
    const req = mapWizardToCreateOrderRequest(form)
    expect(req.lines).toHaveLength(2)
    expect(req.totalAmount).toBe(6_000)

    const order = await runWithMockApiTimers(() => createOrder(req))
    const dto = projectLegacyOrderToListItemDto(order)
    expect(dto.lineSummaryTitle).toBe(formatProductSummaryFromLines(mapWizardProductsToLines(form)))
    expect(dto.qtyOrderedTotal).toBe('9.00')

    const plan = computeShipmentPlanLinesFromSeeds(getLineSeedsForSalesOrder(order.id), [])
    expect(plan).toHaveLength(2)
    expect(plan.find((p) => p.orderLineId === `OL-${order.id}-1`)?.qtyOrdered).toBe('3.00')
  })

  it('legacy single-product create still produces one real line', async () => {
    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Legacy',
        productTitle: 'Tek ürün',
        totalAmount: 4500,
        paidAmount: 0,
        status: 'Bekleniyor',
      }),
    )
    const seeds = getLineSeedsForSalesOrder(order.id)
    expect(seeds).toHaveLength(1)
    expect(seeds[0].qtyOrdered).toBe('1.00')
    expect(seeds[0].id).toBe(`OL-${order.id}-1`)
  })

  it('new order does not use synthetic fallback when seeds exist', async () => {
    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'No Synth',
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [{ title: 'Koltuk', quantity: 4, unitPrice: 2500, sortOrder: 0 }],
      }),
    )
    const seeds = getLineSeedsForSalesOrder(order.id)
    expect(seeds.length).toBeGreaterThan(0)
    expect(seeds[0].id).toBe(`OL-${order.id}-1`)
    expect(computeTotalFromLines([{ title: 'x', quantity: 4, unitPrice: 2500, sortOrder: 0 }])).toBe(10_000)
  })

  it('createOrderInApi strips mock-only fields from wire body', async () => {
    const prev = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'S-API-1',
          orderNumber: 'S-API-1',
          customerDisplayName: 'API',
          displayStatus: 'Bekleniyor',
          totalAmount: { amount: '6000.00', currency: 'TRY' },
          amountPaid: { amount: '0.00', currency: 'TRY' },
          amountDue: { amount: '6000.00', currency: 'TRY' },
          placedAt: '2026-05-14T10:00:00.000Z',
          lifecycleStatus: 'CONFIRMED',
          channel: 'STORE',
          currency: 'TRY',
          customerId: 'C-1',
          lineSummaryTitle: 'Masa × 3',
          fulfillmentProgress: 0.15,
          currentRiskSeverity: 'NONE',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const { createOrderInApi } = await import('../../src/services/realOrdersApi.js')
    await createOrderInApi('http://localhost:4000', {
      customerName: 'API',
      paidAmount: 0,
      status: 'Bekleniyor',
      lines: [
        {
          title: 'Masa',
          quantity: 3,
          unitPrice: 2000,
          sortOrder: 0,
          productGroup: 'Mutfak',
          lineNote: 'Beyaz',
        },
      ],
      phone: '555',
      phone2: '0212',
      nationalId: '12345678901',
      taxNumber: '999',
      taxOffice: 'Kadıköy',
      notes: 'Ödeme: Nakit',
      dueDate: '2026-06-01',
    })
    const call = /** @type {ReturnType<typeof vi.fn>} */ (globalThis.fetch).mock.calls[0]
    const sent = JSON.parse(String(call[1]?.body))
    expect(sent.lines).toHaveLength(1)
    expect(sent.lines[0].productGroup).toBe('Mutfak')
    expect(sent.lines[0].lineNote).toBeUndefined()
    expect(sent.phone).toBe('555')
    expect(sent.notes).toBe('Ödeme: Nakit')
    expect(sent.dueDate).toBe('2026-06-01')
    expect(sent.phone2).toBeUndefined()
    expect(sent.nationalId).toBeUndefined()
    globalThis.fetch = prev
  })
})

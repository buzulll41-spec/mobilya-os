import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockOrdersStore, createOrder } from '../../src/services/mockApi.js'
import { getOrderLinesForSalesOrder } from '../../src/services/mockOrderLineStore.js'
import {
  buildSalesContractModel,
  extractAddressFromNotes,
  extractPaymentMethodFromNotes,
  extractPaymentNoteFromNotes,
} from '../../src/mappers/sales-contract/buildSalesContractModel.js'
import {
  buildContractLineRowsFromWizardForm,
  fetchSalesContractLineRows,
  mapSourcesToContractRows,
} from '../../src/services/salesContractLines.js'
import { emptyWizardForm } from '../../src/features/orders/newOrderWizardModel.js'
import { buildSalesContractPdfFilename } from '../../src/lib/exportSalesContractPdf.js'
import { runWithMockApiTimers } from './_helpers/mockApiTimers.js'
import { authenticateTestAdmin } from './_helpers/testAuth.js'

describe('sales contract', () => {
  beforeEach(() => {
    resetMockOrdersStore()
    authenticateTestAdmin()
  })

  it('buildSalesContractModel — müşteri ek ve finans', () => {
    const order = {
      id: 'S-1',
      customer: 'Ali Veli',
      phone: '0532 111 22 33',
      phone2: '0212 444 55 66',
      nationalId: '12345678901',
      amount: 50_000,
      paidAmount: 10_000,
      orderDate: '2026-05-14',
      dueDate: '2026-07-01',
      salesPerson: 'Elçin',
      status: 'Bekleniyor',
      product: 'Koltuk',
      notes: '--- Müşteri ek ---\nTC: 12345678901\nÖdeme: Havale / EFT\nAdres: Karşıyaka, İzmir',
    }
    const model = buildSalesContractModel(
      order,
      { orderNumber: 'S-1' },
      [
        {
          title: 'Koltuk',
          productGroup: 'Oturma',
          quantity: 2,
          unitPrice: 25_000,
          lineTotal: 50_000,
          fabricNote: 'Antrasit keten',
        },
      ],
    )
    expect(model.customer.nationalId).toBe('12345678901')
    expect(model.customer.phone2).toBe('0212 444 55 66')
    expect(model.finance.grandTotal).toBe(50_000)
    expect(model.finance.remaining).toBe(40_000)
    expect(model.finance.paymentMethod).toBe('Havale / EFT')
    expect(model.delivery.address).toContain('Karşıyaka')
  })

  it('fetchSalesContractLineRows — gerçek order_lines (mock)', async () => {
    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Çok Satırlı',
        paidAmount: 5000,
        status: 'Bekleniyor',
        notes: 'Ödeme: Nakit\nAdres: Bornova, İzmir',
        lines: [
          { title: 'Dolap', quantity: 2, unitPrice: 5000, productGroup: 'Yatak odası', sortOrder: 0 },
          { title: 'Komodin', quantity: 1, unitPrice: 3000, productGroup: 'Yatak odası', sortOrder: 1 },
        ],
      }),
    )
    const seeds = getOrderLinesForSalesOrder(order.id)
    expect(seeds[0].unitPrice).toBe(5000)

    const rows = await fetchSalesContractLineRows(order.id, order.amount)
    expect(rows).toHaveLength(2)
    expect(rows[0].title).toBe('Dolap')
    expect(rows[0].lineTotal).toBe(10_000)
    expect(rows[1].lineTotal).toBe(3000)
  })

  it('mapSourcesToContractRows — boş kaynak crash vermez', () => {
    expect(mapSourcesToContractRows([], 0)).toEqual([])
  })

  it('notlardan adres ve ödeme parse', () => {
    const notes = 'Adres: Alsancak, İzmir\nÖdeme: Kart\nÖdeme notu: Peşin kapora'
    expect(extractAddressFromNotes(notes)).toBe('Alsancak, İzmir')
    expect(extractPaymentMethodFromNotes(notes)).toBe('Kart')
    expect(extractPaymentNoteFromNotes(notes)).toBe('Peşin kapora')
  })

  it('buildSalesContractPdfFilename — sipariş no dosya adı', () => {
    expect(buildSalesContractPdfFilename('S-24102')).toBe('satis-sozlesmesi-S-24102.pdf')
    expect(buildSalesContractPdfFilename('  ')).toBe('satis-sozlesmesi-siparis.pdf')
  })

  it('buildContractLineRowsFromWizardForm — konfigürasyon satırları', () => {
    const form = emptyWizardForm()
    form.products = [
      {
        id: 'w1',
        name: 'ROMA KÖŞE TAKIMI',
        group: 'Oturma grubu',
        qty: '1',
        unitPrice: '45000',
        note: '',
        configuration: {
          bodyFabric: 'Antrasit nubuk',
          cushionFabric: 'Desenli',
          lumbarCushion: 'Krem',
          legColor: 'Ceviz',
          orientation: 'Sağ köşe',
        },
        defaultSupplierName: 'ABC Mobilya',
      },
    ]
    const rows = buildContractLineRowsFromWizardForm(form)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe('ROMA KÖŞE TAKIMI')
    expect(rows[0].supplierName).toBe('ABC Mobilya')
    expect(rows[0].configurationLines?.length).toBeGreaterThan(0)
    expect(rows[0].configurationLines?.some((l) => l.includes('Antrasit'))).toBe(true)
  })
})

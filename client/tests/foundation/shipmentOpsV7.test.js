import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  buildDispatchSheetModel,
  filterAgendaItemsForVehicle,
  DISPATCH_SHEET_CHECKLIST,
} from '../../src/mappers/shipment-ops/buildDispatchSheetModel.js'

vi.mock('../../src/services/salesContractLines.js', () => ({
  fetchSalesContractLineRows: vi.fn(async (orderId) => {
    if (orderId === 'S-1') {
      return [
        {
          title: 'L Koltuk',
          quantity: 1,
          configurationLines: [
            'Kumaş firması: Boss',
            'Gövde kumaşı: Antrasit',
            'Kırlentler: Boss Antrasit ×2',
            'Ayak rengi: Siyah',
            'Yön: Sağ köşe',
          ],
        },
      ]
    }
    return [{ title: 'Sehpa', quantity: 1, configurationLines: ['Ayak rengi: Altın'] }]
  }),
}))

/** @type {import('../../src/mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem[]} */
const agendaItems = [
  {
    id: '1',
    orderId: 'S-1',
    shipmentId: 'S-1',
    timeLabel: '09:00',
    hasScheduledTime: true,
    region: 'İzmit',
    hasRegion: true,
    customer: 'Nihal Aydın',
    product: 'L Koltuk',
    vehicleLabel: 'Araç 1',
    hasVehicle: true,
    crewLabel: 'Muhammet · Cihan',
    hasCrew: true,
    planNote: 'Asansör küçük',
    statusLabel: 'Hazır',
    statusTone: 'ok',
    amount: 90000,
    remaining: 45000,
    riskLabel: 'Yüksek bakiye',
    dateIso: '2026-05-14',
    orderNumber: 'MO-2026-001',
  },
  {
    id: '2',
    orderId: 'S-2',
    shipmentId: 'S-2',
    timeLabel: '11:00',
    hasScheduledTime: true,
    region: 'Kartepe',
    hasRegion: true,
    customer: 'Ali Veli',
    product: 'Sehpa',
    vehicleLabel: 'Araç 2',
    hasVehicle: true,
    crewLabel: 'Ahmet',
    hasCrew: true,
    statusLabel: 'Hazır',
    statusTone: 'ok',
    amount: 12000,
    remaining: 0,
    riskLabel: 'Tahsilat tamam',
    dateIso: '2026-05-14',
    orderNumber: 'MO-2026-002',
  },
  {
    id: '3',
    orderId: 'S-3',
    shipmentId: 'S-3',
    timeLabel: '13:00',
    hasScheduledTime: true,
    region: 'İzmit',
    hasRegion: true,
    customer: 'Ayşe Yılmaz',
    product: 'Dolap',
    vehicleLabel: 'Araç 1',
    hasVehicle: true,
    crewLabel: 'Muhammet · Cihan',
    hasCrew: true,
    statusLabel: 'Hazır',
    statusTone: 'ok',
    amount: 50000,
    remaining: 10000,
    riskLabel: 'Normal',
    dateIso: '2026-05-14',
    orderNumber: 'MO-2026-003',
  },
]

const orders = [
  {
    id: 'S-1',
    customer: 'Nihal Aydın',
    phone: '0532 111 2233',
    amount: 90000,
    paidAmount: 45000,
    notes: 'Adres: İzmit Merkez Mah. No:5\nÖdeme notu: Teslimde kalan',
  },
  {
    id: 'S-2',
    customer: 'Ali Veli',
    phone: '0533 444 5566',
    amount: 12000,
    paidAmount: 12000,
    notes: 'Adres: Kartepe',
  },
  {
    id: 'S-3',
    customer: 'Ayşe Yılmaz',
    phone: '0535 777 8899',
    amount: 50000,
    paidAmount: 40000,
    notes: 'Adres: İzmit Yeni Mah.',
  },
]

describe('buildDispatchSheetModel v7', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Araç 1 için yalnızca o araca atanmış durakları getirir', async () => {
    const model = await buildDispatchSheetModel({
      vehicle: 'Araç 1',
      plannedDate: '2026-05-14',
      agendaItems,
      orders,
      listItemDtos: [],
      plansByOrderId: new Map(),
      preparedBy: 'Test Kullanıcı',
    })

    expect(model.stops).toHaveLength(2)
    expect(model.stops.map((s) => s.orderId)).toEqual(['S-1', 'S-3'])
    expect(model.header.vehicle).toBe('Araç 1')
    expect(model.header.totalCustomers).toBe(2)
  })

  it('ürün konfigürasyonu fiş satırına yansır', async () => {
    const model = await buildDispatchSheetModel({
      vehicle: 'Araç 1',
      plannedDate: '2026-05-14',
      agendaItems,
      orders,
      listItemDtos: [],
      plansByOrderId: new Map(),
    })

    const first = model.stops[0]
    expect(first.products[0].configurationLines).toContain('Kumaş firması: Boss')
    expect(first.products[0].configurationLines).toContain('Yön: Sağ köşe')
  })

  it('kalan ödeme doğru hesaplanır', async () => {
    const model = await buildDispatchSheetModel({
      vehicle: 'Araç 1',
      plannedDate: '2026-05-14',
      agendaItems,
      orders,
      listItemDtos: [],
      plansByOrderId: new Map(),
    })

    expect(model.stops[0].remainingPayment).toBe(45000)
    expect(model.header.totalCollectionDue).toBe(55000)
    expect(model.stops[0].phone).toBe('0532 111 2233')
    expect(model.stops[0].address).toContain('İzmit')
  })

  it('checklist maddeleri modele eklenir', async () => {
    const model = await buildDispatchSheetModel({
      vehicle: 'Araç 1',
      plannedDate: '2026-05-14',
      agendaItems,
      orders,
      listItemDtos: [],
      plansByOrderId: new Map(),
    })

    expect(model.checklist).toEqual(DISPATCH_SHEET_CHECKLIST)
    expect(model.checklist).toHaveLength(7)
  })

  it('filterAgendaItemsForVehicle saat sırasına göre sıralar', () => {
    const filtered = filterAgendaItemsForVehicle(agendaItems, 'Araç 1', '2026-05-14')
    expect(filtered.map((i) => i.orderId)).toEqual(['S-1', 'S-3'])
    expect(filtered[0].timeLabel).toBe('09:00')
  })
})

describe('dispatch sheet print isolation', () => {
  it('print CSS sınıfları tanımlı', () => {
    const cssPath = fileURLToPath(
      new URL('../../src/styles/shipment-dispatch-sheet-print.css', import.meta.url),
    )
    const css = readFileSync(cssPath, 'utf8')
    expect(css).toContain('.shipment-dispatch-sheet-print-area')
    expect(css).toContain('.shipment-dispatch-sheet-print-toolbar')
    expect(css).toContain('@media print')
  })
})

describe('dispatch sheet audit metadata', () => {
  it('dispatchSheetPrintedMetadata payload alanlarını içerir', async () => {
    const { dispatchSheetPrintedMetadata } = await import('../../src/lib/operationActor.js')
    const meta = dispatchSheetPrintedMetadata({
      vehicleName: 'Araç 1',
      plannedDate: '2026-05-14',
      orderIds: ['S-1', 'S-3'],
    })

    expect(meta.vehicleName).toBe('Araç 1')
    expect(meta.plannedDate).toBe('2026-05-14')
    expect(meta.orderIds).toEqual(['S-1', 'S-3'])
    expect(meta.printedBy).toBeTruthy()
    expect(meta.printedAt).toBeTruthy()
  })

  it('audit feed etiketi Türkçe', async () => {
    const { domainEventTypeLabelTr } = await import(
      '../../src/mappers/timeline/domainEventTypeLabelTr.js'
    )
    expect(domainEventTypeLabelTr('shipment.dispatch_sheet_printed')).toBe(
      'Araç çıkış fişi yazdırıldı',
    )
  })
})

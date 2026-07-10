import { describe, it, expect } from 'vitest'
import { normalizeShipmentRegion, KNOWN_SHIPMENT_REGIONS } from '../../src/mappers/shipment-ops/shipmentRegionNormalize.js'
import {
  groupShipmentOpportunities,
  scoreOpportunityOrder,
  toOpportunityCandidate,
} from '../../src/mappers/shipment-ops/shipmentOpportunityEngine.js'
import { buildShipmentOpsV3View } from '../../src/mappers/shipment-ops/shipmentOpsAgendaViewModel.js'

describe('shipmentRegionNormalize', () => {
  it('İzmit ve diğer bölgeleri yakalar', () => {
    expect(normalizeShipmentRegion('Adres: İzmit, Kocaeli').region).toBe('İzmit')
    expect(normalizeShipmentRegion('Adres: Gebze OSB').region).toBe('Gebze')
    expect(normalizeShipmentRegion('').region).toBe('Bölge Belirsiz')
  })

  it('bilinen bölge listesi dolu', () => {
    expect(KNOWN_SHIPMENT_REGIONS).toContain('İzmit')
  })
})

describe('shipmentOpportunityEngine', () => {
  it('aynı bölgede 2+ sipariş fırsat grubu üretir', () => {
    const today = '2026-05-14'
    const rows = [
      {
        id: 'S-1',
        customer: 'A',
        status: 'Hazır',
        shipmentDate: '2026-05-14',
        amount: 100000,
        paidAmount: 50000,
        product: 'Koltuk',
        notes: 'Adres: İzmit merkez',
      },
      {
        id: 'S-2',
        customer: 'B',
        status: 'Hazır',
        shipmentDate: '2026-05-15',
        amount: 80000,
        paidAmount: 20000,
        product: 'Dolap',
        notes: 'Teslim: İzmit',
      },
    ]

    const candidates = rows.map((r) => toOpportunityCandidate(r, today)).filter(Boolean)
    const groups = groupShipmentOpportunities(candidates, today)
    expect(groups.length).toBe(1)
    expect(groups[0].region).toBe('İzmit')
    expect(groups[0].orderCount).toBe(2)
    expect(groups[0].score).toBeGreaterThanOrEqual(60)
  })

  it('skor kuralları', () => {
    const score = scoreOpportunityOrder(
      {
        orderId: 'S-1',
        customer: 'A',
        region: 'İzmit',
        regionKnown: true,
        shipDate: '2026-05-14',
        status: 'Hazır',
        amount: 100000,
        remaining: 10000,
        product: 'X',
        shippable: true,
      },
      '2026-05-14',
    )
    expect(score).toBeGreaterThanOrEqual(80)
  })
})

describe('buildShipmentOpsV3View', () => {
  it('bugün horizon ile agenda filtreler', () => {
    const planToday = {
      orderId: 'S-1',
      plannedDate: '2026-05-14',
      updatedAt: new Date().toISOString(),
    }
    const planTomorrow = {
      orderId: 'S-2',
      plannedDate: '2026-05-15',
      updatedAt: new Date().toISOString(),
    }

    const view = buildShipmentOpsV3View({
      shipmentRows: [
        {
          id: 'S-1',
          customer: 'Bugün',
          status: 'Hazır',
          shipmentDate: '2026-05-14',
          amount: 1000,
          product: 'Ürün',
        },
        {
          id: 'S-2',
          customer: 'Yarın',
          status: 'Hazır',
          shipmentDate: '2026-05-15',
          amount: 2000,
          product: 'Ürün',
        },
      ],
      orders: [],
      listItemDtos: [],
      todayIso: '2026-05-14',
      selectedDate: '2026-05-14',
      agendaHorizon: 'today',
      plansByOrderId: new Map([
        [planToday.orderId, planToday],
        [planTomorrow.orderId, planTomorrow],
      ]),
    })
    expect(view.agendaItems).toHaveLength(1)
    expect(view.agendaItems[0].customer).toBe('Bugün')
    expect(view.kpis.some((k) => k.id === 'savings')).toBe(true)
  })

  it('tümü horizon ile gelecek tarihli planları listeler', () => {
    const plan = {
      orderId: 'S-FUTURE',
      plannedDate: '2026-06-28',
      region: 'İzmit',
      vehicle: 'Araç 1',
      crew1: 'Muhammet',
      crew2: '',
      updatedAt: new Date().toISOString(),
    }

    const view = buildShipmentOpsV3View({
      shipmentRows: [
        {
          id: 'S-FUTURE',
          customer: 'GELECEK MÜŞTERİ',
          status: 'Hazır',
          amount: 50000,
          product: 'Koltuk',
        },
      ],
      orders: [],
      listItemDtos: [],
      todayIso: '2026-06-13',
      selectedDate: '2026-06-13',
      agendaHorizon: 'all',
      plansByOrderId: new Map([[plan.orderId, plan]]),
    })

    expect(view.agendaItems).toHaveLength(1)
    expect(view.agendaItems[0].dateIso).toBe('2026-06-28')
    expect(view.horizonCounts.all).toBe(1)
    expect(view.horizonCounts.future).toBe(1)
    expect(view.horizonCounts.today).toBe(0)
  })
})

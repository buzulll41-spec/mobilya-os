import { describe, it, expect } from 'vitest'
import {
  buildRegionShipmentMap,
  estimateRegionalSavings,
  groupShipmentOpportunities,
  computeWeeklySavingsPotential,
  toOpportunityCandidate,
} from '../../src/mappers/shipment-ops/shipmentOpportunityEngine.js'
import {
  buildDailyVehiclePlan,
  computeVehicleOccupancyPercent,
  pickLeastLoadedVehicle,
} from '../../src/mappers/shipment-ops/shipmentVehiclePlanModel.js'
import { normalizeShipmentRegion } from '../../src/mappers/shipment-ops/shipmentRegionNormalize.js'
import { buildShipmentOpsV3View } from '../../src/mappers/shipment-ops/shipmentOpsAgendaViewModel.js'
import { TRIP_SAVINGS_TRY } from '../../src/mappers/shipment-ops/shipmentPlanConstants.js'

describe('shipmentOpportunityEngine v5', () => {
  it('aynı bölge tespiti ve tasarruf hesabı', () => {
    expect(estimateRegionalSavings(3)).toBe(2 * TRIP_SAVINGS_TRY)
    expect(estimateRegionalSavings(4)).toBe(3 * TRIP_SAVINGS_TRY)

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
        notes: 'Adres: Kartepe',
      },
      {
        id: 'S-2',
        customer: 'B',
        status: 'Hazır',
        shipmentDate: '2026-05-15',
        amount: 80000,
        paidAmount: 20000,
        product: 'Dolap',
        notes: 'Teslim: Kartepe',
      },
      {
        id: 'S-3',
        customer: 'C',
        status: 'Hazır',
        shipmentDate: '2026-05-14',
        amount: 60000,
        paidAmount: 10000,
        product: 'Masa',
        notes: 'Kartepe mah.',
      },
    ]

    const candidates = rows.map((r) => toOpportunityCandidate(r, today)).filter(Boolean)
    const groups = groupShipmentOpportunities(candidates, today)
    expect(groups).toHaveLength(1)
    expect(groups[0].region).toBe('Kartepe')
    expect(groups[0].orderCount).toBe(3)
    expect(groups[0].estimatedSavings).toBe(2400)
    expect(groups[0].vehiclesNeeded).toBe(1)
  })

  it('bölge haritası özetler', () => {
    const candidates = [
      {
        orderId: 'S-1',
        customer: 'A',
        region: 'İzmit',
        regionKnown: true,
        shipDate: '2026-05-14',
        status: 'Hazır',
        amount: 1000,
        remaining: 100,
        product: 'X',
        shippable: true,
      },
      {
        orderId: 'S-2',
        customer: 'B',
        region: 'İzmit',
        regionKnown: true,
        shipDate: '2026-05-14',
        status: 'Hazır',
        amount: 2000,
        remaining: 200,
        product: 'Y',
        shippable: true,
      },
    ]
    const map = buildRegionShipmentMap(candidates)
    expect(map[0].region).toBe('İzmit')
    expect(map[0].orderCount).toBe(2)
  })

  it('haftalık tasarruf KPI üretir', () => {
    const rows = [
      {
        id: 'S-1',
        customer: 'A',
        status: 'Hazır',
        shipmentDate: '2026-05-14',
        amount: 1000,
        notes: 'İzmit',
      },
      {
        id: 'S-2',
        customer: 'B',
        status: 'Hazır',
        shipmentDate: '2026-05-14',
        amount: 2000,
        notes: 'İzmit merkez',
      },
    ]
    const total = computeWeeklySavingsPotential(rows, '2026-05-14')
    expect(total).toBeGreaterThan(0)
  })
})

describe('shipmentVehiclePlanModel v5', () => {
  it('araç doluluk hesabı', () => {
    expect(computeVehicleOccupancyPercent(0)).toBe(0)
    expect(computeVehicleOccupancyPercent(2)).toBe(50)
    expect(computeVehicleOccupancyPercent(4)).toBe(100)
  })

  it('günlük araç planı agenda itemlarından oluşur', () => {
    const columns = buildDailyVehiclePlan([
      {
        id: '1',
        orderId: 'S-1',
        shipmentId: 'S-1',
        timeLabel: '09:00',
        hasScheduledTime: true,
        region: 'İzmit',
        hasRegion: true,
        customer: 'Nihal Aydın',
        product: '2 ürün',
        vehicleLabel: 'Araç 1',
        hasVehicle: true,
        crewLabel: 'Muhammet',
        hasCrew: true,
        statusLabel: 'Planlandı',
        statusTone: 'neutral',
        amount: 90000,
        remaining: 90000,
        riskLabel: 'Normal',
        dateIso: '2026-05-14',
        orderNumber: 'S-1',
      },
    ])

    expect(columns[0].stops).toHaveLength(1)
    expect(columns[0].occupancyPercent).toBe(25)
    expect(columns[0].lowOccupancy).toBe(true)
  })

  it('en az yüklü aracı seçer', () => {
    const vehicle = pickLeastLoadedVehicle(
      [
        { orderId: 'S-1', plannedDate: '2026-05-14', plannedTime: '09:00', vehicle: 'Araç 1', region: '', crew1: '', crew2: '', note: '', updatedAt: '' },
        { orderId: 'S-2', plannedDate: '2026-05-14', plannedTime: '11:00', vehicle: 'Araç 1', region: '', crew1: '', crew2: '', note: '', updatedAt: '' },
        { orderId: 'S-3', plannedDate: '2026-05-14', plannedTime: '09:00', vehicle: 'Araç 2', region: '', crew1: '', crew2: '', note: '', updatedAt: '' },
      ],
      '2026-05-14',
    )
    expect(vehicle).toBe('Araç 3')
  })
})

describe('normalizeShipmentRegion v5', () => {
  it('Kocaeli bölgelerini yakalar, eksik adres Belirsiz', () => {
    expect(normalizeShipmentRegion('Adres: Başiskele').region).toBe('Başiskele')
    expect(normalizeShipmentRegion('').region).toBe('Bölge Belirsiz')
    expect(normalizeShipmentRegion('Adres: Bilinmeyen Mahalle').region).toBe('Bölge Belirsiz')
  })
})

describe('buildShipmentOpsV3View v5 KPI', () => {
  it('Sevk tasarrufu KPI içerir', () => {
    const view = buildShipmentOpsV3View({
      shipmentRows: [],
      orders: [],
      listItemDtos: [],
      todayIso: '2026-05-14',
      selectedDate: '2026-05-14',
    })
    expect(view.kpis.some((k) => k.id === 'savings')).toBe(true)
    expect(view.vehiclePlan).toHaveLength(4)
  })
})

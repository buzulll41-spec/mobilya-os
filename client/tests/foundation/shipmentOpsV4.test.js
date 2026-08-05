import { describe, it, expect } from 'vitest'
import {
  detectPlanConflicts,
  parseTimeToMinutes,
} from '../../src/mappers/shipment-ops/shipmentPlanConflict.js'
import { formatCrewLabel } from '../../src/state/shipmentPlanStore.js'
import { buildShipmentOpsV3View } from '../../src/mappers/shipment-ops/shipmentOpsAgendaViewModel.js'

describe('shipmentPlanConflict', () => {
  it('aynı araç 2 saat içinde çakışma uyarısı verir', () => {
    const warnings = detectPlanConflicts(
      {
        orderId: 'S-1',
        plannedDate: '2026-05-14',
        plannedTime: '09:30',
        region: 'İzmit',
        vehicle: 'Araç 1',
        crew1: 'Muhammet',
        crew2: '',
        note: '',
        updatedAt: '',
      },
      [
        {
          orderId: 'S-2',
          plannedDate: '2026-05-14',
          plannedTime: '10:30',
          region: 'İzmit',
          vehicle: 'Araç 1',
          crew1: 'Cihan',
          crew2: '',
          note: '',
          updatedAt: '',
        },
      ],
    )
    expect(warnings.vehicleWarnings.length).toBe(1)
    expect(warnings.vehicleWarnings[0]).toContain('Araç 1')
  })

  it('aynı ekip 2 saat içinde çakışma uyarısı verir', () => {
    const warnings = detectPlanConflicts(
      {
        orderId: 'S-1',
        plannedDate: '2026-05-14',
        plannedTime: '09:00',
        region: 'İzmit',
        vehicle: 'Araç 1',
        crew1: 'Muhammet',
        crew2: '',
        note: '',
        updatedAt: '',
      },
      [
        {
          orderId: 'S-2',
          plannedDate: '2026-05-14',
          plannedTime: '10:30',
          region: 'Gebze',
          vehicle: 'Araç 2',
          crew1: 'Muhammet',
          crew2: '',
          note: '',
          updatedAt: '',
        },
      ],
    )
    expect(warnings.crewWarnings.length).toBe(1)
    expect(warnings.crewWarnings[0]).toContain('Muhammet')
  })

  it('3 saatten uzak çakışma yok', () => {
    const warnings = detectPlanConflicts(
      {
        orderId: 'S-1',
        plannedDate: '2026-05-14',
        plannedTime: '09:00',
        region: 'İzmit',
        vehicle: 'Araç 1',
        crew1: 'Muhammet',
        crew2: '',
        note: '',
        updatedAt: '',
      },
      [
        {
          orderId: 'S-2',
          plannedDate: '2026-05-14',
          plannedTime: '12:30',
          region: 'İzmit',
          vehicle: 'Araç 1',
          crew1: 'Muhammet',
          crew2: '',
          note: '',
          updatedAt: '',
        },
      ],
    )
    expect(warnings.vehicleWarnings.length).toBe(0)
    expect(warnings.crewWarnings.length).toBe(0)
  })
})

describe('buildShipmentOpsV3View plan merge', () => {
  it('plan bilgisi agenda kartına yansır', () => {
    const plan = {
      orderId: 'S-PLAN-1',
      plannedDate: '2026-05-14',
      plannedTime: '09:30',
      region: 'İzmit',
      vehicle: 'Araç 1',
      crew1: 'Muhammet',
      crew2: 'Cihan',
      note: 'müşteri öğleden sonra evde',
      updatedAt: new Date().toISOString(),
    }

    expect(formatCrewLabel(plan.crew1, plan.crew2)).toBe('Muhammet + Cihan')

    const view = buildShipmentOpsV3View({
      shipmentRows: [
        {
          id: 'S-PLAN-1',
          customer: 'NİHAL AYDIN',
          status: 'Hazır',
          shipmentDate: '2026-05-14',
          amount: 90000,
          product: '2 ürün',
        },
      ],
      orders: [],
      listItemDtos: [],
      todayIso: '2026-05-14',
      selectedDate: '2026-05-14',
      agendaHorizon: 'today',
      plansByOrderId: new Map([[plan.orderId, plan]]),
    })

    expect(view.agendaItems).toHaveLength(1)
    expect(view.agendaItems[0].timeLabel).toBe('09:30')
    expect(view.agendaItems[0].vehicleLabel).toBe('Araç 1')
    expect(view.agendaItems[0].crewLabel).toBe('Muhammet + Cihan')
    expect(view.agendaItems[0].planNote).toContain('öğleden sonra')
  })
})

describe('parseTimeToMinutes', () => {
  it('09:30 -> 570', () => {
    expect(parseTimeToMinutes('09:30')).toBe(570)
  })
})

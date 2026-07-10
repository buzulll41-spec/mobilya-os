import { describe, it, expect } from 'vitest'
import {
  buildGoogleMapsHref,
  buildPhoneDialHref,
  buildShipmentStopDetailModel,
  resolveCrewMembers,
} from '../../src/mappers/shipment-ops/buildShipmentStopDetailModel.js'

/** @type {import('../../src/mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} */
const baseItem = {
  id: 'S-1-2026-05-14',
  orderId: 'S-1',
  shipmentId: 'S-1',
  timeLabel: '09:30',
  hasScheduledTime: true,
  region: 'Kartepe',
  hasRegion: true,
  customer: 'Nihal Aydın',
  product: 'L Koltuk',
  vehicleLabel: 'Araç 2',
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
}

describe('buildShipmentStopDetailModel v2', () => {
  it('araç, telefon, adres, saat ve kalan ödeme gösterir', () => {
    const model = buildShipmentStopDetailModel({
      item: baseItem,
      order: {
        id: 'S-1',
        customer: 'Nihal Aydın',
        phone: '0532 111 2233',
        amount: 90000,
        paidAmount: 45000,
        notes: 'Adres: Kartepe Merkez Mah. No:5\nMontaj notu: 3+1 kurulum, duvar sabitleme',
      },
      plan: {
        orderId: 'S-1',
        plannedDate: '2026-05-14',
        plannedTime: '09:30',
        region: 'Kartepe',
        vehicle: 'Araç 2',
        crew1: 'Muhammet',
        crew2: 'Cihan',
        note: 'Asansör küçük',
        updatedAt: '2026-05-14T09:00:00.000Z',
      },
    })

    expect(model.vehicle).toBe('Araç 2')
    expect(model.phone).toBe('0532 111 2233')
    expect(model.address).toContain('Kartepe')
    expect(model.plannedTime).toBe('09:30')
    expect(model.remainingPayment).toBe(45000)
    expect(model.installationNote).toContain('3+1 kurulum')
    expect(model.crewMembers).toEqual(['Muhammet', 'Cihan'])
  })

  it('Google Maps ve arama linkleri üretir', () => {
    expect(buildGoogleMapsHref('Kartepe Merkez Mah.')).toContain('google.com/maps/search')
    expect(buildPhoneDialHref('0532 111 2233')).toBe('tel:+905321112233')
  })

  it('ekip plan yoksa agenda crewLabel parse eder', () => {
    const members = resolveCrewMembers(undefined, baseItem)
    expect(members).toEqual(['Muhammet', 'Cihan'])
  })
})

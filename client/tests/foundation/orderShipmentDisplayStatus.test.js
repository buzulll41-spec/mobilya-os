import { describe, expect, it } from 'vitest'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'
import { SHIPMENT_PLAN_STATUS } from '../../src/constants/shipmentPlanStatuses.js'
import {
  ORDER_SHIPMENT_DISPLAY,
  resolveShipmentAwareDisplayStatus,
} from '../../src/lib/orderShipmentDisplayStatus.js'

describe('order shipment display status', () => {
  it('sevk planı — Sevk Planlandı', () => {
    const status = resolveShipmentAwareDisplayStatus(
      'Sevke Hazır',
      [],
      { status: SHIPMENT_PLAN_STATUS.PLANNED },
    )
    expect(status).toBe(ORDER_SHIPMENT_DISPLAY.SHIPMENT_PLANNED)
  })

  it('yola çıktı — Yola Çıktı', () => {
    const status = resolveShipmentAwareDisplayStatus(
      'Sevke Hazır',
      [{ status: SHIPMENT_OPERATION_STATUS.DISPATCHED, plannedShipDate: '2026-05-14' }],
      { status: SHIPMENT_PLAN_STATUS.IN_TRANSIT },
    )
    expect(status).toBe(ORDER_SHIPMENT_DISPLAY.DISPATCHED)
  })

  it('teslim onayı — Teslim Onayı Bekliyor', () => {
    const status = resolveShipmentAwareDisplayStatus(
      'Sevke Hazır',
      [{ status: SHIPMENT_OPERATION_STATUS.DISPATCHED }],
      { status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM },
    )
    expect(status).toBe(ORDER_SHIPMENT_DISPLAY.PENDING_DELIVERY_CONFIRM)
  })

  it('teslim edildi — Teslim Edildi', () => {
    const status = resolveShipmentAwareDisplayStatus(
      'Sevke Hazır',
      [{ status: SHIPMENT_OPERATION_STATUS.DELIVERED }],
      { status: SHIPMENT_PLAN_STATUS.DELIVERED },
    )
    expect(status).toBe(ORDER_SHIPMENT_DISPLAY.DELIVERED)
  })
})

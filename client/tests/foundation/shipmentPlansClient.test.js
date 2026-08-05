import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mapClientPlanToApiBody,
  mapShipmentPlanDtoToClient,
} from '../../src/mappers/shipment-ops/mapShipmentPlanDto.js'

vi.mock('../../src/config/dataSource.js', () => ({
  getApiBaseUrl: vi.fn(() => ''),
}))

describe('mapShipmentPlanDto', () => {
  it('API DTO client plana map eder', () => {
    const plan = mapShipmentPlanDtoToClient({
      id: 'plan-1',
      salesOrderId: 'S-1',
      plannedDate: '2026-05-20',
      plannedTime: '09:30',
      region: 'İzmit',
      vehicleName: 'Araç 1',
      crewPrimary: 'Muhammet',
      crewSecondary: 'Cihan',
      note: 'Test',
      updatedAt: '2026-05-20T10:00:00.000Z',
    })
    expect(plan?.orderId).toBe('S-1')
    expect(plan?.vehicle).toBe('Araç 1')
    expect(mapClientPlanToApiBody(plan).salesOrderId).toBe('S-1')
  })
})

import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { computeHotSalesPulse } from '../../src/mappers/dashboard/computeHotSalesPulse.js'
import { getAllPaymentsSnapshot } from '../../src/services/mockPaymentStore.js'

describe('hot sales pulse (SSH)', () => {
  it('bugünkü sipariş sayısı ve yoğunluk üretir', () => {
    const pulse = computeHotSalesPulse(
      initialOrders,
      getAllPaymentsSnapshot(),
      DEMO_TODAY,
      new Date(`${DEMO_TODAY}T14:00:00`),
    )
    expect(pulse.todayOrderCount).toBeGreaterThanOrEqual(0)
    expect(pulse.densityPercent).toBeGreaterThanOrEqual(8)
    expect(pulse.densityPercent).toBeLessThanOrEqual(100)
    expect(['calm', 'busy', 'peak']).toContain(pulse.densityTone)
    expect(pulse.lastHourSalesLabel).toMatch(/₺/)
  })
})

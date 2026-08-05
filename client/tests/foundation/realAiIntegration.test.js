import { describe, expect, it } from 'vitest'
import { canUseRealAiWorkers, isRealAiWorkersEnabled } from '../../src/config/aiWorkerConfig.js'
import { buildRuleBaselineForWorker } from '../../src/services/aiWorkerRunner.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../src/contracts/v1/aiSalesFollowUp.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiCollectionSpecialist.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiShipmentSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../../src/contracts/v1/aiProcurementSpecialist.js'

describe('realAiIntegration config', () => {
  it('feature flag helpers export edilir', () => {
    expect(typeof isRealAiWorkersEnabled).toBe('function')
    expect(typeof canUseRealAiWorkers).toBe('function')
  })
})

describe('realAiIntegration rule baseline', () => {
  it('4 worker için Business Engine baseline üretir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const orderId = orders[0]?.id
    expect(orderId).toBeTruthy()

    for (const workerId of [
      AI_SALES_FOLLOW_UP_WORKER_ID,
      AI_COLLECTION_SPECIALIST_WORKER_ID,
      AI_SHIPMENT_SPECIALIST_WORKER_ID,
      AI_PROCUREMENT_SPECIALIST_WORKER_ID,
    ]) {
      const baseline = buildRuleBaselineForWorker(workerId, orderId, orders, dtos, DEMO_TODAY)
      expect(baseline?.orderId).toBe(orderId)
      expect(baseline?.businessSnapshot).toBeTruthy()
    }
  })
})

describe('realAiIntegration architecture contracts', () => {
  it('aiWorkerRunner contract dosyası mevcut', async () => {
    const mod = await import('../../src/contracts/v1/aiWorkerRunner.js')
    expect(mod).toBeTruthy()
  })
})

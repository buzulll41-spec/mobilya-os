import { describe, expect, it } from 'vitest'
import {
  buildCompanyPredictionsFromOrderPreds,
  buildCustomerPredictionsFromOrders,
  computeOrderPrediction,
  type OrderPredictionInput,
} from '../src/services/prediction/PredictionEngine.js'

function sampleInput(overrides: Partial<OrderPredictionInput> = {}): OrderPredictionInput {
  return {
    id: 'S-TEST-1',
    customerName: 'Ayşe Yılmaz',
    customerPhone: '555',
    displayStatus: 'Üretimde',
    remainingAmount: 12000,
    totalAmount: 20000,
    amountPaid: 8000,
    hasOverdueBalance: true,
    shipmentDate: '2026-07-07',
    dueDate: '2026-07-10',
    riskScores: {
      collection: 72,
      shipment: 65,
      supply: 58,
      ssh: 20,
      operations: 45,
    },
    supplyWaiting: true,
    supplyPartial: false,
    terminOverdue: false,
    computedAt: '2026-07-06',
    ...overrides,
  }
}

describe('Prediction Engine (FAZ 104)', () => {
  describe('Prediction Engine', () => {
    it('order prediction üretir', () => {
      const pred = computeOrderPrediction(sampleInput())
      expect(pred.orderId).toBe('S-TEST-1')
      expect(pred.predictionScore).toBeGreaterThan(0)
    })
  })

  describe('Probability', () => {
    it('olasılık alanları 0-100', () => {
      const pred = computeOrderPrediction(sampleInput())
      expect(pred.delayProbability).toBeLessThanOrEqual(100)
      expect(pred.paymentRiskProbability).toBeLessThanOrEqual(100)
      expect(pred.cancelProbability).toBeLessThanOrEqual(100)
      expect(pred.supplierDelayProbability).toBeLessThanOrEqual(100)
      expect(pred.stockRiskProbability).toBeLessThanOrEqual(100)
    })
  })

  describe('Performance', () => {
    it('1000 order prediction < 100ms', () => {
      const inputs = Array.from({ length: 1000 }, (_, i) =>
        sampleInput({ id: `O${i}`, customerName: `C${i}` }),
      )
      const started = Date.now()
      for (const input of inputs) computeOrderPrediction(input)
      expect(Date.now() - started).toBeLessThan(100)
    })
  })

  describe('Order Prediction', () => {
    it('yüksek risk girdisi yüksek skor üretir', () => {
      const low = computeOrderPrediction(sampleInput({ hasOverdueBalance: false, supplyWaiting: false }))
      const high = computeOrderPrediction(
        sampleInput({ hasOverdueBalance: true, supplyWaiting: true, terminOverdue: true }),
      )
      expect(high.predictionScore).toBeGreaterThan(low.predictionScore)
    })
  })

  describe('Customer Prediction', () => {
    it('müşteri agregasyonu', () => {
      const inputs = [sampleInput(), sampleInput({ id: 'S-TEST-2' })]
      const preds = inputs.map((input) => computeOrderPrediction(input))
      const customers = buildCustomerPredictionsFromOrders(inputs, preds, '2026-07-06')
      expect(customers).toHaveLength(1)
      expect(customers[0].orderCount).toBe(2)
    })
  })

  describe('Company Prediction', () => {
    it('şirket paketi', () => {
      const inputs = [sampleInput()]
      const preds = inputs.map((input) => computeOrderPrediction(input))
      const customers = buildCustomerPredictionsFromOrders(inputs, preds, '2026-07-06')
      const company = buildCompanyPredictionsFromOrderPreds(inputs, preds, customers, '2026-07-06')
      expect(company.meta.orderCount).toBe(1)
      expect(company.riskyOrders.length).toBeGreaterThan(0)
    })
  })
})

/** FAZ 104 — Prediction Engine V1 contracts. */

export type OrderPredictionProbabilities = {
  delayProbability: number
  paymentRiskProbability: number
  cancelProbability: number
  supplierDelayProbability: number
  stockRiskProbability: number
}

export type OrderPredictionDto = OrderPredictionProbabilities & {
  orderId: string
  predictionScore: number
  customerScore: number
  factors: string[]
  computedAt: string
}

export type CustomerPredictionDto = {
  customerId: string
  customerName: string
  customerScore: number
  orderCount: number
  avgDelayProbability: number
  avgPaymentRiskProbability: number
  avgCancelProbability: number
  predictionScore: number
  riskyOrderIds: string[]
  computedAt: string
}

export type CompanyPredictionDto = {
  riskyOrders: OrderPredictionDto[]
  tomorrowDelayOrders: OrderPredictionDto[]
  riskyCustomers: CustomerPredictionDto[]
  weekCollectionRisk: OrderPredictionDto[]
  aggregates: {
    avgDelay: number
    avgPaymentRisk: number
    avgCancel: number
    avgSupplierDelay: number
    avgStockRisk: number
  }
  meta: {
    orderCount: number
    customerCount: number
    durationMs: number
  }
}

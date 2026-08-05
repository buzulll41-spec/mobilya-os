/** FAZ 104 — Prediction Engine V1 contracts. */

/**
 * @typedef {Object} OrderPredictionProbabilities
 * @property {number} delayProbability 0-100
 * @property {number} paymentRiskProbability 0-100
 * @property {number} cancelProbability 0-100
 * @property {number} supplierDelayProbability 0-100
 * @property {number} stockRiskProbability 0-100
 */

/**
 * @typedef {OrderPredictionProbabilities & {
 *   orderId: string
 *   predictionScore: number
 *   customerScore: number
 *   factors: string[]
 *   computedAt: string
 * }} OrderPredictionDto
 */

/**
 * @typedef {Object} CustomerPredictionDto
 * @property {string} customerId
 * @property {string} customerName
 * @property {number} customerScore 0-100 (yüksek = iyi)
 * @property {number} orderCount
 * @property {number} avgDelayProbability
 * @property {number} avgPaymentRiskProbability
 * @property {number} avgCancelProbability
 * @property {number} predictionScore
 * @property {string[]} riskyOrderIds
 * @property {string} computedAt
 */

/**
 * @typedef {Object} CompanyPredictionDto
 * @property {OrderPredictionDto[]} riskyOrders
 * @property {OrderPredictionDto[]} tomorrowDelayOrders
 * @property {CustomerPredictionDto[]} riskyCustomers
 * @property {OrderPredictionDto[]} weekCollectionRisk
 * @property {{ avgDelay: number, avgPaymentRisk: number, avgCancel: number, avgSupplierDelay: number, avgStockRisk: number }} aggregates
 * @property {{ orderCount: number, customerCount: number, durationMs: number }} meta
 */

export const PREDICTION_QUERY = {
  RISKY_ORDERS_TODAY: 'risky_orders_today',
  TOMORROW_DELAY: 'tomorrow_delay',
  RISKY_CUSTOMERS: 'risky_customers',
  WEEK_COLLECTION_RISK: 'week_collection_risk',
}

export {}

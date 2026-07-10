import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import { fetchCompanyPredictions } from '../../services/predictionClient.js'

/**
 * @param {string} intent
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
export async function buildPredictionCopilotReply(intent, message, runtimeCtx) {
  const company = await fetchCompanyPredictions(runtimeCtx)

  if (intent === CEO_COPILOT_INTENT.PREDICTION_RISKY_ORDERS) {
    const orders = company.riskyOrders.slice(0, 8)
    if (!orders.length) {
      return 'Prediction Engine: Bugün riskli sipariş bulunamadı.'
    }
    return [
      'Prediction Engine · Bugün riskli siparişler',
      `${orders.length} / ${company.meta.orderCount} sipariş (skor ≥55)`,
      ...orders.map(
        (o) =>
          `• ${o.orderId} · skor ${o.predictionScore} · gecikme %${o.delayProbability} · tahsilat %${o.paymentRiskProbability}`,
      ),
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.PREDICTION_TOMORROW_DELAY) {
    const orders = company.tomorrowDelayOrders.slice(0, 8)
    if (!orders.length) {
      return 'Prediction Engine: Yarın gecikme riski taşıyan sipariş bulunamadı.'
    }
    return [
      'Prediction Engine · Yarın gecikme riski',
      `${orders.length} sipariş`,
      ...orders.map((o) => `• ${o.orderId} · gecikme ihtimali %${o.delayProbability}`),
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.PREDICTION_RISKY_CUSTOMERS) {
    const customers = company.riskyCustomers.slice(0, 8)
    if (!customers.length) {
      return 'Prediction Engine: En riskli müşteri listesi boş.'
    }
    return [
      'Prediction Engine · En riskli müşteriler',
      `${customers.length} müşteri`,
      ...customers.map(
        (c) =>
          `• ${c.customerName} · skor ${c.customerScore} · tahsilat riski %${c.avgPaymentRiskProbability}`,
      ),
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.PREDICTION_WEEK_COLLECTION) {
    const orders = company.weekCollectionRisk.slice(0, 8)
    if (!orders.length) {
      return 'Prediction Engine: Bu hafta tahsilat riski taşıyan sipariş bulunamadı.'
    }
    return [
      'Prediction Engine · Bu hafta tahsilat riski',
      `${orders.length} sipariş`,
      ...orders.map((o) => `• ${o.orderId} · tahsilat riski %${o.paymentRiskProbability}`),
    ].join('\n')
  }

  void message
  return null
}

export {}

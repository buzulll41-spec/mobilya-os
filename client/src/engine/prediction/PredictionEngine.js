import { GRAPH_EDGE_TYPE, GRAPH_NODE_TYPE } from '../../contracts/v1/knowledgeGraph.js'
import { computeOrderBusinessSnapshot } from '../businessEngine.js'
import { summarizeLineSupply } from '../../mappers/operation-map/operationMapModel.js'
import { moneyToNumber } from '../../mappers/moneyHelpers.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'
import { customerNodeId } from '../graph/KnowledgeGraphEngine.js'

/** @typedef {import('../../contracts/v1/prediction.js').OrderPredictionDto} OrderPredictionDto */
/** @typedef {import('../../contracts/v1/prediction.js').CustomerPredictionDto} CustomerPredictionDto */
/** @typedef {import('../../contracts/v1/prediction.js').CompanyPredictionDto} CompanyPredictionDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../graph/KnowledgeGraphEngine.js').KnowledgeGraphEngine} KnowledgeGraphEngine */

const clampProb = (n) => Math.min(100, Math.max(0, Math.round(n)))

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
function depositRatio(order, dto) {
  const total = dto ? moneyToNumber(dto.totalAmount) : order.totalAmount ?? order.amount ?? 0
  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  return total > 0 ? paid / total : 0
}

/**
 * @param {KnowledgeGraphEngine | null | undefined} graph
 * @param {string} orderId
 */
function graphSignalsForOrder(graph, orderId) {
  if (!graph?.getNode(orderId)) {
    return { hasRisk: false, riskCount: 0, paymentCount: 0, shipmentReady: false }
  }
  const risks = graph
    .getNeighbors(orderId, { direction: 'both' })
    .filter((n) => n.type === GRAPH_NODE_TYPE.RISK)
  const payments = graph.getNeighbors(orderId, { edgeTypes: [GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT] })
  const shipments = graph.getNeighbors(orderId, { edgeTypes: [GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT] })
  const shipmentReady = shipments.some((s) => Boolean(s.properties?.ready))
  return {
    hasRisk: risks.length > 0,
    riskCount: risks.length,
    paymentCount: payments.length,
    shipmentReady,
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {number} ratio
 * @param {import('../../contracts/v1/businessEngine.js').OrderBusinessSnapshot} snap
 * @param {ReturnType<typeof graphSignalsForOrder>} graphCtx
 * @param {string} todayIso
 */
function buildOrderPrediction(order, dto, ratio, snap, graphCtx, todayIso) {
  const risks = snap.riskScores
  const summary = summarizeLineSupply(order.id)
  /** @type {string[]} */
  const factors = []

  let delayProbability = risks.shipment * 0.65 + risks.supply * 0.25 + risks.operations * 0.1
  if (isTerminOverdue(order, todayIso)) {
    delayProbability += 22
    factors.push('Termin geçti')
  }
  if (order.shipmentDate === todayIso) {
    delayProbability += 12
    factors.push('Bugün sevk planı')
  }
  if (graphCtx.hasRisk) {
    delayProbability += 8 + graphCtx.riskCount * 4
    factors.push('Graph risk bağlantısı')
  }

  let paymentRiskProbability = risks.collection
  if (ratio < 0.25) {
    paymentRiskProbability += 18
    factors.push('Düşük kapora')
  }
  if (dto?.hasOverdueBalance) {
    paymentRiskProbability += 22
    factors.push('Gecikmiş bakiye')
  }
  if (graphCtx.shipmentReady) {
    const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
    if (remaining > 0.009) {
      paymentRiskProbability += 15
      factors.push('Sevk hazır · tahsilat açık')
    }
  }

  let cancelProbability = order.status === 'İptal' ? 100 : 12
  if (ratio < 0.1 && (order.status === 'Yeni' || order.status === 'Üretimde')) {
    cancelProbability += 35
    factors.push('Düşük ön ödeme · erken aşama')
  }
  if (risks.operations >= 70) {
    cancelProbability += 20
    factors.push('Operasyon riski yüksek')
  }

  let supplierDelayProbability = risks.supply
  if (summary?.anyWaiting) {
    supplierDelayProbability += 28
    factors.push('Tedarik bekliyor')
  } else if (summary?.anyPartial) {
    supplierDelayProbability += 16
    factors.push('Kısmi tedarik')
  }

  let stockRiskProbability = 12
  if (summary?.anyWaiting) {
    stockRiskProbability = 58
    factors.push('Stok/ürün bekliyor')
  } else if (summary?.anyPartial) {
    stockRiskProbability = 42
  }
  if (risks.ssh >= 45) {
    stockRiskProbability += 18
    factors.push('SSH eksik kalemi')
  }

  const probabilities = {
    delayProbability: clampProb(delayProbability),
    paymentRiskProbability: clampProb(paymentRiskProbability),
    cancelProbability: clampProb(cancelProbability),
    supplierDelayProbability: clampProb(supplierDelayProbability),
    stockRiskProbability: clampProb(stockRiskProbability),
  }

  const predictionScore = clampProb(
    Math.max(
      probabilities.delayProbability,
      probabilities.paymentRiskProbability,
      probabilities.cancelProbability,
      probabilities.supplierDelayProbability,
      probabilities.stockRiskProbability,
    ),
  )

  return {
    orderId: order.id,
    ...probabilities,
    predictionScore,
    customerScore: computeInlineCustomerScore(order, dto, ratio),
    factors: factors.slice(0, 6),
    computedAt: todayIso,
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {number} ratio
 */
function computeInlineCustomerScore(order, dto, ratio) {
  let score = 72
  if (ratio >= 0.5) score += 10
  else if (ratio < 0.2) score -= 18
  if (dto?.hasOverdueBalance) score -= 22
  if (order.status === 'Teslim Edildi' && ratio >= 0.8) score += 8
  if (order.status === 'İptal') score -= 40
  return clampProb(score)
}

/**
 * @param {{
 *   orders: Order[]
 *   dtos: SalesOrderListItemDto[]
 *   todayIso: string
 *   graph?: KnowledgeGraphEngine | null
 * }} input
 */
export function buildOrderPredictions(input) {
  const { orders, dtos, todayIso, graph = null } = input
  const dtoById = new Map(dtos.map((d) => [d.id, d]))
  return orders
    .filter((o) => o.status !== 'İptal')
    .map((order) => {
      const dto = dtoById.get(order.id)
      const snap = computeOrderBusinessSnapshot({ order, dto, todayIso })
      const ratio = depositRatio(order, dto)
      const graphCtx = graphSignalsForOrder(graph, order.id)
      return buildOrderPrediction(order, dto, ratio, snap, graphCtx, todayIso)
    })
}

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 * @param {OrderPredictionDto[]} predictions
 * @param {string} todayIso
 */
export function buildCustomerPredictions(orders, dtos, predictions, todayIso) {
  const dtoById = new Map(dtos.map((d) => [d.id, d]))
  const predById = new Map(predictions.map((p) => [p.orderId, p]))
  /** @type {Map<string, { name: string, phone: string, preds: OrderPredictionDto[] }>} */
  const groups = new Map()

  for (const order of orders.filter((o) => o.status !== 'İptal')) {
    const key = customerNodeId(order.customer, order.phone)
    if (!groups.has(key)) {
      groups.set(key, { name: order.customer, phone: order.phone ?? '', preds: [] })
    }
    const pred = predById.get(order.id)
    if (pred) groups.get(key).preds.push(pred)
    void dtoById.get(order.id)
  }

  /** @type {CustomerPredictionDto[]} */
  const result = []
  for (const [customerId, group] of groups.entries()) {
    const preds = group.preds
    if (!preds.length) continue
    const avg = (field) =>
      clampProb(preds.reduce((sum, p) => sum + p[field], 0) / preds.length)
    const customerScore = clampProb(
      preds.reduce((sum, p) => sum + p.customerScore, 0) / preds.length,
    )
    const riskyOrderIds = preds.filter((p) => p.predictionScore >= 55).map((p) => p.orderId)
    const predictionScore = clampProb(Math.max(...preds.map((p) => p.predictionScore)))

    result.push({
      customerId,
      customerName: group.name,
      customerScore,
      orderCount: preds.length,
      avgDelayProbability: avg('delayProbability'),
      avgPaymentRiskProbability: avg('paymentRiskProbability'),
      avgCancelProbability: avg('cancelProbability'),
      predictionScore,
      riskyOrderIds,
      computedAt: todayIso,
    })
  }

  return result.sort((a, b) => a.customerScore - b.customerScore)
}

/**
 * @param {string} iso
 */
function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * @param {{
 *   orders: Order[]
 *   dtos: SalesOrderListItemDto[]
 *   todayIso: string
 *   graph?: KnowledgeGraphEngine | null
 * }} input
 */
export function buildCompanyPredictions(input) {
  const started = Date.now()
  const { orders, dtos, todayIso, graph = null } = input
  const orderPredictions = buildOrderPredictions({ orders, dtos, todayIso, graph })
  const customerPredictions = buildCustomerPredictions(orders, dtos, orderPredictions, todayIso)
  const tomorrowIso = addDaysIso(todayIso, 1)
  const weekEndIso = addDaysIso(todayIso, 7)
  const dtoById = new Map(dtos.map((d) => [d.id, d]))

  const riskyOrders = [...orderPredictions]
    .filter((p) => p.predictionScore >= 55)
    .sort((a, b) => b.predictionScore - a.predictionScore)

  const tomorrowDelayOrders = orderPredictions.filter((p) => {
    const order = orders.find((o) => o.id === p.orderId)
    const dto = dtoById.get(p.orderId)
    const shipmentDate = order?.shipmentDate ?? dto?.plannedShipmentDate ?? null
    return p.delayProbability >= 45 || shipmentDate === tomorrowIso || shipmentDate === todayIso
  })

  const riskyCustomers = customerPredictions
    .filter((c) => c.customerScore < 55 || c.avgPaymentRiskProbability >= 50)
    .slice(0, 12)

  const weekCollectionRisk = orderPredictions.filter((p) => {
    if (p.paymentRiskProbability < 40) return false
    const order = orders.find((o) => o.id === p.orderId)
    const due = order?.dueDate
    return Boolean(due && due >= todayIso && due <= weekEndIso)
  })

  const avg = (field) => {
    if (!orderPredictions.length) return 0
    return clampProb(
      orderPredictions.reduce((sum, p) => sum + p[field], 0) / orderPredictions.length,
    )
  }

  return {
    riskyOrders,
    tomorrowDelayOrders,
    riskyCustomers,
    weekCollectionRisk,
    aggregates: {
      avgDelay: avg('delayProbability'),
      avgPaymentRisk: avg('paymentRiskProbability'),
      avgCancel: avg('cancelProbability'),
      avgSupplierDelay: avg('supplierDelayProbability'),
      avgStockRisk: avg('stockRiskProbability'),
    },
    meta: {
      orderCount: orderPredictions.length,
      customerCount: customerPredictions.length,
      durationMs: Date.now() - started,
    },
  }
}

/**
 * @param {OrderPredictionDto} prediction
 * @param {'collection' | 'shipment' | 'procurement' | 'sales'} workerKind
 */
export function predictionScoreForWorker(prediction, workerKind) {
  if (!prediction) return 0
  if (workerKind === 'collection') return prediction.paymentRiskProbability
  if (workerKind === 'shipment') return prediction.delayProbability
  if (workerKind === 'procurement') return prediction.supplierDelayProbability
  return prediction.cancelProbability
}

/**
 * @param {number} baseScore
 * @param {number} predictionScore
 * @param {number} [weight=0.25]
 */
export function blendWorkerScoreWithPrediction(baseScore, predictionScore, weight = 0.25) {
  return clampProb(baseScore * (1 - weight) + predictionScore * weight)
}

export {}

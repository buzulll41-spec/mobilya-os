import type {
  OrderPredictionDto,
  CustomerPredictionDto,
  CompanyPredictionDto,
  OrderPredictionProbabilities,
} from '../../contracts/predictionDto.js'
import { GRAPH_EDGE_TYPE, GRAPH_NODE_TYPE } from '../../contracts/knowledgeGraphDto.js'
import type { KnowledgeGraphEngine } from '../graph/KnowledgeGraphEngine.js'
import { customerNodeId } from '../graph/KnowledgeGraphEngine.js'

const clampProb = (n: number) => Math.min(100, Math.max(0, Math.round(n)))

export type OrderPredictionInput = {
  id: string
  customerName: string
  customerPhone: string | null
  displayStatus: string
  remainingAmount: number
  totalAmount: number
  amountPaid: number
  hasOverdueBalance: boolean
  shipmentDate: string | null
  dueDate: string | null
  riskScores: {
    collection: number
    shipment: number
    supply: number
    ssh: number
    operations: number
  }
  supplyWaiting: boolean
  supplyPartial: boolean
  terminOverdue: boolean
  computedAt: string
}

function graphSignalsForOrder(graph: KnowledgeGraphEngine | null, orderId: string) {
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

export function computeOrderPrediction(
  input: OrderPredictionInput,
  graph: KnowledgeGraphEngine | null = null,
): OrderPredictionDto {
  const ratio = input.totalAmount > 0 ? input.amountPaid / input.totalAmount : 0
  const risks = input.riskScores
  const graphCtx = graphSignalsForOrder(graph, input.id)
  const factors: string[] = []

  let delayProbability = risks.shipment * 0.65 + risks.supply * 0.25 + risks.operations * 0.1
  if (input.terminOverdue) {
    delayProbability += 22
    factors.push('Termin geçti')
  }
  if (input.shipmentDate === input.computedAt) {
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
  if (input.hasOverdueBalance) {
    paymentRiskProbability += 22
    factors.push('Gecikmiş bakiye')
  }
  if (graphCtx.shipmentReady && input.remainingAmount > 0.009) {
    paymentRiskProbability += 15
    factors.push('Sevk hazır · tahsilat açık')
  }

  let cancelProbability = input.displayStatus === 'İptal' ? 100 : 12
  if (ratio < 0.1 && (input.displayStatus === 'Yeni' || input.displayStatus === 'Üretimde')) {
    cancelProbability += 35
    factors.push('Düşük ön ödeme · erken aşama')
  }
  if (risks.operations >= 70) {
    cancelProbability += 20
    factors.push('Operasyon riski yüksek')
  }

  let supplierDelayProbability = risks.supply
  if (input.supplyWaiting) {
    supplierDelayProbability += 28
    factors.push('Tedarik bekliyor')
  } else if (input.supplyPartial) {
    supplierDelayProbability += 16
    factors.push('Kısmi tedarik')
  }

  let stockRiskProbability = 12
  if (input.supplyWaiting) {
    stockRiskProbability = 58
    factors.push('Stok/ürün bekliyor')
  } else if (input.supplyPartial) {
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

  let customerScore = 72
  if (ratio >= 0.5) customerScore += 10
  else if (ratio < 0.2) customerScore -= 18
  if (input.hasOverdueBalance) customerScore -= 22
  if (input.displayStatus === 'Teslim Edildi' && ratio >= 0.8) customerScore += 8
  if (input.displayStatus === 'İptal') customerScore -= 40

  return {
    orderId: input.id,
    ...probabilities,
    predictionScore,
    customerScore: clampProb(customerScore),
    factors: factors.slice(0, 6),
    computedAt: input.computedAt,
  }
}

export function buildCustomerPredictionsFromOrders(
  orders: OrderPredictionInput[],
  predictions: OrderPredictionDto[],
  todayIso: string,
): CustomerPredictionDto[] {
  const predById = new Map(predictions.map((p) => [p.orderId, p]))
  const groups = new Map<string, { name: string; preds: OrderPredictionDto[] }>()

  for (const order of orders) {
    const key = customerNodeId(order.customerName, order.customerPhone)
    if (!groups.has(key)) groups.set(key, { name: order.customerName, preds: [] })
    const pred = predById.get(order.id)
    if (pred) groups.get(key)!.preds.push(pred)
  }

  const result: CustomerPredictionDto[] = []
  for (const [customerId, group] of groups.entries()) {
    const preds = group.preds
    if (!preds.length) continue
    const avg = (field: keyof OrderPredictionProbabilities) =>
      clampProb(preds.reduce((sum, p) => sum + p[field], 0) / preds.length)
    const customerScore = clampProb(
      preds.reduce((sum, p) => sum + p.customerScore, 0) / preds.length,
    )
    result.push({
      customerId,
      customerName: group.name,
      customerScore,
      orderCount: preds.length,
      avgDelayProbability: avg('delayProbability'),
      avgPaymentRiskProbability: avg('paymentRiskProbability'),
      avgCancelProbability: avg('cancelProbability'),
      predictionScore: clampProb(Math.max(...preds.map((p) => p.predictionScore))),
      riskyOrderIds: preds.filter((p) => p.predictionScore >= 55).map((p) => p.orderId),
      computedAt: todayIso,
    })
  }
  return result.sort((a, b) => a.customerScore - b.customerScore)
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function buildCompanyPredictionsFromOrderPreds(
  orderInputs: OrderPredictionInput[],
  orderPredictions: OrderPredictionDto[],
  customerPredictions: CustomerPredictionDto[],
  todayIso: string,
): CompanyPredictionDto {
  const started = Date.now()
  const tomorrowIso = addDaysIso(todayIso, 1)
  const weekEndIso = addDaysIso(todayIso, 7)
  const inputById = new Map(orderInputs.map((o) => [o.id, o]))

  const riskyOrders = [...orderPredictions]
    .filter((p) => p.predictionScore >= 55)
    .sort((a, b) => b.predictionScore - a.predictionScore)

  const tomorrowDelayOrders = orderPredictions.filter((p) => {
    const input = inputById.get(p.orderId)
    return (
      p.delayProbability >= 45 ||
      input?.shipmentDate === tomorrowIso ||
      input?.shipmentDate === todayIso
    )
  })

  const riskyCustomers = customerPredictions
    .filter((c) => c.customerScore < 55 || c.avgPaymentRiskProbability >= 50)
    .slice(0, 12)

  const weekCollectionRisk = orderPredictions.filter((p) => {
    if (p.paymentRiskProbability < 40) return false
    const due = inputById.get(p.orderId)?.dueDate
    return Boolean(due && due >= todayIso && due <= weekEndIso)
  })

  const avg = (field: keyof OrderPredictionProbabilities) => {
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

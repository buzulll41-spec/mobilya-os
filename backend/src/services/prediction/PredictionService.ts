import type { PrismaClient } from '@prisma/client'
import type {
  CompanyPredictionDto,
  CustomerPredictionDto,
  OrderPredictionDto,
} from '../../contracts/predictionDto.js'
import { buildKnowledgeGraph } from '../graph/KnowledgeGraphService.js'
import {
  buildCompanyPredictionsFromOrderPreds,
  buildCustomerPredictionsFromOrders,
  computeOrderPrediction,
  type OrderPredictionInput,
} from './PredictionEngine.js'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function computeRiskScores(order: {
  remainingAmount: { toString(): string }
  totalAmount: { toString(): string }
  amountPaid: { toString(): string }
  displayStatus: string
  dueDate: Date | null
}, lines: { shipmentReady: boolean }[], terminOverdue: boolean) {
  const remaining = Number(order.remainingAmount)
  const total = Number(order.totalAmount)
  const hasOverdue = Boolean(order.dueDate && order.dueDate < new Date() && remaining > 0.009)

  const collection =
    remaining <= 0.009
      ? 0
      : clamp((hasOverdue ? 70 : 35) + (remaining / Math.max(total, 1)) * 40 + (hasOverdue ? 20 : 0), 0, 100)

  const shipment = terminOverdue ? clamp(70, 0, 100) : lines.some((l) => l.shipmentReady) ? 25 : 15
  const supplyWaiting = lines.some((l) => !l.shipmentReady)
  const supply = supplyWaiting ? 65 : 20
  const ssh = 15
  let operations = 15
  if (terminOverdue) operations = 60

  return {
    collection: Math.round(collection),
    shipment: Math.round(shipment),
    supply: Math.round(supply),
    ssh: Math.round(ssh),
    operations: Math.round(operations),
  }
}

let cachedAt = 0
let cachedCompany: CompanyPredictionDto | null = null
/** @type {Map<string, OrderPredictionDto> | null} */
let cachedOrders: Map<string, OrderPredictionDto> | null = null
/** @type {Map<string, CustomerPredictionDto> | null} */
let cachedCustomers: Map<string, CustomerPredictionDto> | null = null
const CACHE_MS = 30_000

async function loadPredictionBundle(prisma: PrismaClient) {
  const now = Date.now()
  if (cachedCompany && cachedOrders && cachedCustomers && now - cachedAt < CACHE_MS) {
    return { company: cachedCompany, orders: cachedOrders, customers: cachedCustomers }
  }

  const today = todayIso()
  const graph = await buildKnowledgeGraph(prisma)
  const orders = await prisma.salesOrder.findMany({
    include: { lines: true, payments: true },
    where: { NOT: { displayStatus: 'İptal' } },
  })

  /** @type {OrderPredictionInput[]} */
  const inputs: OrderPredictionInput[] = []
  /** @type {OrderPredictionDto[]} */
  const predictions: OrderPredictionDto[] = []

  for (const order of orders) {
    const total = Number(order.totalAmount)
    const paid = Number(order.paidAmount)
    const remaining = Number(order.remainingAmount)
    const terminOverdue = Boolean(order.dueDate && order.dueDate < new Date() && remaining > 0.009)
    const supplyWaiting = order.lines.some((l) => !l.shipmentReady)
    const supplyPartial = order.lines.some((l) => l.shipmentReady) && supplyWaiting

    const input: OrderPredictionInput = {
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      displayStatus: order.displayStatus,
      remainingAmount: remaining,
      totalAmount: total,
      amountPaid: paid,
      hasOverdueBalance: terminOverdue,
      shipmentDate: order.shipmentDate?.toISOString().slice(0, 10) ?? null,
      dueDate: order.dueDate?.toISOString().slice(0, 10) ?? null,
      riskScores: computeRiskScores(
        {
          remainingAmount: order.remainingAmount,
          totalAmount: order.totalAmount,
          amountPaid: order.paidAmount,
          displayStatus: order.displayStatus,
          dueDate: order.dueDate,
        },
        order.lines,
        terminOverdue,
      ),
      supplyWaiting,
      supplyPartial,
      terminOverdue,
      computedAt: today,
    }
    inputs.push(input)
    predictions.push(computeOrderPrediction(input, graph))
  }

  const customers = buildCustomerPredictionsFromOrders(inputs, predictions, today)
  const company = buildCompanyPredictionsFromOrderPreds(inputs, predictions, customers, today)

  cachedOrders = new Map(predictions.map((p) => [p.orderId, p]))
  cachedCustomers = new Map(customers.map((c) => [c.customerId, c]))
  cachedCompany = company
  cachedAt = now

  return { company, orders: cachedOrders, customers: cachedCustomers }
}

export async function getOrderPrediction(prisma: PrismaClient, orderId: string): Promise<OrderPredictionDto | null> {
  const bundle = await loadPredictionBundle(prisma)
  return bundle.orders.get(orderId) ?? null
}

export async function getCustomerPrediction(
  prisma: PrismaClient,
  customerId: string,
): Promise<CustomerPredictionDto | null> {
  const bundle = await loadPredictionBundle(prisma)
  const decoded = decodeURIComponent(customerId)
  return bundle.customers.get(decoded) ?? null
}

export async function getCompanyPredictions(prisma: PrismaClient): Promise<CompanyPredictionDto> {
  const bundle = await loadPredictionBundle(prisma)
  return bundle.company
}

export function resetPredictionCacheForTests(): void {
  cachedAt = 0
  cachedCompany = null
  cachedOrders = null
  cachedCustomers = null
}

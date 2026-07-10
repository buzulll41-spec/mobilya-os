import type { PrismaClient } from '@prisma/client'
import type {
  CompanyDecisionSummaryDto,
  DecisionHistoryDto,
  DecisionQualityRecordDto,
  WorkerDecisionDetailDto,
} from '../../contracts/decisionQualityDto.js'
import { getLearningStatistics } from '../learning/LearningEngineService.js'
import { getOrderPrediction } from '../prediction/PredictionService.js'
import {
  computeDecisionConfidence,
  computeDecisionScore,
  scoreDecisionCriteria,
} from './DecisionQualityEngine.js'

const WORKER_LABELS: Record<string, string> = {
  'dw-collection': 'Collection AI',
  'dw-shipment': 'Shipment AI',
  'dw-sales-follow-up': 'Sales AI',
  'dw-procurement': 'Procurement AI',
  'dw-ceo-assistant': 'Company Manager',
}

/** @type {DecisionQualityRecordDto[]} */
let records: DecisionQualityRecordDto[] = []
let confidence = 70
let seeded = false
let seq = 0

function nextId() {
  seq += 1
  return `dq-${Date.now()}-${seq}`
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDaysIso(fromIso: string, days: number): string {
  const d = new Date(`${fromIso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function seedRecords(prisma: PrismaClient) {
  if (seeded) return
  const today = todayIso()
  const learning = await getLearningStatistics(prisma)
  const orders = await prisma.salesOrder.findMany({
    where: { NOT: { displayStatus: 'İptal' } },
    take: 24,
  })

  const workers = ['dw-collection', 'dw-shipment', 'dw-sales-follow-up', 'dw-procurement']
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const workerId = workers[i % workers.length]
    const prediction = await getOrderPrediction(prisma, order.id)
    const criteria = scoreDecisionCriteria(i % 5 === 0 ? 'RISK_REDUCED' : 'CREATE_TASK', 'HIGH', {
      predictionAccuracy: learning.predictionAccuracy,
      learningScore: learning.learningScore,
      workerScore: prediction?.predictionScore,
    })
    const decisionScore = computeDecisionScore(criteria)
    const recordConfidence = computeDecisionConfidence(
      decisionScore,
      learning.confidence,
      learning.learningScore,
    )
    records.push({
      id: nextId(),
      source: i % 3 === 0 ? 'company_manager' : 'ai_worker',
      workerId: i % 4 === 0 ? 'dw-ceo-assistant' : workerId,
      decisionType: i % 5 === 0 ? 'RISK_REDUCED' : 'CREATE_TASK',
      orderId: order.id,
      message: i % 5 === 0 ? 'Risk seviyesi düştü' : `Görev · ${order.id}`,
      occurredAt: `${addDaysIso(today, -(i % 28))}T09:00:00.000Z`,
      criteria,
      decisionScore,
      confidence: recordConfidence,
    })
  }
  confidence = learning.confidence
  seeded = true
}

function aggregateByWorker(list: DecisionQualityRecordDto[]) {
  const map = new Map<string, { sum: number; conf: number; count: number }>()
  for (const r of list) {
    const cur = map.get(r.workerId) ?? { sum: 0, conf: 0, count: 0 }
    cur.sum += r.decisionScore
    cur.conf += r.confidence
    cur.count += 1
    map.set(r.workerId, cur)
  }
  return [...map.entries()].map(([workerId, v]) => ({
    workerId,
    workerLabel: WORKER_LABELS[workerId] ?? workerId,
    decisionCount: v.count,
    avgDecisionScore: Math.round(v.sum / v.count),
    avgConfidence: Math.round(v.conf / v.count),
  }))
}

export async function getCompanyDecisionQuality(prisma: PrismaClient): Promise<CompanyDecisionSummaryDto> {
  const started = Date.now()
  await seedRecords(prisma)
  const learning = await getLearningStatistics(prisma)

  if (!records.length) {
    return {
      totalDecisions: 0,
      avgDecisionScore: 0,
      avgConfidence: learning.confidence,
      avgPredictionAccuracy: learning.predictionAccuracy,
      avgLearningScore: learning.learningScore,
      topWorkers: [],
      lowQualityDecisions: [],
      riskReductionLeaders: [],
      meta: { last30DaysAvgScore: 0, last30DaysCount: 0, durationMs: Date.now() - started },
    }
  }

  const avg = (field: 'decisionScore' | 'confidence') =>
    Math.round(records.reduce((sum, r) => sum + r[field], 0) / records.length)
  const avgCriteria = (key: keyof DecisionQualityRecordDto['criteria']) =>
    Math.round(records.reduce((sum, r) => sum + r.criteria[key], 0) / records.length)

  const byWorker = aggregateByWorker(records)
  const cutoff = addDaysIso(todayIso(), 30)
  const last30 = records.filter((r) => r.occurredAt.slice(0, 10) >= cutoff)

  return {
    totalDecisions: records.length,
    avgDecisionScore: avg('decisionScore'),
    avgConfidence: avg('confidence'),
    avgPredictionAccuracy: avgCriteria('predictionAccuracy'),
    avgLearningScore: avgCriteria('learningScore'),
    topWorkers: [...byWorker].sort((a, b) => b.avgDecisionScore - a.avgDecisionScore).slice(0, 5),
    lowQualityDecisions: [...records]
      .sort((a, b) => a.decisionScore - b.decisionScore)
      .slice(0, 8)
      .map((r) => ({
        workerId: r.workerId,
        workerLabel: WORKER_LABELS[r.workerId] ?? r.workerId,
        decisionCount: 1,
        avgDecisionScore: r.decisionScore,
        avgConfidence: r.confidence,
        message: r.message,
        decisionType: r.decisionType,
      })),
    riskReductionLeaders: [...records]
      .sort((a, b) => b.criteria.riskReduction - a.criteria.riskReduction)
      .slice(0, 8),
    meta: {
      last30DaysAvgScore: last30.length
        ? Math.round(last30.reduce((s, r) => s + r.decisionScore, 0) / last30.length)
        : avg('decisionScore'),
      last30DaysCount: last30.length,
      durationMs: Date.now() - started,
    },
  }
}

export async function getWorkerDecisionQuality(
  prisma: PrismaClient,
  workerId: string,
): Promise<WorkerDecisionDetailDto | null> {
  await seedRecords(prisma)
  const workerRecords = records.filter((r) => r.workerId === workerId)
  if (!workerRecords.length) return null
  return {
    workerId,
    workerLabel: WORKER_LABELS[workerId] ?? workerId,
    decisionCount: workerRecords.length,
    avgDecisionScore: Math.round(
      workerRecords.reduce((s, r) => s + r.decisionScore, 0) / workerRecords.length,
    ),
    avgConfidence: Math.round(
      workerRecords.reduce((s, r) => s + r.confidence, 0) / workerRecords.length,
    ),
    recentRecords: workerRecords.slice(0, 15),
  }
}

export async function getDecisionQualityHistory(
  prisma: PrismaClient,
  limit = 50,
): Promise<DecisionHistoryDto> {
  await seedRecords(prisma)
  return { records: records.slice(0, limit) }
}

export function resetDecisionQualityStoreForTests(): void {
  records = []
  confidence = 70
  seeded = false
  seq = 0
}

export function getDecisionQualityConfidence(): number {
  return confidence
}

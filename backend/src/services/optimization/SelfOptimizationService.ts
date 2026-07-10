import type { PrismaClient } from '@prisma/client'
import type {
  CompanyOptimizationSummaryDto,
  OptimizationHistoryDto,
  OptimizationHistoryRecordDto,
  WorkerOptimizationProfileDto,
} from '../../contracts/selfOptimizationDto.js'
import { getLearningStatistics } from '../learning/LearningEngineService.js'
import { getCompanyDecisionQuality } from '../decision/DecisionQualityService.js'
import {
  applyOptimizationRules,
  computeOptimizationScore,
  createDefaultStrategy,
  strategiesEqual,
} from './SelfOptimizationEngine.js'

const WORKER_IDS = ['dw-collection', 'dw-shipment', 'dw-sales-follow-up', 'dw-procurement', 'dw-ceo-assistant']
const WORKER_LABELS: Record<string, string> = {
  'dw-collection': 'Collection AI',
  'dw-shipment': 'Shipment AI',
  'dw-sales-follow-up': 'Sales AI',
  'dw-procurement': 'Procurement AI',
  'dw-ceo-assistant': 'Company Manager',
}

const profiles = new Map<string, WorkerOptimizationProfileDto>()
let history: OptimizationHistoryRecordDto[] = []
const strategyChangeCounts = new Map<string, number>()
let seeded = false
let seq = 0

function nextId() {
  seq += 1
  return `opt-${Date.now()}-${seq}`
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

async function seedOptimization(prisma: PrismaClient) {
  if (seeded) return
  const learning = await getLearningStatistics(prisma)
  const decision = await getCompanyDecisionQuality(prisma)

  for (const workerId of WORKER_IDS) {
    const metrics = {
      predictionAccuracy: learning.predictionAccuracy,
      learningScore: learning.learningScore,
      decisionScore: decision.avgDecisionScore || 65,
      executionSuccess: 72,
      approvalRate: 68,
      riskReduction: 58,
    }
    const currentStrategy = createDefaultStrategy(`${WORKER_LABELS[workerId]} v1`)
    const { strategy: nextStrategy, reasons } = applyOptimizationRules(currentStrategy, metrics)
    const optimizationScore = computeOptimizationScore(metrics, nextStrategy)
    let strategyVersion = 1
    let previousStrategy: WorkerOptimizationProfileDto['previousStrategy'] = null

    if (!strategiesEqual(currentStrategy, nextStrategy)) {
      previousStrategy = { ...currentStrategy }
      strategyVersion = 2
      strategyChangeCounts.set(workerId, 1)
      history.push({
        id: nextId(),
        workerId,
        strategyVersion,
        previousStrategy: currentStrategy,
        currentStrategy: nextStrategy,
        optimizationScore,
        reason: reasons.join(' · ') || 'Initial optimization',
        occurredAt: `${todayIso()}T09:00:00.000Z`,
      })
    }

    profiles.set(workerId, {
      workerId,
      workerLabel: WORKER_LABELS[workerId],
      optimizationScore,
      strategyVersion,
      currentStrategy: nextStrategy,
      previousStrategy,
      lastOptimizedAt: todayIso(),
      scoreDelta: optimizationScore - 60,
    })
  }
  seeded = true
}

export async function getCompanyOptimization(prisma: PrismaClient): Promise<CompanyOptimizationSummaryDto> {
  const started = Date.now()
  await seedOptimization(prisma)
  const workers = [...profiles.values()]
  const avgOptimizationScore = workers.length
    ? Math.round(workers.reduce((s, w) => s + w.optimizationScore, 0) / workers.length)
    : 0
  const mostImproved = [...workers].sort((a, b) => (b.scoreDelta ?? 0) - (a.scoreDelta ?? 0))[0]
  const mostChanges = [...workers].sort(
    (a, b) => (strategyChangeCounts.get(b.workerId) ?? 0) - (strategyChangeCounts.get(a.workerId) ?? 0),
  )[0]

  return {
    workers,
    recentHistory: history.slice(0, 20),
    avgOptimizationScore,
    mostImprovedWorkerId: mostImproved?.workerId ?? WORKER_IDS[0],
    mostStrategyChangesWorkerId: mostChanges?.workerId ?? WORKER_IDS[0],
    meta: { durationMs: Date.now() - started },
  }
}

export async function getWorkerOptimization(
  prisma: PrismaClient,
  workerId: string,
): Promise<WorkerOptimizationProfileDto | null> {
  await seedOptimization(prisma)
  return profiles.get(workerId) ?? null
}

export async function getOptimizationHistory(prisma: PrismaClient, limit = 50): Promise<OptimizationHistoryDto> {
  await seedOptimization(prisma)
  return { records: history.slice(0, limit) }
}

export function resetSelfOptimizationStoreForTests(): void {
  profiles.clear()
  history = []
  strategyChangeCounts.clear()
  seeded = false
  seq = 0
}

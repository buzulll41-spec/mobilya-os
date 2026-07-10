/** FAZ 107 — Self Optimization Engine contracts. */

export type WorkerStrategyDto = {
  label: string
  predictionWeight: number
  humanApprovalRequired: boolean
  aggressiveness: number
  confidenceMultiplier: number
}

export type WorkerOptimizationProfileDto = {
  workerId: string
  workerLabel: string
  optimizationScore: number
  strategyVersion: number
  currentStrategy: WorkerStrategyDto
  previousStrategy: WorkerStrategyDto | null
  lastOptimizedAt: string
  scoreDelta?: number
}

export type OptimizationMetricsDto = {
  predictionAccuracy: number
  learningScore: number
  decisionScore: number
  executionSuccess: number
  approvalRate: number
  riskReduction: number
}

export type OptimizationHistoryRecordDto = {
  id: string
  workerId: string
  strategyVersion: number
  previousStrategy: WorkerStrategyDto
  currentStrategy: WorkerStrategyDto
  optimizationScore: number
  reason: string
  occurredAt: string
}

export type CompanyOptimizationSummaryDto = {
  workers: WorkerOptimizationProfileDto[]
  recentHistory: OptimizationHistoryRecordDto[]
  avgOptimizationScore: number
  mostImprovedWorkerId: string
  mostStrategyChangesWorkerId: string
  meta: { durationMs: number }
}

export type OptimizationHistoryDto = {
  records: OptimizationHistoryRecordDto[]
}

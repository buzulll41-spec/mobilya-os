/** FAZ 106 — Decision Quality Engine contracts. */

export const DECISION_QUALITY_SOURCE = {
  COMPANY_MANAGER: 'company_manager',
  AI_WORKER: 'ai_worker',
} as const

export type DecisionQualitySource =
  (typeof DECISION_QUALITY_SOURCE)[keyof typeof DECISION_QUALITY_SOURCE]

export type DecisionCriteriaScores = {
  predictionAccuracy: number
  learningScore: number
  executionSuccess: number
  approvalRate: number
  userFeedback: number
  businessImpact: number
  timeSaved: number
  riskReduction: number
}

export type DecisionQualityRecordDto = {
  id: string
  source: DecisionQualitySource
  workerId: string
  decisionType: string
  orderId?: string
  message: string
  occurredAt: string
  criteria: DecisionCriteriaScores
  decisionScore: number
  confidence: number
}

export type WorkerDecisionSummaryDto = {
  workerId: string
  workerLabel: string
  decisionCount: number
  avgDecisionScore: number
  avgConfidence: number
  message?: string
  decisionType?: string
}

export type CompanyDecisionSummaryDto = {
  totalDecisions: number
  avgDecisionScore: number
  avgConfidence: number
  avgPredictionAccuracy: number
  avgLearningScore: number
  topWorkers: WorkerDecisionSummaryDto[]
  lowQualityDecisions: WorkerDecisionSummaryDto[]
  riskReductionLeaders: DecisionQualityRecordDto[]
  meta: {
    last30DaysAvgScore: number
    last30DaysCount: number
    durationMs: number
  }
}

export type DecisionHistoryDto = {
  records: DecisionQualityRecordDto[]
}

export type WorkerDecisionDetailDto = WorkerDecisionSummaryDto & {
  recentRecords: DecisionQualityRecordDto[]
}

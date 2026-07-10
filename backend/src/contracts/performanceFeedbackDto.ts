/**
 * Otonom Performans Takip Motoru (Faz 26) — karar sonuç ölçümü.
 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.
 */

import type { PrimaryDecision } from './businessBrainDto.js'

export type StrategyPerformanceDto = {
  strategy: PrimaryDecision
  executionCount: number
  successRate: number
  avgImpact: number
}

export type ImpactAnalysisDto = {
  collectionImpact: number
  profitImpact: number
  riskImpact: number
  shipmentImpact: number
  operationsImpact: number
  summary: string
}

export type StrategyLessonDto = {
  strategy: PrimaryDecision
  lesson: string
  successRate: number
}

export type PerformanceFeedbackResponseDto = {
  feedbackScore: number
  activeStrategy: PrimaryDecision
  strategyPerformance: StrategyPerformanceDto[]
  successfulStrategies: StrategyPerformanceDto[]
  failedStrategies: StrategyPerformanceDto[]
  impactAnalysis: ImpactAnalysisDto
  lessonsLearned: StrategyLessonDto[]
  recommendation: string
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; sources: string[] }
}

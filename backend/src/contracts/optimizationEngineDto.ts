/**
 * Otonom Optimizasyon Motoru (Faz 28) — öğrenme → optimizasyon.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { AgentCode } from './operationsAgentDto.js'

export type OptimizationStrategy =
  | 'COLLECTION_FIRST'
  | 'AGGRESSIVE_GROWTH'
  | 'CONTROLLED_GROWTH'
  | 'DEFENSIVE_MODE'
  | 'COST_REDUCTION'
  | 'SUPPLIER_RESTRUCTURE'
  | 'DATA_QUALITY_FIRST'
  | 'BALANCED_MODE'

export type OptimizationDecision =
  | 'BOOST_COLLECTION_STRATEGY'
  | 'BOOST_SHIPMENT_STRATEGY'
  | 'BOOST_SALES_STRATEGY'
  | 'BOOST_DATA_QUALITY'
  | 'BOOST_SUPPLIER_STRATEGY'
  | 'BALANCED_MODE'
  | 'NO_CHANGE'

export type StrategyOptimizationDto = {
  strategy: OptimizationStrategy
  currentWeight: number
  recommendedWeight: number
  successRate: number
  reason: string
}

export type AgentOptimizationDto = {
  agent: AgentCode
  currentWeight: number
  recommendedWeight: number
  successRate: number
  impactScore: number
  reason: string
}

export type ChangeTargetType = 'STRATEGY' | 'AGENT' | 'ACTION_CATEGORY' | 'AUTOMATION_QUEUE'

export type RecommendedChangeDto = {
  id: string
  targetType: ChangeTargetType
  target: string
  currentValue: string
  recommendedValue: string
  impact: number
  reason: string
  priority: 'P1' | 'P2' | 'P3'
}

export type OptimizationEngineResponseDto = {
  optimizationScore: number
  optimizationDecision: OptimizationDecision
  strategyOptimizations: StrategyOptimizationDto[]
  agentOptimizations: AgentOptimizationDto[]
  recommendedChanges: RecommendedChangeDto[]
  managementBriefing: string[]
  today: string
  generatedAt: string
  applyStatus: 'PENDING' | 'APPLIED'
  lastAppliedAt: string | null
  meta: { depoKatiExcluded: true; virtualOnly: true }
}

export type OptimizationApplyResponseDto = {
  status: 'APPLIED'
  appliedChanges: number
  runAt: string
  meta: { depoKatiExcluded: true; virtualOnly: true }
}

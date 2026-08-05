/**

 * Kurumsal Öğrenme Motoru (Faz 27) — karar → aksiyon → ölçüm → öğrenme.

 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.

 */



import type { AgentCode } from './operationsAgentDto.js'



export type LearningStrategy =

  | 'COLLECTION_FIRST'

  | 'AGGRESSIVE_GROWTH'

  | 'CONTROLLED_GROWTH'

  | 'COST_REDUCTION'

  | 'CASH_PROTECTION'

  | 'SUPPLIER_FOCUS'



export type TrendDirection = 'UP' | 'DOWN' | 'FLAT'



export type StrategySummaryDto = {

  strategy: LearningStrategy

  successRate: number

  usageCount: number

  impactScore: number

  overallScore: number

}



export type StrategyTableRowDto = {

  strategy: LearningStrategy

  usageCount: number

  successRate: number

  impactScore: number

  overallScore: number

}



export type AgentLearningRowDto = {

  agent: AgentCode

  taskCount: number

  successRate: number

  impactScore: number

}



export type DecisionTrendWindowDto = {

  score: number

  trend: TrendDirection

}



export type DecisionTrendDto = {

  days30: DecisionTrendWindowDto

  days90: DecisionTrendWindowDto

  days180: DecisionTrendWindowDto

}



export type LessonLearnedDto = {

  id: string

  category: string

  lesson: string

  confidence: number

}



export type LearningRecommendationDto = {

  id: string

  priority: 'P1' | 'P2' | 'P3'

  title: string

  rationale: string

}



export type LearningEngineResponseDto = {

  learningScore: number

  bestStrategy: StrategySummaryDto

  worstStrategy: StrategySummaryDto

  strategyTable: StrategyTableRowDto[]

  agentLearning: AgentLearningRowDto[]

  decisionTrend: DecisionTrendDto

  lessonsLearned: LessonLearnedDto[]

  recommendations: LearningRecommendationDto[]

  summary: string

  today: string

  generatedAt: string

  meta: { depoKatiExcluded: true; virtualOnly: true }

}



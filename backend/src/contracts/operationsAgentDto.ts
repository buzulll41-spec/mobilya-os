/**
 * Otonom Operasyon Ajanları (Faz 13) — deterministik kural tabanlı ajanlar.
 * Depo Katı satış kaynağı olarak hiçbir ajan çıktısında görünmez.
 */

export type AgentCode =
  | 'COLLECTION_AGENT'
  | 'SHIPMENT_AGENT'
  | 'DATA_QUALITY_AGENT'
  | 'SALES_AGENT'
  | 'SUPPLIER_AGENT'
  | 'EXECUTIVE_AGENT'

export type AgentStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR'

export type AgentPriorityLevel = 'P1' | 'P2' | 'P3'

export type OperationsAgentDto = {
  id: string
  agentCode: AgentCode
  agentName: string
  description: string
  status: AgentStatus
  priority: AgentPriorityLevel
  lastRunAt: string | null
  nextRunAt: string | null
  generatedCases: number
  generatedActions: number
  generatedJobs: number
}

export type AgentOutputItemDto = {
  id: string
  title: string
  reason: string
  recommendedAction: string
  priority: AgentPriorityLevel
  evidence?: Record<string, string | number | boolean | null>
}

export type OperationsAgentDetailDto = OperationsAgentDto & {
  summary: string
  outputs: AgentOutputItemDto[]
}

export type AgentRecommendationDto = {
  id: string
  agentCode: AgentCode
  title: string
  reason: string
  recommendedAction: string
  priority: AgentPriorityLevel
}

export type AgentPriorityItemDto = {
  id: string
  priority: AgentPriorityLevel
  title: string
  reason: string
  agentCode: AgentCode
  category: string
}

export type AgentDailyBriefingDto = {
  headline: string
  paragraphs: string[]
  whatToDoToday: string[]
  criticalIssues: AgentPriorityItemDto[]
}

export type OperationsAgentsSummaryDto = {
  totalAgents: number
  activeAgents: number
  p1Issues: number
  p2Issues: number
  p3Issues: number
  generatedCases: number
  generatedActions: number
  generatedJobs: number
}

export type OperationsAgentsResponseDto = {
  summary: OperationsAgentsSummaryDto
  agents: OperationsAgentDto[]
  briefing: AgentDailyBriefingDto
  recommendations: AgentRecommendationDto[]
  priorities: AgentPriorityItemDto[]
  generatedCases: number
  generatedActions: number
  generatedJobs: number
  today: string
  generatedAt: string
}

export type AgentRunResultDto = {
  agentCode: AgentCode
  ranAt: string
  nextRunAt: string
  outputs: AgentOutputItemDto[]
}

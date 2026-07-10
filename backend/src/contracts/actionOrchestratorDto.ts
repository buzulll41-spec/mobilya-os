/**
 * Otonom Aksiyon Orkestratörü (Faz 25) — Business Brain kararını operasyon katmanına dağıtır.
 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.
 */

import type { PrimaryDecision } from './businessBrainDto.js'
import type { ActionCategory } from './actionCenterDto.js'
import type { AgentCode } from './operationsAgentDto.js'
import type { AutomationJobType } from './automationJobDto.js'

export type OverrideTargetType = 'ACTION_CATEGORY' | 'CASE_CATEGORY' | 'JOB_TYPE' | 'AGENT'

export type PriorityOverrideDto = {
  target: string
  targetType: OverrideTargetType
  boost: number
  effectivePriority?: string
  reason: string
}

export type AffectedItemDto = {
  id: string
  name: string
  category: string
  originalPriority: string
  boostedPriority: string
  boost: number
}

export type OrchestratorRunStatus = 'PLANNED' | 'APPLIED'

export type ActionOrchestratorResponseDto = {
  orchestratorScore: number
  activeStrategy: PrimaryDecision
  brainScore: number
  affectedTasks: AffectedItemDto[]
  affectedCases: AffectedItemDto[]
  affectedJobs: AffectedItemDto[]
  affectedAgents: AffectedItemDto[]
  executionPlan: string[]
  priorityOverrides: PriorityOverrideDto[]
  lastRunAt: string | null
  runStatus: OrchestratorRunStatus
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; sources: string[] }
}

export type StrategyBoostMap = Partial<
  Record<ActionCategory | AgentCode | AutomationJobType | 'GROWTH' | 'INVESTMENT' | 'RISK', number>
>

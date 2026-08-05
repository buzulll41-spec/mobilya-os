/**
 * Otonom Operasyon Ajanları DTO'ları (backend `operationsAgentDto.ts` ile eş).
 * Depo Katı satış kaynağı olarak hiçbir ajan çıktısında görünmez.
 *
 * @typedef {'COLLECTION_AGENT'|'SHIPMENT_AGENT'|'DATA_QUALITY_AGENT'|'SALES_AGENT'|'SUPPLIER_AGENT'|'EXECUTIVE_AGENT'} AgentCode
 * @typedef {'IDLE'|'RUNNING'|'COMPLETED'|'ERROR'} AgentStatus
 * @typedef {'P1'|'P2'|'P3'} AgentPriorityLevel
 *
 * @typedef {Object} OperationsAgentDto
 * @property {string} id
 * @property {AgentCode} agentCode
 * @property {string} agentName
 * @property {string} description
 * @property {AgentStatus} status
 * @property {AgentPriorityLevel} priority
 * @property {string|null} lastRunAt
 * @property {string|null} nextRunAt
 * @property {number} generatedCases
 * @property {number} generatedActions
 * @property {number} generatedJobs
 *
 * @typedef {Object} AgentOutputItemDto
 * @property {string} id
 * @property {string} title
 * @property {string} reason
 * @property {string} recommendedAction
 * @property {AgentPriorityLevel} priority
 * @property {Record<string, string|number|boolean|null>} [evidence]
 *
 * @typedef {OperationsAgentDto & { summary: string, outputs: AgentOutputItemDto[] }} OperationsAgentDetailDto
 *
 * @typedef {Object} AgentRecommendationDto
 * @property {string} id
 * @property {AgentCode} agentCode
 * @property {string} title
 * @property {string} reason
 * @property {string} recommendedAction
 * @property {AgentPriorityLevel} priority
 *
 * @typedef {Object} AgentPriorityItemDto
 * @property {string} id
 * @property {AgentPriorityLevel} priority
 * @property {string} title
 * @property {string} reason
 * @property {AgentCode} agentCode
 * @property {string} category
 *
 * @typedef {Object} AgentDailyBriefingDto
 * @property {string} headline
 * @property {string[]} paragraphs
 * @property {string[]} whatToDoToday
 * @property {AgentPriorityItemDto[]} criticalIssues
 *
 * @typedef {Object} OperationsAgentsSummaryDto
 * @property {number} totalAgents
 * @property {number} activeAgents
 * @property {number} p1Issues
 * @property {number} p2Issues
 * @property {number} p3Issues
 * @property {number} generatedCases
 * @property {number} generatedActions
 * @property {number} generatedJobs
 *
 * @typedef {Object} OperationsAgentsResponseDto
 * @property {OperationsAgentsSummaryDto} summary
 * @property {OperationsAgentDto[]} agents
 * @property {AgentDailyBriefingDto} briefing
 * @property {AgentRecommendationDto[]} recommendations
 * @property {AgentPriorityItemDto[]} priorities
 * @property {number} generatedCases
 * @property {number} generatedActions
 * @property {number} generatedJobs
 * @property {string} today
 * @property {string} generatedAt
 */

export const AGENT_CODES = [
  'COLLECTION_AGENT',
  'SHIPMENT_AGENT',
  'DATA_QUALITY_AGENT',
  'SALES_AGENT',
  'SUPPLIER_AGENT',
  'EXECUTIVE_AGENT',
]

export const AGENT_LABELS = {
  COLLECTION_AGENT: 'Tahsilat Ajanı',
  SHIPMENT_AGENT: 'Sevk Ajanı',
  DATA_QUALITY_AGENT: 'Veri Kalitesi Ajanı',
  SALES_AGENT: 'Satış Ajanı',
  SUPPLIER_AGENT: 'Tedarikçi Ajanı',
  EXECUTIVE_AGENT: 'Yönetici Ajanı',
}

export {}

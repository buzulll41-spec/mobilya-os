/**
 * AI Operasyon Direktörü DTO'ları (backend `executiveDirectorDto.ts` ile eş).
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 *
 * @typedef {'P1'|'P2'|'P3'} DirectorPriorityLevel
 * @typedef {'CRITICAL'|'WARNING'|'INFO'} DirectorRiskSeverity
 *
 * @typedef {Object} ExecutiveDirectorSummaryDto
 * @property {number} managerScore
 * @property {string} managerScoreBand
 * @property {number} p1Count
 * @property {number} p2Count
 * @property {number} p3Count
 * @property {number} riskCount
 * @property {number} recommendedActionCount
 * @property {number} planSectionCount
 * @property {string|null} lastRunAt
 *
 * @typedef {Object} DailyPlanItemDto
 * @property {string} id
 * @property {string} title
 * @property {string} detail
 * @property {DirectorPriorityLevel} priority
 * @property {string} [metric]
 *
 * @typedef {Object} DailyPlanSectionDto
 * @property {string} id
 * @property {string} category
 * @property {string} categoryLabel
 * @property {DailyPlanItemDto[]} items
 *
 * @typedef {Object} PriorityQueueItemDto
 * @property {string} id
 * @property {DirectorPriorityLevel} priority
 * @property {string} title
 * @property {string} reason
 * @property {string} sourceModule
 * @property {string} category
 *
 * @typedef {Object} ImpactMetricDto
 * @property {string} label
 * @property {string|number} before
 * @property {string|number} after
 * @property {string} delta
 * @property {'UP'|'DOWN'|'NEUTRAL'} direction
 *
 * @typedef {Object} ImpactAnalysisItemDto
 * @property {string} id
 * @property {string} actionTitle
 * @property {string} actionDescription
 * @property {ImpactMetricDto[]} metrics
 *
 * @typedef {Object} RiskMapItemDto
 * @property {string} id
 * @property {string} riskTitle
 * @property {DirectorRiskSeverity} severity
 * @property {string} impact
 * @property {string} suggestedAction
 *
 * @typedef {Object} ExecutiveAgendaSlotDto
 * @property {string} timeRange
 * @property {string} focus
 * @property {string} description
 *
 * @typedef {Object} ExecutiveBriefingDto
 * @property {string} headline
 * @property {string[]} criticalTopics
 * @property {string[]} todayPlan
 * @property {string[]} risks
 * @property {string[]} recommendedActions
 *
 * @typedef {Object} RecommendedActionDto
 * @property {string} id
 * @property {string} title
 * @property {string} reason
 * @property {DirectorPriorityLevel} priority
 * @property {string} [deepLinkPage]
 *
 * @typedef {Object} ExecutiveDirectorResponseDto
 * @property {ExecutiveDirectorSummaryDto} summary
 * @property {DailyPlanSectionDto[]} dailyPlan
 * @property {PriorityQueueItemDto[]} priorityQueue
 * @property {ImpactAnalysisItemDto[]} impactAnalysis
 * @property {RiskMapItemDto[]} riskMap
 * @property {ExecutiveBriefingDto} executiveBriefing
 * @property {ExecutiveAgendaSlotDto[]} executiveAgenda
 * @property {RecommendedActionDto[]} recommendedActions
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: true }} meta
 */

export {}

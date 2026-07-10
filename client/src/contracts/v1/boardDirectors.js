/**

 * Otonom Yönetim Kurulu DTO'ları (backend `boardDirectorsDto.ts` ile eş).

 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.

 *

 * @typedef {'FINANCE_DIRECTOR'|'OPERATIONS_DIRECTOR'|'SALES_DIRECTOR'|'SUPPLIER_DIRECTOR'|'RISK_DIRECTOR'|'EXECUTIVE_DIRECTOR'} DirectorCode

 * @typedef {'DELAY_NEW_STORE'|'OPEN_NEW_STORE'|'FOCUS_COLLECTION'|'IMPROVE_OPERATIONS_FIRST'|'EXPAND_GROWTH'|'SUPPLIER_OPTIMIZATION'|'REDUCE_RISK_FIRST'} DirectorVote

 * @typedef {'OPEN_NEW_STORE'|'DELAY_NEW_STORE'|'FOCUS_COLLECTION'|'FOCUS_OPERATIONS'|'FOCUS_PROFITABILITY'|'FOCUS_RISK_REDUCTION'} BoardDecision

 *

 * @typedef {Object} BoardDirectorsSummaryDto

 * @property {number} directorCount

 * @property {number} boardScore

 * @property {string} boardScoreBand

 * @property {BoardDecision} boardDecision

 * @property {number} companyHealthScore

 * @property {string} analysisMonth

 * @property {string} generatedAt

 *

 * @typedef {Object} DirectorVoteDto

 * @property {DirectorCode} code

 * @property {string} label

 * @property {DirectorVote} vote

 * @property {string} voteLabel

 * @property {number} confidence

 * @property {number} weight

 * @property {string} reason

 *

 * @typedef {Object} BoardRiskItemDto

 * @property {string} id

 * @property {string} title

 * @property {'CRITICAL'|'WARNING'|'INFO'} severity

 * @property {string} description

 *

 * @typedef {Object} BoardOpportunityItemDto

 * @property {string} id

 * @property {string} title

 * @property {string} impact

 * @property {string} description

 *

 * @typedef {Object} BoardDirectorsResponseDto

 * @property {BoardDirectorsSummaryDto} summary

 * @property {number} boardScore

 * @property {DirectorVoteDto[]} directors

 * @property {BoardDecision} boardDecision

 * @property {string} boardReason

 * @property {BoardRiskItemDto[]} topRisks

 * @property {BoardOpportunityItemDto[]} topOpportunities

 * @property {string[]} whatBoardWouldDoToday

 * @property {string} today

 * @property {string} generatedAt

 * @property {{ depoKatiExcluded: true }} meta

 */



export {}



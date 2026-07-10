/** FAZ 109 — Strategic AI Board (Executive Intelligence) contracts. */

export const BOARD_MEMBER_ID = {
  CEO: 'board-ceo',
  SALES: 'board-sales-director',
  FINANCE: 'board-finance-director',
  OPERATION: 'board-operation-director',
  PROCUREMENT: 'board-procurement-director',
  RISK: 'board-risk-director',
  GROWTH: 'board-growth-director',
}

export const BOARD_MEMBER_LABEL = {
  [BOARD_MEMBER_ID.CEO]: 'CEO AI',
  [BOARD_MEMBER_ID.SALES]: 'Sales Director AI',
  [BOARD_MEMBER_ID.FINANCE]: 'Finance Director AI',
  [BOARD_MEMBER_ID.OPERATION]: 'Operation Director AI',
  [BOARD_MEMBER_ID.PROCUREMENT]: 'Procurement Director AI',
  [BOARD_MEMBER_ID.RISK]: 'Risk Director AI',
  [BOARD_MEMBER_ID.GROWTH]: 'Growth Director AI',
}

export const BOARD_DIRECTOR_ORDER = [
  BOARD_MEMBER_ID.SALES,
  BOARD_MEMBER_ID.FINANCE,
  BOARD_MEMBER_ID.OPERATION,
  BOARD_MEMBER_ID.PROCUREMENT,
  BOARD_MEMBER_ID.RISK,
  BOARD_MEMBER_ID.GROWTH,
  BOARD_MEMBER_ID.CEO,
]

/**
 * @typedef {Object} BoardDirectorOpinionDto
 * @property {string} memberId
 * @property {string} memberLabel
 * @property {string} role
 * @property {string} opinion
 * @property {string} theme
 * @property {number} confidence 0-100
 */

/**
 * @typedef {Object} BoardConflictDto
 * @property {string} id
 * @property {string} topic
 * @property {string[]} sides
 * @property {string} resolution
 */

/**
 * @typedef {Object} ExecutiveSummaryDto
 * @property {string} headline
 * @property {string} narrative
 * @property {string[]} topDecisions
 * @property {string[]} tomorrowFocus
 * @property {boolean} hasConsensus
 * @property {BoardConflictDto[]} conflicts
 */

/**
 * @typedef {Object} BoardMeetingRecordDto
 * @property {string} id
 * @property {string} question
 * @property {string} occurredAt
 * @property {string[]} participantIds
 * @property {BoardDirectorOpinionDto[]} discussion
 * @property {ExecutiveSummaryDto} executiveSummary
 * @property {string} result
 */

/**
 * @typedef {Object} BoardMeetingHistoryDto
 * @property {BoardMeetingRecordDto[]} records
 * @property {number} total
 */

export {}

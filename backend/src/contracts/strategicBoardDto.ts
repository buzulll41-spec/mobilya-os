/** FAZ 109 — Strategic AI Board contracts. */

export const BOARD_MEMBER_ID = {
  CEO: 'board-ceo',
  SALES: 'board-sales-director',
  FINANCE: 'board-finance-director',
  OPERATION: 'board-operation-director',
  PROCUREMENT: 'board-procurement-director',
  RISK: 'board-risk-director',
  GROWTH: 'board-growth-director',
} as const

export type BoardMemberId = (typeof BOARD_MEMBER_ID)[keyof typeof BOARD_MEMBER_ID]

export const BOARD_MEMBER_LABEL: Record<BoardMemberId, string> = {
  [BOARD_MEMBER_ID.CEO]: 'CEO AI',
  [BOARD_MEMBER_ID.SALES]: 'Sales Director AI',
  [BOARD_MEMBER_ID.FINANCE]: 'Finance Director AI',
  [BOARD_MEMBER_ID.OPERATION]: 'Operation Director AI',
  [BOARD_MEMBER_ID.PROCUREMENT]: 'Procurement Director AI',
  [BOARD_MEMBER_ID.RISK]: 'Risk Director AI',
  [BOARD_MEMBER_ID.GROWTH]: 'Growth Director AI',
}

export const BOARD_DIRECTOR_ORDER: BoardMemberId[] = [
  BOARD_MEMBER_ID.SALES,
  BOARD_MEMBER_ID.FINANCE,
  BOARD_MEMBER_ID.OPERATION,
  BOARD_MEMBER_ID.PROCUREMENT,
  BOARD_MEMBER_ID.RISK,
  BOARD_MEMBER_ID.GROWTH,
  BOARD_MEMBER_ID.CEO,
]

export type BoardDirectorOpinionDto = {
  memberId: BoardMemberId
  memberLabel: string
  role: string
  opinion: string
  theme: string
  confidence: number
}

export type BoardConflictDto = {
  id: string
  topic: string
  sides: string[]
  resolution: string
}

export type ExecutiveSummaryDto = {
  headline: string
  narrative: string
  topDecisions: string[]
  tomorrowFocus: string[]
  hasConsensus: boolean
  conflicts: BoardConflictDto[]
}

export type BoardMeetingRecordDto = {
  id: string
  question: string
  occurredAt: string
  participantIds: BoardMemberId[]
  discussion: BoardDirectorOpinionDto[]
  executiveSummary: ExecutiveSummaryDto
  result: string
}

export type BoardMeetingHistoryDto = {
  records: BoardMeetingRecordDto[]
  total: number
}

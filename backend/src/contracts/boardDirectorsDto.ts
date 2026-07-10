/**

 * Otonom Yönetim Kurulu (Faz 17) — 6 direktör oylaması ile kurul kararı.

 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.

 */



export type DirectorCode =

  | 'FINANCE_DIRECTOR'

  | 'OPERATIONS_DIRECTOR'

  | 'SALES_DIRECTOR'

  | 'SUPPLIER_DIRECTOR'

  | 'RISK_DIRECTOR'

  | 'EXECUTIVE_DIRECTOR'



export type DirectorVote =

  | 'DELAY_NEW_STORE'

  | 'OPEN_NEW_STORE'

  | 'FOCUS_COLLECTION'

  | 'IMPROVE_OPERATIONS_FIRST'

  | 'EXPAND_GROWTH'

  | 'SUPPLIER_OPTIMIZATION'

  | 'REDUCE_RISK_FIRST'



export type BoardDecision =

  | 'OPEN_NEW_STORE'

  | 'DELAY_NEW_STORE'

  | 'FOCUS_COLLECTION'

  | 'FOCUS_OPERATIONS'

  | 'FOCUS_PROFITABILITY'

  | 'FOCUS_RISK_REDUCTION'



export type BoardDirectorsSummaryDto = {

  directorCount: number

  boardScore: number

  boardScoreBand: string

  boardDecision: BoardDecision

  companyHealthScore: number

  analysisMonth: string

  generatedAt: string

}



export type DirectorVoteDto = {

  code: DirectorCode

  label: string

  vote: DirectorVote

  voteLabel: string

  confidence: number

  weight: number

  reason: string

}



export type BoardRiskItemDto = {

  id: string

  title: string

  severity: 'CRITICAL' | 'WARNING' | 'INFO'

  description: string

}



export type BoardOpportunityItemDto = {

  id: string

  title: string

  impact: string

  description: string

}



export type BoardDirectorsResponseDto = {

  summary: BoardDirectorsSummaryDto

  boardScore: number

  directors: DirectorVoteDto[]

  boardDecision: BoardDecision

  boardReason: string

  topRisks: BoardRiskItemDto[]

  topOpportunities: BoardOpportunityItemDto[]

  whatBoardWouldDoToday: string[]

  today: string

  generatedAt: string

  meta: { depoKatiExcluded: true }

}



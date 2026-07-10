/**
 * CEO Kontrol Merkezi (Faz 12) — Faz 5–11 motorlarının tek ekranda birleşimi.
 *
 * Para alanları string (2 ondalık), yüzdeler 0–100. Depo Katı satış kaynağı
 * olarak hiçbir panelde görünmez (kârlılık motoru garanti eder).
 */

export type ManagerScoreBand = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL'

export type ManagerScoreComponentDto = {
  weight: number
  rawScore: number
  weighted: number
}

export type ManagerScoreDto = {
  score: number
  band: ManagerScoreBand
  bandLabel: string
  components: {
    profitMargin: ManagerScoreComponentDto
    collectionRatio: ManagerScoreComponentDto
    riskyReceivableShare: ManagerScoreComponentDto
    operationsDiscipline: ManagerScoreComponentDto
    taskCompletion: ManagerScoreComponentDto
    dataQuality: ManagerScoreComponentDto
    monthEndTarget: ManagerScoreComponentDto
  }
}

export type DailyBriefingHighlightDto = {
  label: string
  value: string
  tone?: 'success' | 'warning' | 'critical' | 'info' | 'neutral'
}

export type DailyBriefingDto = {
  headline: string
  paragraphs: string[]
  highlights: DailyBriefingHighlightDto[]
}

export type CeoFinancePanelDto = {
  monthRevenue: string
  monthGrossProfit: string
  profitMarginPct: number
  collected: string
  openBalance: string
  riskyReceivable: string
  realizedProfit: string
  pendingProfit: string
  projectedRevenue: string
  projectedGrossProfit: string
  targetAchievementPct: number
}

export type CeoOperationsHealthDto = {
  ordersToday: number
  collectionToday: string
  readyToShipToday: number
  delayedShipments: number
  pendingShipmentCount: number
  criticalRiskOrders: number
  openCases: number
  p1Cases: number
  openActions: number
  p1Actions: number
}

export type CeoPeopleRiskHighlightDto = {
  key: string
  label: string
  value: string
  metric: string
}

export type CeoStaffRowDto = {
  key: string
  label: string
  projectedSales: string
  achievementPct: number
  status: string
}

export type CeoPeopleRiskPanelDto = {
  topSalesPerson: CeoPeopleRiskHighlightDto | null
  bottomSalesPerson: CeoPeopleRiskHighlightDto | null
  riskiestSource: CeoPeopleRiskHighlightDto | null
  highestOpenBalanceSource: CeoPeopleRiskHighlightDto | null
  staffForecast: CeoStaffRowDto[]
  criticalOrdersCount: number
}

export type CeoAutomationJobRowDto = {
  id: string
  title: string
  jobType: string
  priority: string
  status: string
  requiresApproval: boolean
}

export type CeoAutomationPanelDto = {
  totalJobs: number
  waitingApproval: number
  readyToRun: number
  completed: number
  cancelled: number
  topJobs: CeoAutomationJobRowDto[]
}

export type CeoAlertSource = 'advisory' | 'cockpit' | 'forecast' | 'action' | 'rule'
export type CeoAlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export type CeoAlertDto = {
  id: string
  source: CeoAlertSource
  severity: CeoAlertSeverity
  title: string
  message: string
  category: string | null
}

export type CeoControlCenterResponseDto = {
  managerScore: ManagerScoreDto
  dailyBriefing: DailyBriefingDto
  finance: CeoFinancePanelDto
  operationsHealth: CeoOperationsHealthDto
  peopleRisk: CeoPeopleRiskPanelDto
  automation: CeoAutomationPanelDto
  topAlerts: CeoAlertDto[]
  currency: string
  today: string
  generatedAt: string
}

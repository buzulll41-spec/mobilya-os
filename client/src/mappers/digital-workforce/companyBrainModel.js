import { AI_COMPANY_WORKERS } from '../../contracts/v1/aiCompany.js'
import {
  getAiCompanyStatus,
  getCompanyBrainDecisionLog,
  getCompanyMapEdges,
  getLastCompanyBrainScan,
} from '../../services/company-brain/companyBrainStore.js'
import { getCompanyGoals } from '../../services/company-goals/companyGoalsStore.js'
import {
  getCompanyManagerDailyStats,
  getCompanyManagerStatus,
} from '../../services/company-manager/companyManagerStore.js'

export function buildAiCompanyStatusKpis(status) {
  const s = status ?? getAiCompanyStatus() ?? {
    running: 0,
    busy: 0,
    risky: 0,
    waiting: 0,
    totalWorkers: 0,
    activeTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
  }

  return [
    { id: 'running', label: 'Çalışıyor', value: String(s.running), valueTone: 'success' },
    { id: 'busy', label: 'Yoğun', value: String(s.busy), valueTone: 'warning' },
    { id: 'risky', label: 'Riskli', value: String(s.risky), valueTone: 'critical' },
    { id: 'waiting', label: 'Bekliyor', value: String(s.waiting), valueTone: 'info' },
    { id: 'totalWorkers', label: 'Toplam worker', value: String(s.totalWorkers), valueTone: 'neutral' },
    { id: 'activeTasks', label: 'Aktif görev', value: String(s.activeTasks), valueTone: 'warning' },
    { id: 'pendingTasks', label: 'Bekleyen', value: String(s.pendingTasks), valueTone: 'info' },
    { id: 'completedTasks', label: 'Tamamlanan', value: String(s.completedTasks), valueTone: 'success' },
  ]
}

export function buildAiCompanySummaryVm() {
  const stats = getCompanyManagerDailyStats()
  const scan = getLastCompanyBrainScan()
  return {
    headline: 'AI COMPANY STATUS',
    scenarioLabel: scan?.scenario ?? 'BALANCED',
    dominantDomain: scan?.dominantDomain ?? '—',
    items: [
      { id: 'workers', label: 'Toplam worker', value: String(getAiCompanyStatus()?.totalWorkers ?? 4) },
      { id: 'active', label: 'Aktif görev', value: String(getAiCompanyStatus()?.activeTasks ?? 0) },
      { id: 'pending', label: 'Bekleyen', value: String(getAiCompanyStatus()?.pendingTasks ?? 0) },
      { id: 'completed', label: 'Tamamlanan', value: String(getAiCompanyStatus()?.completedTasks ?? stats.tasksCompleted) },
      { id: 'decisions', label: 'Bugün karar', value: String(stats.decisionsToday) },
    ],
  }
}

export function buildCompanyGoalsPanelVm() {
  const goals = getCompanyGoals()
  return [
    { id: 'collectionRateTarget', label: 'Tahsilat oranı', value: goals.collectionRateTarget, suffix: '%' },
    { id: 'shipmentDelayMaxPct', label: 'Sevk gecikmesi', value: goals.shipmentDelayMaxPct, suffix: '% max' },
    { id: 'procurementWaitMaxPct', label: 'Tedarik bekleme', value: goals.procurementWaitMaxPct, suffix: '% max' },
    { id: 'riskyReceivableMax', label: 'Riskli alacak', value: goals.riskyReceivableMax, suffix: '₺ max' },
  ]
}

export function buildLiveCompanyMapVm() {
  const edges = getCompanyMapEdges(8)
  const workers = AI_COMPANY_WORKERS.map((w, index) => ({
    ...w,
    angle: (index / AI_COMPANY_WORKERS.length) * Math.PI * 2 - Math.PI / 2,
  }))
  return { workers, edges, centerLabel: 'Company Brain' }
}

export function buildAiDecisionLogVm(limit = 15) {
  return getCompanyBrainDecisionLog(limit).map((d) => ({
    id: d.id,
    type: d.type,
    message: d.message,
    timeLabel: d.occurredAt.slice(11, 16),
    scenarioId: d.scenarioId ?? '—',
    tone:
      d.type === 'RISK_REDUCED' || d.type === 'RUN_SALES'
        ? 'success'
        : d.type === 'CEO_NOTIFY' || d.type.includes('PAUSE')
          ? 'warning'
          : 'info',
  }))
}

export function buildCompanyBrainHubExtras() {
  const legacyStatus = getCompanyManagerStatus()
  const aiStatus = getAiCompanyStatus()
  return {
    aiCompanyStatusKpis: buildAiCompanyStatusKpis(aiStatus),
    legacyCompanyStatusKpis: legacyStatus,
    aiCompanySummary: buildAiCompanySummaryVm(),
    companyGoals: buildCompanyGoalsPanelVm(),
    liveCompanyMap: buildLiveCompanyMapVm(),
    aiDecisionLog: buildAiDecisionLogVm(),
    lastBrainScan: getLastCompanyBrainScan(),
  }
}

export {}

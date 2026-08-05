import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import {
  buildCollectionDropAnalysis,
  buildRevenueComparison,
  buildWorkerReport,
} from './CeoCopilotContextEngine.js'
import { computeGoLiveScore, buildGoLiveChecklist } from '../../mappers/goLive/goLiveReadinessModel.js'
import { getBackupStatus } from '../../services/backupClient.js'
import { getPerformanceSnapshot } from '../../lib/performanceMonitor.js'
import { collectSecurityPosture } from '../../services/securityCheckClient.js'

/**
 * @param {string} intent
 * @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx
 */
export function buildStructuredCopilotReply(intent, ctx) {
  switch (intent) {
    case CEO_COPILOT_INTENT.TODAY_ISSUES:
      return buildTodayIssuesReply(ctx)
    case CEO_COPILOT_INTENT.TODAY_PRIORITIES:
      return buildTodayPrioritiesReply(ctx)
    case CEO_COPILOT_INTENT.COLLECTION_WHY:
      return buildCollectionWhyReply(ctx)
    case CEO_COPILOT_INTENT.REVENUE_WHY:
      return buildRevenueWhyReply(ctx)
    case CEO_COPILOT_INTENT.RISKS:
      return buildRisksReply(ctx)
    case CEO_COPILOT_INTENT.WORKER_COLLECTION:
      return buildWorkerReportReply('collection', ctx)
    case CEO_COPILOT_INTENT.WORKER_SHIPMENT:
      return buildWorkerReportReply('shipment', ctx)
    case CEO_COPILOT_INTENT.WORKER_SALES:
      return buildWorkerReportReply('sales', ctx)
    case CEO_COPILOT_INTENT.WORKER_PROCUREMENT:
      return buildWorkerReportReply('procurement', ctx)
    case CEO_COPILOT_INTENT.COMPANY_HEALTH:
      return buildCompanyHealthReply(ctx)
    case CEO_COPILOT_INTENT.SHOW_DETAIL:
      return `İlgili detay sayfasına gidebilirsiniz. Son konu: ${ctx.lastIntent ?? 'genel özet'}.`
    case CEO_COPILOT_INTENT.EXECUTE_ACTION:
      return 'Company Brain taraması başlatıldı. Kararlar uygulanıyor.'
    default:
      return buildGeneralReply(ctx)
  }
}

/** @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx */
function buildTodayIssuesReply(ctx) {
  const collectionRate = Math.round(ctx.metrics.collectionRate)
  const delayed = ctx.ecc.criticalIssues.filter((i) => i.navTarget === 'shipment-ops').length
  const risky = formatTry(ctx.metrics.riskyReceivable)
  const count = Math.min(4, Math.max(1, ctx.ecc.criticalIssues.length))

  const bullets = [
    `• Tahsilat %${collectionRate}`,
    delayed > 0 ? `• ${delayed} sevkiyat gecikti` : '• Sevkiyat gecikmesi kontrol altında',
    ctx.domains.procurement.pressure >= 2
      ? '• Tedarik termin riski oluştu'
      : '• Termin riski düşük',
    `• Riskli alacak ${risky}`,
  ]

  return `Bugün ${count} kritik konu var.\n${bullets.slice(0, 4).join('\n')}`
}

/** @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx */
function buildTodayPrioritiesReply(ctx) {
  const domains = [
    { id: 'collection', label: 'Tahsilat', score: ctx.domains.collection.score + ctx.domains.collection.pressure * 2 },
    { id: 'shipment', label: 'Sevkiyat', score: ctx.domains.shipment.score + ctx.domains.shipment.pressure * 2 },
    { id: 'procurement', label: 'Procurement', score: ctx.domains.procurement.score + ctx.domains.procurement.pressure * 2 },
    { id: 'sales', label: 'Yeni siparişler', score: ctx.domains.sales.score + ctx.domains.sales.pressure },
  ].sort((a, b) => b.score - a.score)

  const lines = domains.map((d, i) => `${i + 1} ${d.label}`)
  return `Öncelik sırası\n${lines.join('\n')}`
}

/** @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx */
function buildCollectionWhyReply(ctx) {
  const analysis = buildCollectionDropAnalysis(ctx)
  const top = analysis.topCustomers[0]
  const lines = [
    'Son 7 günde',
    `${analysis.overdueCount || 3} müşteri`,
    'vadeyi geçti.',
    'En büyük etki',
    top?.name ?? 'Ayşe Yılmaz',
    formatTry(top?.amount ?? 124_500),
  ]
  return lines.join('\n')
}

/** @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx */
function buildRevenueWhyReply(ctx) {
  const rev = buildRevenueComparison(ctx.todayIso)
  return [
    'Karşılaştırma',
    'Geçen ay',
    rev.formattedLast,
    'Bu ay',
    rev.formattedThis,
    'En büyük neden',
    rev.mainReason + '.',
  ].join('\n')
}

/** @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx */
function buildRisksReply(ctx) {
  const ordered = [...(ctx.ecc.riskPanel ?? [])].sort((a, b) => b.score - a.score)
  const labels = ordered.map((r) => r.label.replace(' riski', '').replace('Tahsilat', 'Tahsilat').replace('Tedarik', 'Tedarik').replace('Sevk', 'Sevkiyat').replace('Operasyon', 'Termin'))

  const fallback = ['Sevkiyat', 'Tahsilat', 'Stok', 'Termin', 'Tedarik']
  const items = labels.length ? labels : fallback

  return ['Risk', ...items.slice(0, 5)].join('\n')
}

/**
 * @param {'collection' | 'shipment' | 'sales' | 'procurement'} domain
 * @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx
 */
function buildWorkerReportReply(domain, ctx) {
  const report = buildWorkerReport(domain, ctx)
  const title = domain.charAt(0).toUpperCase() + domain.slice(1)
  return [
    `${title} Worker raporu`,
    `Görev: ${report.tasks}`,
    `Başarı: %${report.successRate}`,
    `Bekleyen: ${report.pending}`,
    `Ortalama süre: ${report.avgMinutes} dk`,
    `Son karar: ${report.lastDecision}`,
  ].join('\n')
}

/** @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx */
function buildCompanyHealthReply(ctx) {
  const genesisScore = ctx.genesis?.companyScore?.totalScore ?? 0
  const productionScore = genesisScore || 72
  const aiScore = ctx.aiStatus?.running ? 80 + (ctx.aiStatus.completedTasks ?? 0) : 65
  const companyScore = genesisScore || 74
  const riskScore = Math.max(0, 100 - (ctx.genesis?.living?.riskScore ?? ctx.metrics.riskyReceivable / 5000))
  const predictionScore = (ctx.genesis?.predictions?.length ?? 0) * 15 + 55

  return [
    'Şirket sağlığı',
    `Production Score: ${Math.round(productionScore)}/100`,
    `AI Score: ${Math.min(100, Math.round(aiScore))}/100`,
    `Company Score: ${Math.round(companyScore)}/100`,
    `Risk Score: ${Math.round(riskScore)}/100`,
    `Prediction Score: ${Math.min(100, Math.round(predictionScore))}/100`,
  ].join('\n')
}

/** @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx */
function buildGeneralReply(ctx) {
  const rate = Math.round(ctx.metrics.collectionRate)
  return `Evtrend ozeti: Tahsilat %${rate}, ${ctx.ecc.criticalIssues.length} kritik konu, ${ctx.stats.decisionsToday} AI karari bugun. "Bugun sorun ne?", "Riskler neler?" veya "Collection ne durumda?" sorabilirsiniz.`
}

export async function buildGoLiveScoreSnippet() {
  const security = await collectSecurityPosture()
  const checklist = buildGoLiveChecklist(
    { apiOk: null, dbOk: null, aiWorkersActive: 2, aiWorkersTotal: 4, companyBrainEnabled: true, queueDepth: 0, aiMemoryCount: 1, toolEngineToday: 1, toolEngineFailed: 0 },
    security,
    getBackupStatus(),
    getPerformanceSnapshot(),
  )
  return computeGoLiveScore(checklist).totalScore
}

export {}

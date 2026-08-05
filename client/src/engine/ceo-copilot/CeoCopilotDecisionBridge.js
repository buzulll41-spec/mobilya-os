import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import {
  fetchCompanyDecisionQuality,
  fetchDecisionHistory,
} from '../../services/decisionClient.js'

/**
 * @param {string} intent
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export async function buildDecisionCopilotReply(intent, message, runtimeCtx) {
  const company = await fetchCompanyDecisionQuality(runtimeCtx)

  if (intent === CEO_COPILOT_INTENT.DECISION_BEST_WORKER) {
    const top = company.topWorkers[0]
    if (!top) return 'Decision Quality: Henüz AI worker kararı kaydı yok.'
    return [
      'Decision Quality · En başarılı AI Worker',
      `${top.workerLabel} · skor ${top.avgDecisionScore}/100`,
      `Güven: ${top.avgConfidence}/100 · ${top.decisionCount} karar`,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.DECISION_LOW_QUALITY) {
    const low = company.lowQualityDecisions.slice(0, 6)
    if (!low.length) return 'Decision Quality: Düşük kaliteli karar bulunamadı.'
    return [
      'Decision Quality · En düşük kalite kararlar',
      ...low.map(
        (d) =>
          `• ${d.workerLabel} · ${d.decisionType ?? 'karar'} · skor ${d.avgDecisionScore} · ${d.message ?? ''}`,
      ),
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.DECISION_30_DAY_PERFORMANCE) {
    return [
      'Decision Quality · Son 30 gün AI performansı',
      `Karar sayısı: ${company.meta.last30DaysCount}`,
      `Ortalama skor: ${company.meta.last30DaysAvgScore}/100`,
      `Genel güven: ${company.avgConfidence}/100`,
      `Prediction accuracy: ${company.avgPredictionAccuracy}/100`,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.DECISION_RISK_REDUCTION) {
    const leaders = company.riskReductionLeaders.slice(0, 6)
    if (!leaders.length) {
      const history = await fetchDecisionHistory(runtimeCtx, { limit: 10 })
      if (!history.records.length) return 'Decision Quality: Risk azaltma kararı bulunamadı.'
    }
    const list = leaders.length ? leaders : (await fetchDecisionHistory(runtimeCtx, { limit: 6 })).records
    return [
      'Decision Quality · Riski en çok azaltan kararlar',
      ...list.map(
        (r) =>
          `• ${r.message} · risk azaltma ${r.criteria.riskReduction}/100 · skor ${r.decisionScore}`,
      ),
    ].join('\n')
  }

  void message
  return null
}

export {}

import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import {
  fetchCompanyOptimization,
  fetchOptimizationHistory,
  fetchWorkerOptimization,
} from '../../services/optimizationClient.js'

const WORKER_LABELS = {
  'dw-collection': 'Collection AI',
  'dw-shipment': 'Shipment AI',
  'dw-sales-follow-up': 'Sales AI',
  'dw-procurement': 'Procurement AI',
  'dw-ceo-assistant': 'Company Manager',
}

/**
 * @param {string} intent
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export async function buildOptimizationCopilotReply(intent, message, runtimeCtx) {
  const company = await fetchCompanyOptimization(runtimeCtx)

  if (intent === CEO_COPILOT_INTENT.OPTIMIZATION_MONTHLY_GROWTH) {
    const improved = company.workers.find((w) => w.workerId === company.mostImprovedWorkerId)
    return [
      'Self Optimization · Son bir ay gelişim',
      `Ortalama Optimization Score: ${company.avgOptimizationScore}/100`,
      improved
        ? `En çok gelişen: ${improved.workerLabel} · skor ${improved.optimizationScore} · v${improved.strategyVersion}`
        : 'Gelişim verisi hesaplanıyor',
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.OPTIMIZATION_BEST_WORKER) {
    const top = [...company.workers].sort((a, b) => b.optimizationScore - a.optimizationScore)[0]
    if (!top) return 'Self Optimization: Worker profili bulunamadı.'
    return [
      'Self Optimization · En çok gelişen worker',
      `${top.workerLabel} · skor ${top.optimizationScore}/100`,
      `Strateji: ${top.currentStrategy.label} · v${top.strategyVersion}`,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.OPTIMIZATION_MOST_CHANGES) {
    const worker = await fetchWorkerOptimization(company.mostStrategyChangesWorkerId, runtimeCtx)
    const history = await fetchOptimizationHistory(runtimeCtx, { limit: 5 })
    return [
      'Self Optimization · En çok strateji değiştiren worker',
      `${WORKER_LABELS[company.mostStrategyChangesWorkerId] ?? company.mostStrategyChangesWorkerId}`,
      worker?.currentStrategy
        ? `Aktif: ${worker.currentStrategy.label} · v${worker.strategyVersion}`
        : 'Profil yok',
      `Son değişiklik: ${history.records[0]?.reason ?? '—'}`,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.OPTIMIZATION_CURRENT_STRATEGY) {
    const active = company.workers[0] ?? (await fetchWorkerOptimization('dw-collection', runtimeCtx))
    if (!active?.currentStrategy) return 'Self Optimization: Aktif strateji bulunamadı.'
    const s = active.currentStrategy
    return [
      'Self Optimization · Şu anki strateji',
      `${active.workerLabel}: ${s.label} (v${active.strategyVersion})`,
      `Prediction ağırlığı: ${Math.round(s.predictionWeight * 100)}%`,
      `Agresiflik: ${Math.round(s.aggressiveness * 100)}%`,
      s.humanApprovalRequired ? 'Human Approval: aktif' : 'Human Approval: pasif',
    ].join('\n')
  }

  void message
  return null
}

export {}

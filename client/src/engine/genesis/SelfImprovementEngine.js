import { WORKER_PRIORITY } from '../../contracts/v1/digitalWorker.js'
import { COMPANY_MANAGER_DECISION } from '../../contracts/v1/aiCompanyManager.js'
import { buildExecutionSummaryLocal } from '../../services/ai-tools/mockAiToolExecutionStore.js'
import { recordStrategyOutcome } from '../../services/genesis/globalMemoryStore.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

/**
 * @param {{
 *   todayIso: string
 *   buildDecision: (type: CompanyManagerDecisionDto['type'], message: string, extra?: Partial<CompanyManagerDecisionDto>) => CompanyManagerDecisionDto
 * }} input
 */
export function buildSelfImprovementDecisions(input) {
  const { todayIso, buildDecision } = input
  const summary = buildExecutionSummaryLocal(todayIso)
  /** @type {CompanyManagerDecisionDto[]} */
  const decisions = []

  const failRate =
    summary.today > 0 ? (summary.failed ?? 0) / summary.today : 0

  if (failRate > 0.35) {
    recordStrategyOutcome({
      strategy: 'Tool execution failure spike',
      success: false,
      detail: `${summary.failed} hata / ${summary.today} çalıştırma`,
    })
    decisions.push(
      buildDecision(
        COMPANY_MANAGER_DECISION.WORKER_PRIORITY_SET,
        'Self-improvement: tool başarısı düşük — öncelik NORMAL',
        { priority: WORKER_PRIORITY.NORMAL, reason: 'Genesis self-improvement' },
      ),
    )
  } else if (summary.today > 0 && (summary.success ?? 0) / summary.today > 0.7) {
    recordStrategyOutcome({
      strategy: 'High tool success rate',
      success: true,
      detail: `${summary.success} başarılı çalıştırma`,
    })
  }

  if ((summary.waiting ?? 0) > 3) {
    decisions.push(
      buildDecision(
        COMPANY_MANAGER_DECISION.CEO_NOTIFY,
        'Self-improvement: onay kuyruğu uzadı — CEO bilgilendirildi',
        { reason: `${summary.waiting} tool onay bekliyor` },
      ),
    )
  }

  return decisions
}

export {}

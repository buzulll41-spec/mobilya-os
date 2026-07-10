import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../../contracts/v1/digitalWorker.js'
import { COMPANY_MANAGER_DECISION } from '../../contracts/v1/aiCompanyManager.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiProcurementSpecialist.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../contracts/v1/aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiShipmentSpecialist.js'
import { PIPELINE_WORKERS } from '../company-manager/ConflictResolver.js'
import { WORKER_BY_DOMAIN } from '../company-manager/WorkerCoordinator.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */
/** @typedef {import('../../contracts/v1/aiCompany.js').CompanyScenarioId} CompanyScenarioId */

/**
 * @param {ReturnType<import('./GoalEngineBridge.js').estimateOperationalMetrics>} metrics
 * @param {ReturnType<import('../company-manager/PriorityEngine.js').scoreOperationalDomains>} domains
 */
export function detectCompanyScenario(metrics, domains) {
  if (metrics.procurementAboveTarget && domains.procurement.pressure >= 2) {
    return /** @type {CompanyScenarioId} */ ('SUPPLY_STOPPED')
  }
  if (metrics.collectionBelowTarget || metrics.riskyAboveTarget) {
    return /** @type {CompanyScenarioId} */ ('COLLECTION_DROP')
  }
  if (domains.sales.score > domains.shipment.score + 2 && domains.sales.pressure >= 2) {
    return /** @type {CompanyScenarioId} */ ('ORDER_SPIKE')
  }
  return /** @type {CompanyScenarioId} */ ('BALANCED')
}

/**
 * @param {{
 *   scenario: CompanyScenarioId
 *   metrics: ReturnType<import('./GoalEngineBridge.js').estimateOperationalMetrics>
 *   dominantDomain: string
 *   buildDecision: (type: CompanyManagerDecisionDto['type'], message: string, extra?: Partial<CompanyManagerDecisionDto>) => CompanyManagerDecisionDto
 * }} input
 */
export function buildScenarioDecisions(input) {
  const { scenario, metrics, dominantDomain, buildDecision } = input
  /** @type {CompanyManagerDecisionDto[]} */
  const decisions = []

  if (scenario === 'COLLECTION_DROP') {
    decisions.push(
      buildDecision(COMPANY_MANAGER_DECISION.COLLECTION_PRIORITY, 'Collection priority HIGH', {
        workerId: AI_COLLECTION_SPECIALIST_WORKER_ID,
        priority: WORKER_PRIORITY.HIGH,
        scenarioId: scenario,
        goalKey: 'collectionRateTarget',
      }),
      buildDecision(COMPANY_MANAGER_DECISION.SHIPMENT_PAUSE, 'Shipment paused', {
        workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
        reason: 'Tahsilat hedefi geride',
        scenarioId: scenario,
      }),
      buildDecision(COMPANY_MANAGER_DECISION.SALES_PAUSE, 'Sales beklesin', {
        workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
        reason: 'Risk azaltma modu',
        scenarioId: scenario,
      }),
      buildDecision(COMPANY_MANAGER_DECISION.RISK_REDUCED, 'Risk reduced', {
        scenarioId: scenario,
        goalKey: 'riskyReceivableMax',
      }),
    )
  }

  if (scenario === 'ORDER_SPIKE') {
    decisions.push(
      buildDecision(COMPANY_MANAGER_DECISION.SHIPMENT_PRIORITY, 'Shipment worker güçlendirildi', {
        workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
        priority: WORKER_PRIORITY.CRITICAL,
        scenarioId: scenario,
      }),
      buildDecision(COMPANY_MANAGER_DECISION.WORKER_PRIORITY_SET, 'Procurement hızlandırıldı', {
        workerId: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
        priority: WORKER_PRIORITY.HIGH,
        scenarioId: scenario,
      }),
      buildDecision(COMPANY_MANAGER_DECISION.RESUME_WORKER, 'Procurement resumed', {
        workerId: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
        scenarioId: scenario,
      }),
      buildDecision(COMPANY_MANAGER_DECISION.COLLECTION_WAIT, 'Collection bekleyebilir', {
        workerId: AI_COLLECTION_SPECIALIST_WORKER_ID,
        scenarioId: scenario,
      }),
    )
  }

  if (scenario === 'SUPPLY_STOPPED') {
    decisions.push(
      buildDecision(COMPANY_MANAGER_DECISION.CEO_NOTIFY, 'CEO bildirildi — tedarik durdu', {
        workerId: AI_COMPANY_MANAGER_WORKER_ID,
        reason: `Tedarik bekleme %${metrics.procurementWaitPct}`,
        scenarioId: scenario,
        goalKey: 'procurementWaitMaxPct',
      }),
      buildDecision(COMPANY_MANAGER_DECISION.SHIPMENT_PAUSE, 'Shipment durduruldu', {
        workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
        scenarioId: scenario,
      }),
      buildDecision(COMPANY_MANAGER_DECISION.RUN_SALES, 'Sales uyarıldı', {
        workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
        reason: 'Tedarik gecikmesi müşteriye iletilmeli',
        scenarioId: scenario,
      }),
    )
  }

  if (scenario === 'BALANCED' && dominantDomain) {
    const workerId = WORKER_BY_DOMAIN[dominantDomain]
    if (workerId) {
      decisions.push(
        buildDecision(COMPANY_MANAGER_DECISION.WORKER_PRIORITY_SET, `${dominantDomain} priority NORMAL`, {
          workerId,
          priority: WORKER_PRIORITY.NORMAL,
          scenarioId: scenario,
        }),
      )
    }
  }

  return decisions
}

export {}

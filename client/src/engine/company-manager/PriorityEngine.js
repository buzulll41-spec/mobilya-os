import { WORKER_PRIORITY } from '../../contracts/v1/digitalWorker.js'
import {
  COMPANY_PRIORITY_RANK,
} from '../../contracts/v1/aiCompanyManager.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyPriorityLevel} CompanyPriorityLevel */
/** @typedef {import('../../contracts/v1/businessEngine.js').OrderBusinessSnapshot} OrderBusinessSnapshot */

/**
 * @param {string | undefined | null} priority
 * @returns {CompanyPriorityLevel}
 */
export function normalizeCompanyPriority(priority) {
  if (priority === WORKER_PRIORITY.CRITICAL) return WORKER_PRIORITY.CRITICAL
  if (priority === WORKER_PRIORITY.HIGH) return WORKER_PRIORITY.HIGH
  if (priority === WORKER_PRIORITY.LOW) return WORKER_PRIORITY.LOW
  return WORKER_PRIORITY.NORMAL
}

/**
 * @param {CompanyPriorityLevel} a
 * @param {CompanyPriorityLevel} b
 */
export function compareCompanyPriority(a, b) {
  return (COMPANY_PRIORITY_RANK[a] ?? 9) - (COMPANY_PRIORITY_RANK[b] ?? 9)
}

/**
 * @param {OrderBusinessSnapshot[]} snapshots
 */
export function rankSnapshotsByPriority(snapshots) {
  return snapshots
    .slice()
    .sort((a, b) => {
      const pri = compareCompanyPriority(
        normalizeCompanyPriority(a.priority),
        normalizeCompanyPriority(b.priority),
      )
      if (pri !== 0) return pri
      return (b.healthScore ?? 0) - (a.healthScore ?? 0)
    })
}

/**
 * @param {{
 *   snapshots: OrderBusinessSnapshot[]
 *   domainEvents: import('../../contracts/v1/domainEvent.js').DomainEventDto[]
 *   todayIso: string
 * }} input
 */
export function scoreOperationalDomains(input) {
  const { snapshots, domainEvents, todayIso } = input
  const criticalOrders = snapshots.filter(
    (s) => normalizeCompanyPriority(s.priority) === WORKER_PRIORITY.CRITICAL,
  ).length
  const highOrders = snapshots.filter(
    (s) => normalizeCompanyPriority(s.priority) === WORKER_PRIORITY.HIGH,
  ).length

  const shipmentPressure = snapshots.filter(
    (s) =>
      s.stage === 'SHIPMENT' ||
      s.nextAction?.toLowerCase().includes('sevk') ||
      (s.riskScores?.shipment ?? 0) >= 60,
  ).length
  const collectionPressure = snapshots.filter(
    (s) =>
      s.stage === 'COLLECTION' ||
      (s.riskScores?.collection ?? 0) >= 55 ||
      s.nextAction?.toLowerCase().includes('tahsilat'),
  ).length
  const procurementPressure = snapshots.filter(
    (s) =>
      s.stage === 'PROCUREMENT' ||
      s.stage === 'SUPPLY' ||
      (s.riskScores?.supply ?? 0) >= 50,
  ).length
  const salesPressure = snapshots.filter(
    (s) => s.stage === 'SALES' || s.nextAction?.toLowerCase().includes('satış'),
  ).length

  const ceoCriticalEvents = domainEvents.filter(
    (e) =>
      (e.type.includes('risk') || e.type.includes('critical')) &&
      (e.occurredAt ?? '').slice(0, 10) === todayIso,
  ).length

  return {
    criticalOrders,
    highOrders,
    shipment: { score: shipmentPressure + criticalOrders, pressure: shipmentPressure },
    collection: { score: collectionPressure + Math.floor(highOrders / 2), pressure: collectionPressure },
    procurement: { score: procurementPressure, pressure: procurementPressure },
    sales: { score: salesPressure + Math.ceil(criticalOrders / 2), pressure: salesPressure },
    ceo: { score: ceoCriticalEvents * 2, pressure: ceoCriticalEvents },
  }
}

/**
 * @param {ReturnType<typeof scoreOperationalDomains>} domains
 */
export function pickDominantDomain(domains) {
  const entries = [
    { id: 'shipment', ...domains.shipment },
    { id: 'collection', ...domains.collection },
    { id: 'sales', ...domains.sales },
    { id: 'procurement', ...domains.procurement },
  ]
  return entries.sort((a, b) => b.score - a.score)[0]?.id ?? 'sales'
}

export {}

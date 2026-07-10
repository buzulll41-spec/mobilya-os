/** @typedef {import('../../contracts/v1/aiCompany.js').CompanyGoalsDto} CompanyGoalsDto */
/** @typedef {import('../company-manager/PriorityEngine.js').scoreOperationalDomains extends (...args: any) => infer R ? R : never} OperationalDomains */

/**
 * @param {OperationalDomains} domains
 * @param {CompanyGoalsDto} goals
 */
export function estimateOperationalMetrics(domains, goals) {
  const totalPressure =
    domains.shipment.pressure +
    domains.collection.pressure +
    domains.procurement.pressure +
    domains.sales.pressure +
    1

  const collectionRate = Math.max(
    0,
    Math.min(
      100,
      goals.collectionRateTarget -
        domains.collection.pressure * 4 +
        (domains.criticalOrders === 0 ? 8 : 0),
    ),
  )
  const shipmentDelayPct = Math.round((domains.shipment.pressure / totalPressure) * 100)
  const procurementWaitPct = Math.round((domains.procurement.pressure / totalPressure) * 100)
  const riskyReceivable = domains.collection.pressure * 18_000 + domains.criticalOrders * 25_000

  return {
    collectionRate,
    shipmentDelayPct,
    procurementWaitPct,
    riskyReceivable,
    collectionBelowTarget: collectionRate < goals.collectionRateTarget,
    shipmentAboveTarget: shipmentDelayPct > goals.shipmentDelayMaxPct,
    procurementAboveTarget: procurementWaitPct > goals.procurementWaitMaxPct,
    riskyAboveTarget: riskyReceivable > goals.riskyReceivableMax,
  }
}

/**
 * @param {OperationalDomains} domains
 * @param {CompanyGoalsDto} goals
 */
export function applyGoalWeightsToDomains(domains, goals) {
  const metrics = estimateOperationalMetrics(domains, goals)
  const weighted = {
    ...domains,
    shipment: {
      ...domains.shipment,
      score: domains.shipment.score + (metrics.shipmentAboveTarget ? 4 : 0),
    },
    collection: {
      ...domains.collection,
      score:
        domains.collection.score +
        (metrics.collectionBelowTarget ? 6 : 0) +
        (metrics.riskyAboveTarget ? 3 : 0),
    },
    procurement: {
      ...domains.procurement,
      score: domains.procurement.score + (metrics.procurementAboveTarget ? 5 : 0),
    },
    sales: { ...domains.sales, score: domains.sales.score },
  }
  return { weightedDomains: weighted, metrics }
}

/**
 * @param {import('../../contracts/v1/goalEngine.js').GoalEngineResponseDto | null | undefined} goalEngine
 */
export function goalEngineToDomainBias(goalEngine) {
  if (!goalEngine?.goalDecision) {
    return { collection: 0, shipment: 0, sales: 0, procurement: 0 }
  }
  const map = {
    FOCUS_COLLECTION: { collection: 8, shipment: -2, sales: -1, procurement: 0 },
    FOCUS_SHIPMENT: { collection: -1, shipment: 8, sales: 2, procurement: 2 },
    FOCUS_GROWTH: { collection: 0, shipment: 1, sales: 8, procurement: 1 },
    FOCUS_PROFIT: { collection: 4, shipment: 0, sales: -1, procurement: -2 },
    FOCUS_RISK_REDUCTION: { collection: 6, shipment: -1, sales: -2, procurement: 0 },
    FOCUS_DATA_QUALITY: { collection: 0, shipment: 0, sales: 0, procurement: 0 },
    BALANCED_GOALS: { collection: 1, shipment: 1, sales: 1, procurement: 1 },
  }
  return map[goalEngine.goalDecision] ?? map.BALANCED_GOALS
}

/**
 * @param {OperationalDomains} domains
 * @param {ReturnType<typeof goalEngineToDomainBias>} bias
 */
export function mergeGoalEngineBias(domains, bias) {
  return {
    ...domains,
    shipment: { ...domains.shipment, score: domains.shipment.score + (bias.shipment ?? 0) },
    collection: { ...domains.collection, score: domains.collection.score + (bias.collection ?? 0) },
    sales: { ...domains.sales, score: domains.sales.score + (bias.sales ?? 0) },
    procurement: { ...domains.procurement, score: domains.procurement.score + (bias.procurement ?? 0) },
  }
}

export {}

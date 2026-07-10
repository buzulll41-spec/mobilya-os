/** @typedef {import('../../contracts/v1/genesis.js').GenesisPredictionDto} GenesisPredictionDto */

/**
 * @param {{
 *   domains: ReturnType<import('../company-manager/PriorityEngine.js').scoreOperationalDomains>
 *   metrics?: ReturnType<import('../company-brain/GoalEngineBridge.js').estimateOperationalMetrics>
 *   todayIso: string
 * }} input
 */
export function buildGenesisPredictions(input) {
  const { domains, metrics, todayIso } = input
  /** @type {GenesisPredictionDto[]} */
  const predictions = []

  if (domains.shipment.pressure >= 2 || metrics?.shipmentAboveTarget) {
    predictions.push({
      id: 'pred-shipment-delay',
      label: 'Yarın teslim gecikecek',
      detail: `Sevk baskısı ${domains.shipment.pressure} sipariş · gecikme riski yüksek`,
      severity: domains.shipment.pressure >= 4 ? 'high' : 'medium',
      horizon: `${todayIso} → yarın`,
    })
  }

  if (metrics?.collectionBelowTarget || domains.collection.pressure >= 2) {
    predictions.push({
      id: 'pred-collection-drop',
      label: 'Yarın tahsilat düşecek',
      detail: metrics
        ? `Tahsilat oranı ~%${metrics.collectionRate} · hedef altında`
        : 'Tahsilat baskısı artıyor',
      severity: metrics?.collectionBelowTarget ? 'high' : 'medium',
      horizon: '24s',
    })
  }

  if (domains.procurement.pressure >= 1 || metrics?.procurementAboveTarget) {
    predictions.push({
      id: 'pred-supply-delay',
      label: 'Yarın tedarik gecikecek',
      detail: `${domains.procurement.pressure} tedarik bekleyen sipariş`,
      severity: domains.procurement.pressure >= 3 ? 'high' : 'low',
      horizon: '24s',
    })
  }

  if (domains.sales.pressure >= 3) {
    predictions.push({
      id: 'pred-stock-pressure',
      label: 'Yarın stok baskısı',
      detail: 'Satış hacmi tedarik hızını aşıyor',
      severity: 'medium',
      horizon: '24s',
    })
  }

  return predictions
}

export {}

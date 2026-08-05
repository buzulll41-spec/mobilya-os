/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionKpiCard} CollectionKpiCard */

/** @type {Record<string, { label?: string, hint?: string }>} */
const KPI_PRESENTATION = {
  'priority-call': {
    label: 'Bugün müdahale edilecek',
    hint: 'Operasyon önceliği',
  },
  'critical-balance': {
    hint: 'Acil tahsilat alanı',
  },
  'total-open': {
    hint: 'Açık alacak portföyü',
  },
  overdue: {
    hint: 'Vadesi geçmiş',
  },
  'avg-rate': {
    hint: 'Portföy ortalaması',
  },
}

/**
 * @param {CollectionKpiCard} kpi
 * @returns {CollectionKpiCard}
 */
export function presentCollectionKpi(kpi) {
  const override = KPI_PRESENTATION[kpi.id]
  if (!override) return kpi
  return {
    ...kpi,
    label: override.label ?? kpi.label,
    hint: override.hint ?? kpi.hint,
  }
}

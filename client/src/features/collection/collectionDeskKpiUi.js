/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionKpiCard} CollectionKpiCard */

const DESK_KPI_IDS = /** @type {const} */ ([
  'total-open',
  'critical-balance',
  'priority-call',
  'overdue',
])

/** @type {Record<string, { label: string, hint?: string | null }>} */
const DESK_LABELS = {
  'total-open': { label: 'Açık Bakiye', hint: null },
  'critical-balance': { label: 'Kritik Dosya', hint: null },
  'priority-call': { label: 'Bugün Aranacak', hint: null },
  overdue: { label: 'Gecikmiş Tahsilat', hint: null },
}

/**
 * @param {CollectionKpiCard} kpi
 * @returns {CollectionKpiCard}
 */
function presentDeskKpi(kpi) {
  const meta = DESK_LABELS[kpi.id]
  if (!meta) return kpi

  if (kpi.id === 'critical-balance') {
    const countMatch = kpi.hint?.match(/(\d+)/)
    const fileCount = countMatch ? countMatch[1] : '0'
    return {
      ...kpi,
      label: meta.label,
      value: fileCount,
      hint: kpi.value,
      filterTarget: kpi.filterTarget,
    }
  }

  return {
    ...kpi,
    label: meta.label,
    hint: meta.hint ?? kpi.hint,
  }
}

/**
 * @param {CollectionKpiCard[]} kpis
 * @returns {CollectionKpiCard[]}
 */
export function selectDeskKpis(kpis) {
  const byId = Object.fromEntries(kpis.map((k) => [k.id, k]))
  return DESK_KPI_IDS.map((id) => byId[id]).filter(Boolean).map(presentDeskKpi)
}

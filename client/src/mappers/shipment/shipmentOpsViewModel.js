import { groupShipmentOpsPipeline, resolveShipmentPipelineColumn } from './shipmentOpsPipeline.js'

/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('./shipmentOpsPipeline.js').ShipmentPipelineColumnId} ShipmentPipelineColumnId */

/**
 * @typedef {{
 *   id: string
 *   label: string
 *   value: string
 *   hint?: string
 *   tone: 'ok' | 'warn' | 'critical' | 'neutral'
 * }} ShipmentOpsKpi
 */

/**
 * @param {ShipmentRowVM[]} rows
 * @param {string} todayIso
 */
export function buildShipmentOpsKpis(rows, todayIso) {
  let todayPlanned = 0
  let inTransit = 0
  let deliveryPending = 0
  let installation = 0
  let issue = 0

  for (const row of rows) {
    const col = resolveShipmentPipelineColumn(row)
    if (!col) continue
    const date = row.plannedShipDate ?? row.shipmentDate ?? ''
    if (col === 'issue') issue += 1
    if (col === 'in_transit') inTransit += 1
    if (col === 'delivered') deliveryPending += 1
    if (col === 'installation') installation += 1
    if ((col === 'planned' || col === 'preparing') && date === todayIso) todayPlanned += 1
  }

  /** @type {ShipmentOpsKpi[]} */
  return [
    {
      id: 'today',
      label: 'Bugün planlanan',
      value: String(todayPlanned),
      hint: todayPlanned ? 'Yükleme / hazırlık' : 'Bugün plan yok',
      tone: todayPlanned > 4 ? 'warn' : 'ok',
    },
    {
      id: 'transit',
      label: 'Yolda',
      value: String(inTransit),
      tone: inTransit > 0 ? 'warn' : 'neutral',
    },
    {
      id: 'delivered',
      label: 'Teslim bekleyen',
      value: String(deliveryPending),
      hint: 'Teslim edildi · montaj öncesi',
      tone: deliveryPending > 0 ? 'neutral' : 'ok',
    },
    {
      id: 'install',
      label: 'Montaj bekleyen',
      value: String(installation),
      tone: installation > 0 ? 'warn' : 'ok',
    },
    {
      id: 'issue',
      label: 'Sorunlu sevk',
      value: String(issue),
      tone: issue > 0 ? 'critical' : 'ok',
    },
  ]
}

/**
 * @param {ShipmentRowVM[]} rows
 * @param {string} todayIso
 */
export function buildShipmentOpsPipelineView(rows, todayIso) {
  return {
    groups: groupShipmentOpsPipeline(rows),
    kpis: buildShipmentOpsKpis(rows, todayIso),
  }
}

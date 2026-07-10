import { addDays } from '../data/constants.js'
import { formatTry } from '../data/dashboardHelpers.js'
import { formatShortDate } from './dates.js'
import { remainingBalance } from './orderFinance.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @typedef {'critical' | 'warning' | 'info'} OperationalAlarmLevel
 * @typedef {'termin' | 'missing' | 'ssh' | 'shipment' | 'install' | 'finance'} OperationalAlarmCategory
 *
 * @typedef {Object} OperationalAlarm
 * @property {string} id
 * @property {OperationalAlarmLevel} level
 * @property {OperationalAlarmCategory} category
 * @property {string} title
 * @property {string} detail
 * @property {string} orderId
 * @property {string} customer
 */

const LEVEL_RANK = { critical: 0, warning: 1, info: 2 }

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} todayIso
 * @returns {OperationalAlarm[]}
 */
export function buildOperationalAlarms(orders, listItemDtos, todayIso) {
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const soonLimit = addDays(todayIso, 2)
  /** @type {OperationalAlarm[]} */
  const alarms = []

  for (const order of orders) {
    if (order.status === 'Teslim Edildi') continue
    const dto = dtoById.get(order.id)
    const base = { orderId: order.id, customer: order.customer }

    if (order.dueDate && order.dueDate < todayIso) {
      alarms.push({
        ...base,
        id: `${order.id}-termin`,
        level: 'critical',
        category: 'termin',
        title: 'Termin geçti',
        detail: `Termin ${formatShortDate(order.dueDate)} — acil müdahale`,
      })
    }

    const openMissing = dto?.openMissingItemsCount ?? (order.status === 'Eksik Var' ? 1 : 0)
    if (openMissing > 0) {
      alarms.push({
        ...base,
        id: `${order.id}-missing`,
        level: 'critical',
        category: 'ssh',
        title: 'Eksik Parça',
        detail:
          openMissing === 1
            ? '1 eksik parça sevki geciktirebilir. SSH takibi bekliyor.'
            : `${openMissing} eksik parça sevki geciktirebilir. SSH takibi bekliyor.`,
      })
    }

    const shipDate =
      dto?.shipmentSummaryNextPlannedDate ?? dto?.plannedShipmentDate ?? order.shipmentDate ?? null
    if (shipDate && shipDate >= todayIso && shipDate <= soonLimit) {
      alarms.push({
        ...base,
        id: `${order.id}-ship-soon`,
        level: 'warning',
        category: 'shipment',
        title: 'Sevk tarihi yakın',
        detail: `Plan: ${formatShortDate(shipDate)}`,
      })
    }

    if (dto?.installationPending) {
      alarms.push({
        ...base,
        id: `${order.id}-install`,
        level: 'warning',
        category: 'install',
        title: 'Montaj bekliyor',
        detail: 'Teslim sonrası montaj ekibi atanmalı',
      })
    }

    if (dto?.hasShipmentIssue) {
      alarms.push({
        ...base,
        id: `${order.id}-ship-issue`,
        level: 'critical',
        category: 'shipment',
        title: 'Sevk sorunu',
        detail: 'Operasyon ekibi bilgilendirilmeli',
      })
    }

    const rem = remainingBalance(order)
    const ratio = order.amount > 0 ? rem / order.amount : 0
    if (rem > 0) {
      if (ratio >= 0.75 || rem >= 120_000) {
        alarms.push({
          ...base,
          id: `${order.id}-finance-critical`,
          level: 'critical',
          category: 'finance',
          title: 'Yüksek bakiye riski',
          detail: `Kalan ${formatTry(rem)} (${Math.round(ratio * 100)}%)`,
        })
      } else if (ratio >= 0.45 || rem >= 50_000 || dto?.hasOverdueBalance) {
        alarms.push({
          ...base,
          id: `${order.id}-finance`,
          level: 'warning',
          category: 'finance',
          title: 'Riskli ödeme',
          detail: `Kalan ${formatTry(rem)}`,
        })
      }
    }

    if ((dto?.inTransitShipmentCount ?? 0) > 0 && !dto?.installationPending) {
      alarms.push({
        ...base,
        id: `${order.id}-transit`,
        level: 'info',
        category: 'shipment',
        title: 'Yolda',
        detail: `${dto.inTransitShipmentCount} sevk hareketi devam ediyor`,
      })
    }
  }

  return alarms.sort((a, b) => {
    const lr = LEVEL_RANK[a.level] - LEVEL_RANK[b.level]
    if (lr !== 0) return lr
    return a.customer.localeCompare(b.customer, 'tr')
  })
}

/**
 * @param {OperationalAlarm[]} alarms
 */
export function summarizeOperationalAlarms(alarms) {
  return {
    critical: alarms.filter((a) => a.level === 'critical').length,
    warning: alarms.filter((a) => a.level === 'warning').length,
    info: alarms.filter((a) => a.level === 'info').length,
    total: alarms.length,
  }
}

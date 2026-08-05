import {
  isCollectionOverdue,
  isDeliveredOpenBalance,
  pickPriorityCallRows,
} from '../../mappers/collection/collectionCommandCenterModel.js'
import { remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */

/**
 * @typedef {Object} CollectionOpsTask
 * @property {string} id
 * @property {string} label
 */

/**
 * @param {CollectionRowVM[]} openRows
 * @param {string} todayIso
 * @returns {CollectionOpsTask[]}
 */
export function buildTodayOpsTasks(openRows, todayIso) {
  /** @type {CollectionOpsTask[]} */
  const tasks = []

  const priorityCards = pickPriorityCallRows(openRows, todayIso)
  for (const card of priorityCards.slice(0, 6)) {
    tasks.push({
      id: `call-${card.row.id}`,
      label: `${card.row.customer} ara`,
    })
  }

  const deliveredOpenCount = openRows.filter((row) => isDeliveredOpenBalance(row)).length
  if (deliveredOpenCount > 0) {
    tasks.push({
      id: 'delivered-open-review',
      label: `Teslim edilmiş açık bakiye kontrolü (${deliveredOpenCount})`,
    })
  }

  const overdueCount = openRows.filter((row) => isCollectionOverdue(row, todayIso)).length
  if (overdueCount > 0) {
    tasks.push({
      id: 'overdue-review',
      label: `Gecikmiş tahsilat görüşmesi (${overdueCount})`,
    })
  }

  const openCount = openRows.filter((row) => remainingBalance(row) > 0.009).length
  if (openCount > 0 && tasks.length === 0) {
    tasks.push({
      id: 'portfolio-review',
      label: 'Açık tahsilat portföyünü gözden geçir',
    })
  }

  return tasks
}

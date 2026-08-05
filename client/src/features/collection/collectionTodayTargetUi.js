import { formatTry } from '../../data/dashboardHelpers.js'
import {
  isCollectionOverdue,
  isDeliveredOpenBalance,
  pickPriorityCallRows,
} from '../../mappers/collection/collectionCommandCenterModel.js'

/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */

/**
 * Sunum katmanı — mevcut model fonksiyonlarını salt okunur kullanır.
 * @param {CollectionRowVM[]} openRows
 * @param {string} todayIso
 */
export function buildCollectionTodayTarget(openRows, todayIso) {
  const priorityCards = pickPriorityCallRows(openRows, todayIso)
  const collectibleTotal = priorityCards.reduce((sum, card) => sum + card.remaining, 0)
  const deliveredOpenCount = openRows.filter((row) => isDeliveredOpenBalance(row)).length
  const overdueCount = openRows.filter((row) => isCollectionOverdue(row, todayIso)).length

  return {
    callCount: priorityCards.length,
    collectibleTotalLabel: formatTry(collectibleTotal),
    deliveredOpenCount,
    overdueCount,
  }
}

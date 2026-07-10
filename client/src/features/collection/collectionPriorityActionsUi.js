import { pickPriorityCallRows } from '../../mappers/collection/collectionCommandCenterModel.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { buildCollectionSuggestedAction } from './collectionSuggestedActionUi.js'

/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */

/**
 * @typedef {Object} CollectionPriorityAction
 * @property {string} id
 * @property {string} customer
 * @property {string} orderNo
 * @property {string} remainingLabel
 * @property {string} actionLabel
 * @property {CollectionRowVM} row
 */

/**
 * @param {import('./collectionSuggestedActionUi.js').CollectionSuggestedAction} suggested
 */
function actionShortLabel(suggested) {
  if (suggested.title.includes('Ara')) return suggested.title
  if (suggested.title.includes('Sevk')) return 'Sevk öncesi tahsilat'
  return 'Tahsilat görüşmesi'
}

/**
 * @param {CollectionRowVM[]} openRows
 * @param {string} todayIso
 * @param {number} [limit]
 * @returns {CollectionPriorityAction[]}
 */
export function buildPriorityActions(openRows, todayIso, limit = 5) {
  const cards = pickPriorityCallRows(openRows, todayIso, limit)
  return cards.map((card) => {
    const suggested = buildCollectionSuggestedAction(card, todayIso)
    return {
      id: card.row.id,
      customer: card.row.customer,
      orderNo: card.orderNo,
      remainingLabel: formatTry(card.remaining),
      actionLabel: actionShortLabel(suggested),
      row: card.row,
    }
  })
}

import { formatTry } from '../../data/dashboardHelpers.js'
import { isDeliveredOpenBalance } from '../../mappers/collection/collectionCommandCenterModel.js'
import { resolveCollectionOperationCategory } from './collectionOperationCategoryUi.js'
import { buildCollectionSuggestedAction } from './collectionSuggestedActionUi.js'

/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */

/**
 * @typedef {Object} CollectionDeskTableRow
 * @property {CollectionCardModel} card
 * @property {number | null} priorityRank
 * @property {string} priorityMark
 * @property {'critical' | 'risky' | 'watch' | 'normal'} rowTone
 * @property {string} statusLabel
 * @property {string} remainingLabel
 * @property {number} paidPct
 * @property {string} nextActionLabel
 * @property {string} phone
 */

/**
 * @param {import('./collectionSuggestedActionUi.js').CollectionSuggestedAction} suggested
 */
function nextActionShortLabel(suggested) {
  if (suggested.title.includes('Ara')) return 'Ara'
  if (suggested.title.includes('Sevk')) return 'Sevk öncesi'
  return 'Takip'
}

/**
 * @param {CollectionCardModel} card
 */
function statusLabelForRow(card) {
  const { row } = card
  if (isDeliveredOpenBalance(row)) return 'Teslim edildi · bakiye açık'
  if (row.status?.trim()) return row.status.trim()
  return card.healthLabel
}

/**
 * @param {CollectionCardModel} card
 * @param {string} todayIso
 * @param {number | null} priorityRank
 * @returns {CollectionDeskTableRow}
 */
export function buildDeskTableRow(card, todayIso, priorityRank) {
  const categoryId = resolveCollectionOperationCategory(card, todayIso)
  const suggested = buildCollectionSuggestedAction(card, todayIso)
  const priorityMark =
    categoryId === 'critical'
      ? '🔴'
      : categoryId === 'risky'
        ? '🟠'
        : categoryId === 'watch'
          ? '🟡'
          : '🟢'

  const phone = card.row.phone?.trim() || card.row.phone2?.trim() || ''

  return {
    card,
    priorityRank,
    priorityMark,
    rowTone:
      categoryId === 'critical'
        ? 'critical'
        : categoryId === 'risky' || categoryId === 'watch'
          ? 'risky'
          : 'normal',
    statusLabel: statusLabelForRow(card),
    remainingLabel: formatTry(card.remaining),
    paidPct: Math.min(100, Math.max(0, card.paidPct)),
    nextActionLabel: nextActionShortLabel(suggested),
    phone,
  }
}

/**
 * @param {CollectionCardModel[]} cards
 * @param {string} todayIso
 * @param {number} topLimit
 */
export function buildDeskTableRows(cards, todayIso, topLimit = 10) {
  return cards.map((card, index) => {
    const rank = index < topLimit ? index + 1 : null
    return buildDeskTableRow(card, todayIso, rank)
  })
}

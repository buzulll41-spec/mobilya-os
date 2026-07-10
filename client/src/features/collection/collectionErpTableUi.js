import { formatCustomerPhonesCompact } from '../orders/newOrderWizardModel.js'
import { formatShortDate } from '../../utils/dates.js'
import { resolveCollectionOperationCategory } from './collectionOperationCategoryUi.js'
import { buildCollectionSuggestedAction } from './collectionSuggestedActionUi.js'
import { buildDeskTableRow } from './collectionOperationTableUi.js'

/** @typedef {import('./collectionOperationTableUi.js').CollectionDeskTableRow} CollectionDeskTableRow */
/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */

/**
 * @typedef {'critical' | 'high' | 'medium' | 'normal'} ErpStatusBadgeLevel
 */

/**
 * @typedef {Object} ErpStatusBadge
 * @property {ErpStatusBadgeLevel} level
 * @property {string} label
 */

/**
 * Sunum katmanı — kartın mevcut stripe/health alanlarını kullanır (model dosyasına dokunmaz).
 * @param {CollectionCardModel} card
 * @param {import('./collectionOperationCategoryUi.js').CollectionOperationCategoryId} categoryId
 * @returns {ErpStatusBadge}
 */
function statusBadgeFromCard(card, categoryId) {
  if (card.stripeTone === 'critical') {
    return { level: 'critical', label: 'Kritik' }
  }
  if (card.stripeTone === 'warning') {
    if (categoryId === 'watch') {
      return { level: 'medium', label: 'Takip' }
    }
    return { level: 'high', label: 'Yüksek' }
  }
  if (categoryId === 'watch') {
    return { level: 'medium', label: 'Takip' }
  }
  return { level: 'normal', label: 'Normal' }
}

/**
 * @param {string} phone
 */
function phoneDigits(phone) {
  return phone.replace(/\D/g, '')
}

/**
 * @param {CollectionCardModel} card
 * @param {string} todayIso
 */
export function buildLastOperationLabel(card, todayIso) {
  void todayIso
  const { row } = card
  if (row.lastPaymentAt) {
    return `Ödeme · ${formatShortDate(row.lastPaymentAt.slice(0, 10))}`
  }
  return 'Veri yok'
}

/**
 * @param {CollectionCardModel} card
 * @param {string} todayIso
 */
export function buildLastContactNote(card, todayIso) {
  const note = card.row.notes?.trim()
  if (note) return note
  return buildCollectionSuggestedAction(card, todayIso).detail
}

/**
 * @param {CollectionCardModel} card
 * @param {string} todayIso
 * @param {number | null} priorityRank
 * @returns {CollectionErpTableRow}
 */
export function buildErpTableRow(card, todayIso, priorityRank) {
  const base = buildDeskTableRow(card, todayIso, priorityRank)
  const categoryId = resolveCollectionOperationCategory(card, todayIso)
  const suggested = buildCollectionSuggestedAction(card, todayIso)
  const phone = base.phone
  const hasPhone = Boolean(phone)
  const digits = hasPhone ? phoneDigits(phone) : ''

  return {
    ...base,
    statusBadge: statusBadgeFromCard(card, categoryId),
    riskLabel: card.riskLabel,
    lastOperationLabel: buildLastOperationLabel(card, todayIso),
    phoneDisplay: hasPhone
      ? formatCustomerPhonesCompact({ phone: card.row.phone, phone2: card.row.phone2 })
      : null,
    nextActionFull: suggested.title,
    telHref: hasPhone ? `tel:${phone.replace(/\s/g, '')}` : null,
    whatsappHref: digits ? `https://wa.me/${digits.replace(/^0/, '90')}` : null,
  }
}

/**
 * @param {CollectionCardModel[]} cards
 * @param {string} todayIso
 * @param {number} topLimit
 */
export function buildErpTableRows(cards, todayIso, topLimit = 10) {
  return cards.map((card, index) => {
    const rank = index < topLimit ? index + 1 : null
    return buildErpTableRow(card, todayIso, rank)
  })
}

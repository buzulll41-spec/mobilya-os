/** @typedef {import('../../mappers/ssh/sshMissingPartsModel.js').SshMissingPartCard} SshMissingPartCard */
import { getOrderPilotKind } from '../../lib/pilotRecordHeuristics.js'
/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpOpsTableRow} ErpOpsTableRow */
/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpRowTone} ErpRowTone */

/** @typedef {'all' | 'locked' | 'waiting' | 'arrived' | 'ready'} SshQuickFilterId */

export const SSH_QUICK_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tüm kayıtlar' },
  { id: 'locked', label: 'Sevk kilidi' },
  { id: 'waiting', label: 'Bekleniyor' },
  { id: 'arrived', label: 'Parça geldi' },
  { id: 'ready', label: 'Sevke hazır' },
])

/**
 * @param {SshMissingPartCard} card
 * @returns {ErpRowTone}
 */
function toneForCard(card) {
  if (card.locksShipment) return 'critical'
  if (card.uiStatus === 'waiting') return 'warning'
  if (card.uiStatus === 'ready') return 'success'
  return 'neutral'
}

/**
 * @param {SshMissingPartCard} card
 * @returns {ErpOpsTableRow}
 */
export function sshCardToErpTableRow(card) {
  const tone = toneForCard(card)
  return {
    id: card.id,
    orderNo: card.orderNumber,
    customer: card.customer,
    pilotKind: getOrderPilotKind({
      id: card.orderId,
      orderNumber: card.orderNumber,
      customer: card.customer,
    }),
    category: card.riskLabel,
    statusLabel: card.statusLabel,
    dateLabel: card.estimatedArrivalLabel,
    lastActionLabel: card.partTitle,
    headerSummary: card.headerSummary,
    nextActionLabel: card.locksShipment ? 'Sevk kilidi' : 'Takip',
    actionButtonLabel: 'SSH aç',
    tone,
    priorityRank: card.locksShipment ? 1 : card.uiStatus === 'waiting' ? 2 : null,
  }
}

/**
 * @param {SshMissingPartCard[]} cards
 * @param {SshQuickFilterId} filterId
 */
export function filterSshCards(cards, filterId) {
  if (filterId === 'all') return cards
  return cards.filter((c) => {
    switch (filterId) {
      case 'locked':
        return c.locksShipment
      case 'waiting':
        return c.uiStatus === 'waiting'
      case 'arrived':
        return c.uiStatus === 'arrived'
      case 'ready':
        return c.uiStatus === 'ready' || c.uiStatus === 'resolved'
      default:
        return true
    }
  })
}

/**
 * @param {SshMissingPartCard[]} cards
 */
export function buildSshOpsSummary(cards) {
  const locked = cards.filter((c) => c.locksShipment).length
  const completed = cards.filter((c) => c.uiStatus === 'ready' || c.uiStatus === 'resolved').length

  return [
    { id: 'open', label: 'Açık SSH', value: String(cards.length) },
    {
      id: 'locked',
      label: 'Kritik Kayıt',
      value: String(locked),
      valueTone: locked > 0 ? /** @type {const} */ ('critical') : undefined,
    },
    {
      id: 'completed',
      label: 'Tamamlanan',
      value: String(completed),
      valueTone: completed > 0 ? /** @type {const} */ ('success') : undefined,
    },
  ]
}

/**
 * @param {SshMissingPartCard[]} cards
 * @param {SshQuickFilterId} filterId
 */
export function countSshFilter(cards, filterId) {
  return filterSshCards(cards, filterId).length
}

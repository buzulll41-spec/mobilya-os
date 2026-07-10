import { formatTry } from '../../data/dashboardHelpers.js'
import {
  isCollectionOverdue,
  isDeliveredOpenBalance,
  isPreShipmentCollection,
} from '../../mappers/collection/collectionCommandCenterModel.js'

/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */

/**
 * @typedef {'critical' | 'warning' | 'neutral'} CollectionActionTone
 */

/**
 * @typedef {Object} CollectionSuggestedAction
 * @property {string} title
 * @property {string} icon
 * @property {string} detail
 * @property {CollectionActionTone} tone
 */

/**
 * @param {string} fromIso
 * @param {string} toIso
 */
function daysBetween(fromIso, toIso) {
  return Math.floor(
    (Date.parse(`${toIso}T12:00:00`) - Date.parse(`${fromIso}T12:00:00`)) / 86_400_000,
  )
}

/**
 * @param {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} row
 * @param {string} todayIso
 */
function overdueDaysLabel(row, todayIso) {
  if (row.dueDate && row.dueDate < todayIso) {
    const days = daysBetween(row.dueDate, todayIso)
    return days >= 1 ? `${days} gündür ödeme alınmadı.` : 'Termin gecikti, tahsilat bekleniyor.'
  }
  if (row.lastPaymentAt) {
    const paidOn = row.lastPaymentAt.slice(0, 10)
    const days = daysBetween(paidOn, todayIso)
    if (days >= 14) return `${days} gündür ödeme alınmadı.`
  }
  return 'Gecikmiş tahsilat — müşteriyle görüşün.'
}

/**
 * @param {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} row
 * @param {string} todayIso
 */
function preShipmentDetail(row, todayIso) {
  const shipDate = row.shipmentDate ?? row.dueDate
  if (!shipDate) return 'Sevk tarihi yaklaşıyor.'
  const days = daysBetween(todayIso, shipDate)
  if (days <= 0) return 'Sevk bugün veya gecikti — tahsilatı netleştirin.'
  if (days <= 7) return `Sevk ${days} gün içinde — tahsilatı tamamlayın.`
  return 'Sevk tarihi yaklaşıyor.'
}

/**
 * Mevcut risk modelinden salt okunur türetilmiş öneri — iş mantığına dokunmaz.
 * @param {CollectionCardModel} card
 * @param {string} todayIso
 * @returns {CollectionSuggestedAction}
 */
export function buildCollectionSuggestedAction(card, todayIso) {
  const { row, remaining } = card
  const remainingLabel = formatTry(remaining)

  if (isDeliveredOpenBalance(row)) {
    return {
      title: 'Müşteriyi Ara',
      icon: '📞',
      detail: `Teslim edildi ancak ${remainingLabel} bakiye açık.`,
      tone: 'critical',
    }
  }

  if (isCollectionOverdue(row, todayIso)) {
    return {
      title: 'Tahsilat Görüşmesi',
      icon: '📞',
      detail: overdueDaysLabel(row, todayIso),
      tone: 'critical',
    }
  }

  if (isPreShipmentCollection(row, todayIso)) {
    return {
      title: 'Sevk Öncesi Tahsilat',
      icon: '📞',
      detail: preShipmentDetail(row, todayIso),
      tone: 'warning',
    }
  }

  return {
    title: 'Tahsilat Görüşmesi',
    icon: '📞',
    detail: `${remainingLabel} açık bakiye — ${card.healthLabel}.`,
    tone: 'neutral',
  }
}

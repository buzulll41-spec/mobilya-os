/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */

/**
 * @typedef {{ level: 'critical' | 'high' | 'watch' | 'normal', label: string, emoji: string }} CollectionRiskBadgeVisual
 */

/**
 * Görsel risk rozeti — model hesaplarına dokunmaz.
 * @param {CollectionCardModel} card
 * @returns {CollectionRiskBadgeVisual}
 */
export function buildCollectionRiskBadgeVisual(card) {
  const { stripeTone, paidPct } = card

  if (stripeTone === 'critical') {
    return { level: 'critical', label: 'KRİTİK', emoji: '🔴' }
  }
  if (stripeTone === 'warning') {
    if (paidPct < 20) {
      return { level: 'high', label: 'YÜKSEK', emoji: '🟠' }
    }
    return { level: 'watch', label: 'ORTA', emoji: '🟡' }
  }
  if (paidPct >= 50) {
    return { level: 'normal', label: 'NORMAL', emoji: '🟢' }
  }
  return { level: 'watch', label: 'ORTA', emoji: '🟡' }
}

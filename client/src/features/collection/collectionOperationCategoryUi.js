import {
  isCollectionCritical,
  isCollectionOverdue,
  isDeliveredOpenBalance,
  isHighBalanceLowPaymentRate,
  isHighCollectionBalance,
  isPreShipmentCollection,
} from '../../mappers/collection/collectionCommandCenterModel.js'

/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */

/** @typedef {'critical' | 'risky' | 'watch' | 'normal'} CollectionOperationCategoryId */

/**
 * @typedef {Object} CollectionOperationCategoryMeta
 * @property {CollectionOperationCategoryId} id
 * @property {string} title
 * @property {string} sectionTitle
 * @property {string} emoji
 * @property {'critical' | 'high' | 'watch' | 'normal'} badgeLevel
 */

export const COLLECTION_OPERATION_CATEGORIES = /** @type {const} */ ([
  {
    id: 'critical',
    title: 'Kritik tahsilat',
    sectionTitle: 'Kritik tahsilatlar',
    emoji: '🔴',
    badgeLevel: 'critical',
  },
  {
    id: 'risky',
    title: 'Riskli tahsilat',
    sectionTitle: 'Riskli tahsilatlar',
    emoji: '🟠',
    badgeLevel: 'high',
  },
  {
    id: 'watch',
    title: 'Takip gerekiyor',
    sectionTitle: 'Takip gerekenler',
    emoji: '🟡',
    badgeLevel: 'watch',
  },
  {
    id: 'normal',
    title: 'Normal takip',
    sectionTitle: 'Normal takip',
    emoji: '🟢',
    badgeLevel: 'normal',
  },
])

/** @type {Record<CollectionOperationCategoryId, CollectionOperationCategoryMeta>} */
export const COLLECTION_OPERATION_CATEGORY_BY_ID = Object.fromEntries(
  COLLECTION_OPERATION_CATEGORIES.map((c) => [c.id, c]),
)

/**
 * @param {CollectionCardModel} card
 * @param {string} todayIso
 * @returns {CollectionOperationCategoryId}
 */
export function resolveCollectionOperationCategory(card, todayIso) {
  const { row, remaining, collected, stripeTone } = card
  const total = row.amount ?? 0

  if (
    isCollectionCritical(row, todayIso) ||
    stripeTone === 'critical' ||
    isDeliveredOpenBalance(row) ||
    isCollectionOverdue(row, todayIso)
  ) {
    return 'critical'
  }

  if (
    stripeTone === 'warning' ||
    isHighBalanceLowPaymentRate(row) ||
    isHighCollectionBalance(remaining, total)
  ) {
    return 'risky'
  }

  if (isPreShipmentCollection(row, todayIso) || (collected > 0.009 && remaining > 0.009)) {
    return 'watch'
  }

  return 'normal'
}

/**
 * @param {CollectionCardModel} card
 * @param {string} todayIso
 * @returns {CollectionOperationCategoryMeta}
 */
export function getCollectionOperationCategoryMeta(card, todayIso) {
  const id = resolveCollectionOperationCategory(card, todayIso)
  return COLLECTION_OPERATION_CATEGORY_BY_ID[id]
}

/**
 * @param {CollectionCardModel[]} cards
 * @param {string} todayIso
 * @returns {Array<CollectionOperationCategoryMeta & { cards: CollectionCardModel[] }>}
 */
export function groupCollectionCardsByOperation(cards, todayIso) {
  /** @type {Record<CollectionOperationCategoryId, CollectionCardModel[]>} */
  const buckets = { critical: [], risky: [], watch: [], normal: [] }

  for (const card of cards) {
    const id = resolveCollectionOperationCategory(card, todayIso)
    buckets[id].push(card)
  }

  return COLLECTION_OPERATION_CATEGORIES.map((meta) => ({
    ...meta,
    cards: buckets[meta.id],
  })).filter((group) => group.cards.length > 0)
}

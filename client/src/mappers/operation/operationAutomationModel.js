import { DEMO_TODAY } from '../../data/constants.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import {
  buildCollectionCardModel,
  isCollectionCritical,
  isCollectionOverdue,
  sortCollectionByRisk,
} from '../collection/collectionCommandCenterModel.js'
import { buildCollectionSuggestedAction } from '../../features/collection/collectionSuggestedActionUi.js'
import { buildSshMissingPartsQueue } from '../ssh/sshMissingPartsModel.js'
import {
  publishReadinessMissingImage,
  publishReadinessMissingSeo,
  publishReadinessMissingVariant,
  resolvePublishReadiness,
} from '../../features/product/publishReadinessUi.js'
import { resolveProductHealthScore } from '../../features/product/productMasterCenterUi.js'
import { remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */
/** @typedef {import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId} OpsDeepLinkFilterId */

/**
 * @param {string} fromIso
 * @param {string} toIso
 */
function daysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return 0
  return Math.max(
    0,
    Math.floor(
      (Date.parse(`${toIso}T12:00:00`) - Date.parse(`${fromIso.slice(0, 10)}T12:00:00`)) / 86_400_000,
    ),
  )
}

/**
 * @param {number} totalMinutes
 */
export function formatEstimatedDuration(totalMinutes) {
  if (totalMinutes <= 0) return '0 dk'
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours === 0) return `${mins} dk`
  if (mins === 0) return `${hours} saat`
  return `${hours} saat ${mins} dk`
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
function collectionOverdueDays(row, todayIso) {
  if (row.dueDate && row.dueDate < todayIso) return daysBetween(row.dueDate, todayIso)
  if (row.lastPaymentAt) return daysBetween(row.lastPaymentAt.slice(0, 10), todayIso)
  if (row.hasOverdueBalance) return 30
  return 0
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
function productMissingShortLabels(product) {
  /** @type {string[]} */
  const labels = []
  const health = resolveProductHealthScore(product)
  const readiness = resolvePublishReadiness(product)

  if (publishReadinessMissingImage(product) || !health.checks.hasHeroImage) {
    if (!labels.includes('Görsel')) labels.push('Görsel')
  }
  if (publishReadinessMissingSeo(product) || !health.checks.hasSeoTitle) {
    if (!labels.includes('SEO')) labels.push('SEO')
  }
  if (publishReadinessMissingVariant(product) || !health.checks.hasActiveVariant) {
    if (!labels.includes('Varyant')) labels.push('Varyant')
  }
  if (!health.checks.hasShortDescription && !readiness.checks.hasDescription) {
    if (!labels.includes('Açıklama')) labels.push('Açıklama')
  }
  if (!readiness.checks.hasCategory && !product.category?.trim()) {
    if (!labels.includes('Kategori')) labels.push('Kategori')
  }

  if (labels.length === 0 && health.missingLabels.length > 0) {
    return health.missingLabels.slice(0, 3).map((l) => l.replace(/ yok$/i, ''))
  }
  return labels
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
function estimateProductFixMinutes(product) {
  const missing = productMissingShortLabels(product)
  /** @type {Record<string, number>} */
  const weights = {
    Görsel: 5,
    SEO: 3,
    Varyant: 8,
    Açıklama: 4,
    Kategori: 2,
  }
  const sum = missing.reduce((s, label) => s + (weights[label] ?? 4), 0)
  return Math.max(5, sum || 5)
}

/**
 * @param {{
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentRowVMs: ShipmentRowVM[]
 *   missingItems?: import('../../contracts/v1/missingItem.js').MissingItemDto[]
 *   productItems: ProductMasterCenterRowVm[]
 *   todayIso?: string
 * }} input
 */
export function buildOperationAutomationView(input) {
  const {
    orders,
    listItemDtos,
    collectionRows,
    missingItems = [],
    productItems,
    todayIso = DEMO_TODAY,
  } = input

  const dtoByOrderId = new Map(listItemDtos.map((d) => [d.id, d]))

  const openCollections = collectionRows.filter((r) => remainingBalance(r) > 0.009)
  const criticalCollections = openCollections.filter((r) => isCollectionCritical(r, todayIso))
  const overdueCollections = openCollections.filter((r) => isCollectionOverdue(r, todayIso))

  const overdueShipments = orders.filter(
    (o) => o.shipmentDate && o.shipmentDate < todayIso && o.status !== 'Teslim Edildi',
  )

  const sshQueue = buildSshMissingPartsQueue({
    orders,
    listItemDtos,
    missingItems,
    todayIso,
  })
  const openSsh = sshQueue.filter((c) => c.locksShipment !== false)

  const productCandidates = productItems.filter(
    (p) =>
      !resolvePublishReadiness(p).isReadyToPublish ||
      resolveProductHealthScore(p).score < 80,
  )

  const collectionRecommendations = sortCollectionByRisk(
    overdueCollections.length > 0 ? overdueCollections : criticalCollections,
    todayIso,
  )
    .slice(0, 10)
    .map((row) => {
      const card = buildCollectionCardModel(row, todayIso)
      const suggested = buildCollectionSuggestedAction(card, todayIso)
      const overdueDays = collectionOverdueDays(row, todayIso)
      return {
        id: row.id,
        customer: row.customer ?? row.id,
        debtLabel: formatTry(remainingBalance(row)),
        overdueLabel:
          overdueDays > 0
            ? `Son ödeme: ${overdueDays} gün geçmiş`
            : suggested.detail,
        suggestions: [
          suggested.title === 'Müşteriyi Ara' || suggested.title === 'Tahsilat Görüşmesi'
            ? 'Telefon görüşmesi yap.'
            : `${suggested.title}.`,
        ],
        tone: suggested.tone === 'neutral' ? 'warning' : suggested.tone,
        navTarget: 'collection',
        navFilter: /** @type {OpsDeepLinkFilterId} */ (
          isCollectionCritical(row, todayIso) ? 'critical' : 'overdue'
        ),
        estimatedMinutes: isCollectionCritical(row, todayIso) ? 8 : 5,
      }
    })

  const shipmentRecommendations = overdueShipments.slice(0, 10).map((order) => {
    const dto = dtoByOrderId.get(order.id)
    const orderNo = dto?.orderNumber ?? order.orderNumber ?? order.id
    const daysLate = order.shipmentDate ? daysBetween(order.shipmentDate, todayIso) : 0
    return {
      id: order.id,
      orderLabel: orderNo,
      statusLabel: daysLate > 0 ? `Sevk tarihi ${daysLate} gün geçmiş.` : 'Sevk tarihi geçmiş.',
      suggestions: ['Müşteri ara.', 'Yeni sevk tarihi oluştur.'],
      tone: /** @type {'critical'} */ ('critical'),
      navTarget: 'shipment-ops',
      navFilter: /** @type {OpsDeepLinkFilterId} */ ('overdue'),
      estimatedMinutes: 10,
    }
  })

  const sshRecommendations = openSsh.slice(0, 10).map((card) => {
    const openDaysMatch = card.headerSummary?.match(/(\d+) gün açık/)
    const openDays = openDaysMatch ? Number.parseInt(openDaysMatch[1], 10) : 0
    return {
      id: card.id,
      orderId: card.orderId,
      title: card.partTitle || 'Eksik Parça',
      customer: card.customer,
      openDaysLabel: openDays > 0 ? `Açık gün: ${openDays}` : 'Açık kayıt',
      suggestions: ['Tedarikçi aranmalı.'],
      tone: card.locksShipment ? /** @type {'critical'} */ ('critical') : /** @type {'warning'} */ ('warning'),
      navTarget: 'ssh-service',
      navFilter: /** @type {OpsDeepLinkFilterId} */ ('locked'),
      estimatedMinutes: 15,
    }
  })

  const productRecommendations = productCandidates
    .sort(
      (a, b) =>
        resolveProductHealthScore(a).score - resolveProductHealthScore(b).score ||
        a.name.localeCompare(b.name, 'tr'),
    )
    .slice(0, 12)
    .map((product) => {
      const health = resolveProductHealthScore(product)
      const missing = productMissingShortLabels(product)
      const fixMinutes = estimateProductFixMinutes(product)
      return {
        id: product.id,
        name: product.name ?? product.productCode ?? product.id,
        healthScore: health.score,
        missingLabels: missing,
        fixMinutesLabel: `${fixMinutes} dakika`,
        suggestions: missing.length > 0 ? [`Eksikleri tamamla: ${missing.join(', ')}.`] : ['Ürün kartını gözden geçir.'],
        tone: health.score < 50 ? /** @type {'critical'} */ ('critical') : /** @type {'warning'} */ ('warning'),
        navTarget: 'product-publish-readiness',
        navFilter: /** @type {OpsDeepLinkFilterId} */ (
          publishReadinessMissingImage(product) ? 'missing-image' : 'missing-variant'
        ),
        estimatedMinutes: fixMinutes,
      }
    })

  const gainCounts = {
    criticalCollections: criticalCollections.length,
    shipments: overdueShipments.length,
    ssh: openSsh.length,
    products: productCandidates.length,
  }

  const totalEstimatedMinutes =
    criticalCollections.length * 8 +
    Math.max(0, overdueShipments.length - 0) * 10 +
    openSsh.length * 15 +
    productCandidates.reduce((s, p) => s + estimateProductFixMinutes(p), 0)

  const gainSummary = {
    counts: gainCounts,
    totalEstimatedMinutes,
    totalEstimatedLabel: formatEstimatedDuration(totalEstimatedMinutes),
    headline: 'Bugün yapılacak:',
    items: [
      { tone: gainCounts.criticalCollections > 0 ? 'critical' : 'neutral', text: `${gainCounts.criticalCollections} kritik tahsilat` },
      { tone: gainCounts.shipments > 0 ? 'critical' : 'neutral', text: `${gainCounts.shipments} sevk` },
      { tone: gainCounts.ssh > 0 ? 'warning' : 'neutral', text: `${gainCounts.ssh} SSH` },
      { tone: gainCounts.products > 0 ? 'warning' : 'neutral', text: `${gainCounts.products} ürün` },
    ],
  }

  return {
    gainSummary,
    collectionRecommendations,
    shipmentRecommendations,
    sshRecommendations,
    productRecommendations,
    totals: {
      recommendations:
        collectionRecommendations.length +
        shipmentRecommendations.length +
        sshRecommendations.length +
        productRecommendations.length,
    },
  }
}

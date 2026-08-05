import { DEMO_TODAY } from '../../data/constants.js'
import { buildSshMissingPartsQueue } from '../ssh/sshMissingPartsModel.js'
import {
  publishReadinessMissingImage,
  publishReadinessMissingVariant,
} from '../../features/product/publishReadinessUi.js'
import { isCollectionCritical, isCollectionOverdue } from '../collection/collectionCommandCenterModel.js'
import {
  buildExecutiveCenterView,
  computeGeneralOperationScoreBundle,
  last7DayIsos,
  operationScoreTone,
} from '../executive/executiveCenterModel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */
/** @typedef {import('../../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto} ProfitabilityResponseDto */
/** @typedef {import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId} OpsDeepLinkFilterId */

/**
 * @param {string} iso
 */
function shortDayLabel(iso) {
  const dt = new Date(`${iso}T12:00:00`)
  return dt.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' })
}

/**
 * @param {string} iso
 */
function relativeDayLabel(iso, todayIso) {
  if (iso === todayIso) return 'Bugün'
  const yesterday = new Date(`${todayIso}T12:00:00`)
  yesterday.setDate(yesterday.getDate() - 1)
  if (iso === yesterday.toISOString().slice(0, 10)) return 'Dün'
  return shortDayLabel(iso)
}

/**
 * @param {{
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentRowVMs: ShipmentRowVM[]
 *   missingItems?: import('../../contracts/v1/missingItem.js').MissingItemDto[]
 *   productItems: ProductMasterCenterRowVm[]
 *   profitability?: ProfitabilityResponseDto | null
 *   todayIso?: string
 *   domainEvents?: import('../../contracts/v1/domainEvent.js').DomainEventDto[]
 *   operationalTasks?: import('../../contracts/v1/task.js').TaskDto[]
 *   userFirstName?: string
 * }} input
 */
export function buildOperationCenterView(input) {
  const {
    orders,
    listItemDtos,
    collectionRows,
    shipmentRowVMs,
    missingItems = [],
    productItems,
    profitability = null,
    todayIso = DEMO_TODAY,
    domainEvents = [],
    operationalTasks = [],
    userFirstName = 'Murat',
  } = input

  const executive = buildExecutiveCenterView({
    orders,
    listItemDtos,
    collectionRows,
    shipmentRowVMs,
    missingItems,
    productItems,
    profitability,
    todayIso,
    domainEvents,
    operationalTasks,
  })

  const sshQueue = buildSshMissingPartsQueue({
    orders,
    listItemDtos,
    missingItems,
    todayIso,
  })

  const criticalCollections = collectionRows.filter((r) => isCollectionCritical(r, todayIso)).length
  const overdueShipments = orders.filter(
    (o) => o.shipmentDate && o.shipmentDate < todayIso && o.status !== 'Teslim Edildi',
  ).length
  const missingImageCount = productItems.filter((p) => publishReadinessMissingImage(p)).length
  const missingVariantCount = productItems.filter((p) => publishReadinessMissingVariant(p)).length
  const openSsh = sshQueue.filter((c) => c.locksShipment !== false).length
  const overdueCollections = executive.counts.overdueCollections
  const pendingShipmentCount = Number(
    executive.kpiStrip.find((k) => k.id === 'pending-ship')?.value ?? 0,
  )

  /** @type {{ id: string, label: string, navTarget: string, navFilter?: OpsDeepLinkFilterId, weight: number, reason: string }[]} */
  const priorityCandidates = [
    {
      id: 'collection',
      label: 'Tahsilat',
      navTarget: 'collection',
      navFilter: 'critical',
      weight: criticalCollections * 12 + overdueCollections * 6,
      reason:
        criticalCollections > 0
          ? `Çünkü ${criticalCollections} kritik dosya var.`
          : overdueCollections > 0
            ? `Çünkü ${overdueCollections} geciken tahsilat var.`
            : 'Tahsilat kuyruğu temiz görünüyor.',
    },
    {
      id: 'shipment',
      label: 'Sevk',
      navTarget: 'shipment-ops',
      navFilter: 'overdue',
      weight: overdueShipments * 14 + pendingShipmentCount * 2,
      reason:
        overdueShipments > 0
          ? `Çünkü ${overdueShipments} sevk tarihi geçmiş.`
          : pendingShipmentCount > 0
            ? `Çünkü ${pendingShipmentCount} sevk bekliyor.`
            : 'Sevk kuyruğu kontrol altında.',
    },
    {
      id: 'ssh',
      label: 'SSH',
      navTarget: 'ssh-service',
      navFilter: 'locked',
      weight: openSsh * 10 + sshQueue.filter((c) => c.locksShipment).length * 4,
      reason:
        openSsh > 0
          ? `Çünkü ${openSsh} açık SSH kaydı sevkiyatı etkileyebilir.`
          : 'SSH kuyruğunda acil kayıt yok.',
    },
    {
      id: 'product',
      label: 'Ürün',
      navTarget: 'product-publish-readiness',
      navFilter: missingImageCount >= missingVariantCount ? 'missing-image' : 'missing-variant',
      weight: missingImageCount * 3 + missingVariantCount * 4,
      reason:
        missingImageCount + missingVariantCount > 0
          ? `Çünkü ${missingImageCount} eksik görsel, ${missingVariantCount} eksik varyant var.`
          : 'Ürün yayın hazırlığı tamamlandı.',
    },
  ]

  const operationOrder = [...priorityCandidates]
    .sort((a, b) => b.weight - a.weight)
    .map((item, index) => ({
      rank: index + 1,
      id: item.id,
      label: item.label,
      navTarget: item.navTarget,
      navFilter: item.navFilter,
      headline: `${item.label} ${index === 0 ? 'ilk sırada' : `${index + 1}. sırada`}`,
      reason: item.reason,
    }))

  const firstAction = operationOrder[0]

  const briefing = {
    greeting: `Günaydın ${userFirstName},`,
    items: [
      {
        tone: criticalCollections > 0 ? 'critical' : 'neutral',
        text: `${criticalCollections} kritik tahsilat`,
      },
      {
        tone: overdueShipments > 0 ? 'critical' : 'neutral',
        text: `${overdueShipments} geciken sevk`,
      },
      {
        tone: missingImageCount > 0 ? 'warning' : 'neutral',
        text: `${missingImageCount} eksik görselli ürün`,
      },
      {
        tone: missingVariantCount > 0 ? 'warning' : 'neutral',
        text: `${missingVariantCount} eksik varyantlı ürün`,
      },
    ],
    recommendedAction: {
      label: firstAction?.label === 'Tahsilat' ? 'Tahsilat Merkezi' : `${firstAction?.label ?? 'Operasyon'} Merkezi`,
      navTarget: firstAction?.navTarget ?? 'collection',
      navFilter: firstAction?.navFilter,
    },
  }

  /** @type {{ id: string, rank: number, title: string, detail: string, tone: 'critical' | 'warning', navTarget: string, navFilter?: OpsDeepLinkFilterId }[]} */
  const taskCandidates = []

  for (const row of collectionRows.filter((r) => isCollectionOverdue(r, todayIso) || isCollectionCritical(r, todayIso))) {
    taskCandidates.push({
      id: `collection-${row.id}`,
      rank: isCollectionCritical(row, todayIso) ? 0 : 1,
      title: row.customer ?? row.id,
      detail: isCollectionOverdue(row, todayIso) ? 'ödeme gecikmiş' : 'kritik tahsilat',
      tone: isCollectionCritical(row, todayIso) ? 'critical' : 'warning',
      navTarget: 'collection',
      navFilter: isCollectionCritical(row, todayIso) ? 'critical' : 'overdue',
    })
  }

  for (const order of orders.filter(
    (o) => o.shipmentDate && o.shipmentDate < todayIso && o.status !== 'Teslim Edildi',
  )) {
    taskCandidates.push({
      id: `shipment-${order.id}`,
      rank: 0,
      title: order.customer ?? order.id,
      detail: 'sevk tarihi geçmiş',
      tone: 'critical',
      navTarget: 'shipment-ops',
      navFilter: 'overdue',
    })
  }

  for (const product of productItems.filter((p) => publishReadinessMissingVariant(p))) {
    taskCandidates.push({
      id: `variant-${product.id}`,
      rank: 2,
      title: product.name ?? product.sku ?? product.id,
      detail: 'varyant eksik',
      tone: 'warning',
      navTarget: 'product-publish-readiness',
      navFilter: 'missing-variant',
    })
  }

  for (const product of productItems.filter((p) => publishReadinessMissingImage(p))) {
    taskCandidates.push({
      id: `image-${product.id}`,
      rank: 2,
      title: product.name ?? product.sku ?? product.id,
      detail: 'görsel eksik',
      tone: 'warning',
      navTarget: 'product-publish-readiness',
      navFilter: 'missing-image',
    })
  }

  const todayTasks = taskCandidates
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title, 'tr'))
    .slice(0, 12)
    .map((task, index) => ({ ...task, displayRank: index + 1 }))

  const shortcuts = [
    {
      id: 'critical-collection',
      label: 'Kritik Tahsilatları Aç',
      navTarget: 'collection',
      navFilter: /** @type {const} */ ('critical'),
    },
    {
      id: 'overdue-shipment',
      label: 'Geciken Sevkleri Aç',
      navTarget: 'shipment-ops',
      navFilter: /** @type {const} */ ('overdue'),
    },
    {
      id: 'open-ssh',
      label: "Açık SSH'leri Aç",
      navTarget: 'ssh-service',
      navFilter: /** @type {const} */ ('locked'),
    },
    {
      id: 'missing-image',
      label: 'Eksik Görselli Ürünleri Aç',
      navTarget: 'product-publish-readiness',
      navFilter: /** @type {const} */ ('missing-image'),
    },
  ]

  /**
   * @param {string} asOfIso
   */
  function snapshotForDay(asOfIso) {
    const dtoIds = new Set(
      listItemDtos
        .filter((d) => {
          const placed = (d.placedAt ?? d.createdAt ?? '').slice(0, 10)
          return !placed || placed <= asOfIso
        })
        .map((d) => d.id),
    )
    const scopedOrders = orders.filter((o) => dtoIds.has(o.id))
    const scopedDtos = listItemDtos.filter((d) => dtoIds.has(d.id))
    const scopedCollections = collectionRows.filter((r) => dtoIds.has(r.id))
    const scopedShipments = shipmentRowVMs.filter((r) => dtoIds.has(r.id))
    const scopedSsh = buildSshMissingPartsQueue({
      orders: scopedOrders,
      listItemDtos: scopedDtos,
      missingItems,
      todayIso: asOfIso,
    })
    return computeGeneralOperationScoreBundle({
      listItemDtos: scopedDtos,
      orders: scopedOrders,
      collectionRows: scopedCollections,
      shipmentRowVMs: scopedShipments,
      sshQueue: scopedSsh,
      productItems,
      profitability,
      todayIso: asOfIso,
    }).generalScore
  }

  const historyDays = last7DayIsos(todayIso).map((iso) => {
    const score = snapshotForDay(iso)
    return {
      iso,
      label: relativeDayLabel(iso, todayIso),
      shortLabel: shortDayLabel(iso),
      score,
      tone: operationScoreTone(score),
    }
  })

  const todayScore = historyDays[historyDays.length - 1]?.score ?? executive.generalScore
  const yesterdayScore = historyDays[historyDays.length - 2]?.score ?? todayScore
  const delta = todayScore - yesterdayScore

  const healthHistory = {
    days: historyDays,
    todayScore,
    yesterdayScore,
    delta,
    deltaLabel:
      delta > 0 ? `+${delta} iyileşme` : delta < 0 ? `${delta} düşüş` : 'değişim yok',
    deltaTone: delta > 0 ? 'success' : delta < 0 ? 'critical' : 'neutral',
  }

  return {
    briefing,
    todayTasks,
    operationOrder,
    shortcuts,
    healthHistory,
    generalScore: executive.generalScore,
    generalScoreTone: operationScoreTone(executive.generalScore),
  }
}

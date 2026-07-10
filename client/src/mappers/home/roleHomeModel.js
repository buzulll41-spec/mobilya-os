import { DEMO_TODAY } from '../../data/constants.js'
import { computeDashboardKpis, formatTry } from '../../data/dashboardHelpers.js'
import { USER_ROLE } from '../../contracts/v1/user.js'
import { ROLE_HOME_TITLE } from '../../constants/roleDefaults.js'
import {
  filterCollectionRows,
  isCollectionCritical,
  isCollectionOverdue,
} from '../collection/collectionCommandCenterModel.js'
import { buildSshMissingPartsQueue } from '../ssh/sshMissingPartsModel.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import {
  applyPilotScope,
  getEffectivePilotScope,
  getOrderPilotKind,
  getProductPilotKind,
} from '../../lib/pilotRecordHeuristics.js'
import {
  countDelayedShipmentKpi,
  countPendingDeliveryConfirmations,
} from '../shipment/deliveryConfirmationQueue.js'

/** @typedef {import('../../contracts/v1/user.js').UserRole} UserRole */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId} OpsDeepLinkFilterId */

/**
 * @typedef {'success' | 'warning' | 'critical' | 'neutral'} HomeTone
 *
 * @typedef {Object} RoleHomeKpi
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {HomeTone} tone
 * @property {string} navTarget
 * @property {OpsDeepLinkFilterId} [navFilter]
 *
 * @typedef {Object} RoleHomeTask
 * @property {string} id
 * @property {string} text
 * @property {HomeTone} tone
 * @property {string} [navTarget]
 * @property {OpsDeepLinkFilterId} [navFilter]
 *
 * @typedef {Object} RoleHomeAction
 * @property {string} id
 * @property {string} label
 * @property {'primary' | 'secondary'} variant
 * @property {string} [navTarget]
 * @property {OpsDeepLinkFilterId} [navFilter]
 * @property {'new-order' | 'search-product'} [actionKind]
 *
 * @typedef {Object} RoleHomeView
 * @property {string} title
 * @property {string} greeting
 * @property {string} todayLabel
 * @property {RoleHomeKpi[]} kpis
 * @property {RoleHomeTask[]} todayTasks
 * @property {RoleHomeAction[]} quickActions
 */

/**
 * @param {RoleHomeKpi[]} kpis
 */
function takeKpis(kpis) {
  return kpis.slice(0, 4)
}

/**
 * @param {{
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   missingItems?: import('../../contracts/v1/missingItem.js').MissingItemDto[]
 *   todayIso?: string
 *   shipmentPlans?: import('../../state/shipmentPlanStore.js').ShipmentPlan[]
 * }} input
 */
function buildMetrics(input) {
  const {
    orders,
    listItemDtos,
    collectionRows,
    missingItems = [],
    todayIso = DEMO_TODAY,
    shipmentPlans = [],
  } = input

  const kpis = computeDashboardKpis(orders, listItemDtos, todayIso, shipmentPlans)
  const openCollections = collectionRows.filter((r) => remainingBalance(r) > 0.009)
  const criticalCollections = openCollections.filter((r) => isCollectionCritical(r, todayIso))
  const overdueCollections = openCollections.filter((r) => isCollectionOverdue(r, todayIso))
  const partialPayments = filterCollectionRows(openCollections, 'partial', todayIso)
  const noPayments = filterCollectionRows(openCollections, 'none', todayIso)
  const openBalanceTotal = openCollections.reduce((s, r) => s + remainingBalance(r), 0)

  const activeOrders = orders.filter((o) => o.status !== 'Teslim Edildi')
  const overdueShipments = activeOrders.filter(
    (o) => o.shipmentDate && o.shipmentDate < todayIso,
  )
  const todayShipments = activeOrders.filter((o) => o.shipmentDate === todayIso)
  const readyForInstall = activeOrders.filter((o) => o.status === 'Hazır')
  const readyToDeliver = activeOrders.filter(
    (o) => o.shipmentDate && o.shipmentDate <= todayIso && o.status !== 'Teslim Edildi',
  )

  const sshQueue = buildSshMissingPartsQueue({
    orders,
    listItemDtos,
    missingItems,
    todayIso,
  })
  const openSsh = sshQueue.filter((c) => c.locksShipment !== false)
  const lockedSsh = sshQueue.filter((c) => c.locksShipment)
  const waitingParts = sshQueue.filter((c) => c.uiStatus === 'waiting')
  const readySsh = sshQueue.filter((c) => c.uiStatus === 'ready' || c.uiStatus === 'arrived')

  const pendingDeliveryConfirmations = countPendingDeliveryConfirmations(shipmentPlans)
  const delayedShipmentKpi = countDelayedShipmentKpi(shipmentPlans)

  return {
    kpis,
    criticalCollections,
    overdueCollections,
    partialPayments,
    noPayments,
    openBalanceTotal,
    activeOrders,
    overdueShipments,
    todayShipments,
    readyForInstall,
    readyToDeliver,
    openSsh,
    lockedSsh,
    waitingParts,
    readySsh,
    pendingDeliveryConfirmations,
    delayedShipmentKpi,
    pendingApprovalPayments: kpis.pendingApprovalPayments ?? 0,
    pendingMailOrderApprovals: kpis.pendingMailOrderApprovals ?? 0,
  }
}

/**
 * @param {string} firstName
 * @param {ReturnType<typeof buildMetrics>} m
 * @returns {RoleHomeView}
 */
function buildAdminHome(firstName, m) {
  return {
    title: ROLE_HOME_TITLE[USER_ROLE.ADMIN],
    greeting: `Günaydın ${firstName}`,
    todayLabel: DEMO_TODAY,
    kpis: takeKpis([
      {
        id: 'critical-collection',
        label: 'Kritik tahsilat',
        value: String(m.criticalCollections.length),
        tone: m.criticalCollections.length > 0 ? 'critical' : 'success',
        navTarget: 'collection',
        navFilter: 'critical',
      },
      {
        id: 'overdue-shipment',
        label: 'Geciken sevk',
        value: String(m.delayedShipmentKpi),
        tone: m.delayedShipmentKpi > 0 ? 'critical' : 'success',
        navTarget: 'shipment-ops',
        navFilter: 'pending_confirm',
      },
      {
        id: 'delivery-confirm',
        label: 'Teslim onayı bekleyen',
        value: String(m.pendingDeliveryConfirmations),
        tone: m.pendingDeliveryConfirmations > 0 ? 'warning' : 'success',
        navTarget: 'shipment-ops',
        navFilter: 'pending_confirm',
      },
      {
        id: 'open-ssh',
        label: 'Açık SSH',
        value: String(m.openSsh.length),
        tone: m.openSsh.length > 0 ? 'warning' : 'success',
        navTarget: 'ssh-service',
        navFilter: 'locked',
      },
      {
        id: 'today-revenue',
        label: 'Bugünkü ciro',
        value: formatTry(m.kpis.todaySalesTotal ?? 0),
        tone: (m.kpis.todaySalesTotal ?? 0) > 0 ? 'success' : 'neutral',
        navTarget: 'executive-center',
      },
    ]),
    todayTasks: [
      m.pendingApprovalPayments > 0
        ? {
            id: 't-pay',
            text: `${m.pendingApprovalPayments} Tahsilat Onayı Bekliyor`,
            tone: 'warning',
            navTarget: 'collection',
            navFilter: 'pending-approval',
          }
        : null,
      m.pendingMailOrderApprovals > 0
        ? {
            id: 't-mo',
            text: `${m.pendingMailOrderApprovals} Mail Order Onayı Bekliyor`,
            tone: 'warning',
            navTarget: 'collection',
            navFilter: 'pending-approval',
          }
        : null,
      m.pendingDeliveryConfirmations > 0
        ? {
            id: 't2',
            text: `${m.pendingDeliveryConfirmations} Teslim Onayı Bekliyor`,
            tone: 'critical',
            navTarget: 'shipment-ops',
            navFilter: 'pending_confirm',
          }
        : null,
      m.criticalCollections.length > 0
        ? { id: 't1', text: `${m.criticalCollections.length} kritik tahsilat dosyasını öncele`, tone: 'critical' }
        : null,
      m.openSsh.length > 0
        ? { id: 't3', text: `${m.openSsh.length} SSH kaydını takip et`, tone: 'warning' }
        : null,
      { id: 't4', text: 'Ürün sağlığı ve yayın hazırlığını gözden geçir', tone: 'neutral' },
    ].filter(Boolean),
    quickActions: [
      { id: 'exec', label: 'Yönetici Merkezi', variant: 'primary', navTarget: 'executive-center' },
      { id: 'guide', label: 'Operasyon Rehberi', variant: 'primary', navTarget: 'operation-center' },
      { id: 'health', label: 'Ürün Sağlığı', variant: 'secondary', navTarget: 'product-health' },
      { id: 'publish', label: 'Yayına Hazır', variant: 'secondary', navTarget: 'product-publish-readiness' },
      { id: 'woo', label: 'WooCommerce Hazırlık', variant: 'secondary', navTarget: 'commerce-publishing' },
      { id: 'users', label: 'Kullanıcılar', variant: 'secondary', navTarget: 'users-admin' },
    ],
  }
}

/**
 * @param {string} firstName
 * @param {ReturnType<typeof buildMetrics>} m
 * @returns {RoleHomeView}
 */
function buildManagerHome(firstName, m) {
  return {
    title: ROLE_HOME_TITLE[USER_ROLE.MANAGER],
    greeting: `Günaydın ${firstName}`,
    todayLabel: DEMO_TODAY,
    kpis: takeKpis([
      {
        id: 'collection-risk',
        label: 'Tahsilat riski',
        value: String(m.criticalCollections.length),
        tone: m.criticalCollections.length > 0 ? 'critical' : 'success',
        navTarget: 'collection',
        navFilter: 'critical',
      },
      {
        id: 'pending-ship',
        label: 'Sevk bekleyen',
        value: String(m.kpis.pendingShipmentCount ?? 0),
        tone: (m.kpis.pendingShipmentCount ?? 0) > 0 ? 'warning' : 'success',
        navTarget: 'shipment-ops',
        navFilter: 'all',
      },
      {
        id: 'open-ssh',
        label: 'SSH açık',
        value: String(m.openSsh.length),
        tone: m.openSsh.length > 0 ? 'warning' : 'success',
        navTarget: 'ssh-service',
        navFilter: 'locked',
      },
      {
        id: 'today-sales',
        label: 'Bugünkü ciro',
        value: formatTry(m.kpis.todaySalesTotal ?? 0),
        tone: (m.kpis.todaySalesTotal ?? 0) > 0 ? 'success' : 'neutral',
        navTarget: 'orders',
      },
    ]),
    todayTasks: [
      { id: 't1', text: 'Operasyon rehberinden günlük sırayı kontrol et', tone: 'neutral' },
      m.criticalCollections.length > 0
        ? { id: 't2', text: 'Kritik tahsilat müşterilerini ara', tone: 'critical' }
        : null,
      m.overdueShipments.length > 0
        ? { id: 't3', text: 'Geciken sevkler için müşteri bilgilendir', tone: 'critical' }
        : null,
      { id: 't4', text: 'Kritik aksiyonları kapat', tone: 'warning' },
    ].filter(Boolean),
    quickActions: [
      { id: 'guide', label: 'Operasyon Rehberi', variant: 'primary', navTarget: 'operation-center' },
      { id: 'auto', label: 'Otomasyon Merkezi', variant: 'primary', navTarget: 'operation-automation-center' },
      { id: 'collection', label: 'Tahsilat', variant: 'secondary', navTarget: 'collection', navFilter: 'critical' },
      { id: 'ship', label: 'Sevk Operasyonu', variant: 'secondary', navTarget: 'shipment-ops', navFilter: 'overdue' },
    ],
  }
}

/**
 * @param {string} firstName
 * @param {ReturnType<typeof buildMetrics>} m
 * @returns {RoleHomeView}
 */
function buildSalesHome(firstName, m) {
  const waitingCustomers = m.overdueCollections.slice(0, 5)
  return {
    title: ROLE_HOME_TITLE[USER_ROLE.SALES],
    greeting: `Günaydın ${firstName}`,
    todayLabel: DEMO_TODAY,
    kpis: takeKpis([
      {
        id: 'open-orders',
        label: 'Açık siparişlerim',
        value: String(m.activeOrders.length),
        tone: m.activeOrders.length > 0 ? 'warning' : 'neutral',
        navTarget: 'orders',
      },
      {
        id: 'today-sales',
        label: 'Bugünkü satış',
        value: formatTry(m.kpis.todaySalesTotal ?? 0),
        tone: (m.kpis.todaySalesTotal ?? 0) > 0 ? 'success' : 'neutral',
        navTarget: 'orders',
      },
      {
        id: 'today-orders',
        label: 'Bugünkü sipariş',
        value: String(m.kpis.todayOrderCount ?? 0),
        tone: (m.kpis.todayOrderCount ?? 0) > 0 ? 'success' : 'neutral',
        navTarget: 'orders',
      },
      {
        id: 'collection-summary',
        label: 'Tahsilat özeti',
        value: `${m.overdueCollections.length} gecikmiş`,
        tone: m.overdueCollections.length > 0 ? 'warning' : 'success',
        navTarget: 'collection',
        navFilter: 'overdue',
      },
    ]),
    todayTasks: [
      { id: 't1', text: 'Yeni sipariş oluştur veya mevcut siparişi güncelle', tone: 'neutral' },
      m.activeOrders.length > 0
        ? { id: 't2', text: `${m.activeOrders.length} açık siparişi takip et`, tone: 'warning' }
        : null,
      waitingCustomers.length > 0
        ? { id: 't3', text: `${waitingCustomers.length} müşteri ödeme bekliyor`, tone: 'warning' }
        : null,
      { id: 't4', text: 'Ürün kataloğundan hızlı arama yap', tone: 'neutral' },
    ].filter(Boolean),
    quickActions: [
      { id: 'new-order', label: 'Yeni Sipariş', variant: 'primary', actionKind: 'new-order' },
      { id: 'orders', label: 'Açık Siparişler', variant: 'primary', navTarget: 'orders' },
      { id: 'search', label: 'Ürün Ara', variant: 'secondary', navTarget: 'product-master-center', actionKind: 'search-product' },
      { id: 'collection', label: 'Tahsilat Özeti', variant: 'secondary', navTarget: 'collection', navFilter: 'overdue' },
    ],
  }
}

/**
 * @param {string} firstName
 * @param {ReturnType<typeof buildMetrics>} m
 * @returns {RoleHomeView}
 */
function buildOperationHome(firstName, m) {
  return {
    title: ROLE_HOME_TITLE[USER_ROLE.OPERATION],
    greeting: `Günaydın ${firstName}`,
    todayLabel: DEMO_TODAY,
    kpis: takeKpis([
      {
        id: 'today-ship',
        label: 'Bugünkü sevkler',
        value: String(m.todayShipments.length),
        tone: m.todayShipments.length > 0 ? 'warning' : 'neutral',
        navTarget: 'shipment-ops',
        navFilter: 'today',
      },
      {
        id: 'delivery-confirm',
        label: 'Teslim onayı bekleyen',
        value: String(m.pendingDeliveryConfirmations),
        tone: m.pendingDeliveryConfirmations > 0 ? 'critical' : 'success',
        navTarget: 'shipment-ops',
        navFilter: 'pending_confirm',
      },
      {
        id: 'overdue-ship',
        label: 'Geciken sevkler',
        value: String(m.delayedShipmentKpi),
        tone: m.delayedShipmentKpi > 0 ? 'critical' : 'success',
        navTarget: 'shipment-ops',
        navFilter: 'pending_confirm',
      },
      {
        id: 'install-wait',
        label: 'Montaj bekleyen',
        value: String(m.readyForInstall.length),
        tone: m.readyForInstall.length > 0 ? 'warning' : 'success',
        navTarget: 'shipment-ops',
        navFilter: 'today',
      },
      {
        id: 'ssh-open',
        label: 'SSH / Eksik parça',
        value: String(m.openSsh.length),
        tone: m.openSsh.length > 0 ? 'critical' : 'success',
        navTarget: 'ssh-service',
        navFilter: 'locked',
      },
    ]),
    todayTasks: [
      m.todayShipments.length > 0
        ? { id: 't1', text: `${m.todayShipments.length} bugünkü sevki planla`, tone: 'warning' }
        : null,
      m.pendingDeliveryConfirmations > 0
        ? {
            id: 't2',
            text: `${m.pendingDeliveryConfirmations} sevk teslim onayı bekliyor`,
            tone: 'critical',
          }
        : null,
      m.readyToDeliver.length > 0
        ? { id: 't3', text: `${m.readyToDeliver.length} sipariş teslim edilebilir`, tone: 'warning' }
        : null,
      m.openSsh.length > 0
        ? { id: 't4', text: `${m.openSsh.length} eksik parça kaydını kontrol et`, tone: 'critical' }
        : null,
    ].filter(Boolean),
    quickActions: [
      { id: 'ship-today', label: 'Bugünkü Sevkler', variant: 'primary', navTarget: 'shipment-ops', navFilter: 'today' },
      { id: 'ship-late', label: 'Teslim Onayları', variant: 'primary', navTarget: 'shipment-ops', navFilter: 'pending_confirm' },
      { id: 'ssh', label: 'SSH Merkezi', variant: 'secondary', navTarget: 'ssh-service', navFilter: 'locked' },
      { id: 'guide', label: 'Operasyon Rehberi', variant: 'secondary', navTarget: 'operation-center' },
    ],
  }
}

/**
 * @param {string} firstName
 * @param {ReturnType<typeof buildMetrics>} m
 * @returns {RoleHomeView}
 */
function buildServiceHome(firstName, m) {
  return {
    title: ROLE_HOME_TITLE[USER_ROLE.SERVICE],
    greeting: `Günaydın ${firstName}`,
    todayLabel: DEMO_TODAY,
    kpis: takeKpis([
      {
        id: 'open-ssh',
        label: 'Açık SSH kayıtları',
        value: String(m.openSsh.length),
        tone: m.openSsh.length > 0 ? 'critical' : 'success',
        navTarget: 'ssh-service',
        navFilter: 'all',
      },
      {
        id: 'missing-parts',
        label: 'Eksik parça',
        value: String(m.waitingParts.length),
        tone: m.waitingParts.length > 0 ? 'warning' : 'success',
        navTarget: 'ssh-service',
        navFilter: 'waiting',
      },
      {
        id: 'critical-ssh',
        label: 'Kritik servisler',
        value: String(m.lockedSsh.length),
        tone: m.lockedSsh.length > 0 ? 'critical' : 'success',
        navTarget: 'ssh-service',
        navFilter: 'locked',
      },
      {
        id: 'completed',
        label: 'Tamamlanan',
        value: String(m.readySsh.length),
        tone: m.readySsh.length > 0 ? 'success' : 'neutral',
        navTarget: 'ssh-service',
        navFilter: 'ready',
      },
    ]),
    todayTasks: [
      m.lockedSsh.length > 0
        ? { id: 't1', text: `${m.lockedSsh.length} sevk kilidi olan kaydı çöz`, tone: 'critical' }
        : null,
      m.waitingParts.length > 0
        ? { id: 't2', text: `${m.waitingParts.length} eksik parça için tedarikçi takibi`, tone: 'warning' }
        : null,
      { id: 't3', text: 'Gelen parçaları sevke hazır işaretle', tone: 'neutral' },
    ].filter(Boolean),
    quickActions: [
      { id: 'ssh-open', label: 'Açık SSH', variant: 'primary', navTarget: 'ssh-service', navFilter: 'all' },
      { id: 'ssh-wait', label: 'Eksik Parça', variant: 'primary', navTarget: 'ssh-service', navFilter: 'waiting' },
      { id: 'ssh-lock', label: 'Kritik Servisler', variant: 'secondary', navTarget: 'ssh-service', navFilter: 'locked' },
      { id: 'ssh-ready', label: 'Tamamlanan', variant: 'secondary', navTarget: 'ssh-service', navFilter: 'ready' },
    ],
  }
}

/**
 * @param {string} firstName
 * @param {ReturnType<typeof buildMetrics>} m
 * @returns {RoleHomeView}
 */
function buildFinanceHome(firstName, m) {
  return {
    title: ROLE_HOME_TITLE[USER_ROLE.FINANCE],
    greeting: `Günaydın ${firstName}`,
    todayLabel: DEMO_TODAY,
    kpis: takeKpis([
      {
        id: 'critical',
        label: 'Kritik tahsilat',
        value: String(m.criticalCollections.length),
        tone: m.criticalCollections.length > 0 ? 'critical' : 'success',
        navTarget: 'collection',
        navFilter: 'critical',
      },
      {
        id: 'partial',
        label: 'Kısmi ödemeler',
        value: String(m.partialPayments.length),
        tone: m.partialPayments.length > 0 ? 'warning' : 'success',
        navTarget: 'collection',
        navFilter: 'partial',
      },
      {
        id: 'none',
        label: 'Hiç ödeme yok',
        value: String(m.noPayments.length),
        tone: m.noPayments.length > 0 ? 'critical' : 'success',
        navTarget: 'collection',
        navFilter: 'none',
      },
      {
        id: 'open-balance',
        label: 'Açık bakiye',
        value: formatTry(m.openBalanceTotal),
        tone: m.openBalanceTotal > 0 ? 'warning' : 'success',
        navTarget: 'collection',
        navFilter: 'all',
      },
    ]),
    todayTasks: [
      { id: 't1', text: 'Tahsilat merkezinden kritik dosyaları önceliklendir', tone: 'critical' },
      m.partialPayments.length > 0
        ? { id: 't2', text: `${m.partialPayments.length} kısmi ödemeyi takip et`, tone: 'warning' }
        : null,
      m.noPayments.length > 0
        ? { id: 't3', text: `${m.noPayments.length} dosyada hiç ödeme yok`, tone: 'critical' }
        : null,
    ].filter(Boolean),
    quickActions: [
      { id: 'collection', label: 'Tahsilat Merkezi', variant: 'primary', navTarget: 'collection' },
      { id: 'critical', label: 'Kritik Tahsilat', variant: 'primary', navTarget: 'collection', navFilter: 'critical' },
      { id: 'partial', label: 'Kısmi Ödemeler', variant: 'secondary', navTarget: 'collection', navFilter: 'partial' },
      { id: 'none', label: 'Hiç Ödeme Yok', variant: 'secondary', navTarget: 'collection', navFilter: 'none' },
    ],
  }
}

/**
 * @param {string} firstName
 * @param {ReturnType<typeof buildMetrics>} m
 * @returns {RoleHomeView}
 */
function buildWarehouseHome(firstName, m) {
  return {
    title: ROLE_HOME_TITLE[USER_ROLE.WAREHOUSE],
    greeting: `Günaydın ${firstName}`,
    todayLabel: DEMO_TODAY,
    kpis: takeKpis([
      {
        id: 'today-ship',
        label: 'Bugünkü sevkler',
        value: String(m.todayShipments.length),
        tone: 'neutral',
        navTarget: 'shipment-ops',
        navFilter: 'today',
      },
      {
        id: 'pending-ship',
        label: 'Sevk bekleyen',
        value: String(m.kpis.pendingShipmentCount ?? 0),
        tone: 'warning',
        navTarget: 'shipment-ops',
      },
      {
        id: 'supply',
        label: 'Tedarik kuyruğu',
        value: String(m.activeOrders.length),
        tone: 'neutral',
        navTarget: 'supply-incoming',
      },
      {
        id: 'products',
        label: 'Ürün kartları',
        value: 'Aç',
        tone: 'neutral',
        navTarget: 'product-master-center',
      },
    ]),
    todayTasks: [
      { id: 't1', text: 'Gelen ürün kayıtlarını kontrol et', tone: 'neutral' },
      { id: 't2', text: 'Bugünkü sevk planını doğrula', tone: 'warning' },
    ],
    quickActions: [
      { id: 'supply', label: 'Tedarik & Gelen', variant: 'primary', navTarget: 'supply-incoming' },
      { id: 'ship', label: 'Sevk Operasyonu', variant: 'primary', navTarget: 'shipment-ops', navFilter: 'today' },
    ],
  }
}

/**
 * @param {{
 *   role: UserRole
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   missingItems?: import('../../contracts/v1/missingItem.js').MissingItemDto[]
 *   todayIso?: string
 *   userFirstName?: string
 *   shipmentPlans?: import('../../state/shipmentPlanStore.js').ShipmentPlan[]
 * }} input
 * @returns {RoleHomeView}
 */
export function buildRoleHomeView(input) {
  const {
    role,
    orders,
    listItemDtos,
    collectionRows,
    missingItems = [],
    todayIso = DEMO_TODAY,
    userFirstName = 'Murat',
    shipmentPlans = [],
  } = input

  const scope = getEffectivePilotScope(role)

  const scopedOrders = applyPilotScope(orders, scope, getOrderPilotKind)
  const scopedDtos = applyPilotScope(listItemDtos, scope, getOrderPilotKind)
  const scopedCollections = applyPilotScope(collectionRows, scope, getOrderPilotKind)
  const scopedPlans = applyPilotScope(shipmentPlans, scope, (plan) =>
    getOrderPilotKind({ id: plan.orderId, orderNumber: plan.orderId, customer: '' }),
  )

  const metrics = buildMetrics({
    orders: scopedOrders,
    listItemDtos: scopedDtos,
    collectionRows: scopedCollections,
    missingItems,
    todayIso,
    shipmentPlans: scopedPlans,
  })

  switch (role) {
    case USER_ROLE.ADMIN:
      return buildAdminHome(userFirstName, metrics)
    case USER_ROLE.MANAGER:
      return buildManagerHome(userFirstName, metrics)
    case USER_ROLE.SALES:
      return buildSalesHome(userFirstName, metrics)
    case USER_ROLE.OPERATION:
      return buildOperationHome(userFirstName, metrics)
    case USER_ROLE.SERVICE:
      return buildServiceHome(userFirstName, metrics)
    case USER_ROLE.FINANCE:
      return buildFinanceHome(userFirstName, metrics)
    case USER_ROLE.WAREHOUSE:
      return buildWarehouseHome(userFirstName, metrics)
    default:
      return buildManagerHome(userFirstName, metrics)
  }
}

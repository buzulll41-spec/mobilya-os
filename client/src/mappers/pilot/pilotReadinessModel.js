import { DEMO_TODAY } from '../../data/constants.js'
import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import { isProductionMode, isDemoMode } from '../../config/appMode.js'
import { canAccessPage } from '../../constants/roleAccess.js'
import { USER_ROLE } from '../../contracts/v1/user.js'
import {
  applyPilotScope,
  getEffectivePilotScope,
  getOrderPilotKind,
  getProductPilotKind,
} from '../../lib/pilotRecordHeuristics.js'

/** @typedef {'PASS' | 'WARNING' | 'FAIL'} ReadinessStatus */

/**
 * @typedef {Object} PilotReadinessItem
 * @property {string} id
 * @property {string} label
 * @property {ReadinessStatus} status
 * @property {string} detail
 */

/**
 * @param {ReadinessStatus} status
 * @param {string} pass
 * @param {string} warn
 * @param {string} fail
 */
function detailFor(status, pass, warn, fail) {
  if (status === 'PASS') return pass
  if (status === 'WARNING') return warn
  return fail
}

/**
 * @param {boolean} ok
 * @param {boolean} [soft]
 * @returns {ReadinessStatus}
 */
function statusFrom(ok, soft = false) {
  if (ok) return 'PASS'
  return soft ? 'WARNING' : 'FAIL'
}

/**
 * @param {{
 *   role?: import('../../contracts/v1/user.js').UserRole
 *   ordersCount?: number
 *   collectionCount?: number
 *   productCount?: number
 *   apiMode?: boolean
 *   wooConfigured?: boolean | null
 * }} ctx
 */
export function buildPilotReadinessView(ctx) {
  const {
    role = USER_ROLE.ADMIN,
    ordersCount = 0,
    collectionCount = 0,
    productCount = 0,
    apiMode = Boolean(getApiBaseUrl()),
    wooConfigured = null,
  } = ctx

  const canOrders = canAccessPage(role, 'orders')
  const canCollection = canAccessPage(role, 'collection')
  const canShipment = canAccessPage(role, 'shipment-ops')
  const canSsh = canAccessPage(role, 'ssh-service')
  const canProducts = canAccessPage(role, 'product-master-center')
  const canHealth = canAccessPage(role, 'product-health')
  const canPublish = canAccessPage(role, 'product-publish-readiness')
  const canWoo = canAccessPage(role, 'commerce-publishing')

  /** @type {PilotReadinessItem[]} */
  const items = []

  items.push({
    id: 'login',
    label: 'Login',
    status: 'PASS',
    detail: 'Oturum açıldı, rol bazlı ana ekran aktif.',
  })

  const modeStatus = isProductionMode()
    ? apiMode
      ? 'PASS'
      : 'FAIL'
    : isDemoMode()
      ? 'PASS'
      : 'WARNING'
  items.push({
    id: 'app-mode',
    label: 'Demo / Production ayrımı',
    status: modeStatus,
    detail:
      modeStatus === 'PASS'
        ? isProductionMode()
          ? 'Production modu · canlı API'
          : 'Demo modu · mock veya API'
        : 'Production modunda VITE_API_BASE_URL zorunlu.',
  })

  const orderStatus = statusFrom(canOrders && ordersCount >= 0, !canOrders)
  items.push({
    id: 'order-create',
    label: 'Sipariş oluşturma',
    status: orderStatus,
    detail: detailFor(
      orderStatus,
      'Sipariş modülü erişilebilir.',
      'Bu rol sipariş oluşturamaz.',
      'Sipariş modülü kapalı.',
    ),
  })

  const collectionStatus = statusFrom(canCollection)
  items.push({
    id: 'collection',
    label: 'Tahsilat girme',
    status: collectionStatus,
    detail: detailFor(
      collectionStatus,
      `${collectionCount} açık tahsilat kaydı izlenebilir.`,
      '',
      'Tahsilat modülü bu rol için kapalı.',
    ),
  })

  const shipStatus = statusFrom(canShipment)
  items.push({
    id: 'shipment',
    label: 'Sevk planlama',
    status: shipStatus,
    detail: detailFor(shipStatus, 'Sevk operasyon modülü hazır.', '', 'Sevk modülü kapalı.'),
  })

  const sshStatus = statusFrom(canSsh)
  items.push({
    id: 'ssh',
    label: 'SSH kaydı açma',
    status: sshStatus,
    detail: detailFor(sshStatus, 'SSH / Servis Merkezi erişilebilir.', '', 'SSH modülü kapalı.'),
  })

  const productStatus = statusFrom(canProducts && productCount > 0, canProducts && productCount === 0)
  items.push({
    id: 'product-create',
    label: 'Ürün oluşturma',
    status: productStatus,
    detail: detailFor(
      productStatus,
      `${productCount} ürün kartı yüklendi.`,
      'Ürün modülü açık; katalog boş olabilir.',
      'Ürün Master erişimi yok.',
    ),
  })

  items.push({
    id: 'product-health',
    label: 'Ürün sağlık kontrolü',
    status: statusFrom(canHealth),
    detail: canHealth ? 'Ürün Sağlık Merkezi erişilebilir.' : 'Bu rol ürün sağlığını göremez.',
  })

  items.push({
    id: 'publish-readiness',
    label: 'Yayına hazır kontrolü',
    status: statusFrom(canPublish),
    detail: canPublish ? 'Yayına Hazır Merkezi erişilebilir.' : 'Yayın hazırlık modülü kapalı.',
  })

  const wooStatus =
    !canWoo ? 'FAIL' : !apiMode ? 'WARNING' : wooConfigured === false ? 'WARNING' : wooConfigured ? 'PASS' : 'WARNING'
  items.push({
    id: 'woo',
    label: 'Woo hazırlık kontrolü',
    status: wooStatus,
    detail:
      wooStatus === 'PASS'
        ? 'WooCommerce bağlantı ayarı mevcut.'
        : wooStatus === 'WARNING'
          ? apiMode
            ? 'Woo ayarı eksik veya test edilmedi.'
            : 'Mock modda Woo canlı test yapılamaz.'
          : 'WooCommerce modülü kapalı.',
  })

  items.push({
    id: 'tablet',
    label: 'Tablet görünümü',
    status: 'PASS',
    detail: '1024×768 / 1280×800 responsive kurallar tanımlı.',
  })

  const passCount = items.filter((i) => i.status === 'PASS').length
  const warnCount = items.filter((i) => i.status === 'WARNING').length
  const failCount = items.filter((i) => i.status === 'FAIL').length

  return {
    items,
    summary: { passCount, warnCount, failCount, total: items.length },
    readyForPilot: failCount === 0 && warnCount <= 2,
  }
}

/**
 * @typedef {'success' | 'warning' | 'critical'} HealthTone
 *
 * @typedef {Object} SystemHealthItem
 * @property {string} id
 * @property {string} label
 * @property {HealthTone} tone
 * @property {string} detail
 */

/**
 * @param {{
 *   apiMode?: boolean
 *   apiOk?: boolean | null
 *   dbOk?: boolean | null
 *   wooConfigured?: boolean | null
 *   wooOk?: boolean | null
 * }} input
 */
export function buildSystemHealthCard(input) {
  const { apiMode = false, apiOk = null, dbOk = null, wooConfigured = null, wooOk = null } = input

  /** @type {SystemHealthItem[]} */
  const items = [
    {
      id: 'api',
      label: 'API',
      tone: !apiMode ? 'warning' : apiOk ? 'success' : 'critical',
      detail: !apiMode ? 'Mock mod' : apiOk ? 'Canlı API yanıt veriyor' : 'API yanıt vermiyor',
    },
    {
      id: 'db',
      label: 'DB',
      tone: !apiMode ? 'warning' : dbOk ? 'success' : 'critical',
      detail: !apiMode ? 'Mock mod' : dbOk ? 'Veritabanı bağlı' : 'Veritabanı erişilemiyor',
    },
    {
      id: 'frontend',
      label: 'Frontend',
      tone: 'success',
      detail: 'Arayüz yüklendi',
    },
    {
      id: 'woo',
      label: 'Woo bağlantı ayarı',
      tone: !apiMode ? 'warning' : wooConfigured && wooOk ? 'success' : wooConfigured ? 'warning' : 'warning',
      detail: !apiMode
        ? 'Canlı API gerekli'
        : wooConfigured
          ? wooOk
            ? 'Bağlantı testi başarılı'
            : 'Ayar var, test bekliyor'
          : 'Woo ayarı eksik',
    },
  ]

  return { items }
}

/**
 * @typedef {Object} DailyOpSummary
 * @property {number} ordersOpened
 * @property {number} paymentsPosted
 * @property {number} shipmentsPlanned
 * @property {number} sshOpened
 * @property {number} productsUpdated
 */

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   listItemDtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   domainEvents?: import('../../contracts/v1/domainEvent.js').DomainEventDto[]
 *   productItems?: import('../product/productMasterCenterModel.js').ProductMasterCenterRowVm[]
 *   todayIso?: string
 *   role?: import('../../contracts/v1/user.js').UserRole
 * }} input
 * @returns {DailyOpSummary}
 */
export function buildDailyOperationSummary(input) {
  const {
    orders,
    listItemDtos,
    domainEvents = [],
    productItems = [],
    todayIso = DEMO_TODAY,
    role,
  } = input

  const scope = getEffectivePilotScope(role)
  const scopedOrders = applyPilotScope(orders, scope, getOrderPilotKind)
  const scopedDtos = applyPilotScope(listItemDtos, scope, getOrderPilotKind)
  const scopedProducts = applyPilotScope(productItems, scope, getProductPilotKind)

  const ordersOpened = scopedDtos.filter((d) => (d.placedAt ?? '').slice(0, 10) === todayIso).length

  const dayEvents = domainEvents.filter((e) => (e.occurredAt ?? '').slice(0, 10) === todayIso)

  const paymentsPosted = dayEvents.filter((e) => e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED).length
  const shipmentsPlanned = dayEvents.filter(
    (e) =>
      e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED ||
      e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED ||
      e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_UPDATED,
  ).length
  const sshOpened = dayEvents.filter((e) => e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED).length

  const productsUpdated = scopedProducts.filter((p) => {
    const sync = p.woo?.lastSyncAt
    return sync && sync.slice(0, 10) === todayIso
  }).length

  const fallbackProductTouch = scopedOrders.length > 0 && productsUpdated === 0 ? 0 : productsUpdated

  return {
    ordersOpened: ordersOpened || scopedOrders.filter((o) => o.orderDate === todayIso).length,
    paymentsPosted,
    shipmentsPlanned,
    sshOpened,
    productsUpdated: fallbackProductTouch,
  }
}

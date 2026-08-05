import { useMemo } from 'react'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import { useShipmentPlans } from '../../hooks/useShipmentPlans.jsx'
import { buildMobileStoreHomeCards } from '../../mappers/mobile/mobileStoreOpsModel.js'
import { buildMobileOperationCenterTasks } from '../../mappers/mobile/mobileOperationHubModel.js'
import { getOperationalToday } from '../../data/index.js'
import {
  IconBell,
  IconChart,
  IconMenu,
  IconOrders,
  IconPlus,
  IconSearch,
  IconService,
  IconTruck,
  IconUsers,
  IconWallet,
} from '../../components/Icons.jsx'
import '../../styles/mobile-home-native.css'

/** @param {'collection' | 'shipment' | 'service' | 'orders' | 'customers' | 'reports' | 'search'} iconKey */
function HomeIcon({ iconKey }) {
  const icons = {
    collection: IconWallet,
    shipment: IconTruck,
    service: IconService,
    orders: IconOrders,
    customers: IconUsers,
    reports: IconChart,
    search: IconSearch,
  }
  const Icon = icons[iconKey] ?? IconOrders
  return <Icon />
}

/** @param {'success' | 'warning' | 'critical' | 'neutral'} tone */
function toneClass(tone) {
  if (tone === 'critical') return 'is-critical'
  if (tone === 'warning') return 'is-warning'
  if (tone === 'success') return 'is-success'
  return 'is-neutral'
}

/** @param {number} value */
function badgeValue(value) {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 99) return 99
  return Math.round(value)
}

/**
 * @param {{
 *   onNavigate: (page: 'home' | 'orders' | 'customers' | 'menu') => void
 * }} props
 */
export default function AppleNativeHomePage({ onNavigate }) {
  const { user } = useAuth()
  const { orders, salesOrderListItemDtos, collectionRowVMs } = useOrders()
  const { plans } = useShipmentPlans()

  const todayIso = getOperationalToday()
  const isDev = import.meta.env.DEV

  const firstName = useMemo(() => {
    const raw = user?.fullName?.trim()
    if (!raw) return 'Murat'
    const first = raw.split(/\s+/)[0]
    if (['Operasyon', 'Admin', 'Manager', 'Sales', 'Service', 'Finance', 'Warehouse'].includes(first)) {
      return 'Murat'
    }
    return first || 'Murat'
  }, [user?.fullName])

  const moduleCards = useMemo(
    () =>
      buildMobileStoreHomeCards({
        orders,
        listItemDtos: salesOrderListItemDtos,
        collectionRows: collectionRowVMs,
        shipmentPlans: plans,
        todayIso,
      }),
    [orders, salesOrderListItemDtos, collectionRowVMs, plans, todayIso],
  )

  const operationTasks = useMemo(
    () =>
      buildMobileOperationCenterTasks({
        listItemDtos: salesOrderListItemDtos,
        collectionRows: collectionRowVMs,
        shipmentPlans: plans,
        todayIso,
        currentUserName: user?.fullName ?? '',
      }),
    [salesOrderListItemDtos, collectionRowVMs, plans, todayIso, user?.fullName],
  )

  const criticalCards = useMemo(
    () => operationTasks.filter((task) => task.isCritical || task.isDelayed).slice(0, 3),
    [operationTasks],
  )

  const recentRows = useMemo(() => operationTasks.slice(0, 4), [operationTasks])

  const mappedModules = useMemo(() => {
    const byId = new Map(moduleCards.map((card) => [card.id, card]))
    const fallback = isDev
      ? {
          collection: { value: '228.750', hint: 'Bugün tahsilat' },
          shipment: { value: '0', hint: 'Planlanan sevk' },
          service: { value: '2', hint: 'Açık servis' },
          orders: { value: '0', hint: 'Yeni sipariş' },
          customers: { value: '0', hint: 'Aktif müşteri' },
          reports: { value: '0', hint: 'Canlı rapor' },
        }
      : {
          collection: { value: '0', hint: 'Tahsilat' },
          shipment: { value: '0', hint: 'Sevkiyat' },
          service: { value: '0', hint: 'Servis' },
          orders: { value: '0', hint: 'Sipariş' },
          customers: { value: '0', hint: 'Müşteri' },
          reports: { value: '0', hint: 'Rapor' },
        }

    return [
      {
        id: 'collection',
        label: 'TAHSİLAT',
        value: byId.get('collection')?.value ?? fallback.collection.value,
        hint: byId.get('collection')?.hint ?? fallback.collection.hint,
        badge: badgeValue(criticalCards.filter((task) => task.moduleId === 'collection').length),
        iconKey: 'collection',
      },
      {
        id: 'shipment',
        label: 'SEVKİYAT',
        value: byId.get('shipment')?.value ?? fallback.shipment.value,
        hint: byId.get('shipment')?.hint ?? fallback.shipment.hint,
        badge: badgeValue(criticalCards.filter((task) => task.moduleId === 'shipment').length),
        iconKey: 'shipment',
      },
      {
        id: 'service',
        label: 'SERVİS',
        value: byId.get('service')?.value ?? fallback.service.value,
        hint: byId.get('service')?.hint ?? fallback.service.hint,
        badge: badgeValue(criticalCards.filter((task) => task.moduleId === 'service').length),
        iconKey: 'service',
      },
      {
        id: 'orders',
        label: 'SİPARİŞ',
        value: byId.get('orders')?.value ?? fallback.orders.value,
        hint: byId.get('orders')?.hint ?? fallback.orders.hint,
        badge: badgeValue(criticalCards.filter((task) => task.moduleId === 'orders').length),
        iconKey: 'orders',
      },
      {
        id: 'customers',
        label: 'MÜŞTERİLER',
        value: byId.get('customers')?.value ?? fallback.customers.value,
        hint: byId.get('customers')?.hint ?? fallback.customers.hint,
        badge: 0,
        iconKey: 'customers',
      },
      {
        id: 'reports',
        label: 'RAPORLAR',
        value: byId.get('reports')?.value ?? fallback.reports.value,
        hint: byId.get('reports')?.hint ?? fallback.reports.hint,
        badge: 0,
        iconKey: 'reports',
      },
    ]
  }, [moduleCards, criticalCards, isDev])

  const quickActions = useMemo(
    () => [
      { id: 'new-order', label: 'Yeni Sipariş', iconKey: 'orders', target: 'orders' },
      { id: 'customers', label: 'Müşteriler', iconKey: 'customers', target: 'customers' },
      { id: 'collection', label: 'Tahsilat', iconKey: 'collection', target: 'orders' },
      { id: 'shipment', label: 'Sevkiyat', iconKey: 'shipment', target: 'orders' },
      { id: 'other', label: 'Diğer', iconKey: 'reports', target: 'orders' },
    ],
    [],
  )

  const criticalTiles = useMemo(
    () => [
      {
        id: 'critical-collection',
        title: 'Tahsilat\nBekliyor',
        badge: badgeValue(criticalCards.filter((task) => task.moduleId === 'collection').length),
        iconKey: 'collection',
        target: 'orders',
      },
      {
        id: 'critical-service',
        title: 'Montaj\nPlanla',
        badge: badgeValue(criticalCards.filter((task) => task.moduleId === 'service').length),
        iconKey: 'service',
        target: 'orders',
      },
      {
        id: 'critical-shipment',
        title: 'Sevkiyat\nPlanla',
        badge: badgeValue(criticalCards.filter((task) => task.moduleId === 'shipment').length),
        iconKey: 'shipment',
        target: 'orders',
      },
    ],
    [criticalCards],
  )

  const renderedRecentRows = useMemo(() => {
    const devFallback = [
      {
        id: 'recent-1',
        title: 'ABC Mobilya tahsilatı kaydedildi',
        detail: 'Tahsilat',
        time: '09:21',
        target: 'orders',
        iconKey: 'collection',
      },
      {
        id: 'recent-2',
        title: 'Montaj planı oluşturuldu',
        detail: 'Servis',
        time: 'Dün',
        target: 'orders',
        iconKey: 'service',
      },
      {
        id: 'recent-3',
        title: 'Sevkiyat tamamlandı',
        detail: 'Sevkiyat',
        time: 'Dün',
        target: 'orders',
        iconKey: 'shipment',
      },
      {
        id: 'recent-4',
        title: 'Yeni sipariş kaydı açıldı',
        detail: 'Sipariş',
        time: 'Dün',
        target: 'orders',
        iconKey: 'orders',
      },
    ]

    if (recentRows.length > 0) {
      const liveRows = recentRows.slice(0, 4).map((task) => ({
        id: task.id,
        title: task.party,
        detail: task.summary,
        time: task.lastAction,
        target: task.navTarget,
        iconKey: task.moduleId === 'collection' ? 'collection' : task.moduleId === 'shipment' ? 'shipment' : task.moduleId === 'service' ? 'service' : 'orders',
      }))

      if (!isDev || liveRows.length >= 4) return liveRows

      const extraRows = devFallback.filter((row) => !liveRows.some((liveRow) => liveRow.id === row.id))
      return [...liveRows, ...extraRows].slice(0, 4)
    }

    if (!isDev) return []

    return devFallback
  }, [recentRows, isDev])

  function resolvePage(target) {
    if (target === 'customers') return 'customers'
    if (target === 'home') return 'home'
    if (target === 'collection' || target === 'shipment' || target === 'service' || target === 'reports') {
      return 'menu'
    }
    return 'orders'
  }

  function handleNavigate(target) {
    onNavigate(resolvePage(target))
  }

  const unreadCount = criticalCards.length

  return (
    <main className="mos-native-home" aria-label="Apple Native Home">
      <div className="mos-native-home__status" aria-hidden>
        <span>9:41</span>
        <span className="mos-native-home__status-dynamic" />
        <span className="mos-native-home__status-icons">▮▮▮</span>
      </div>

      <header className="mos-native-home__header">
        <div className="mos-native-home__title-wrap">
          <p className="mos-native-home__greeting">Günaydın</p>
          <h1 className="mos-native-home__title">{firstName}</h1>
        </div>
        <button type="button" className="mos-native-home__notify" aria-label="Bildirimler">
          <IconBell />
          {unreadCount > 0 ? <span className="mos-native-home__notify-badge">{unreadCount}</span> : null}
        </button>
      </header>

      <section className="mos-native-home__module-area" aria-label="Ana modüller">
        <div className="mos-native-home__module-grid">
          {mappedModules.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`mos-native-home__module mos-native-home__module--${card.id} ${toneClass(moduleCards.find((entry) => entry.id === card.id)?.tone ?? 'neutral')}`}
              onClick={() => handleNavigate(card.id)}
            >
              <div className="mos-native-home__module-top">
                <span className="mos-native-home__module-icon" aria-hidden>
                  <HomeIcon iconKey={/** @type {any} */ (card.id)} />
                </span>
                {card.badge > 0 ? <span className="mos-native-home__module-badge">{card.badge}</span> : null}
              </div>
              <span className="mos-native-home__module-label">{card.label}</span>
              <strong className="mos-native-home__module-value">{card.value}</strong>
              <span className="mos-native-home__module-hint">{card.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mos-native-home__section mos-native-home__section--flat" aria-label="Kritik işler">
        <div className="mos-native-home__section-head">
          <h2>Kritik İşler</h2>
          <button type="button" className="mos-native-home__all" onClick={() => handleNavigate('orders')}>
            Tümü ›
          </button>
        </div>
        <div className="mos-native-home__critical-grid">
          {criticalTiles.map((task) => (
              <button
                key={task.id}
                type="button"
                className={`mos-native-home__critical mos-native-home__critical--${task.iconKey}`}
                onClick={() => handleNavigate(task.target)}
              >
                <span className="mos-native-home__critical-top">
                  <span className="mos-native-home__critical-icon" aria-hidden>
                    <HomeIcon iconKey={/** @type {any} */ (task.iconKey)} />
                  </span>
                  {task.badge > 0 ? <span className="mos-native-home__critical-badge">{task.badge}</span> : null}
                </span>
                <strong className="mos-native-home__critical-title">{task.title}</strong>
                <span className="mos-native-home__critical-go" aria-hidden>
                  <IconPlus />
                </span>
              </button>
            ))}
        </div>
      </section>

      <section className="mos-native-home__section mos-native-home__section--flat" aria-label="Hızlı işlemler">
        <div className="mos-native-home__section-head">
          <h2>Hızlı İşlemler</h2>
        </div>
        <div className="mos-native-home__quick-grid">
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="mos-native-home__quick"
              onClick={() => handleNavigate(action.target)}
            >
              <span className="mos-native-home__quick-icon" aria-hidden>
                <HomeIcon iconKey={/** @type {any} */ (action.iconKey)} />
              </span>
              <span className="mos-native-home__quick-label">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mos-native-home__section mos-native-home__section--flat" aria-label="Son hareketler">
        <div className="mos-native-home__section-head">
          <h2>Son Hareketler</h2>
          <button type="button" className="mos-native-home__all" onClick={() => handleNavigate('orders')}>
            Tümünü Gör
          </button>
        </div>
        <ul className="mos-native-home__recent-list">
          {renderedRecentRows.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="mos-native-home__recent"
                  onClick={() => handleNavigate(task.target)}
                >
                  <span className={`mos-native-home__recent-icon mos-native-home__recent-icon--${task.iconKey}`} aria-hidden>
                    <HomeIcon iconKey={/** @type {any} */ (task.iconKey)} />
                  </span>
                  <span className="mos-native-home__recent-copy">
                    <strong>{task.title}</strong>
                    <span>{task.detail}</span>
                  </span>
                  <span className="mos-native-home__recent-side">
                    <span className="mos-native-home__recent-time">{task.time}</span>
                    <span className="mos-native-home__recent-chevron" aria-hidden>
                      ›
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </section>

      <button type="button" className="mos-native-home__fab" aria-label="Hızlı ekle">
        <IconPlus />
      </button>

      <button type="button" className="mos-native-home__menu-fab" aria-label="Menü">
        <IconMenu />
      </button>
    </main>
  )
}

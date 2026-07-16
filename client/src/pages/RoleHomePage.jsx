import { useEffect, useMemo, useState } from 'react'
import { buildRoleHomeView } from '../mappers/home/roleHomeModel.js'
import { buildMobileStoreHomeCards } from '../mappers/mobile/mobileStoreOpsModel.js'
import { navigateWithOpsFilter } from '../lib/opsDeepLink.js'
import { getAllMissingItemsSnapshot } from '../services/mockMissingItemStore.js'
import { getApiBaseUrl } from '../config/dataSource.js'
import { useOrders } from '../state/useOrders.js'
import { useAuth } from '../state/AuthProvider.jsx'
import { useShipmentPlans } from '../hooks/useShipmentPlans.jsx'
import { useCompactPhoneViewport, useViewportTier } from '../hooks/useViewportTier.js'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import MosEmptyState from '../components/standards/MosEmptyState.jsx'
import MobileStoreHome from '../components/mobile/MobileStoreHome.jsx'
import MobileOperationHub from '../components/mobile/MobileOperationHub.jsx'
import MobileNotificationCenter from '../components/mobile/MobileNotificationCenter.jsx'
import MobileQuickActions from '../components/mobile/MobileQuickActions.jsx'
import { toastSuccess } from '../lib/toastBus.js'
import {
  buildMobileOperationCenterTasks,
  buildMobileOperationHubCards,
  buildMobileFieldPilotHubCards,
  filterMobileOperationCenterTasks,
} from '../mappers/mobile/mobileOperationHubModel.js'
import { useMobileOfflineFoundationOptional } from '../state/MobileOfflineFoundationProvider.jsx'
import {
  appendMobileLiveNotification,
  getMobileUnreadNotificationCount,
  markAllMobileNotificationsRead,
  markMobileNotificationRead,
  readMobileNotificationHistory,
  readMobileNotificationPreferences,
  readMobileNotificationReadIds,
  readMobileNotificationSignalSnapshot,
  writeMobileNotificationPreferences,
  writeMobileNotificationSignalSnapshot,
} from '../services/mobile/mobileNotificationCenterStore.js'
import '../styles/role-home.css'
import '../styles/mobile-operation-hub.css'
import '../styles/mobile-notification-center.css'

/**
 * @param {'success' | 'warning' | 'critical' | 'neutral'} tone
 */
function toneClass(tone) {
  if (tone === 'success') return 'is-success'
  if (tone === 'warning') return 'is-warning'
  if (tone === 'critical') return 'is-critical'
  return ''
}

/**
 * @param {{
 *   onNavigate?: (page: string, ctx?: { opsFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void
 *   onOpenOrderModal?: () => void
 *   onDashboardInteract?: () => void
 * }} props
 */
export default function RoleHomePage({ onNavigate, onOpenOrderModal, onDashboardInteract }) {
  const { user } = useAuth()
  const { orders, salesOrderListItemDtos, collectionRowVMs, refreshOrders, isRefreshing } = useOrders()
  const { plans, refreshPlans } = useShipmentPlans()
  const viewportTier = useViewportTier()
  const isCompactPhone = useCompactPhoneViewport()
  const isPhone = viewportTier === 'phone'
  const isTablet = viewportTier === 'tablet'
  const mobileOffline = useMobileOfflineFoundationOptional()
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
  const [taskFilter, setTaskFilter] = useState(/** @type {import('../mappers/mobile/mobileOperationHubModel.js').MobileOperationTaskFilterId} */ ('all'))
  const [mobileNotifications, setMobileNotifications] = useState(readMobileNotificationHistory)
  const [notificationReadIds, setNotificationReadIds] = useState(readMobileNotificationReadIds)
  const [notificationPrefs, setNotificationPrefs] = useState(readMobileNotificationPreferences)

  const effectiveListItemDtos = useMemo(() => {
    if (!isPhone) return salesOrderListItemDtos
    if (!mobileOffline?.usingCachedList) return salesOrderListItemDtos
    return mobileOffline.cachedListItemDtos
  }, [isPhone, salesOrderListItemDtos, mobileOffline])

  const userFirstName = useMemo(() => {
    const name = user?.fullName?.trim()
    if (!name) return 'Murat'
    return name.split(/\s+/)[0]
  }, [user?.fullName])

  const view = useMemo(() => {
    const apiMode = Boolean(getApiBaseUrl())
    return buildRoleHomeView({
      role: user?.role ?? 'MANAGER',
      orders,
      listItemDtos: salesOrderListItemDtos,
      collectionRows: collectionRowVMs,
      missingItems: apiMode ? undefined : getAllMissingItemsSnapshot(),
      userFirstName,
      shipmentPlans: plans,
    })
  }, [user?.role, orders, salesOrderListItemDtos, collectionRowVMs, userFirstName, plans])

  const mobileStoreCards = useMemo(
    () =>
      buildMobileStoreHomeCards({
        orders,
        listItemDtos: effectiveListItemDtos,
        collectionRows: collectionRowVMs,
        shipmentPlans: plans,
      }),
    [orders, effectiveListItemDtos, collectionRowVMs, plans],
  )

  const mobileUnreadNotificationCount = useMemo(
    () => getMobileUnreadNotificationCount(mobileNotifications, notificationReadIds),
    [mobileNotifications, notificationReadIds],
  )

  const mobileOperationHubCards = useMemo(
    () =>
      (isCompactPhone
        ? buildMobileOperationHubCards({
            listItemDtos: effectiveListItemDtos,
            collectionRows: collectionRowVMs,
            shipmentPlans: plans,
          })
        : buildMobileFieldPilotHubCards({
            listItemDtos: effectiveListItemDtos,
            collectionRows: collectionRowVMs,
            shipmentPlans: plans,
            notificationUnreadCount: mobileUnreadNotificationCount,
            offlinePendingCount: mobileOffline?.pendingSyncCount ?? 0,
            isOffline: mobileOffline?.online === false,
          })),
    [
      isCompactPhone,
      effectiveListItemDtos,
      collectionRowVMs,
      plans,
      mobileUnreadNotificationCount,
      mobileOffline?.pendingSyncCount,
      mobileOffline?.online,
    ],
  )

  const mobileOperationTasks = useMemo(
    () =>
      buildMobileOperationCenterTasks({
        listItemDtos: effectiveListItemDtos,
        collectionRows: collectionRowVMs,
        shipmentPlans: plans,
        currentUserName: user?.fullName || '',
      }),
    [effectiveListItemDtos, collectionRowVMs, plans, user?.fullName],
  )

  const filteredOperationTasks = useMemo(
    () => filterMobileOperationCenterTasks(mobileOperationTasks, taskFilter),
    [mobileOperationTasks, taskFilter],
  )

  const criticalOperationTask = useMemo(
    () => mobileOperationTasks.find((task) => task.isCritical) ?? null,
    [mobileOperationTasks],
  )

  useEffect(() => {
    if (!isPhone) return

    const currentSignal = {
      order: effectiveListItemDtos.length,
      shipment: plans.filter((plan) => {
        const status = String(plan.status ?? '').toLowerCase()
        return !status || (!status.includes('teslim') && !status.includes('delivered'))
      }).length,
      service: effectiveListItemDtos.filter((dto) => (dto.openMissingItemsCount ?? 0) > 0).length,
      missing: effectiveListItemDtos.reduce((sum, dto) => sum + (dto.openMissingItemsCount ?? 0), 0),
      collection: effectiveListItemDtos.filter((dto) => {
        const v = Number(dto.remainingAmount?.value ?? 0)
        return Number.isFinite(v) && v > 0
      }).length,
    }

    const previousSignal = readMobileNotificationSignalSnapshot()
    if (!previousSignal) {
      writeMobileNotificationSignalSnapshot(currentSignal)
      return
    }

    const definitions = [
      { key: 'order', title: 'Sipariş', navTarget: 'orders', navFilter: /** @type {const} */ ('new') },
      { key: 'shipment', title: 'Sevkiyat', navTarget: 'shipment-ops', navFilter: /** @type {const} */ ('today') },
      { key: 'service', title: 'Servis', navTarget: 'ssh-service', navFilter: /** @type {const} */ ('all') },
      { key: 'missing', title: 'Eksik Parça', navTarget: 'ssh-service', navFilter: /** @type {const} */ ('waiting') },
      { key: 'collection', title: 'Tahsilat', navTarget: 'collection', navFilter: /** @type {const} */ ('all') },
    ]

    let changed = false
    for (const item of definitions) {
      const before = previousSignal[item.key]
      const after = currentSignal[item.key]
      if (after <= before) continue
      const delta = after - before
      appendMobileLiveNotification(
        {
          type: /** @type {any} */ (item.key),
          title: `${item.title} icin yeni is`,
          body: `${delta} yeni kayit geldi`,
          navTarget: item.navTarget,
          navFilter: item.navFilter,
        },
        notificationPrefs,
      )
      changed = true
    }

    writeMobileNotificationSignalSnapshot(currentSignal)
    if (changed) {
      setMobileNotifications(readMobileNotificationHistory())
      setNotificationReadIds(readMobileNotificationReadIds())
    }
  }, [isPhone, effectiveListItemDtos, plans, notificationPrefs])

  function handleOpenMobileNotification(item) {
    onDashboardInteract?.()
    markMobileNotificationRead(item.id)
    setNotificationReadIds(readMobileNotificationReadIds())
    setNotificationCenterOpen(false)
    if (!onNavigate) return
    if (item.navFilter) navigateWithOpsFilter(item.navTarget, item.navFilter, onNavigate)
    else onNavigate(item.navTarget)
  }

  function handleMarkAllMobileNotificationsRead() {
    markAllMobileNotificationsRead(mobileNotifications.map((item) => item.id))
    setNotificationReadIds(readMobileNotificationReadIds())
  }

  function handleOpenOperationTask(task) {
    onDashboardInteract?.()
    if (!onNavigate) return
    if (task.navFilter) navigateWithOpsFilter(task.navTarget, task.navFilter, onNavigate)
    else onNavigate(task.navTarget)
  }

  function handleNotificationPreferenceChange(next) {
    setNotificationPrefs(next)
    writeMobileNotificationPreferences(next)
  }

  function focusGlobalSearch() {
    document.querySelector('.mos-global-search-input')?.focus()
  }

  /** @param {import('../mappers/home/roleHomeModel.js').RoleHomeAction} action */
  function runAction(action) {
    onDashboardInteract?.()
    if (action.actionKind === 'new-order') {
      onOpenOrderModal?.()
      return
    }
    if (!onNavigate) return
    if (action.navTarget && action.navFilter) {
      navigateWithOpsFilter(action.navTarget, action.navFilter, onNavigate)
      return
    }
    if (action.navTarget) onNavigate(action.navTarget)
  }

  /** @param {import('../mappers/home/roleHomeModel.js').RoleHomeKpi} kpi */
  function openKpi(kpi) {
    onDashboardInteract?.()
    if (!onNavigate) return
    if (kpi.navFilter) navigateWithOpsFilter(kpi.navTarget, kpi.navFilter, onNavigate)
    else onNavigate(kpi.navTarget)
  }

  /** @param {import('../mappers/home/roleHomeModel.js').RoleHomeTask} task */
  function openTask(task) {
    onDashboardInteract?.()
    if (!onNavigate || !task.navTarget) return
    if (task.navFilter) navigateWithOpsFilter(task.navTarget, task.navFilter, onNavigate)
    else onNavigate(task.navTarget)
  }

  const visibleActions = view.quickActions.slice(0, 4)

  async function handleRefresh() {
    await Promise.all([refreshOrders(), refreshPlans()])
    setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
    toastSuccess('Dashboard verileri yenilendi')
  }

  return (
    <div className="mos-role-home">
      {!isPhone ? (
        <PageRefreshBar
          title="Dashboard verilerini yenile"
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          updatedAt={lastRefresh}
        />
      ) : null}

      {isPhone ? (
        <>
          <MobileStoreHome
            cards={mobileStoreCards}
            greeting={view.greeting}
            todayLabel={view.todayLabel}
            onNavigate={onNavigate}
          />
          {criticalOperationTask ? (
            <section className="mos-role-home__mobile-sticky-critical" aria-label="Kritik aksiyon">
              <p className="mos-role-home__mobile-sticky-critical-label">Kritik aksiyon</p>
              <button
                type="button"
                className="mos-role-home__mobile-sticky-critical-btn"
                onClick={() => handleOpenOperationTask(criticalOperationTask)}
              >
                {criticalOperationTask.summary}
              </button>
            </section>
          ) : null}
          <MobileOperationHub
            cards={mobileOperationHubCards}
            onNavigate={onNavigate}
            pendingSyncCount={mobileOffline?.pendingSyncCount ?? 0}
            notificationUnreadCount={mobileUnreadNotificationCount}
            onOpenNotifications={() => setNotificationCenterOpen(true)}
            taskFilter={taskFilter}
            onTaskFilterChange={setTaskFilter}
            tasks={filteredOperationTasks}
            onOpenTask={handleOpenOperationTask}
          />
          <MobileQuickActions
            onNavigate={onNavigate}
            onNewOrder={onOpenOrderModal}
            onFocusSearch={focusGlobalSearch}
            className="mos-mobile-quick-actions--dock"
          />
          <MobileNotificationCenter
            open={notificationCenterOpen}
            unreadCount={mobileUnreadNotificationCount}
            notifications={mobileNotifications}
            preferences={notificationPrefs}
            onClose={() => setNotificationCenterOpen(false)}
            onMarkAllRead={handleMarkAllMobileNotificationsRead}
            onOpenNotification={handleOpenMobileNotification}
            onPreferenceChange={handleNotificationPreferenceChange}
          />
        </>
      ) : null}

      {isTablet ? (
        <>
          <MobileStoreHome
            cards={mobileStoreCards}
            greeting={view.greeting}
            todayLabel={view.todayLabel}
            onNavigate={onNavigate}
          />
          <MobileQuickActions
            onNavigate={onNavigate}
            onNewOrder={onOpenOrderModal}
            onFocusSearch={focusGlobalSearch}
          />
        </>
      ) : null}

      <header className="mos-role-home__header mos-role-home__desktop-only">
        <div>
          <p className="mos-role-home__eyebrow">{view.todayLabel}</p>
          <h1 className="mos-role-home__title">{view.title}</h1>
          <p className="mos-role-home__greeting">{view.greeting}</p>
        </div>
      </header>

      <section className="mos-role-home__kpis mos-role-home__desktop-only" aria-label="Ana göstergeler">
        {view.kpis.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            className={`mos-role-home__kpi ${toneClass(kpi.tone)}`}
            onClick={() => openKpi(kpi)}
          >
            <span className="mos-role-home__kpi-label">{kpi.label}</span>
            <strong className="mos-role-home__kpi-value">{kpi.value}</strong>
          </button>
        ))}
      </section>

      <section className="mos-role-home__tasks mos-role-home__desktop-only">
        <h2 className="mos-role-home__section-title">Bugün ne yapmalıyım?</h2>
        <ul className="mos-role-home__task-list">
          {view.todayTasks.length === 0 ? (
            <li>
              <MosEmptyState preset="dashboard" title="Bugün için özel görev yok" body="Operasyon akışı temiz görünüyor." />
            </li>
          ) : (
            view.todayTasks.map((task) =>
              task.navTarget ? (
                <li key={task.id}>
                  <button
                    type="button"
                    className={`mos-role-home__task mos-role-home__task-btn ${toneClass(task.tone)}`}
                    onClick={() => openTask(task)}
                  >
                    {task.text}
                  </button>
                </li>
              ) : (
                <li key={task.id} className={`mos-role-home__task ${toneClass(task.tone)}`}>
                  {task.text}
                </li>
              ),
            )
          )}
        </ul>
      </section>

      {visibleActions.length > 0 ? (
        <section className="mos-role-home__actions mos-role-home__desktop-only">
          <h2 className="mos-role-home__section-title">Hızlı aksiyonlar</h2>
          <div className="mos-role-home__action-grid">
            {visibleActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`mos-role-home__action mos-role-home__action--${action.variant}`}
                onClick={() => runAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

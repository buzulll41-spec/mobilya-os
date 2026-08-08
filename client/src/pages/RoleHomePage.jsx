import { Fragment, useEffect, useMemo, useState } from 'react'
import { buildRoleHomeView } from '../mappers/home/roleHomeModel.js'
import { buildMobileStoreHomeCards } from '../mappers/mobile/mobileStoreOpsModel.js'
import { navigateWithOpsFilter } from '../lib/opsDeepLink.js'
import { useOrders } from '../state/useOrders.js'
import { useAuth } from '../state/AuthProvider.jsx'
import { useShipmentPlans } from '../hooks/useShipmentPlans.jsx'
import { useViewportTier } from '../hooks/useViewportTier.js'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import MosEmptyState from '../components/standards/MosEmptyState.jsx'
import MobileStoreHome from '../components/mobile/MobileStoreHome.jsx'
import MobileNotificationCenter from '../components/mobile/MobileNotificationCenter.jsx'
import MobileQuickActions from '../components/mobile/MobileQuickActions.jsx'
import {
  IconBell,
  IconChart,
  IconOrders,
  IconSearch,
  IconService,
  IconTruck,
  IconUsers,
  IconWallet,
} from '../components/Icons.jsx'
import { toastSuccess } from '../lib/toastBus.js'
import {
  buildMobileOperationCenterTasks,
} from '../mappers/mobile/mobileOperationHubModel.js'
import { getOperationalToday } from '../data/index.js'
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

const HOME_V5_DEV_FILLED_DATA_ENABLED = import.meta.env.DEV
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

/** @param {unknown} value */
function toCount(value) {
  const text = String(value ?? '0')
  const normalized = text.replace(/[^0-9-]/g, '')
  const parsed = Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function getModuleActionLabel(task) {
  if (task.moduleId === 'collection') return 'Tahsilat Bekliyor'
  if (task.moduleId === 'shipment') return task.isDelayed ? 'Sevkiyat Gecikti' : 'Sevkiyat Planla'
  if (task.moduleId === 'service') return 'Montaj Planla'
  if (task.moduleId === 'missing') return 'Eksik Parca'
  return 'Siparis Onayi'
}

function getModuleIconKey(moduleId) {
  if (moduleId === 'collection') return 'collection'
  if (moduleId === 'shipment') return 'shipment'
  if (moduleId === 'service') return 'service'
  if (moduleId === 'missing') return 'customers'
  return 'orders'
}

function getModuleTone(task) {
  if (task.moduleId === 'missing') return 'info'
  if (task.isCritical || task.isDelayed || task.priority === 'Kritik') return 'critical'
  if (task.moduleId === 'collection') return 'success'
  if (task.moduleId === 'shipment') return 'info'
  return 'warning'
}

function getRecentActivityTone(moduleId) {
  if (moduleId === 'collection') return 'success'
  if (moduleId === 'shipment') return 'info'
  if (moduleId === 'service') return 'warning'
  if (moduleId === 'customer') return 'accent'
  return 'purple'
}

function getRecentActivityLabel(task) {
  if (task.moduleId === 'collection') return 'Tahsilat'
  if (task.moduleId === 'shipment') return 'Sevkiyat'
  if (task.moduleId === 'service') return 'Servis'
  if (task.moduleId === 'customer') return 'Musteri'
  return 'Siparis'
}

function renderHomeIcon(iconKey) {
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

const HOME_V5_DEV_MODULE_OVERRIDES = {
  collection: { value: '4', hint: 'Bekleyen tahsilat', tone: 'success' },
  shipment: { value: '1', hint: 'Plan bekliyor', tone: 'info' },
  service: { value: '2', hint: 'Montaj / servis', tone: 'warning' },
  orders: { value: '3', hint: 'Yeni siparis', tone: 'purple' },
  reports: { value: 'Aktif', hint: 'Canli erisim', tone: 'accent' },
}

const HOME_V5_DEV_CRITICAL_JOBS = [
  {
    id: 'dev-critical-collection',
    moduleId: 'collection',
    navTarget: 'collection',
    navFilter: 'overdue',
    actionLabel: 'Tahsilat Bekliyor',
    party: '4',
    status: 'Kritik',
    lastAction: 'Bugun',
    iconKey: 'collection',
    tone: 'critical',
  },
  {
    id: 'dev-critical-service',
    moduleId: 'service',
    navTarget: 'ssh-service',
    navFilter: 'all',
    actionLabel: 'Montaj Planla',
    party: '2',
    status: 'Oncelik',
    lastAction: 'Bugun',
    iconKey: 'service',
    tone: 'warning',
  },
  {
    id: 'dev-critical-shipment',
    moduleId: 'shipment',
    navTarget: 'shipment-ops',
    navFilter: 'today',
    actionLabel: 'Sevkiyat Planla',
    party: '1',
    status: 'Bekliyor',
    lastAction: 'Bugun',
    iconKey: 'shipment',
    tone: 'info',
  },
]

const HOME_V5_DEV_RECENT_ROWS = [
  {
    id: 'dev-recent-abc',
    iconKey: 'collection',
    title: 'ABC Mobilya',
    detail: '128.500 ₺',
    kindLabel: 'Tahsilat',
    tone: 'success',
    time: '09:21',
    task: { navTarget: 'collection', navFilter: 'all' },
  },
  {
    id: 'dev-recent-def',
    iconKey: 'service',
    title: 'DEF Insaat',
    detail: 'Montaj planlandi',
    kindLabel: 'Servis',
    tone: 'warning',
    time: 'Dun',
    task: { navTarget: 'ssh-service', navFilter: 'all' },
  },
  {
    id: 'dev-recent-ghi',
    iconKey: 'shipment',
    title: 'GHI Magazasi',
    detail: 'Sevkiyat tamamlandi',
    kindLabel: 'Sevkiyat',
    tone: 'info',
    time: 'Dun',
    task: { navTarget: 'shipment-ops', navFilter: 'today' },
  },
  {
    id: 'dev-recent-jkl',
    iconKey: 'orders',
    title: 'JKL Tasarim',
    detail: 'Yeni siparis · 75.200 ₺',
    kindLabel: 'Siparis',
    tone: 'purple',
    time: '2 gun',
    task: { navTarget: 'orders', navFilter: 'new' },
  },
]

/**
 * @param {{
 *   onNavigate?: (page: string, ctx?: { opsFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void
 *   onOpenOrderModal?: () => void
 *   onDashboardInteract?: () => void
 * }} props
 */
export default function RoleHomePage({ onNavigate, onOpenOrderModal, onDashboardInteract }) {
  const { user } = useAuth()
  const { orders, salesOrderListItemDtos, collectionRowVMs, refreshOrders, isRefreshing, dataPipeline } = useOrders()
  const { plans, refreshPlans } = useShipmentPlans()
  const viewportTier = useViewportTier()
  const isPhone = viewportTier === 'phone'
  const isTablet = viewportTier === 'tablet'
  const showDesktopHome = !isPhone && !isTablet
  const mobileOffline = useMobileOfflineFoundationOptional()
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false)
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
    const first = name.split(/\s+/)[0]
    if (['Operasyon', 'Admin', 'Manager', 'Sales', 'Service', 'Finance', 'Warehouse'].includes(first)) {
      return 'Murat'
    }
    return first
  }, [user?.fullName])

  const view = useMemo(() => {
    return buildRoleHomeView({
      role: user?.role ?? 'MANAGER',
      orders,
      listItemDtos: salesOrderListItemDtos,
      collectionRows: collectionRowVMs,
      missingItems: undefined,
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

  const displayMobileStoreCards = useMemo(() => {
    if (!isPhone || !HOME_V5_DEV_FILLED_DATA_ENABLED) return mobileStoreCards
    return mobileStoreCards.map((card) => {
      const override = HOME_V5_DEV_MODULE_OVERRIDES[card.id]
      if (!override) return card
      return {
        ...card,
        value: override.value,
        hint: override.hint,
        tone: override.tone,
      }
    })
  }, [isPhone, mobileStoreCards])

  const mobileUnreadNotificationCount = useMemo(
    () => getMobileUnreadNotificationCount(mobileNotifications, notificationReadIds),
    [mobileNotifications, notificationReadIds],
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

  const criticalOperationTask = useMemo(
    () => mobileOperationTasks.find((task) => task.isCritical) ?? null,
    [mobileOperationTasks],
  )

  const todaySummaryCards = useMemo(() => {
    const shipments = mobileStoreCards.find((card) => card.id === 'shipment')
    const collections = mobileStoreCards.find((card) => card.id === 'collection')
    const newOrders = mobileStoreCards.find((card) => card.id === 'orders')
    return [
      {
        id: 'shipments',
        title: 'Sevkiyatlar',
        value: shipments?.value ?? '0',
        subtitle: 'Bugünkü sevkiyat',
        navTarget: shipments?.navTarget ?? 'shipment-ops',
        navFilter: shipments?.navFilter ?? 'today',
      },
      {
        id: 'collections',
        title: 'Tahsilatlar',
        value: collections?.value ?? '0',
        subtitle: 'Bekleyen tahsilat',
        navTarget: collections?.navTarget ?? 'collection',
        navFilter: collections?.navFilter ?? 'all',
      },
      {
        id: 'orders',
        title: 'Yeni Siparişler',
        value: newOrders?.value ?? '0',
        subtitle: 'Yeni sipariş',
        navTarget: newOrders?.navTarget ?? 'orders',
        navFilter: newOrders?.navFilter ?? 'new',
      },
    ]
  }, [mobileStoreCards])

  const priorityTask = useMemo(
    () => criticalOperationTask ?? mobileOperationTasks[0] ?? null,
    [criticalOperationTask, mobileOperationTasks],
  )

  const shipmentDelayedCount = useMemo(
    () => mobileOperationTasks.filter((task) => task.moduleId === 'shipment' && task.isDelayed).length,
    [mobileOperationTasks],
  )

  const collectionOverdueCount = useMemo(
    () => mobileOperationTasks.filter((task) => task.moduleId === 'collection' && task.isCritical).length,
    [mobileOperationTasks],
  )

  const installPlannedCount = useMemo(
    () => mobileOperationTasks.filter((task) => task.moduleId === 'service' || task.moduleId === 'missing').length,
    [mobileOperationTasks],
  )

  const dynamicCounts = useMemo(() => {
    const shipmentCount = toCount(todaySummaryCards.find((card) => card.id === 'shipments')?.value ?? 0)
    const collectionCount = toCount(todaySummaryCards.find((card) => card.id === 'collections')?.value ?? 0)
    const orderCount = toCount(todaySummaryCards.find((card) => card.id === 'orders')?.value ?? 0)
    return { shipmentCount, collectionCount, orderCount }
  }, [todaySummaryCards])

  const aiRecommendations = useMemo(() => {
    /** @type {Array<{ id: string, title: string, description: string, actions: Array<{ id: string, label: string, navTarget?: string, navFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId, actionKind?: 'new-order' | 'open-menu' }> }>} */
    const suggestions = []

    const delayedShipment = mobileOperationTasks.find((task) => task.moduleId === 'shipment' && task.isDelayed)
    if (delayedShipment) {
      suggestions.push({
        id: 'ai-shipment-delay',
        title: `${delayedShipment.party} teslimatı gecikme riski taşıyor`,
        description: 'Bugünün akışını korumak için sevk planını güncelle.',
        actions: [
          { id: 'ai-update-shipment', label: 'Sevki Güncelle', navTarget: 'shipment-ops', navFilter: 'today' },
        ],
      })
    }

    const overdueCollection = mobileOperationTasks.find((task) => task.moduleId === 'collection' && task.isCritical)
    if (overdueCollection) {
      suggestions.push({
        id: 'ai-collection-overdue',
        title: `${overdueCollection.party} tahsilatı bugün bekleniyor`,
        description: overdueCollection.summary,
        actions: [
          { id: 'ai-collect-now', label: 'Tahsilatı Başlat', navTarget: 'collection', navFilter: 'overdue' },
        ],
      })
    }

    if (installPlannedCount > 0) {
      suggestions.push({
        id: 'ai-install-plan',
        title: `${installPlannedCount} montaj / servis işi plan bekliyor`,
        description: 'Ekip atayıp sırayı netleştirerek günü rahatlat.',
        actions: [
          { id: 'ai-plan-install', label: 'Montajı Planla', navTarget: 'ssh-service', navFilter: 'all' },
        ],
      })
    }

    if (suggestions.length === 0) {
      suggestions.push({
        id: 'ai-clear-day',
        title: 'Kritik risk görünmüyor',
        description: 'Yeni siparişleri ve bugünkü teslimatları ritimde tut.',
        actions: [
          { id: 'ai-open-orders', label: 'Siparişleri Aç', navTarget: 'orders', navFilter: 'new' },
        ],
      })
    }

    return suggestions.slice(0, 1)
  }, [mobileOperationTasks, installPlannedCount])

  const criticalJobs = useMemo(
    () => {
      if (isPhone && HOME_V5_DEV_FILLED_DATA_ENABLED) return HOME_V5_DEV_CRITICAL_JOBS
      const strictCritical = mobileOperationTasks
        .filter((task) => task.isCritical || task.isDelayed || task.priority === 'Kritik')
        .slice(0, 4)
        .map((task) => ({
          ...task,
          actionLabel: getModuleActionLabel(task),
          tone: getModuleTone(task),
          iconKey: getModuleIconKey(task.moduleId),
        }))

      if (strictCritical.length > 0) return strictCritical

      // Fallback: operasyon listesi boş görünmesin, sıradaki gerçek işleri göster.
      return mobileOperationTasks.slice(0, 4).map((task) => ({
        ...task,
        actionLabel: getModuleActionLabel(task),
        tone: getModuleTone(task),
        iconKey: getModuleIconKey(task.moduleId),
      }))
    },
    [isPhone, mobileOperationTasks],
  )

  const criticalDecisionTrace = useMemo(() => {
    return mobileOperationTasks.map((task) => {
      const selected = task.isCritical || task.isDelayed || task.priority === 'Kritik'
      /** @type {string[]} */
      const eliminationReasons = []
      if (!selected) {
        if (!task.isCritical) eliminationReasons.push('not_critical')
        if (!task.isDelayed) eliminationReasons.push('not_delayed')
        if (task.priority !== 'Kritik') eliminationReasons.push('priority_not_kritik')
      }
      return {
        id: task.id,
        moduleId: task.moduleId,
        party: task.party,
        selected,
        eliminationReasons,
      }
    })
  }, [mobileOperationTasks])

  useEffect(() => {
    if (!isPhone) return

    const selection = criticalDecisionTrace
    const selected = selection.filter((item) => item.selected)
    const excluded = selection.filter((item) => !item.selected)
    const eliminationReasonCounts = excluded.reduce((acc, item) => {
      for (const reason of item.eliminationReasons) {
        acc[reason] = (acc[reason] ?? 0) + 1
      }
      return acc
    }, /** @type {Record<string, number>} */ ({}))

    console.info('HOME OPERATION DIAGNOSTICS', {
      source: 'RoleHomePage.mobileHome',
      pipelineLayer: dataPipeline?.layer ?? 'unknown',
      operationEngineInputCount: effectiveListItemDtos.length,
      matchedRecordCount: mobileOperationTasks.length,
      renderedActionCount: criticalJobs.length,
      strictCriticalMatchCount: selected.length,
      excludedCount: excluded.length,
      eliminationReasonCounts,
      sampleDecisionTrace: selection.slice(0, 5),
    })
  }, [
    isPhone,
    dataPipeline?.layer,
    effectiveListItemDtos.length,
    mobileOperationTasks.length,
    criticalJobs.length,
    criticalDecisionTrace,
  ])

  const aiMicroCard = aiRecommendations[0] ?? null

  const quickActions = useMemo(
    () => [
      { id: 'new-order', label: 'Siparis', iconKey: 'orders' },
      { id: 'collection', label: 'Tahsilat', iconKey: 'collection' },
      { id: 'shipment', label: 'Sevkiyat', iconKey: 'shipment' },
      { id: 'customer-add', label: 'Musteri', iconKey: 'customers' },
      { id: 'install', label: 'Montaj', iconKey: 'service' },
      { id: 'product-search', label: 'Ara', iconKey: 'search' },
    ],
    [],
  )

  const activityRows = useMemo(
    () => {
      if (isPhone && HOME_V5_DEV_FILLED_DATA_ENABLED) return HOME_V5_DEV_RECENT_ROWS
      return mobileOperationTasks.slice(0, 4).map((task) => ({
        id: task.id,
        iconKey: getModuleIconKey(task.moduleId),
        title: task.party || 'Operasyon',
        detail:
          task.moduleId === 'collection'
            ? task.status || 'Tahsilat'
            : task.moduleId === 'shipment'
              ? task.isDelayed
                ? 'Sevkiyat'
                : task.status || 'Sevkiyat'
              : task.moduleId === 'service'
                ? task.status || 'Servis'
                : task.moduleId === 'customer'
                  ? 'Musteri'
                  : task.status || 'Siparis',
        kindLabel: getRecentActivityLabel(task),
        tone: getRecentActivityTone(task.moduleId),
        time: task.lastAction || task.dueDate || '—',
        task,
      }))
    },
    [isPhone, mobileOperationTasks],
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

  function handleHomeNavigate(page, ctx) {
    onDashboardInteract?.()
    onNavigate?.(page, ctx)
  }

  function handleTodayQuickAction(actionId) {
    onDashboardInteract?.()
    if (actionId === 'new-order') {
      onOpenOrderModal?.()
      return
    }
    if (actionId === 'collection') {
      onNavigate?.('collection')
      return
    }
    if (actionId === 'shipment') {
      if (onNavigate) navigateWithOpsFilter('shipment-ops', 'today', onNavigate)
      return
    }
    if (actionId === 'install') {
      if (onNavigate) navigateWithOpsFilter('ssh-service', 'all', onNavigate)
      return
    }
    if (actionId === 'customer-add') {
      onNavigate?.('orders')
      return
    }
    if (actionId === 'product-search') {
      onNavigate?.('product-master-center')
      return
    }
    if (actionId === 'customer-search') {
      onNavigate?.('orders')
    }
  }

  function handleSuggestionAction(action) {
    onDashboardInteract?.()
    if (action.actionKind === 'new-order') {
      onOpenOrderModal?.()
      return
    }
    if (!onNavigate || !action.navTarget) return
    if (action.navFilter) navigateWithOpsFilter(action.navTarget, action.navFilter, onNavigate)
    else onNavigate(action.navTarget)
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
          <section className="mos-today-mobile" aria-label="Bugün ana ekranı">
            <header className="mos-today-mobile__head">
              <div>
                <h1 className="mos-today-mobile__greeting">Günaydın {userFirstName}</h1>
              </div>
              <button
                type="button"
                className="mos-today-mobile__notify-btn"
                aria-label="Bildirim merkezi"
                onClick={() => setNotificationCenterOpen(true)}
              >
                <IconBell />
                {mobileUnreadNotificationCount > 0 ? (
                  <span className="mos-today-mobile__notify-badge">{mobileUnreadNotificationCount}</span>
                ) : null}
              </button>
            </header>

            <section className="mos-today-mobile__modules" aria-label="Ana modüller">
              <MobileStoreHome cards={displayMobileStoreCards} onNavigate={handleHomeNavigate} />
            </section>

            <section className="mos-today-mobile__critical" aria-label="Kritik işler">
              <div className="mos-today-mobile__section-head">
                <h2 className="mos-today-mobile__section-title">Kritik İşler</h2>
                <span className="mos-today-mobile__section-badge">{criticalJobs.length}</span>
              </div>
              {criticalJobs.length === 0 ? (
                <p className="mos-today-mobile__empty">Kritik iş görünmüyor. Operasyon akışı dengede.</p>
              ) : (
                <ul className="mos-today-mobile__critical-list">
                  {aiMicroCard ? (
                    <li key={aiMicroCard.id}>
                      <button
                        type="button"
                        className="mos-today-mobile__critical-item mos-today-mobile__critical-item--ai"
                        onClick={() => handleSuggestionAction(aiMicroCard.actions[0])}
                      >
                        <span className="mos-today-mobile__critical-top">
                          <span className="mos-today-mobile__critical-icon" aria-hidden>
                            {renderHomeIcon('reports')}
                          </span>
                          <span className="mos-today-mobile__critical-arrow" aria-hidden>›</span>
                        </span>
                        <span className="mos-today-mobile__critical-title">AI Onerisi</span>
                        <strong className="mos-today-mobile__critical-party">{aiMicroCard.title}</strong>
                        <span className="mos-today-mobile__critical-meta">{aiMicroCard.actions[0]?.label ?? 'Detaya git'}</span>
                      </button>
                    </li>
                  ) : null}
                  {criticalJobs.map((job) => (
                    <li key={job.id}>
                      <button
                        type="button"
                        className={`mos-today-mobile__critical-item is-${job.tone}`}
                        onClick={() => handleOpenOperationTask(job)}
                      >
                        <span className="mos-today-mobile__critical-top">
                          <span className="mos-today-mobile__critical-icon" aria-hidden>
                            {renderHomeIcon(job.iconKey)}
                          </span>
                          <span className="mos-today-mobile__critical-arrow" aria-hidden>›</span>
                        </span>
                        <span className="mos-today-mobile__critical-title">{job.actionLabel}</span>
                        <strong className="mos-today-mobile__critical-party">{job.party}</strong>
                        <span className="mos-today-mobile__critical-meta">{job.lastAction || job.dueDate || job.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mos-today-mobile__quick" aria-label="Hızlı işlemler">
              <h2 className="mos-today-mobile__section-title">Hızlı İşlemler</h2>
              <div className="mos-today-mobile__quick-grid">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="mos-today-mobile__quick-btn"
                    onClick={() => handleTodayQuickAction(action.id)}
                  >
                    <span className="mos-today-mobile__quick-icon" aria-hidden>{renderHomeIcon(action.iconKey)}</span>
                    <span className="mos-today-mobile__quick-label">{action.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mos-today-mobile__recent" aria-label="Son hareketler">
              <div className="mos-today-mobile__recent-head">
                <h2 className="mos-today-mobile__section-title">Son Hareketler</h2>
              </div>
              <ul className="mos-today-mobile__recent-list">
                {activityRows.length === 0 ? (
                  <li className="mos-today-mobile__recent-empty">Henüz hareket bulunmuyor.</li>
                ) : (
                  activityRows.map((row, index) => (
                    <Fragment key={row.id}>
                      <li key={row.id}>
                        <button
                          type="button"
                          className={`mos-today-mobile__recent-item is-${row.tone}`}
                          onClick={() => handleOpenOperationTask(row.task)}
                        >
                          <span className={`mos-today-mobile__recent-icon is-${row.tone}`} aria-hidden>
                            {renderHomeIcon(row.iconKey)}
                          </span>
                          <span className="mos-today-mobile__recent-copy">
                            <strong>{row.title}</strong>
                              <span>{row.detail}</span>
                          </span>
                          <span className="mos-today-mobile__recent-side">
                            <span className="mos-today-mobile__recent-time">{row.time}</span>
                            <span className="mos-today-mobile__recent-chevron" aria-hidden>›</span>
                          </span>
                        </button>
                      </li>
                      {index === 0 ? (
                        <li key="recent-see-all">
                          <button
                            type="button"
                            className="mos-today-mobile__recent-item mos-today-mobile__recent-item--see-all"
                            onClick={() => setNotificationCenterOpen(true)}
                          >
                            <span className="mos-today-mobile__recent-icon is-neutral" aria-hidden>
                              {renderHomeIcon('reports')}
                            </span>
                            <span className="mos-today-mobile__recent-copy">
                              <strong>Tum Hareketleri Gor</strong>
                              <span>Bildirim merkezi ve gecmis akis</span>
                            </span>
                            <span className="mos-today-mobile__recent-side">
                              <span className="mos-today-mobile__recent-time">Tumu</span>
                              <span className="mos-today-mobile__recent-chevron" aria-hidden>›</span>
                            </span>
                          </button>
                        </li>
                      ) : null}
                    </Fragment>
                  ))
                )}
              </ul>
            </section>

          </section>

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

      {showDesktopHome ? (
        <>
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
        </>
      ) : null}
    </div>
  )
}

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import NewOrderWizard from './features/orders/NewOrderWizard.jsx'
import OrderOperationPanel from './features/orders/OrderOperationPanel.jsx'
import SalesContractPrint from './features/orders/SalesContractPrint.jsx'
import { getApiBaseUrl } from './config/dataSource.js'
import { isDemoMode } from './config/appMode.js'
import { projectLegacyOrderToListItemDto } from './services/orderListItemProjection.js'
import { buildSshMissingPartsQueue } from './mappers/ssh/sshMissingPartsModel.js'
import { getAllMissingItemsSnapshot } from './services/mockMissingItemStore.js'
const ExecutiveCommandCenterPage = lazy(() => import('./pages/ExecutiveCommandCenterPage.jsx'))
const DigitalWorkforcePage = lazy(() => import('./pages/DigitalWorkforcePage.jsx'))
const ExecutiveCenterPage = lazy(() => import('./pages/ExecutiveCenterPage.jsx'))
const ProductMasterHubPage = lazy(() => import('./pages/hubs/ProductMasterHubPage.jsx'))
const OperationMapPage = lazy(() => import('./pages/OperationMapPage.jsx'))
const CompanySimulationPage = lazy(() => import('./pages/CompanySimulationPage.jsx'))
const EnterpriseCommandCenterPage = lazy(() => import('./pages/EnterpriseCommandCenterPage.jsx'))
import ShipmentOperationModal from './features/shipment/ShipmentOperationModal.jsx'
import EmptyOrdersState from './components/EmptyOrdersState.jsx'
import LoadingBlock from './components/LoadingBlock.jsx'
import OrdersErrorBanner from './components/OrdersErrorBanner.jsx'
import MobileStoreErrorState from './components/mobile/MobileStoreErrorState.jsx'
import { getOperationalToday } from './data/index.js'
import { dispatchMobileFabIntent } from './constants/mobileFabActions.js'
import AppLayout from './layout/AppLayout.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import RoleHomePage from './pages/RoleHomePage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import ShipmentOperationsPage from './pages/ShipmentOperationsPage.jsx'
import { MAIN_NAV, normalizePageId } from './constants/navigation.js'
import { canAccessPage, filterNavForRole } from './constants/roleAccess.js'
import { canCreateSalesOrder } from './constants/orderDrawerPermissions.js'
import { resolveDefaultHomePage, resolveMobileFieldPilotHomePage } from './constants/roleDefaults.js'
import { setOpsDeepLink } from './lib/opsDeepLink.js'
import { USER_ROLE } from './contracts/v1/user.js'
import { useAuth } from './state/AuthProvider.jsx'
import { loadAuthSession } from './services/authSessionStore.js'
import LoginPage from './pages/LoginPage.jsx'
import ServiceCenterPage from './pages/ServiceCenterPage.jsx'
import SupplyIncomingPage from './pages/SupplyIncomingPage.jsx'
import SupplierLedgerCenterPage from './pages/SupplierLedgerCenterPage.jsx'
import ProductHealthPage from './pages/ProductHealthPage.jsx'
import ProductPublishReadinessPage from './pages/ProductPublishReadinessPage.jsx'
import OperationCenterPage from './pages/OperationCenterPage.jsx'
import OperationAutomationCenterPage from './pages/OperationAutomationCenterPage.jsx'
import PilotReadinessPage from './pages/PilotReadinessPage.jsx'
import GoLivePage from './pages/GoLivePage.jsx'
import EnterpriseReleasePage from './pages/EnterpriseReleasePage.jsx'
import EnterpriseCeoDashboardPage from './pages/EnterpriseCeoDashboardPage.jsx'
import ErrorCenterPage from './pages/ErrorCenterPage.jsx'
import CeoCopilotPage from './pages/CeoCopilotPage.jsx'
import SystemHealthPage from './pages/SystemHealthPage.jsx'
import EvtrendPublishingHubPage from './pages/hubs/EvtrendPublishingHubPage.jsx'
import CeoControlHubPage from './pages/hubs/CeoControlHubPage.jsx'
import OperationHubPage from './pages/hubs/OperationHubPage.jsx'
import SalesSourceAnalyticsPage from './pages/SalesSourceAnalyticsPage.jsx'
import ProfitabilityAnalyticsPage from './pages/ProfitabilityAnalyticsPage.jsx'
import OperationsAgentsPage from './pages/OperationsAgentsPage.jsx'
import ExecutiveDirectorPage from './pages/ExecutiveDirectorPage.jsx'
import StrategicIntelligencePage from './pages/StrategicIntelligencePage.jsx'
import BoardDirectorsPage from './pages/BoardDirectorsPage.jsx'
import CeoIntelligencePage from './pages/CeoIntelligencePage.jsx'
import ChairmanIntelligencePage from './pages/ChairmanIntelligencePage.jsx'
import FutureEnginePage from './pages/FutureEnginePage.jsx'
import InvestorIntelligencePage from './pages/InvestorIntelligencePage.jsx'
import HoldingCenterPage from './pages/HoldingCenterPage.jsx'
import GroupChairmanPage from './pages/GroupChairmanPage.jsx'
import BusinessBrainPage from './pages/BusinessBrainPage.jsx'
import ActionOrchestratorPage from './pages/ActionOrchestratorPage.jsx'
import PerformanceFeedbackPage from './pages/PerformanceFeedbackPage.jsx'
import LearningEnginePage from './pages/LearningEnginePage.jsx'
import OptimizationEnginePage from './pages/OptimizationEnginePage.jsx'
import GoalEnginePage from './pages/GoalEnginePage.jsx'
import ManagerCockpitPage from './pages/ManagerCockpitPage.jsx'
import ForecastEnginePage from './pages/ForecastEnginePage.jsx'
import OperationsAdvisorPage from './pages/OperationsAdvisorPage.jsx'
import BusinessRulesPage from './pages/BusinessRulesPage.jsx'
import BusinessRuleTesterPage from './pages/BusinessRuleTesterPage.jsx'
import DataQualityPage from './pages/DataQualityPage.jsx'
import UsersAdminPage from './pages/UsersAdminPage.jsx'
import { tasksToNotificationItems } from './mappers/tasks/projectOperationalTasks.js'
import { formatShortDate } from './utils/dates.js'
import { readSidebarCollapsed, writeSidebarCollapsed } from './utils/sidebarPreferences.js'
import { useOrderWorkspace } from './hooks/useOrderWorkspace.js'
import { useShipmentPlans } from './hooks/useShipmentPlans.jsx'
import DeliveryConfirmationBanner from './components/DeliveryConfirmationBanner.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import PwaInstallPrompt from './components/mobile/PwaInstallPrompt.jsx'
import DeveloperPerformancePanel from './components/dev/DeveloperPerformancePanel.jsx'
import DeveloperOfflinePanel from './components/dev/DeveloperOfflinePanel.jsx'
import PendingActionsPanel from './components/offline/PendingActionsPanel.jsx'
import ConflictCenterPanel from './components/offline/ConflictCenterPanel.jsx'
import { useOfflineFirst } from './state/OfflineFirstProvider.jsx'
import { MobileOfflineFoundationProvider } from './state/MobileOfflineFoundationProvider.jsx'
import { onOfflineSyncDrainComplete } from './services/offline/offlineSyncEngine.js'
import { toastInfo } from './lib/toastBus.js'
import { buildGlobalSearchResults } from './utils/globalSearchExperience.js'
import { useCompactPhoneViewport, useViewportTier } from './hooks/useViewportTier.js'
import PaymentApprovalBanner from './components/PaymentApprovalBanner.jsx'
import { countPendingDeliveryConfirmations } from './mappers/shipment/deliveryConfirmationQueue.js'
import { useOrderDrawer, useOrderDrawerDtoSync } from './state/OrderDrawerProvider.jsx'
import { computeDashboardControlTower } from './mappers/dashboard/computeDashboardControlTower.js'
import { useOrders } from './state/useOrders.js'
import { filterOrdersBySearch } from './utils/orderSearch.js'
import { remainingBalance } from './utils/orderFinance.js'
import { HUB_PAGE_ALIASES, resolveNavigateHash, resolvePageFromHash } from './lib/hubRouting.js'
import {
  buildDigitalWorkforceHash,
  parseDigitalWorkforceWorkerFromHash,
} from './mappers/digital-workforce/digitalWorkforceExperience.js'
import {
  initGenesisEngine,
  stopGenesisEngine,
  updateGenesisContext,
} from './services/genesis/genesisLifecycle.js'
import { initGoLiveAuditSubscriber } from './services/goLiveAuditSubscriber.js'
import { markInitialLoadComplete, recordPageTransition } from './lib/performanceMonitor.js'
import './styles/app.css'
import './styles/mos-pro-experience.css'
import './styles/tablet-store-ops.css'
import './styles/pilot-store-ops.css'
import './styles/mobile-pwa.css'
import './styles/pilot-readiness-sprint2.css'
import './styles/phone-tablet-sprint3.css'
import './styles/mobile-edition-faz112.css'
import './styles/touch-first-erp-faz113.css'
import './styles/offline-first-faz114.css'
import './styles/mobile-store-ops-faz115.css'
import './styles/mobile-enterprise-polish-v3.css'

/** @typedef {import('./data/seedOrders.js').Order} Order */
/** @typedef {import('./contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */
/** @typedef {import('./features/orders/newOrderWizardModel.js').NewOrderWizardForm} NewOrderWizardForm */

const ROLE_LABELS = {
  [USER_ROLE.ADMIN]: 'Yönetici',
  [USER_ROLE.MANAGER]: 'Müdür',
  [USER_ROLE.SALES]: 'Satış',
  [USER_ROLE.OPERATION]: 'Operasyon',
  [USER_ROLE.SERVICE]: 'Servis',
  [USER_ROLE.FINANCE]: 'Finans',
  [USER_ROLE.WAREHOUSE]: 'Depo',
}

/** @param {{ children: import('react').ReactNode }} props */
function PageSuspense({ children }) {
  return (
    <Suspense fallback={<LoadingBlock title="Sayfa yükleniyor" variant="table" />}>
      {children}
    </Suspense>
  )
}

export default function App() {
  const { user, loading: authLoading, requiresLogin, logout } = useAuth()
  const {
    orders,
    orderListRows,
    shipmentRowVMs,
    shipmentQueueRows,
    collectionRowVMs,
    loading,
    isRefreshing,
    mutating,
    error,
    refreshOrders,
    createOrder,
    salesOrderListItemDtos,
    domainEvents,
    operationalTasks,
    postOrderPayment,
  } = useOrders()

  const viewportTier = useViewportTier()
  const isCompactPhone = useCompactPhoneViewport()
  const { forceSync } = useOfflineFirst()
  const isTouchViewport = viewportTier === 'phone' || viewportTier === 'tablet'

  const { plans, refreshPlans } = useShipmentPlans()
  const pendingDeliveryConfirmCount = useMemo(
    () => countPendingDeliveryConfirmations(plans),
    [plans],
  )
  const pendingPaymentApprovalCount = useMemo(
    () =>
      salesOrderListItemDtos.reduce((sum, d) => sum + (d.pendingApprovalPaymentCount ?? 0), 0),
    [salesOrderListItemDtos],
  )

  useEffect(() => {
    markInitialLoadComplete()
    const unsubAudit = initGoLiveAuditSubscriber()
    return () => unsubAudit()
  }, [])

  useEffect(() => {
    if (loading || !orders.length) return undefined
    const todayIso = getOperationalToday()
    initGenesisEngine({
      demoMode: isDemoMode() || !getApiBaseUrl(),
      orders,
      dtos: salesOrderListItemDtos,
      todayIso,
    })
    return () => {
      stopGenesisEngine()
    }
  }, [loading, orders, salesOrderListItemDtos])

  useEffect(() => {
    if (loading || !orders.length) return
    updateGenesisContext({
      orders,
      dtos: salesOrderListItemDtos,
      todayIso: getOperationalToday(),
    })
  }, [loading, orders, salesOrderListItemDtos])

  useEffect(() => {
    if (!isDemoMode() || getApiBaseUrl() || loading || !orders.length) return
    const todayIso = getOperationalToday()
    void import('./services/mockApi.js').then((m) =>
      m.processMockDeliveryConfirmationQueue(todayIso).then(() => refreshPlans()),
    )
  }, [loading, orders.length, refreshPlans])

  const {
    drawerOrderId,
    drawerTab,
    drawerSource,
    queue,
    highlightOrderId,
    canGoPrev,
    canGoNext,
    openOrderDrawer,
    closeOrderDrawer,
    goToPrevOrder,
    goToNextOrder,
  } = useOrderDrawer()

  useOrderDrawerDtoSync(salesOrderListItemDtos)

  const [page, setPage] = useState(() => resolvePageFromHash(window.location.hash))
  const [dwInitialWorkerId, setDwInitialWorkerId] = useState(() =>
    parseDigitalWorkforceWorkerFromHash(window.location.hash),
  )

  const prevPageRef = useRef(page)
  useEffect(() => {
    const prev = prevPageRef.current
    if (prev !== page) {
      recordPageTransition(page, 120)
      prevPageRef.current = page
    }
  }, [page])

  useEffect(() => {
    function onHashChange() {
      const resolved = resolvePageFromHash(window.location.hash)
      setPage(resolved)
      if (resolved === 'digital-workforce') {
        setDwInitialWorkerId(parseDigitalWorkforceWorkerFromHash(window.location.hash))
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!user?.role) return
    const resolved = resolvePageFromHash(window.location.hash)
    const hubResolved = HUB_PAGE_ALIASES[resolved]?.hub ?? resolved
    if (!canAccessPage(user.role, resolved) && !canAccessPage(user.role, hubResolved)) {
      const home = resolveDefaultHomePage(user.role)
      setPage(home)
      window.history.replaceState(null, '', resolveNavigateHash(home))
    }
  }, [user?.role])

  useEffect(() => {
    if (viewportTier !== 'phone') return
    if (!user?.role) return
    if (window.location.hash && window.location.hash !== '#/dashboard') return
    const mobileHome = resolveMobileFieldPilotHomePage(user.role)
    if (page === mobileHome) return
    setPage(mobileHome)
    window.history.replaceState(null, '', resolveNavigateHash(mobileHome))
  }, [viewportTier, user?.role, page])

  const [ruleTesterCtx, setRuleTesterCtx] = useState(/** @type {{ code?: string, value?: string }} */ ({ code: '', value: '' }))
  const [shipmentOpsInitialView, setShipmentOpsInitialView] = useState(
    /** @type {'pipeline' | 'week'} */ (() =>
      window.location.hash === '#/shipment-calendar' ? 'week' : 'pipeline'),
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const [globalSearch, setGlobalSearch] = useState('')
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderModalKey, setOrderModalKey] = useState(0)
  const [wizardError, setWizardError] = useState(/** @type {string | null} */ (null))
  const [shipmentModal, setShipmentModal] = useState(
    /** @type {{ orderId: string, shipmentId?: string } | null} */ (null),
  )
  const [postCreateContract, setPostCreateContract] = useState(
    /** @type {{ order: Order, listItemDto: import('./contracts/v1/salesOrderListItem.js').SalesOrderListItemDto, wizardForm: NewOrderWizardForm } | null} */ (
      null
    ),
  )
  const [listContractOrderId, setListContractOrderId] = useState(/** @type {string | null} */ (null))

  /** Modül / route değişiminde tüm overlay state temizlenir (mağaza tablet UX). */
  function closeAllOverlays() {
    closeOrderDrawer()
    setShipmentModal(null)
    setOrderModalOpen(false)
  }

  useEffect(() => {
    closeAllOverlays()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca sayfa kimliği değişince
  }, [page])

  const {
    searchedOrders,
    shipmentQueue,
    collectionRows,
    kpis,
    operationalAlarms,
  } = useOrderWorkspace(
    orders,
    globalSearch,
    getOperationalToday(),
    shipmentRowVMs,
    collectionRowVMs,
    salesOrderListItemDtos,
    plans,
  )

  const ordersById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders])

  const controlTower = useMemo(
    () =>
      computeDashboardControlTower({
        orders,
        listItemDtos: salesOrderListItemDtos,
        todayIso: getOperationalToday(),
        kpis,
        operationalAlarms,
        domainEvents: domainEvents ?? [],
        shipmentQueue,
        operationalTasks: operationalTasks ?? [],
      }),
    [
      orders,
      salesOrderListItemDtos,
      kpis,
      operationalAlarms,
      domainEvents,
      shipmentQueue,
      operationalTasks,
    ],
  )

  const notificationItems = useMemo(
    () => tasksToNotificationItems(operationalTasks ?? [], 10),
    [operationalTasks],
  )

  const searchedOrderRows = useMemo(() => {
    const byId = new Map(orderListRows.map((r) => [r.id, r]))
    /** @type {OrderListRowVM[]} */
    const out = []
    for (const o of searchedOrders) {
      const row = byId.get(o.id)
      if (row) out.push(row)
    }
    return out
  }, [searchedOrders, orderListRows])

  const drawerOrder = useMemo(
    () => (drawerOrderId ? orders.find((o) => o.id === drawerOrderId) ?? null : null),
    [orders, drawerOrderId],
  )

  const listContractOrder = useMemo(
    () => (listContractOrderId ? orders.find((o) => o.id === listContractOrderId) ?? null : null),
    [orders, listContractOrderId],
  )

  const listContractDto = useMemo(
    () =>
      listContractOrderId
        ? salesOrderListItemDtos.find((d) => d.id === listContractOrderId)
        : undefined,
    [salesOrderListItemDtos, listContractOrderId],
  )

  const navItems = useMemo(
    () => filterNavForRole(user?.role, MAIN_NAV),
    [user?.role],
  )

  const userInitials = useMemo(() => {
    const n = user?.fullName?.trim() ?? ''
    if (!n) return 'K'
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }, [user?.fullName])

  const canCreateOrder = canCreateSalesOrder(user?.role)

  function navigateTo(next, ctx) {
    closeAllOverlays()
    const target = normalizePageId(typeof next === 'string' ? next : 'dashboard')
    if (target === 'business-rule-tester' && ctx && typeof ctx === 'object') {
      setRuleTesterCtx({ code: ctx.code ?? '', value: ctx.value ?? '' })
    }
    const hubTarget = HUB_PAGE_ALIASES[target]?.hub ?? target
    if (user?.role && !canAccessPage(user.role, target) && !canAccessPage(user.role, hubTarget)) {
      setPage(navItems[0]?.id ?? 'dashboard')
      setSidebarOpen(false)
      return
    }
    setPage(hubTarget)
    setSidebarOpen(false)
    if (ctx && typeof ctx === 'object' && ctx.opsFilter) {
      setOpsDeepLink(hubTarget, ctx.opsFilter)
    }
    if (target === 'shipment-ops') {
      const week = next === 'shipment-calendar'
      setShipmentOpsInitialView(week ? 'week' : 'pipeline')
      window.history.replaceState(null, '', week ? '#/shipment-ops?view=week' : '#/shipment-ops')
    } else if (hubTarget === 'digital-workforce') {
      const workerId =
        ctx && typeof ctx === 'object' && ctx.workerId ? String(ctx.workerId) : null
      setDwInitialWorkerId(workerId)
      window.history.replaceState(null, '', buildDigitalWorkforceHash(workerId))
    } else {
      window.history.replaceState(null, '', resolveNavigateHash(target))
    }
  }

  function openOrderModal() {
    if (!canCreateOrder) return
    setWizardError(null)
    setOrderModalKey((k) => k + 1)
    setOrderModalOpen(true)
  }

  function closeOrderModal() {
    setWizardError(null)
    setOrderModalOpen(false)
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((c) => {
      const n = !c
      writeSidebarCollapsed(n)
      return n
    })
  }

  /** @param {import('./utils/globalSearchExperience.js').GlobalSearchResult} result */
  const handleGlobalSearchSelect = useCallback(
    (result) => {
      if (result.meta === 'Son arama') {
        setGlobalSearch(result.title)
        navigateTo('orders')
        return
      }
      if (result.targetId && result.targetPage === 'orders') {
        setGlobalSearch(result.query || result.title)
        navigateTo('orders')
        const order = ordersById.get(result.targetId)
        if (order) openOrderDetail(order, { source: 'search' })
        return
      }
      if (result.kind === 'customer') {
        setGlobalSearch(result.title)
        navigateTo('orders')
        return
      }
      if (result.kind === 'product' || result.kind === 'page') {
        setGlobalSearch(result.query || result.title)
        navigateTo(result.targetPage)
        return
      }
      setGlobalSearch(result.query || result.title)
      navigateTo(result.targetPage)
    },
    [ordersById],
  )

  const handleGlobalSearchCommit = useCallback(
    (query, results) => {
      setGlobalSearch(query)
      if (results.length > 0) return
      const rebuilt = buildGlobalSearchResults({ orders, query })
      if (rebuilt.length > 0) {
        handleGlobalSearchSelect(rebuilt[0])
        return
      }
      navigateTo('orders')
      toastInfo(`"${query}" için siparişlerde arama uygulandı`, 'info')
    },
    [orders, handleGlobalSearchSelect],
  )

  /** @param {import('./lib/quickActions.js').QuickActionDef} action */
  const handleQuickAction = useCallback(
    (action) => {
      if (action.action === 'new-order') {
        openOrderModal()
        return
      }
      if (action.action === 'focus-search') {
        document.querySelector('.mos-global-search-input')?.focus()
        return
      }
      if (action.action === 'week') {
        navigateTo('shipment-calendar')
        return
      }
      if (action.page) navigateTo(action.page)
    },
    [],
  )

  /** @param {string} intent */
  const handleMobileFabIntent = useCallback(
    (intent) => {
      if (intent === 'new-order') {
        openOrderModal()
        return
      }
      dispatchMobileFabIntent(intent)
    },
    [],
  )

  const handleMobilePullRefresh = useCallback(async () => {
    await refreshOrders()
    await refreshPlans()
    await forceSync()
  }, [refreshOrders, refreshPlans, forceSync])

  useEffect(() => {
    onOfflineSyncDrainComplete(() => {
      void refreshOrders()
      void refreshPlans()
    })
    return () => onOfflineSyncDrainComplete(() => {})
  }, [refreshOrders, refreshPlans])

  const handleNotificationNavigate = useCallback(
    (targetPage, ctx) => {
      navigateTo(targetPage)
      if (ctx?.orderId) {
        const order = ordersById.get(ctx.orderId)
        if (order) openOrderDetail(order, { source: 'notification' })
      }
    },
    [ordersById],
  )

  /** @param {Order} order @param {import('./contracts/orderDrawer.js').OpenOrderDrawerOptions} [options] */
  function openOrderDetail(order, options) {
    openOrderDrawer(order.id, options)
  }

  /** @param {{ id: string, shipmentId?: string }} orderOrRow */
  function openShipmentOperation(orderOrRow) {
    closeOrderDrawer()
    setShipmentModal({
      orderId: orderOrRow.id,
      shipmentId: 'shipmentId' in orderOrRow ? orderOrRow.shipmentId : undefined,
    })
  }

  function closeShipmentOperation() {
    setShipmentModal(null)
  }

  /** @param {Omit<Order, 'id' | 'orderDate'>} draft */
  const recentCustomers = useMemo(() => {
    const names = new Set()
    for (const o of orders) {
      if (o.customer?.trim()) names.add(o.customer.trim())
    }
    return [...names].slice(0, 24)
  }, [orders])

  async function handleWizardSave(draft) {
    const created = await createOrder(draft)
    return created
  }

  function handleWizardCreated(order, meta) {
    closeOrderModal()
    if (meta?.form) {
      setPostCreateContract({
        order,
        listItemDto: projectLegacyOrderToListItemDto(order, getOperationalToday()),
        wizardForm: meta.form,
      })
      return
    }
    openOrderDetail(order)
  }

  function closePostCreateContract() {
    setPostCreateContract(null)
  }

  function closeListContract() {
    setListContractOrderId(null)
  }

  /** @param {import('./contracts/v1/orderListRowVm.js').OrderListRowVM} row @param {'detail' | 'payment' | 'shipment' | 'contract'} action */
  function handleOrdersQuickAction(row, action) {
    const order = ordersById.get(row.id)
    if (!order) return
    switch (action) {
      case 'detail':
        openOrderDetail(order, { source: 'orders' })
        break
      case 'payment':
        openOrderDetail(order, { tab: 'payments', source: 'orders' })
        break
      case 'shipment':
        openOrderDetail(order, { tab: 'shipment', source: 'orders' })
        break
      case 'contract':
        setListContractOrderId(order.id)
        break
      default:
        break
    }
  }

  function goToOrderDetailFromContract() {
    if (!postCreateContract) return
    const { order } = postCreateContract
    setPostCreateContract(null)
    openOrderDetail(order)
  }

  function handleLoggedIn() {
    const session = loadAuthSession()
    const role = session?.user?.role ?? user?.role
    const home = isCompactPhone
      ? 'dashboard'
      : viewportTier === 'phone'
        ? resolveMobileFieldPilotHomePage(role)
        : resolveDefaultHomePage(role)
    setPage(home)
    window.history.replaceState(null, '', resolveNavigateHash(home))
  }

  const apiMode = Boolean(getApiBaseUrl())

  const openBalanceCollectionRows = useMemo(() => {
    const source = collectionRowVMs.length > 0 ? collectionRowVMs : orders
    return filterOrdersBySearch(source, globalSearch).filter((row) => remainingBalance(row) > 0.009)
  }, [collectionRowVMs, orders, globalSearch])

  const sshMissingPartsQueue = useMemo(
    () =>
      buildSshMissingPartsQueue({
        orders,
        listItemDtos: salesOrderListItemDtos,
        missingItems: apiMode ? undefined : getAllMissingItemsSnapshot(),
        todayIso: getOperationalToday(),
      }),
    [orders, salesOrderListItemDtos, apiMode],
  )
  const todayLabel = `Bugün · ${formatShortDate(getOperationalToday())}`

  if (authLoading) {
    return <LoadingBlock title="Oturum kontrol ediliyor" hint="Auth" />
  }

  if (requiresLogin) {
    return <LoginPage onLoggedIn={handleLoggedIn} />
  }

  return (
    <>
      <AppLayout
        navItems={navItems}
        userName={user?.fullName ?? 'Kullanıcı'}
        userRole={user?.role ? (ROLE_LABELS[user.role] ?? user.role) : '—'}
        userRoleKey={user?.role}
        userInitials={userInitials}
        onLogout={logout}
        page={page}
        onNavigate={navigateTo}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebarCollapsed={toggleSidebarCollapsed}
        todayLabel={todayLabel}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        orders={orders}
        onSearchSelect={handleGlobalSearchSelect}
        onCommitSearch={handleGlobalSearchCommit}
        onQuickAction={handleQuickAction}
        onMobileFabIntent={handleMobileFabIntent}
        onPullRefresh={handleMobilePullRefresh}
        onOpenOrderModal={openOrderModal}
        onNotificationNavigate={handleNotificationNavigate}
        notifications={notificationItems}
        suspendMobileDock={Boolean(orderModalOpen || drawerOrder || postCreateContract || listContractOrder || shipmentModal)}
      >
        <MobileOfflineFoundationProvider
          isPhoneViewport={viewportTier === 'phone'}
          currentPage={page}
          liveListItemDtos={salesOrderListItemDtos}
          onRestorePage={(restoredPage) => navigateTo(restoredPage)}
        >
        {isRefreshing && orders.length > 0 ? (
          <div className="mos-refresh-strip" aria-hidden />
        ) : null}

        <OfflineBanner />

        <PendingActionsPanel />

        <ConflictCenterPanel />

        {isTouchViewport ? <PwaInstallPrompt /> : null}

        {!isTouchViewport ? <DeveloperPerformancePanel /> : null}

        {!isTouchViewport ? <DeveloperOfflinePanel /> : null}

        {error ? (
          viewportTier === 'phone' || viewportTier === 'tablet' ? (
            <MobileStoreErrorState message={error.message} onRetry={() => void refreshOrders()} />
          ) : (
            <OrdersErrorBanner message={error.message} onRetry={() => void refreshOrders()} />
          )
        ) : null}

        {!loading && pendingDeliveryConfirmCount > 0 ? (
          <DeliveryConfirmationBanner count={pendingDeliveryConfirmCount} onNavigate={navigateTo} />
        ) : null}

        {!loading && pendingPaymentApprovalCount > 0 ? (
          <PaymentApprovalBanner
            count={pendingPaymentApprovalCount}
            userRole={user?.role}
            onNavigate={navigateTo}
          />
        ) : null}

        {page === 'users-admin' ? (
          <UsersAdminPage />
        ) : page === 'operation-map' ? (
          <PageSuspense>
            <OperationMapPage
              orders={searchedOrders}
              listItemDtos={salesOrderListItemDtos}
              todayIso={getOperationalToday()}
              onOpenOrder={(orderId) => {
                const order = ordersById.get(orderId)
                if (order) openOrderDetail(order, { source: 'orders', tab: 'overview' })
              }}
            />
          </PageSuspense>
        ) : page === 'executive-command-center' ? (
          <PageSuspense>
            <ExecutiveCommandCenterPage onNavigate={navigateTo} />
          </PageSuspense>
        ) : page === 'enterprise-ceo-dashboard' ? (
          <EnterpriseCeoDashboardPage onNavigate={navigateTo} />
        ) : page === 'enterprise-release' ? (
          <EnterpriseReleasePage onNavigate={navigateTo} />
        ) : page === 'ceo-copilot' ? (
          <CeoCopilotPage
            orders={orders}
            dtos={salesOrderListItemDtos}
            collectionRows={collectionRowVMs}
            shipmentRows={shipmentRowVMs}
            onNavigate={navigateTo}
          />
        ) : page === 'executive-center' ? (
          <PageSuspense>
            <ExecutiveCenterPage onNavigate={navigateTo} />
          </PageSuspense>
        ) : page === 'operation-center' ? (
          <OperationCenterPage onNavigate={navigateTo} />
        ) : page === 'operation-automation-center' ? (
          <OperationAutomationCenterPage onNavigate={navigateTo} />
        ) : page === 'pilot-readiness' ? (
          <PilotReadinessPage />
        ) : page === 'go-live' ? (
          <GoLivePage onNavigate={navigateTo} />
        ) : page === 'error-center' ? (
          <ErrorCenterPage />
        ) : page === 'system-health' ? (
          <SystemHealthPage />
        ) : page === 'product-master-center' ? (
          <PageSuspense>
            <ProductMasterHubPage />
          </PageSuspense>
        ) : page === 'product-health' ? (
          <ProductHealthPage />
        ) : page === 'product-publish-readiness' ? (
          <ProductPublishReadinessPage />
        ) : page === 'commerce-publishing' ? (
          <EvtrendPublishingHubPage />
        ) : page === 'supply-incoming' ? (
          <SupplyIncomingPage />
        ) : page === 'supplier-ledger-center' ? (
          <SupplierLedgerCenterPage />
        ) : page === 'ceo-control-center' ? (
          <CeoControlHubPage />
        ) : page === 'digital-workforce' ? (
          <PageSuspense>
            <DigitalWorkforcePage initialWorkerId={dwInitialWorkerId} />
          </PageSuspense>
        ) : page === 'operations-agents' ? (
          <OperationsAgentsPage />
        ) : page === 'executive-director' ? (
          <ExecutiveDirectorPage />
        ) : page === 'strategic-intelligence' ? (
          <StrategicIntelligencePage />
        ) : page === 'company-simulation' ? (
          <PageSuspense>
            <CompanySimulationPage />
          </PageSuspense>
        ) : page === 'board-directors' ? (
          <BoardDirectorsPage />
        ) : page === 'ceo-intelligence' ? (
          <CeoIntelligencePage />
        ) : page === 'chairman-intelligence' ? (
          <ChairmanIntelligencePage />
        ) : page === 'future-engine' ? (
          <FutureEnginePage />
        ) : page === 'investor-intelligence' ? (
          <InvestorIntelligencePage />
        ) : page === 'holding-center' ? (
          <HoldingCenterPage />
        ) : page === 'group-chairman' ? (
          <GroupChairmanPage />
        ) : page === 'business-brain' ? (
          <BusinessBrainPage />
        ) : page === 'action-orchestrator' ? (
          <ActionOrchestratorPage />
        ) : page === 'performance-feedback' ? (
          <PerformanceFeedbackPage />
        ) : page === 'learning-engine' ? (
          <LearningEnginePage />
        ) : page === 'optimization-engine' ? (
          <OptimizationEnginePage />
        ) : page === 'goal-engine' ? (
          <GoalEnginePage />
        ) : page === 'enterprise-command-center' ? (
          <PageSuspense>
            <EnterpriseCommandCenterPage />
          </PageSuspense>
        ) : page === 'manager-cockpit' ? (
          <ManagerCockpitPage />
        ) : page === 'forecast-engine' ? (
          <ForecastEnginePage />
        ) : page === 'ai-operations-advisor' ? (
          <OperationsAdvisorPage />
        ) : page === 'operation-cases' ? (
          <OperationHubPage />
        ) : page === 'business-rules' ? (
          <BusinessRulesPage onNavigate={navigateTo} />
        ) : page === 'business-rule-tester' ? (
          <BusinessRuleTesterPage
            onBack={() => navigateTo('business-rules')}
            initialCode={ruleTesterCtx.code}
            initialValue={ruleTesterCtx.value}
          />
        ) : page === 'sales-source-analytics' ? (
          <SalesSourceAnalyticsPage />
        ) : page === 'profitability-analytics' ? (
          <ProfitabilityAnalyticsPage />
        ) : page === 'data-quality' ? (
          <DataQualityPage />
        ) : loading ? (
          <LoadingBlock
            title="Siparişler yükleniyor"
            hint={apiMode ? 'GET /v1/orders' : 'Mock API: getOrders()'}
            variant={isTouchViewport ? 'card-grid' : 'table'}
          />
        ) : orders.length === 0 && page !== 'dashboard' ? (
          <EmptyOrdersState
            isBusy={isRefreshing}
            onRefresh={() => void refreshOrders()}
            onAddOrder={openOrderModal}
          />
        ) : (
          <>
            {page === 'dashboard' && (
              <RoleHomePage onNavigate={navigateTo} onOpenOrderModal={openOrderModal} />
            )}
            {page === 'orders' && (
              <OrdersPage
                orderRows={searchedOrderRows}
                orders={orders}
                listItemDtos={salesOrderListItemDtos}
                todayIso={getOperationalToday()}
                canCreateOrder={canCreateOrder}
                onOpenOrderModal={openOrderModal}
                onOrderSelect={openOrderDetail}
                onQuickAction={handleOrdersQuickAction}
                highlightOrderId={highlightOrderId}
                globalSearch={globalSearch}
                onGlobalSearchChange={setGlobalSearch}
                onSearchSelect={handleGlobalSearchSelect}
                onCommitSearch={handleGlobalSearchCommit}
              />
            )}
            {page === 'shipment-ops' && (
              <ShipmentOperationsPage
                shipmentRows={
                  shipmentQueueRows.length > 0 ? shipmentQueueRows : shipmentQueue
                }
                orders={searchedOrders}
                listItemDtos={salesOrderListItemDtos}
                todayIso={getOperationalToday()}
                onOpenOrder={(row, options) => {
                  const order = ordersById.get(row.id)
                  if (order) openOrderDetail(order, options)
                }}
                highlightOrderId={highlightOrderId}
              />
            )}
            {page === 'collection' && (
              <CollectionPage
                collectionRows={openBalanceCollectionRows}
                listItemDtos={salesOrderListItemDtos}
                todayIso={getOperationalToday()}
                globalSearch={globalSearch}
                onClearGlobalSearch={() => setGlobalSearch('')}
                getOrderById={(id) => ordersById.get(id)}
                postOrderPayment={postOrderPayment}
                mutating={mutating}
                domainEvents={domainEvents}
                onRefreshOrders={refreshOrders}
                onOpenOrder={(row, options) => {
                  const order = ordersById.get(row.id)
                  if (order) openOrderDetail(order, options)
                }}
                highlightOrderId={highlightOrderId}
              />
            )}
            {page === 'ssh-service' && (
              <ServiceCenterPage
                sshMissingParts={sshMissingPartsQueue}
                onOpenSsh={(orderId, options) => {
                  const order = ordersById.get(orderId)
                  if (order) {
                    openOrderDrawer(order.id, {
                      tab: 'ssh',
                      source: 'ssh',
                      ...options,
                    })
                  }
                }}
                highlightOrderId={highlightOrderId}
              />
            )}
          </>
        )}
        </MobileOfflineFoundationProvider>
      </AppLayout>

      {!loading ? (
        <>
          {orderModalOpen ? (
            <NewOrderWizard
              key={orderModalKey}
              open
              onClose={closeOrderModal}
              apiMode={apiMode}
              apiBusy={mutating}
              canCreateOrder={canCreateOrder}
              errorMessage={wizardError}
              recentCustomers={recentCustomers}
              orders={orders}
              onSave={handleWizardSave}
              onCreated={handleWizardCreated}
            />
          ) : null}

          <OrderOperationPanel
            order={drawerOrder}
            open={Boolean(drawerOrder)}
            onClose={closeOrderDrawer}
            initialTab={drawerTab}
            drawerSource={drawerSource}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onGoPrev={goToPrevOrder}
            onGoNext={goToNextOrder}
            queuePositionLabel={
              queue
                ? `${queue.activeIndex + 1} / ${queue.rowIds.length}`
                : null
            }
          />

          <ShipmentOperationModal
            key={shipmentModal?.orderId ?? 'shipment-closed'}
            orderId={shipmentModal?.orderId ?? null}
            initialShipmentId={shipmentModal?.shipmentId ?? null}
            open={Boolean(shipmentModal)}
            onClose={closeShipmentOperation}
            returnLabel="← Sevk Operasyonuna Dön"
          />

          <SalesContractPrint
            open={Boolean(postCreateContract)}
            order={postCreateContract?.order ?? null}
            listItemDto={postCreateContract?.listItemDto}
            wizardForm={postCreateContract?.wizardForm}
            variant="postCreate"
            onClose={closePostCreateContract}
            onGoToOrderDetail={goToOrderDetailFromContract}
          />

          <SalesContractPrint
            open={Boolean(listContractOrder)}
            order={listContractOrder}
            listItemDto={listContractDto}
            onClose={closeListContract}
          />
        </>
      ) : null}
    </>
  )
}

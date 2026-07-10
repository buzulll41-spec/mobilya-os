import { useMemo, useState } from 'react'
import { buildRoleHomeView } from '../mappers/home/roleHomeModel.js'
import { buildMobileStoreHomeCards } from '../mappers/mobile/mobileStoreOpsModel.js'
import { navigateWithOpsFilter } from '../lib/opsDeepLink.js'
import { getAllMissingItemsSnapshot } from '../services/mockMissingItemStore.js'
import { getApiBaseUrl } from '../config/dataSource.js'
import { useOrders } from '../state/useOrders.js'
import { useAuth } from '../state/AuthProvider.jsx'
import { useShipmentPlans } from '../hooks/useShipmentPlans.jsx'
import { useViewportTier } from '../hooks/useViewportTier.js'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import MosEmptyState from '../components/standards/MosEmptyState.jsx'
import MobileStoreHome from '../components/mobile/MobileStoreHome.jsx'
import MobileQuickActions from '../components/mobile/MobileQuickActions.jsx'
import { toastSuccess } from '../lib/toastBus.js'
import '../styles/role-home.css'

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
 * }} props
 */
export default function RoleHomePage({ onNavigate, onOpenOrderModal }) {
  const { user } = useAuth()
  const { orders, salesOrderListItemDtos, collectionRowVMs, refreshOrders, isRefreshing } = useOrders()
  const { plans, refreshPlans } = useShipmentPlans()
  const viewportTier = useViewportTier()
  const isTouchStore = viewportTier === 'phone' || viewportTier === 'tablet'
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))

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
        listItemDtos: salesOrderListItemDtos,
        collectionRows: collectionRowVMs,
        shipmentPlans: plans,
      }),
    [orders, salesOrderListItemDtos, collectionRowVMs, plans],
  )

  function focusGlobalSearch() {
    document.querySelector('.mos-global-search-input')?.focus()
  }

  /** @param {import('../mappers/home/roleHomeModel.js').RoleHomeAction} action */
  function runAction(action) {
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
    if (!onNavigate) return
    if (kpi.navFilter) navigateWithOpsFilter(kpi.navTarget, kpi.navFilter, onNavigate)
    else onNavigate(kpi.navTarget)
  }

  /** @param {import('../mappers/home/roleHomeModel.js').RoleHomeTask} task */
  function openTask(task) {
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
      <PageRefreshBar
        title="Dashboard verilerini yenile"
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        updatedAt={lastRefresh}
      />

      {isTouchStore ? (
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

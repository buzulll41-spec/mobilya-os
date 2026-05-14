import { useMemo, useState } from 'react'
import OrderFormModal from './components/OrderFormModal.jsx'
import OrderDetailDrawer from './features/orders/OrderDetailDrawer.jsx'
import EmptyOrdersState from './components/EmptyOrdersState.jsx'
import LoadingBlock from './components/LoadingBlock.jsx'
import OrdersErrorBanner from './components/OrdersErrorBanner.jsx'
import { DEMO_TODAY } from './data/index.js'
import AppLayout from './layout/AppLayout.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import ShipmentPage from './pages/ShipmentPage.jsx'
import { DEMO_NOTIFICATIONS, MONTAJ_EKIPLERI } from './constants/operations.js'
import { formatShortDate } from './utils/dates.js'
import { readSidebarCollapsed, writeSidebarCollapsed } from './utils/sidebarPreferences.js'
import { useOrderWorkspace } from './hooks/useOrderWorkspace.js'
import { useOrders } from './state/useOrders.js'
import './styles/app.css'

/** @typedef {import('./data/seedOrders.js').Order} Order */

export default function App() {
  const {
    orders,
    loading,
    isRefreshing,
    mutating,
    error,
    refreshOrders,
    createOrder,
  } = useOrders()

  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed)
  const [globalSearch, setGlobalSearch] = useState('')
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderModalKey, setOrderModalKey] = useState(0)
  const [drawerOrderId, setDrawerOrderId] = useState(/** @type {string | null} */ (null))

  const {
    searchedOrders,
    activeOrders,
    shipmentQueue,
    collectionRows,
    overdueRisk,
    underpaidRisk,
    todayDeliveries,
    missingOrders,
    kpis,
  } = useOrderWorkspace(orders, globalSearch, DEMO_TODAY)

  const drawerOrder = useMemo(
    () => (drawerOrderId ? orders.find((o) => o.id === drawerOrderId) ?? null : null),
    [orders, drawerOrderId],
  )

  function navigateTo(next) {
    setPage(next)
    setSidebarOpen(false)
  }

  function openOrderModal() {
    setOrderModalKey((k) => k + 1)
    setOrderModalOpen(true)
  }

  function closeOrderModal() {
    setOrderModalOpen(false)
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((c) => {
      const n = !c
      writeSidebarCollapsed(n)
      return n
    })
  }

  function openOrderDetail(order) {
    setDrawerOrderId(order.id)
  }

  function closeOrderDetail() {
    setDrawerOrderId(null)
  }

  /** @param {Omit<Order, 'id' | 'orderDate'>} draft */
  async function handleSaveOrder(draft) {
    await createOrder(draft)
    closeOrderModal()
  }

  const todayLabel = `Bugün · ${formatShortDate(DEMO_TODAY)}`

  return (
    <>
      <AppLayout
        page={page}
        onNavigate={navigateTo}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebarCollapsed={toggleSidebarCollapsed}
        todayLabel={todayLabel}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        notifications={DEMO_NOTIFICATIONS}
      >
        {isRefreshing && orders.length > 0 ? (
          <div className="mos-refresh-strip" aria-hidden />
        ) : null}

        {error ? (
          <OrdersErrorBanner message={error.message} onRetry={() => void refreshOrders()} />
        ) : null}

        {loading ? (
          <LoadingBlock title="Siparişler yükleniyor" hint="Mock API: getOrders()" />
        ) : orders.length === 0 ? (
          <EmptyOrdersState
            isBusy={isRefreshing}
            onRefresh={() => void refreshOrders()}
            onAddOrder={openOrderModal}
          />
        ) : (
          <>
            {page === 'dashboard' && (
              <DashboardPage
                activeOrders={activeOrders}
                overdueRisk={overdueRisk}
                underpaidRisk={underpaidRisk}
                missingOrders={missingOrders}
                todayDeliveries={todayDeliveries}
                montajEkipleri={MONTAJ_EKIPLERI}
                todayIso={DEMO_TODAY}
                kpis={kpis}
                onOpenOrderModal={openOrderModal}
                onOrderSelect={openOrderDetail}
              />
            )}
            {page === 'orders' && (
              <OrdersPage
                orders={searchedOrders}
                todayIso={DEMO_TODAY}
                onOpenOrderModal={openOrderModal}
                onOrderSelect={openOrderDetail}
              />
            )}
            {page === 'shipment' && (
              <ShipmentPage shipmentQueue={shipmentQueue} todayIso={DEMO_TODAY} />
            )}
            {page === 'collection' && (
              <CollectionPage collectionRows={collectionRows} todayIso={DEMO_TODAY} />
            )}
          </>
        )}
      </AppLayout>

      {!loading ? (
        <>
          <OrderFormModal
            key={orderModalKey}
            open={orderModalOpen}
            onClose={closeOrderModal}
            onSave={handleSaveOrder}
            apiBusy={mutating}
          />

          <OrderDetailDrawer
            order={drawerOrder}
            open={Boolean(drawerOrder)}
            onClose={closeOrderDetail}
          />
        </>
      ) : null}
    </>
  )
}

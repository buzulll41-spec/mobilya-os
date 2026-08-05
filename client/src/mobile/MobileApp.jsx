import { useEffect, useMemo, useState } from 'react'
import MobileLayout from './layout/MobileLayout.jsx'
import HomePage from './HomePage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import CustomersPage from './pages/CustomersPage.jsx'
import CollectionsPage from './pages/CollectionsPage.jsx'
import ShipmentsPage from './pages/ShipmentsPage.jsx'
import ServicePage from './pages/ServicePage.jsx'
import SshPage from './pages/SshPage.jsx'
import WarehousePage from './pages/WarehousePage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import MenuPage from './pages/MenuPage.jsx'
import NewOrderWizard from '../features/orders/NewOrderWizard.jsx'
import OrderOperationPanel from '../features/orders/OrderOperationPanel.jsx'
import { getApiBaseUrl } from '../config/dataSource.js'
import { useOrders } from '../state/useOrders.js'
import { useOrderDrawer, useOrderDrawerDtoSync } from '../state/OrderDrawerProvider.jsx'
import { BottomSheet, ListRow } from './design-system/MobileOpsV2Components.jsx'

/** @typedef {'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'ssh' | 'warehouse' | 'reports'} MobilePage */

function parseMobilePage(hashValue) {
  const raw = String(hashValue || '').toLowerCase()
  if (raw.startsWith('#/mobile/home') || raw.startsWith('#/m/home')) return 'home'
  if (raw.startsWith('#/mobile/collections') || raw.startsWith('#/m/collections')) return 'collection'
  if (raw.startsWith('#/mobile/collection') || raw.startsWith('#/m/collection')) return 'collection'
  if (raw.startsWith('#/mobile/shipments') || raw.startsWith('#/m/shipments')) return 'shipment'
  if (raw.startsWith('#/mobile/shipment') || raw.startsWith('#/m/shipment')) return 'shipment'
  if (raw.startsWith('#/mobile/service') || raw.startsWith('#/m/service')) return 'service'
  if (raw.startsWith('#/mobile/ssh') || raw.startsWith('#/m/ssh')) return 'ssh'
  if (raw.startsWith('#/mobile/warehouse') || raw.startsWith('#/m/warehouse')) return 'warehouse'
  if (raw.startsWith('#/mobile/reports') || raw.startsWith('#/m/reports')) return 'reports'
  if (raw.startsWith('#/mobile/orders') || raw.startsWith('#/m/orders')) return 'orders'
  if (raw.startsWith('#/mobile/customers') || raw.startsWith('#/m/customers')) return 'customers'
  if (raw.startsWith('#/mobile/menu') || raw.startsWith('#/m/menu')) return 'menu'
  return 'home'
}

/** @param {MobilePage} page */
function toMobileHash(page) {
  if (page === 'collection') return '#/mobile/collections'
  if (page === 'shipment') return '#/mobile/shipments'
  if (page === 'ssh') return '#/mobile/ssh'
  if (page === 'warehouse') return '#/mobile/warehouse'
  return `#/mobile/${page}`
}

export default function MobileApp() {
  const { orders, createOrder, mutating, salesOrderListItemDtos } = useOrders()
  const { drawerOrderId, drawerTab, openOrderDrawer, closeOrderDrawer } = useOrderDrawer()
  const [page, setPage] = useState(() => parseMobilePage(window.location.hash))
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderModalKey, setOrderModalKey] = useState(0)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)

  const defaultContact = useMemo(() => {
    const candidate = orders.find((order) => String(order.phone ?? order.phone2 ?? '').trim())
    const phone = String(candidate?.phone ?? candidate?.phone2 ?? '').trim()
    const digits = phone.replace(/[^\d+]/g, '')
    const telHref = digits ? `tel:${digits}` : null
    const waDigits = digits.replace(/^\+/, '')
    const waHref = waDigits ? `https://wa.me/${waDigits}` : null
    return { telHref, waHref }
  }, [orders])

  useOrderDrawerDtoSync(salesOrderListItemDtos)

  useEffect(() => {
    function onHashChange() {
      setPage(parseMobilePage(window.location.hash))
    }

    // Ensure mobile hash exists so deep links and back/forward remain stable.
    if (!String(window.location.hash || '').trim()) {
      window.history.replaceState(null, '', toMobileHash(page))
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigateToPage(nextPage) {
    setPage(nextPage)
    const nextHash = toMobileHash(nextPage)
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
    }
  }

  const drawerOrder = useMemo(
    () => (drawerOrderId ? orders.find((order) => order.id === drawerOrderId) ?? null : null),
    [orders, drawerOrderId],
  )

  function openOrderModal() {
    setOrderModalKey((prev) => prev + 1)
    setOrderModalOpen(true)
  }

  function closeOrderModal() {
    setOrderModalOpen(false)
  }

  function openQuickActions() {
    setQuickActionsOpen(true)
  }

  function closeQuickActions() {
    setQuickActionsOpen(false)
  }

  function handleOpenOrderById(orderId, options) {
    const order = orders.find((item) => item.id === orderId)
    if (!order) return
    openOrderDrawer(order.id, options)
  }

  function openExternalOrFallback(href, fallbackPage) {
    closeQuickActions()
    if (href) {
      window.location.href = href
      return
    }
    navigateToPage(fallbackPage)
  }

  const content = useMemo(() => {
    if (page === 'collection') {
      return <CollectionsPage onOpenOrderById={handleOpenOrderById} />
    }
    if (page === 'shipment') {
      return <ShipmentsPage onOpenOrderById={handleOpenOrderById} />
    }
    if (page === 'service') {
      return <ServicePage onOpenOrderById={handleOpenOrderById} />
    }
    if (page === 'ssh') {
      return <SshPage onOpenOrderById={handleOpenOrderById} />
    }
    if (page === 'warehouse') {
      return <WarehousePage onOpenOrderById={handleOpenOrderById} />
    }
    if (page === 'reports') {
      return <ReportsPage />
    }
    if (page === 'orders') {
      return <OrdersPage onOpenOrderModal={openOrderModal} onOpenOrderById={handleOpenOrderById} />
    }
    if (page === 'customers') {
      return <CustomersPage onOpenOrderById={handleOpenOrderById} />
    }
    if (page === 'menu') {
      return <MenuPage onNavigate={navigateToPage} onOpenOrderModal={openOrderModal} />
    }
    return <HomePage onNavigate={navigateToPage} />
  }, [page, orders])

  return (
    <>
      <MobileLayout page={page} onNavigate={navigateToPage} onOpenOrderModal={openQuickActions}>
        {content}
      </MobileLayout>

      <BottomSheet open={quickActionsOpen} title="Hizli Islem" onClose={closeQuickActions}>
        <div className="evm-v2-sheet-action-list" aria-label="Hizli islem listesi">
          <ListRow title="Yeni Siparis" subtitle="2 dokunusla siparis ac" onPress={() => { closeQuickActions(); openOrderModal() }} buttonProps={{ 'data-testid': 'qa-new-order' }} />
          <ListRow title="Yeni Tahsilat" subtitle="Bugunku tahsilat listesine git" onPress={() => { closeQuickActions(); navigateToPage('collection') }} buttonProps={{ 'data-testid': 'qa-new-collection' }} />
          <ListRow title="Yeni Sevkiyat" subtitle="Sevkiyat planlama ekranina git" onPress={() => { closeQuickActions(); navigateToPage('shipment') }} buttonProps={{ 'data-testid': 'qa-new-shipment' }} />
          <ListRow title="Yeni Servis" subtitle="Servis kaydi baslat" onPress={() => { closeQuickActions(); navigateToPage('service') }} buttonProps={{ 'data-testid': 'qa-new-service' }} />
          <ListRow title="Yeni Musteri" subtitle="Musteri listesi ve kayit akisina git" onPress={() => { closeQuickActions(); navigateToPage('customers') }} buttonProps={{ 'data-testid': 'qa-new-customer' }} />
          <ListRow title="Yeni Not" subtitle="Siparis detayinda hizli not gir" onPress={() => { closeQuickActions(); navigateToPage('orders') }} buttonProps={{ 'data-testid': 'qa-new-note' }} />
          <ListRow title="Fotograf Yukle" subtitle="Servis kaydinda kanit ekle" onPress={() => { closeQuickActions(); navigateToPage('service') }} buttonProps={{ 'data-testid': 'qa-upload-photo' }} />
          <ListRow title="QR Tara" subtitle="Depo veya urun akisini ac" onPress={() => { closeQuickActions(); navigateToPage('warehouse') }} buttonProps={{ 'data-testid': 'qa-qr-scan' }} />
          <ListRow title="Telefon Ara" subtitle="Ilk uygun musteri ile gorus" onPress={() => openExternalOrFallback(defaultContact.telHref, 'customers')} buttonProps={{ 'data-testid': 'qa-phone-call' }} />
          <ListRow title="WhatsApp Gonder" subtitle="Ilk uygun musteriye mesaj gonder" onPress={() => openExternalOrFallback(defaultContact.waHref, 'customers')} buttonProps={{ 'data-testid': 'qa-whatsapp' }} />
        </div>
      </BottomSheet>

      {orderModalOpen ? (
        <NewOrderWizard
          key={orderModalKey}
          open
          onClose={closeOrderModal}
          apiMode={Boolean(getApiBaseUrl())}
          apiBusy={mutating}
          orders={orders}
          onSave={createOrder}
          onCreated={(order) => {
            setOrderModalOpen(false)
            openOrderDrawer(order.id, { source: 'orders' })
          }}
        />
      ) : null}

      <OrderOperationPanel
        order={drawerOrder}
        onClose={closeOrderDrawer}
        initialActiveTab={drawerTab}
        drawerSource="orders"
      />
    </>
  )
}

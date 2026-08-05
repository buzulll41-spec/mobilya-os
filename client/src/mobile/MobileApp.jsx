import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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
import { IconChevronRight, IconClose } from '../components/Icons.jsx'
import { getApiBaseUrl } from '../config/dataSource.js'
import { useOrders } from '../state/useOrders.js'
import { useOrderDrawer, useOrderDrawerDtoSync } from '../state/OrderDrawerProvider.jsx'
import './design-system/MobileOpsV2.css'

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

function MobileQuickActionSheet({ open, onClose, onAction }) {
  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="mobile-quick-action-overlay" role="presentation" onClick={onClose}>
      <section
        className="mobile-quick-action-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Hizli Islem"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mobile-quick-action-header">
          <strong>Hizli Islem</strong>
          <button type="button" className="mobile-quick-action-close" aria-label="Kapat" onClick={onClose}>
            <IconClose />
          </button>
        </header>
        <div className="mobile-quick-action-list" aria-label="Hizli islem listesi">
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('new-order')}>
            <span className="mobile-quick-action-copy"><strong>Yeni Siparis</strong><small>2 dokunusla siparis ac</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('collection')}>
            <span className="mobile-quick-action-copy"><strong>Yeni Tahsilat</strong><small>Bugunku tahsilat listesine git</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('shipment')}>
            <span className="mobile-quick-action-copy"><strong>Yeni Sevkiyat</strong><small>Sevkiyat planlama ekranina git</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('service')}>
            <span className="mobile-quick-action-copy"><strong>Yeni Servis</strong><small>Servis kaydi baslat</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('customers')}>
            <span className="mobile-quick-action-copy"><strong>Yeni Musteri</strong><small>Musteri listesi ve kayit akisina git</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('orders')}>
            <span className="mobile-quick-action-copy"><strong>Yeni Not</strong><small>Siparis detayinda hizli not gir</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('service')}>
            <span className="mobile-quick-action-copy"><strong>Fotograf Yukle</strong><small>Servis kaydinda kanit ekle</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('warehouse')}>
            <span className="mobile-quick-action-copy"><strong>QR Tara</strong><small>Depo veya urun akisini ac</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('phone')}>
            <span className="mobile-quick-action-copy"><strong>Telefon Ara</strong><small>Ilk uygun musteri ile gorus</small></span>
            <IconChevronRight />
          </button>
          <button type="button" className="mobile-quick-action-item" onClick={() => onAction('whatsapp')}>
            <span className="mobile-quick-action-copy"><strong>WhatsApp Gonder</strong><small>Ilk uygun musteriye mesaj gonder</small></span>
            <IconChevronRight />
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
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
      setQuickActionsOpen(false)
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
    setQuickActionsOpen(false)
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

  function handleQuickAction(action) {
    closeQuickActions()
    if (action === 'new-order') {
      openOrderModal()
      return
    }
    if (action === 'collection' || action === 'shipment' || action === 'service' || action === 'customers' || action === 'orders' || action === 'warehouse') {
      navigateToPage(action)
      return
    }
    if (action === 'phone') {
      openExternalOrFallback(defaultContact.telHref, 'customers')
      return
    }
    if (action === 'whatsapp') {
      openExternalOrFallback(defaultContact.waHref, 'customers')
    }
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

      <MobileQuickActionSheet open={quickActionsOpen} onClose={closeQuickActions} onAction={handleQuickAction} />

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

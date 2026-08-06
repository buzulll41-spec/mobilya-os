import { useMemo, useState } from 'react'
import OrderCustomerErpDrawer from '../../features/orders/panel/OrderCustomerErpDrawer.jsx'
import { formatShortDate } from '../../utils/dates.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import {
  AppHeader,
  EmptyState,
  FloatingActionButton,
  LoadingSkeleton,
  MobileScreenShell,
  PrimaryListItem,
  SearchBar,
  SecondaryButton,
  Badge,
} from '../design-system/MobileOpsV2Components.jsx'
import { initialsFrom, roleLabel } from '../utils/mobileIdentity.js'
import '../../styles/orders-mobile-v1.css'

/**
 * @param {string | null | undefined} phone
 */
function normalizePhone(phone) {
  return String(phone ?? '').replace(/\D/g, '')
}

/**
 * @param {string | null | undefined} phone
 */
function telHref(phone) {
  const raw = String(phone ?? '').trim()
  if (!raw) return null
  return `tel:${raw.replace(/\s/g, '')}`
}

/**
 * @param {string | null | undefined} phone
 */
function whatsappHref(phone) {
  const digits = normalizePhone(phone)
  if (!digits) return null
  return `https://wa.me/${digits.replace(/^0/, '90')}`
}

/**
 * @param {{
 *   onOpenOrderById: (orderId: string, options?: import('../../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   onCreateCustomer?: () => void
 * }} props
 */
export default function CustomersPage({ onOpenOrderById, onCreateCustomer }) {
  const { user } = useAuth()
  const { orders, salesOrderListItemDtos, loading } = useOrders()
  const [query, setQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(/** @type {string | null} */ (null))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const dtoById = useMemo(
    () => new Map(salesOrderListItemDtos.map((dto) => [dto.id, dto])),
    [salesOrderListItemDtos],
  )

  const customerCards = useMemo(() => {
    const byKey = new Map()
    for (const order of orders) {
      const key = String(order.customer ?? '').trim().toLowerCase()
      if (!key) continue
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, {
          id: key,
          customer: String(order.customer ?? '').trim(),
          latestOrder: order,
          orders: [order],
        })
      } else {
        existing.orders.push(order)
        if (String(order.orderDate ?? '') > String(existing.latestOrder.orderDate ?? '')) {
          existing.latestOrder = order
        }
      }
    }

    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')

    return [...byKey.values()]
      .map((entry) => {
        const openCount = entry.orders.filter((order) => remainingBalance(order) > 0.009).length
        const totalRemaining = entry.orders.reduce((sum, order) => sum + remainingBalance(order), 0)
        const primaryPhone = entry.latestOrder.phone?.trim() || entry.latestOrder.phone2?.trim() || ''
        const location = String(entry.latestOrder.address ?? '')
          .split(',')
          .map((part) => part.trim())
          .find(Boolean) || 'Lokasyon yok'
        const latestActionDate = entry.orders
          .map((order) => String(order.orderDate ?? ''))
          .filter(Boolean)
          .sort((a, b) => b.localeCompare(a))[0] || ''
        return {
          ...entry,
          openCount,
          totalRemaining,
          primaryPhone,
          location,
          latestActionDate,
        }
      })
      .filter((entry) => {
        if (!q) return true
        const blob = [
          entry.customer,
          entry.latestOrder.orderNumber,
          entry.latestOrder.phone,
          entry.latestOrder.phone2,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (blob.includes(q)) return true
        if (digits.length >= 4) {
          return normalizePhone(entry.primaryPhone).includes(digits)
        }
        return false
      })
      .sort((a, b) => String(b.latestOrder.orderDate ?? '').localeCompare(String(a.latestOrder.orderDate ?? '')))
  }, [orders, query])

  const selectedCustomer = useMemo(
    () => customerCards.find((item) => item.id === selectedCustomerId) ?? null,
    [customerCards, selectedCustomerId],
  )

  const userInitials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const userRoleLabel = useMemo(() => {
    if (!user?.role) return 'Satis Uzmani'
    return roleLabel(user.role)
  }, [user?.role])

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2" aria-label="Mobile Customers">
      <MobileScreenShell
        header={<AppHeader eyebrow="Hangi musteri bekliyor" title="Musteriler" subtitle={`${customerCards.length} musteri · canli siparis verisi`} meta={`${userRoleLabel} • Merkez Magaza`} initials={userInitials} onOpenMenu={() => { window.location.hash = '#/mobile/menu' }} />}
        search={<SearchBar value={query} onValueChange={setQuery} placeholder="Musteri ara" />}
        primary={
          <ul className="evm-order-list-v1__cards" aria-label="Musteri kartlari">
            {loading ? (
              <li className="evm-order-list-v1__skeleton-wrap"><LoadingSkeleton rows={6} /></li>
            ) : customerCards.length === 0 ? (
              <li className="evm-order-list-v1__empty"><EmptyState title="Musteri bulunamadi" description="Bu filtrede gosterilecek musteri kaydi bulunamadi." /></li>
            ) : (
              customerCards.map((card) => {
                const phoneLink = telHref(card.primaryPhone)
                const waLink = whatsappHref(card.primaryPhone)
                return (
                  <li key={card.id} className="evm-collection-v2__item">
                    <PrimaryListItem
                      className="evm-order-list-v1__card-row"
                      title={card.customer}
                      subtitle={card.location}
                      metaLeft={`Son siparis · ${formatShortDate(card.latestOrder.orderDate)}`}
                      metaRight={`#${card.latestOrder.orderNumber}`}
                      badge={<Badge label="Acik" tone={card.openCount > 0 ? 'orange' : 'green'} count={card.openCount} />}
                      onPress={() => {
                        setSelectedCustomerId(card.id)
                        setDrawerOpen(true)
                      }}
                    />
                    <div className="evm-v2-inline-metrics">
                      <div className="evm-v2-inline-metric">
                        <span>Son islem</span>
                        <strong>{card.latestActionDate ? formatShortDate(card.latestActionDate) : 'Yok'}</strong>
                      </div>
                      <div className="evm-v2-inline-metric">
                        <span>Bekleyen bakiye</span>
                        <strong>{card.totalRemaining.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL</strong>
                      </div>
                    </div>
                    <div className="evm-v2-inline-actions" role="group" aria-label="Musteri hizli aksiyonlari">
                    {phoneLink ? (
                      <a className="evm-v2-btn evm-v2-btn--secondary" href={phoneLink} onClick={(event) => event.stopPropagation()}>Ara</a>
                    ) : (
                      <span className="evm-v2-btn evm-v2-btn--secondary" aria-disabled>Ara</span>
                    )}
                    {waLink ? (
                      <a className="evm-v2-btn evm-v2-btn--secondary" href={waLink} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>WA</a>
                    ) : (
                      <span className="evm-v2-btn evm-v2-btn--secondary" aria-disabled>WA</span>
                    )}
                    <SecondaryButton onClick={() => onOpenOrderById(card.latestOrder.id, { source: 'orders' })}>
                      Siparis
                    </SecondaryButton>
                    <SecondaryButton onClick={() => {
                        setSelectedCustomerId(card.id)
                        setDrawerOpen(true)
                    }}>
                      Merkez
                    </SecondaryButton>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        }
        fab={<FloatingActionButton label="Yeni Musteri" onPress={onCreateCustomer} />}
      />

      {selectedCustomer ? (
        <OrderCustomerErpDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          customer={selectedCustomer.customer}
          order={selectedCustomer.latestOrder}
          orderNo={selectedCustomer.latestOrder.orderNumber || selectedCustomer.latestOrder.id}
          listItemDto={dtoById.get(selectedCustomer.latestOrder.id)}
          phone={selectedCustomer.latestOrder.phone}
          phone2={selectedCustomer.latestOrder.phone2}
          addressLine={selectedCustomer.latestOrder.address}
          orderDateLabel={selectedCustomer.latestOrder.orderDate}
          onOpenOrder={(orderId) => onOpenOrderById(orderId, { source: 'orders' })}
        />
      ) : null}
    </section>
  )
}

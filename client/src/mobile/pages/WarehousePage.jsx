import { useMemo, useState } from 'react'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import {
  AppHeader,
  EmptyState,
  FilterChips,
  LoadingSkeleton,
  MobileScreenShell,
  PrimaryListItem,
  SearchBar,
  Badge,
} from '../design-system/MobileOpsV2Components.jsx'
import '../../styles/orders-mobile-v1.css'

/** @typedef {'all' | 'waiting' | 'critical'} WarehouseFilterId */

const FILTERS = /** @type {{ id: WarehouseFilterId; label: string }[]} */ ([
  { id: 'all', label: 'Tumu' },
  { id: 'waiting', label: 'Bekleyen' },
  { id: 'critical', label: 'Kritik' },
])

function initialsFrom(fullName) {
  const raw = String(fullName || '').trim()
  if (!raw) return 'MO'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function roleLabel(role) {
  if (role === 'WAREHOUSE') return 'Depo Uzmani'
  if (role === 'MANAGER') return 'Magaza Muduru'
  if (role === 'ADMIN') return 'Yonetici'
  return 'Depo Uzmani'
}

function toneForRow(row) {
  if (row.missingCount >= 3) return 'red'
  if (row.missingCount >= 1) return 'orange'
  return 'gray'
}

function matchesFilter(row, filter) {
  if (filter === 'all') return true
  if (filter === 'waiting') return row.missingCount > 0
  if (filter === 'critical') return row.missingCount >= 3
  return true
}

export default function WarehousePage({ onOpenOrderById }) {
  const { user } = useAuth()
  const { salesOrderListItemDtos, loading } = useOrders()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState(/** @type {WarehouseFilterId} */ ('all'))

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return salesOrderListItemDtos
      .map((dto) => ({
        id: dto.id,
        customer: dto.customerDisplayName || dto.customerId || dto.id,
        orderNo: dto.orderNumber || dto.id,
        summary: dto.lineSummaryTitle || 'Urun ozeti yok',
        missingCount: Number(dto.openMissingItemsCount ?? 0),
        remainingQty: dto.remainingQty || '0',
      }))
      .filter((row) => {
        if (!matchesFilter(row, activeFilter)) return false
        if (!q) return true
        return `${row.customer} ${row.orderNo} ${row.summary}`.toLowerCase().includes(q)
      })
      .sort((a, b) => b.missingCount - a.missingCount)
  }, [salesOrderListItemDtos, query, activeFilter])

  const counts = useMemo(() => {
    const map = { all: 0, waiting: 0, critical: 0 }
    for (const row of rows) {
      map.all += 1
      if (matchesFilter(row, 'waiting')) map.waiting += 1
      if (matchesFilter(row, 'critical')) map.critical += 1
    }
    return map
  }, [rows])

  const userInitials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const userRoleLabel = useMemo(() => roleLabel(user?.role), [user?.role])

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2" aria-label="Mobile Warehouse">
      <MobileScreenShell
        header={<AppHeader eyebrow="Depo" title="Depo" subtitle={`${rows.length} bekleyen kayit`} meta={`${userRoleLabel} • Merkez Magaza`} unreadCount={counts.critical} initials={userInitials} onOpenMenu={() => { window.location.hash = '#/mobile/menu' }} />}
        search={<SearchBar value={query} onValueChange={setQuery} placeholder="Musteri, siparis no veya urun ara" />}
        filter={<FilterChips items={FILTERS.map((filter) => ({ id: filter.id, label: filter.label, count: counts[filter.id] }))} activeId={activeFilter} onSelect={(id) => setActiveFilter(/** @type {WarehouseFilterId} */ (id))} ariaLabel="Depo filtreleri" />}
        primary={
          <ul className="evm-order-list-v1__cards" aria-label="Depo listesi">
            {loading ? (
              <li className="evm-order-list-v1__skeleton-wrap"><LoadingSkeleton rows={6} /></li>
            ) : rows.length === 0 ? (
              <li className="evm-order-list-v1__empty"><EmptyState title="Depo kaydi yok" description="Bu filtrede gosterilecek bekleyen depo kaydi bulunamadi." /></li>
            ) : (
              rows.map((row) => (
                <li key={row.id} className="evm-collection-v2__item">
                  <PrimaryListItem
                    className="evm-order-list-v1__card-row"
                    title={row.customer}
                    subtitle={row.summary}
                    metaLeft={`Kalan adet · ${row.remainingQty}`}
                    metaRight={`#${row.orderNo}`}
                    badge={<Badge label="Eksik" tone={toneForRow(row)} count={row.missingCount} />}
                    onPress={() => onOpenOrderById(row.id, { source: 'orders' })}
                  />
                </li>
              ))
            )}
          </ul>
        }
      />
    </section>
  )
}

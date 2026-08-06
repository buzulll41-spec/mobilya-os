import { useMemo, useState } from 'react'
import { formatShortDate } from '../../utils/dates.js'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import {
  AppHeader,
  EmptyState,
  FilterChips,
  FloatingActionButton,
  LoadingSkeleton,
  MobileScreenShell,
  PrimaryButton,
  PrimaryListItem,
  SearchBar,
  SecondaryButton,
  Badge,
} from '../design-system/MobileOpsV2Components.jsx'
import { initialsFrom, roleLabel } from '../utils/mobileIdentity.js'
import '../../styles/orders-mobile-v1.css'

/** @typedef {'all' | 'missing' | 'shipment-issue' | 'urgent'} SshFilterId */

const FILTERS = /** @type {{ id: SshFilterId; label: string }[]} */ ([
  { id: 'all', label: 'Tumu' },
  { id: 'missing', label: 'Eksik' },
  { id: 'shipment-issue', label: 'Sevkiyat' },
  { id: 'urgent', label: 'Acil' },
])

/** @param {number} count */
function toneForCount(count) {
  if (count >= 3) return 'red'
  if (count >= 1) return 'orange'
  return 'gray'
}

/** @param {any} row @param {SshFilterId} filter */
function matchesFilter(row, filter) {
  if (filter === 'all') return true
  if (filter === 'missing') return row.openMissingItemsCount > 0
  if (filter === 'shipment-issue') return Boolean(row.hasShipmentIssue)
  if (filter === 'urgent') return row.openMissingItemsCount >= 2 || Boolean(row.hasShipmentIssue)
  return true
}

/**
 * @param {{
 *   onOpenOrderById: (orderId: string, options?: import('../../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   onCreateSsh?: () => void
 * }} props
 */
export default function SshPage({ onOpenOrderById, onCreateSsh }) {
  const { user } = useAuth()
  const { salesOrderListItemDtos, loading } = useOrders()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState(/** @type {SshFilterId} */ ('all'))

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return salesOrderListItemDtos
      .filter((dto) => (Number(dto.openMissingItemsCount ?? 0) > 0) || dto.hasShipmentIssue)
      .map((dto) => ({
        id: dto.id,
        customer: dto.customerDisplayName || dto.customerId || dto.id,
        orderNo: dto.orderNumber || dto.id,
        phone: dto.customerPhone || 'Telefon yok',
        issueCount: Number(dto.openMissingItemsCount ?? 0),
        hasShipmentIssue: Boolean(dto.hasShipmentIssue),
        dueDate: dto.earliestCommittedShipBy || dto.plannedShipmentDate || dto.placedAt?.slice(0, 10) || null,
        summary: dto.lineSummaryTitle || 'Eksik kayit',
      }))
      .filter((row) => {
        if (!matchesFilter(row, activeFilter)) return false
        if (!q) return true
        return `${row.customer} ${row.orderNo} ${row.summary} ${row.phone}`.toLowerCase().includes(q)
      })
      .sort((a, b) => Number(b.issueCount) - Number(a.issueCount))
  }, [salesOrderListItemDtos, query, activeFilter])

  const counts = useMemo(() => {
    /** @type {Record<SshFilterId, number>} */
    const map = { all: 0, missing: 0, 'shipment-issue': 0, urgent: 0 }
    for (const row of rows) {
      map.all += 1
      if (matchesFilter(row, 'missing')) map.missing += 1
      if (matchesFilter(row, 'shipment-issue')) map['shipment-issue'] += 1
      if (matchesFilter(row, 'urgent')) map.urgent += 1
    }
    return map
  }, [rows])

  const userInitials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const userRoleLabel = useMemo(() => roleLabel(user?.role), [user?.role])

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2" aria-label="Mobile SSH">
      <MobileScreenShell
        header={<AppHeader eyebrow="Hangi musteri bekliyor" title="SSH" subtitle={`${rows.length} acik takip kaydi`} meta={`${userRoleLabel} • Merkez Magaza`} unreadCount={counts.urgent} initials={userInitials} onOpenMenu={() => { window.location.hash = '#/mobile/menu' }} />}
        search={<SearchBar value={query} onValueChange={setQuery} placeholder="SSH ara" />}
        filter={<FilterChips items={FILTERS.map((filter) => ({ id: filter.id, label: filter.label, count: counts[filter.id] }))} activeId={activeFilter} onSelect={(id) => setActiveFilter(/** @type {SshFilterId} */ (id))} ariaLabel="SSH filtreleri" />}
        primary={
          <ul className="evm-order-list-v1__cards" aria-label="SSH listesi">
            {loading ? (
              <li className="evm-order-list-v1__skeleton-wrap"><LoadingSkeleton rows={6} /></li>
            ) : rows.length === 0 ? (
              <li className="evm-order-list-v1__empty"><EmptyState title="SSH kaydi yok" description="Bu filtrede gosterilecek acik SSH kaydi bulunamadi." /></li>
            ) : (
              rows.map((row) => (
                <li key={row.id} className="evm-collection-v2__item">
                  <PrimaryListItem
                    className="evm-order-list-v1__card-row"
                    title={row.customer}
                    subtitle={row.summary}
                    metaLeft={`${row.dueDate ? formatShortDate(row.dueDate) : 'Plan yok'} · ${row.phone}`}
                    metaRight={`#${row.orderNo}`}
                    badge={<Badge label={row.hasShipmentIssue ? 'Issue' : 'Eksik Parca'} tone={toneForCount(row.issueCount)} count={row.issueCount} />}
                    onPress={() => onOpenOrderById(row.id, { source: 'orders' })}
                  />
                  <div className="evm-v2-inline-actions" role="group" aria-label="SSH aksiyonlari">
                    <PrimaryButton onClick={() => onOpenOrderById(row.id, { source: 'orders', tab: 'ssh' })}>SSH Ac</PrimaryButton>
                    <SecondaryButton onClick={() => onOpenOrderById(row.id, { source: 'orders' })}>Siparis Detayi</SecondaryButton>
                  </div>
                </li>
              ))
            )}
          </ul>
        }
        fab={<FloatingActionButton label="Yeni SSH" onPress={onCreateSsh} />}
      />
    </section>
  )
}

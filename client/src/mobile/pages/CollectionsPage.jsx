import { useEffect, useMemo, useRef, useState } from 'react'
import { formatTry } from '../../data/dashboardHelpers.js'
import { formatShortDate } from '../../utils/dates.js'
import { getOperationalToday } from '../../data/index.js'
import { toastError, toastSuccess } from '../../lib/toastBus.js'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import {
  AppHeader,
  Badge,
  EmptyState,
  FilterChips,
  LoadingSkeleton,
  MobileScreenShell,
  PrimaryButton,
  PrimaryListItem,
  SearchBar,
  SecondaryButton,
} from '../design-system/MobileOpsV2Components.jsx'
import '../../styles/orders-mobile-v1.css'

/** @typedef {'all' | 'today' | 'overdue' | 'partial' | 'completed'} CollectionFilterId */

const FILTERS = /** @type {{ id: CollectionFilterId; label: string }[]} */ ([
  { id: 'all', label: 'Tumu' },
  { id: 'today', label: 'Bugun' },
  { id: 'overdue', label: 'Geciken' },
  { id: 'partial', label: 'Kismi' },
  { id: 'completed', label: 'Tamamlanan' },
])

function readCollectionHashParams() {
  const raw = String(window.location.hash || '')
  const queryStart = raw.indexOf('?')
  if (queryStart < 0) return { filter: null, focus: null }
  const search = new URLSearchParams(raw.slice(queryStart + 1))
  const filter = search.get('filter')
  const focus = search.get('focus')
  return { filter, focus }
}

/** @param {string | null} value */
function toCollectionFilter(value) {
  if (value === 'today' || value === 'overdue' || value === 'partial' || value === 'completed' || value === 'all') return value
  return 'all'
}

/** @param {number} value */
function toPercent(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value * 100)))
}

/** @param {{ hasOverdueBalance?: boolean, remaining: number, paid: number }} row */
function collectionStatus(row) {
  if (row.remaining <= 0.009) return 'Tamamlandi'
  if (row.hasOverdueBalance) return 'Gecikmis'
  if (row.paid > 0.009) return 'Kismi'
  return 'Bekliyor'
}

/** @param {string} status */
function statusClass(status) {
  if (status === 'Tamamlandi') return 'is-delivered'
  if (status === 'Gecikmis') return 'is-collection'
  if (status === 'Kismi') return 'is-shipment'
  return 'is-neutral'
}

/** @param {string} status */
function statusTone(status) {
  if (status === 'Tamamlandi') return 'green'
  if (status === 'Gecikmis') return 'red'
  if (status === 'Kismi') return 'orange'
  return 'gray'
}

/** @param {string} fullName */
function initialsFrom(fullName) {
  const raw = String(fullName || '').trim()
  if (!raw) return 'MO'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

/** @param {import('../../contracts/v1/user.js').UserRole | undefined | null} role */
function roleLabel(role) {
  if (role === 'MANAGER') return 'Magaza Muduru'
  if (role === 'SALES') return 'Satis Uzmani'
  if (role === 'OPERATION') return 'Operasyon Uzmani'
  if (role === 'SERVICE') return 'Servis Uzmani'
  if (role === 'FINANCE') return 'Finans Uzmani'
  if (role === 'WAREHOUSE') return 'Depo Uzmani'
  if (role === 'ADMIN') return 'Yonetici'
  return 'Finans Uzmani'
}

/**
 * @param {{
 *   remaining: number
 *   hasOverdueBalance?: boolean
 *   lastPaymentAt?: string | null
 *   paymentProgress?: number
 * }} row
 * @param {CollectionFilterId} filter
 * @param {string} todayIso
 */
function matchesFilter(row, filter, todayIso) {
  const progress = Number(row.paymentProgress ?? 0)
  if (filter === 'all') return true
  if (filter === 'today') return String(row.lastPaymentAt ?? '').slice(0, 10) === todayIso
  if (filter === 'overdue') return Boolean(row.hasOverdueBalance) && row.remaining > 0.009
  if (filter === 'partial') return progress > 0.009 && progress < 0.999 && row.remaining > 0.009
  if (filter === 'completed') return row.remaining <= 0.009
  return true
}

/**
 * @param {{
 *   onOpenOrderById: (orderId: string, options?: import('../../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 * }} props
 */
export default function CollectionsPage({ onOpenOrderById }) {
  const { user } = useAuth()
  const { collectionRowVMs, postOrderPayment, mutating, loading } = useOrders()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState(/** @type {CollectionFilterId} */ (toCollectionFilter(readCollectionHashParams().filter)))
  const todayIso = getOperationalToday()
  const lastFocusedIdRef = useRef('')

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')

    return collectionRowVMs
      .map((row) => {
        const amount = Number(row.amount ?? 0)
        const paid = Number(row.paidAmount ?? 0)
        const remaining = Math.max(0, Number(row.remainingAmount?.value ?? amount - paid))
        return {
          ...row,
          amount,
          paid,
          remaining,
          status: collectionStatus({ hasOverdueBalance: row.hasOverdueBalance, remaining, paid }),
          progressPct: toPercent(typeof row.paymentProgress === 'number' ? row.paymentProgress : amount > 0 ? paid / amount : 0),
        }
      })
      .filter((row) => {
        if (!matchesFilter(row, activeFilter, todayIso)) return false
        if (!q) return true
        const blob = [row.customer, row.orderNumber, row.phone, row.phone2].filter(Boolean).join(' ').toLowerCase()
        if (blob.includes(q)) return true
        if (digits.length >= 4) {
          const rowDigits = String(row.phone ?? row.phone2 ?? '').replace(/\D/g, '')
          return rowDigits.includes(digits)
        }
        return false
      })
      .sort((a, b) => Number(b.remaining) - Number(a.remaining))
  }, [collectionRowVMs, query, activeFilter, todayIso])

  const counts = useMemo(() => {
    /** @type {Record<CollectionFilterId, number>} */
    const map = { all: 0, today: 0, overdue: 0, partial: 0, completed: 0 }
    for (const row of cards) {
      map.all += 1
      if (matchesFilter(row, 'today', todayIso)) map.today += 1
      if (matchesFilter(row, 'overdue', todayIso)) map.overdue += 1
      if (matchesFilter(row, 'partial', todayIso)) map.partial += 1
      if (matchesFilter(row, 'completed', todayIso)) map.completed += 1
    }
    return map
  }, [cards, todayIso])

  const pendingTotal = useMemo(
    () => cards.reduce((sum, row) => sum + (row.remaining > 0.009 ? row.remaining : 0), 0),
    [cards],
  )

  const userInitials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const userRoleLabel = useMemo(() => roleLabel(user?.role), [user?.role])

  useEffect(() => {
    function onHashChange() {
      const next = toCollectionFilter(readCollectionHashParams().filter)
      setActiveFilter(/** @type {CollectionFilterId} */ (next))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const focusId = readCollectionHashParams().focus
    if (!focusId || focusId === lastFocusedIdRef.current) return
    const target = cards.find((row) => String(row.id) === focusId || String(row.orderNumber) === focusId)
    if (!target) return
    lastFocusedIdRef.current = focusId
    onOpenOrderById(target.id, { source: 'orders' })
  }, [cards, onOpenOrderById])

  async function handleCollect(row) {
    if (row.remaining <= 0.009) return
    try {
      await postOrderPayment(row.id, {
        amount: Number(row.remaining.toFixed(2)),
        method: 'CASH',
        note: 'Mobil tahsilat islemi',
      })
      toastSuccess('Tahsilat kaydedildi')
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Tahsilat kaydi basarisiz')
    }
  }

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2 evm-collection-v2" aria-label="Mobile Collections">
      <MobileScreenShell
        header={
          <AppHeader
            eyebrow="Bugun kimden tahsilat yapacagim"
            title="Tahsilat"
            subtitle={`Bekleyen toplam · ${formatTry(pendingTotal)}`}
            meta={`${userRoleLabel} • Merkez Magaza`}
            unreadCount={counts.overdue}
            initials={userInitials}
            onOpenMenu={() => {
              window.location.hash = '#/mobile/menu'
            }}
          />
        }
        search={
          <SearchBar
            value={query}
            onValueChange={setQuery}
            placeholder="Musteri, telefon veya siparis no ara"
          />
        }
        filter={
          <FilterChips
            items={FILTERS.map((filter) => ({ id: filter.id, label: filter.label, count: counts[filter.id] }))}
            activeId={activeFilter}
            onSelect={(id) => setActiveFilter(/** @type {CollectionFilterId} */ (id))}
            ariaLabel="Tahsilat filtreleri"
          />
        }
        primary={
          <ul className="evm-order-list-v1__cards" aria-label="Tahsilat kartlari">
            {loading ? (
              <li className="evm-order-list-v1__skeleton-wrap">
                <LoadingSkeleton rows={6} />
              </li>
            ) : cards.length === 0 ? (
              <li className="evm-order-list-v1__empty">
                <EmptyState
                  title="Tahsilat kaydi yok"
                  description="Bu filtrede gosterilecek tahsilat kaydi bulunamadi."
                />
              </li>
            ) : (
              cards.map((row) => (
                <li key={row.id} className="evm-collection-v2__item">
                  <PrimaryListItem
                    className="evm-order-list-v1__card-row"
                    title={row.customer || row.id}
                    subtitle={`Kalan bakiye · ${formatTry(row.remaining)}`}
                    metaLeft={`${row.dueDate ? formatShortDate(row.dueDate) : 'Belirsiz'} · ${row.phone || row.phone2 || 'Telefon yok'}`}
                    metaRight={`#${row.orderNumber || row.id}`}
                    badge={<Badge label={row.status} tone={statusTone(row.status)} />}
                    trailing={<strong className="evm-order-list-v1__amount">{formatTry(row.amount)}</strong>}
                    onPress={() => onOpenOrderById(row.id, { source: 'orders' })}
                  />
                  <div className="evm-collection-v2__detail-strip">
                    <div className="evm-collection-v2__metric">
                      <span>Son odeme</span>
                      <strong>{row.lastPaymentAt ? formatShortDate(String(row.lastPaymentAt).slice(0, 10)) : 'Yok'}</strong>
                    </div>
                    <div className="evm-collection-v2__metric">
                      <span>Ilereleme</span>
                      <strong>%{row.progressPct}</strong>
                    </div>
                    <div className="evm-collection-v2__metric is-progress" aria-hidden>
                      <span style={{ width: `${row.progressPct}%` }} />
                    </div>
                  </div>
                  <div className="evm-collection-v2__actions">
                    <PrimaryButton onClick={() => handleCollect(row)} disabled={mutating || row.remaining <= 0.009}>
                      Tahsilat Al
                    </PrimaryButton>
                    <SecondaryButton onClick={() => onOpenOrderById(row.id, { source: 'orders' })}>
                      Siparis Detayi
                    </SecondaryButton>
                  </div>
                </li>
              ))
            )}
          </ul>
        }
      />
    </section>
  )
}

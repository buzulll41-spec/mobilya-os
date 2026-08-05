import { useEffect, useMemo, useRef, useState } from 'react'
import { formatShortDate } from '../../utils/dates.js'
import { getOperationalToday } from '../../data/index.js'
import { toastError, toastSuccess } from '../../lib/toastBus.js'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import {
  AppHeader,
  EmptyState,
  FilterChips,
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

/** @typedef {'today' | 'tomorrow' | 'unplanned' | 'in-transit' | 'completed'} ShipmentFilterId */

const FILTERS = /** @type {{ id: ShipmentFilterId; label: string }[]} */ ([
  { id: 'today', label: 'Bugun' },
  { id: 'tomorrow', label: 'Yarin' },
  { id: 'unplanned', label: 'Planlanmamis' },
  { id: 'in-transit', label: 'Yolda' },
  { id: 'completed', label: 'Tamamlandi' },
])

function readShipmentHashParams() {
  const raw = String(window.location.hash || '')
  const queryStart = raw.indexOf('?')
  if (queryStart < 0) return { filter: null, focus: null }
  const search = new URLSearchParams(raw.slice(queryStart + 1))
  const filter = search.get('filter')
  const focus = search.get('focus')
  return { filter, focus }
}

/** @param {string | null} value */
function toShipmentFilter(value) {
  if (value === 'today' || value === 'tomorrow' || value === 'unplanned' || value === 'in-transit' || value === 'completed') return value
  return 'today'
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** @param {string | null | undefined} raw */
function statusLabel(raw) {
  const value = String(raw ?? '').toUpperCase()
  if (value === 'DISPATCHED') return 'Yolda'
  if (value === 'CLOSED') return 'Tamamlandi'
  if (value === 'PLANNED') return 'Planlandi'
  return 'Plan bekliyor'
}

/** @param {string} status */
/** @param {string} status */
function statusTone(status) {
  if (status === 'Tamamlandi') return 'green'
  if (status === 'Yolda') return 'blue'
  if (status === 'Planlandi') return 'orange'
  return 'gray'
}

/**
 * @param {{ plannedDate: string | null, status: string, shipmentId?: string | null }} row
 * @param {ShipmentFilterId} filter
 * @param {string} todayIso
 */
function matchesFilter(row, filter, todayIso) {
  const tomorrowIso = addDays(todayIso, 1)
  if (filter === 'today') return row.plannedDate === todayIso
  if (filter === 'tomorrow') return row.plannedDate === tomorrowIso
  if (filter === 'unplanned') return !row.shipmentId || !row.plannedDate
  if (filter === 'in-transit') return row.status === 'Yolda'
  if (filter === 'completed') return row.status === 'Tamamlandi'
  return true
}

/**
 * @param {{
 *   onOpenOrderById: (orderId: string, options?: import('../../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 * }} props
 */
export default function ShipmentsPage({ onOpenOrderById }) {
  const { user } = useAuth()
  const { orders, shipmentQueueRows, shipmentRowVMs, postOrderShipment, patchShipmentStatus, mutating, loading } = useOrders()
  const [activeFilter, setActiveFilter] = useState(/** @type {ShipmentFilterId} */ (toShipmentFilter(readShipmentHashParams().filter)))
  const [query, setQuery] = useState('')
  const todayIso = getOperationalToday()
  const lastFocusedIdRef = useRef('')

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders])

  const rows = useMemo(() => {
    const fromQueue = shipmentQueueRows.length > 0 ? shipmentQueueRows : shipmentRowVMs
    const q = query.trim().toLowerCase()

    return fromQueue
      .map((row) => {
        const order = orderById.get(row.id)
        const plannedDate = row.plannedShipDate ?? row.shipmentDate ?? order?.shipmentDate ?? null
        const region = String(order?.address ?? '')
          .split(',')
          .map((part) => part.trim())
          .find(Boolean) ?? 'Bolge yok'
        return {
          ...row,
          plannedDate,
          region,
          status: statusLabel(row.shipmentStatus),
        }
      })
      .filter((row) => {
        if (!matchesFilter(row, activeFilter, todayIso)) return false
        if (!q) return true
        const hay = [row.customer, row.orderNumber, row.phone, row.region].filter(Boolean).join(' ').toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => String(a.plannedDate ?? '').localeCompare(String(b.plannedDate ?? '')))
  }, [shipmentQueueRows, shipmentRowVMs, orderById, activeFilter, todayIso, query])

  const counts = useMemo(() => {
    /** @type {Record<ShipmentFilterId, number>} */
    const map = { today: 0, tomorrow: 0, unplanned: 0, 'in-transit': 0, completed: 0 }
    for (const row of rows) {
      for (const filter of FILTERS) {
        if (matchesFilter(row, filter.id, todayIso)) map[filter.id] += 1
      }
    }
    return map
  }, [rows, todayIso])

  const userInitials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const userRoleLabel = useMemo(() => roleLabel(user?.role), [user?.role])

  useEffect(() => {
    function onHashChange() {
      const next = toShipmentFilter(readShipmentHashParams().filter)
      setActiveFilter(/** @type {ShipmentFilterId} */ (next))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const focusId = readShipmentHashParams().focus
    if (!focusId || focusId === lastFocusedIdRef.current) return
    const target = rows.find((row) => String(row.id) === focusId || String(row.orderNumber) === focusId)
    if (!target) return
    lastFocusedIdRef.current = focusId
    onOpenOrderById(target.id, { source: 'orders' })
  }, [rows, onOpenOrderById])

  async function handlePlan(row) {
    try {
      await postOrderShipment(row.id, {
        plannedDate: todayIso,
        crewName: row.crewName || 'Mobil Ekip',
        note: 'Mobil sevkiyat plani',
      })
      toastSuccess('Sevkiyat planlandi')
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Planlama basarisiz')
    }
  }

  async function handleDispatch(row) {
    if (!row.shipmentId) return
    try {
      await patchShipmentStatus(row.id, row.shipmentId, { status: 'DISPATCHED' })
      toastSuccess('Sevkiyat yola cikarildi')
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Yola cikarma basarisiz')
    }
  }

  async function handleDeliver(row) {
    if (!row.shipmentId) return
    try {
      await patchShipmentStatus(row.id, row.shipmentId, { status: 'CLOSED' })
      toastSuccess('Sevkiyat teslim edildi')
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Teslim islemi basarisiz')
    }
  }

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2" aria-label="Mobile Shipments">
      <MobileScreenShell
        header={<AppHeader eyebrow="Bugun nereye gidecegim" title="Sevkiyat" subtitle="Bugunku sevkiyatlar ve plan bekleyenler" meta={`${userRoleLabel} • Merkez Magaza`} unreadCount={counts['in-transit']} initials={userInitials} onOpenMenu={() => { window.location.hash = '#/mobile/menu' }} />}
        search={<SearchBar value={query} onValueChange={setQuery} placeholder="Musteri, bolge veya siparis no ara" />}
        filter={<FilterChips items={FILTERS.map((filter) => ({ id: filter.id, label: filter.label, count: counts[filter.id] }))} activeId={activeFilter} onSelect={(id) => setActiveFilter(/** @type {ShipmentFilterId} */ (id))} ariaLabel="Sevkiyat filtreleri" />}
        primary={
          <ul className="evm-order-list-v1__cards" aria-label="Sevkiyat kartlari">
            {loading ? (
              <li className="evm-order-list-v1__skeleton-wrap"><LoadingSkeleton rows={6} /></li>
            ) : rows.length === 0 ? (
              <li className="evm-order-list-v1__empty"><EmptyState title="Sevkiyat kaydi yok" description="Bu filtrede gosterilecek sevkiyat kaydi bulunamadi." /></li>
            ) : (
              rows.map((row) => (
                <li key={`${row.id}-${row.shipmentId ?? 'none'}`} className="evm-collection-v2__item">
                  <PrimaryListItem
                    className="evm-order-list-v1__card-row"
                    title={row.customer || row.id}
                    subtitle={row.region}
                    metaLeft={`${row.plannedDate ? formatShortDate(row.plannedDate) : 'Plan yok'} · ${row.phone || 'Telefon yok'}`}
                    metaRight={`#${row.orderNumber || row.id}`}
                    badge={<Badge label={row.status} tone={statusTone(row.status)} />}
                    onPress={() => onOpenOrderById(row.id, { source: 'orders' })}
                  />
                  <div className="evm-v2-inline-actions" role="group" aria-label="Sevkiyat aksiyonlari">
                    <PrimaryButton onClick={() => handlePlan(row)} disabled={mutating}>Planla</PrimaryButton>
                    <SecondaryButton onClick={() => handleDispatch(row)} disabled={mutating || !row.shipmentId || row.status === 'Yolda' || row.status === 'Tamamlandi'}>Yola Cikar</SecondaryButton>
                    <PrimaryButton onClick={() => handleDeliver(row)} disabled={mutating || !row.shipmentId || row.status === 'Tamamlandi'}>Teslim Et</PrimaryButton>
                    <SecondaryButton onClick={() => onOpenOrderById(row.id, { source: 'orders' })}>Siparis detayi</SecondaryButton>
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

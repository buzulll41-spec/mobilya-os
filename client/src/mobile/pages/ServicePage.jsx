import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import { getOperationalToday } from '../../data/index.js'
import { buildMobileOperationCenterTasks } from '../../mappers/mobile/mobileOperationHubModel.js'
import { toastSuccess } from '../../lib/toastBus.js'
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
import { STORE_ACTION, canPerformStoreAction } from '../../constants/roleActions.js'
import { initialsFrom, roleLabel } from '../utils/mobileIdentity.js'
import '../../styles/orders-mobile-v1.css'

/** @typedef {'open' | 'today' | 'waiting-part' | 'completed'} ServiceFilterId */

const FILTERS = /** @type {{ id: ServiceFilterId; label: string }[]} */ ([
  { id: 'open', label: 'Acik' },
  { id: 'today', label: 'Bugun' },
  { id: 'waiting-part', label: 'Bekleyen parca' },
  { id: 'completed', label: 'Tamamlanan' },
])

function readServiceHashParams() {
  const raw = String(window.location.hash || '')
  const queryStart = raw.indexOf('?')
  if (queryStart < 0) return { filter: null, focus: null }
  const search = new URLSearchParams(raw.slice(queryStart + 1))
  const filter = search.get('filter')
  const focus = search.get('focus')
  return { filter, focus }
}

/** @param {string | null} value */
function toServiceFilter(value) {
  if (value === 'open' || value === 'today' || value === 'waiting-part' || value === 'completed') return value
  return 'open'
}

/** @param {string} value */
function toPriorityLabel(value) {
  const raw = String(value ?? '').toLowerCase()
  if (raw.includes('kritik') || raw.includes('critical')) return 'Yuksek'
  if (raw.includes('high') || raw.includes('warning')) return 'Orta'
  return 'Normal'
}

/** @param {string} priority */
function priorityClass(priority) {
  if (priority === 'Yuksek') return 'is-collection'
  if (priority === 'Orta') return 'is-shipment'
  return 'is-neutral'
}

/** @param {string} priority */
function priorityTone(priority) {
  if (priority === 'Yuksek') return 'red'
  if (priority === 'Orta') return 'orange'
  return 'gray'
}

/**
 * @param {{ filterId: ServiceFilterId, task: ReturnType<typeof buildMobileOperationCenterTasks>[number], openMissingItemsCount: number }} input
 */
function matchesFilter({ filterId, task, openMissingItemsCount }) {
  if (filterId === 'open') return task.status !== 'Tamamlandi'
  if (filterId === 'today') return task.isToday
  if (filterId === 'waiting-part') return openMissingItemsCount > 0
  if (filterId === 'completed') return task.status === 'Tamamlandi'
  return true
}

/**
 * @param {{
 *   onOpenOrderById: (orderId: string, options?: import('../../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   onCreateService?: () => void
 * }} props
 */
export default function ServicePage({ onOpenOrderById, onCreateService }) {
  const { user } = useAuth()
  const { salesOrderListItemDtos, collectionRowVMs, operationalTasks, setTaskOverlay, loading } = useOrders()
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState(/** @type {ServiceFilterId} */ (toServiceFilter(readServiceHashParams().filter)))
  const todayIso = getOperationalToday()
  const lastFocusedIdRef = useRef('')

  const dtoById = useMemo(
    () => new Map(salesOrderListItemDtos.map((dto) => [dto.id, dto])),
    [salesOrderListItemDtos],
  )

  const taskByOrder = useMemo(() => {
    const byOrder = new Map()
    for (const task of operationalTasks) {
      if (!byOrder.has(task.salesOrderId)) {
        byOrder.set(task.salesOrderId, task)
      }
    }
    return byOrder
  }, [operationalTasks])

  const rows = useMemo(() => {
    const base = buildMobileOperationCenterTasks({
      listItemDtos: salesOrderListItemDtos,
      collectionRows: collectionRowVMs,
      todayIso,
      currentUserName: user?.fullName ?? '',
    }).filter((task) => task.moduleId === 'service' || task.moduleId === 'missing')

    const q = query.trim().toLowerCase()

    return base
      .map((task) => {
        const dto = dtoById.get(task.id.replace(/^(service|missing):/, '')) ?? dtoById.get(task.party)
        const salesOrderId = dto?.id ?? task.id.replace(/^(service|missing):/, '')
        const overlayTask = taskByOrder.get(salesOrderId)
        const openMissingItemsCount = Number(dto?.openMissingItemsCount ?? 0)
        const issueType =
          openMissingItemsCount > 0
            ? 'Eksik parca'
            : dto?.hasShipmentIssue
              ? 'Sevkiyat issue'
              : 'Operasyon takibi'

        return {
          ...task,
          salesOrderId,
          issueType,
          openMissingItemsCount,
          assignee: dto?.salesPerson?.trim() || task.assignee || 'Atanmadi',
          serviceDate: dto?.earliestCommittedShipBy || dto?.plannedShipmentDate || dto?.placedAt?.slice(0, 10) || todayIso,
          status: overlayTask && overlayTask.status !== 'OPEN' ? 'Tamamlandi' : task.status,
          dedupeKey: overlayTask?.dedupeKey ?? null,
          priorityLabel: toPriorityLabel(task.priority),
        }
      })
      .filter((row) => {
        if (!matchesFilter({ filterId: activeFilter, task: row, openMissingItemsCount: row.openMissingItemsCount })) return false
        if (!q) return true
        const hay = [row.party, row.issueType, row.assignee, row.summary].join(' ').toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => String(a.serviceDate).localeCompare(String(b.serviceDate)))
  }, [salesOrderListItemDtos, collectionRowVMs, todayIso, user?.fullName, query, activeFilter, dtoById, taskByOrder])

  const counts = useMemo(() => {
    /** @type {Record<ServiceFilterId, number>} */
    const map = { open: 0, today: 0, 'waiting-part': 0, completed: 0 }
    for (const row of rows) {
      if (matchesFilter({ filterId: 'open', task: row, openMissingItemsCount: row.openMissingItemsCount })) map.open += 1
      if (matchesFilter({ filterId: 'today', task: row, openMissingItemsCount: row.openMissingItemsCount })) map.today += 1
      if (matchesFilter({ filterId: 'waiting-part', task: row, openMissingItemsCount: row.openMissingItemsCount })) map['waiting-part'] += 1
      if (matchesFilter({ filterId: 'completed', task: row, openMissingItemsCount: row.openMissingItemsCount })) map.completed += 1
    }
    return map
  }, [rows])

  const userInitials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const userRoleLabel = useMemo(() => {
    if (!user?.role) return 'Servis Uzmani'
    return roleLabel(user.role)
  }, [user?.role])

  const canCreateService = useMemo(
    () => canPerformStoreAction(user?.role, STORE_ACTION.CREATE_SSH),
    [user?.role],
  )

  useEffect(() => {
    function onHashChange() {
      const next = toServiceFilter(readServiceHashParams().filter)
      setActiveFilter(/** @type {ServiceFilterId} */ (next))
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const focusId = readServiceHashParams().focus
    if (!focusId || focusId === lastFocusedIdRef.current) return
    const target = rows.find((row) => String(row.salesOrderId) === focusId || String(row.id).endsWith(`:${focusId}`))
    if (!target) return
    lastFocusedIdRef.current = focusId
    onOpenOrderById(target.salesOrderId, { source: 'orders' })
  }, [rows, onOpenOrderById])

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2" aria-label="Mobile Service">
      <MobileScreenShell
        header={<AppHeader eyebrow="Bugun hangi servisler var" title="Servis" subtitle="Acik servis kayitlari ve takip aksiyonlari" meta={`${userRoleLabel} • Merkez Magaza`} unreadCount={counts.open} initials={userInitials} onOpenMenu={() => { window.location.hash = '#/mobile/menu' }} />}
        search={<SearchBar value={query} onValueChange={setQuery} placeholder="Musteri, sorun veya atanan kisi ara" />}
        filter={<FilterChips items={FILTERS.map((filter) => ({ id: filter.id, label: filter.label, count: counts[filter.id] }))} activeId={activeFilter} onSelect={(id) => setActiveFilter(/** @type {ServiceFilterId} */ (id))} ariaLabel="Servis filtreleri" />}
        primary={
          <ul className="evm-order-list-v1__cards" aria-label="Servis kartlari">
            {loading ? (
              <li className="evm-order-list-v1__skeleton-wrap"><LoadingSkeleton rows={6} /></li>
            ) : rows.length === 0 ? (
              <li className="evm-order-list-v1__empty">
                <EmptyState
                  title="Servis kaydi yok"
                  description="Bu filtrede gosterilecek servis kaydi bulunamadi."
                  actionLabel="Yeni Servis Kaydi Ac"
                  onAction={canCreateService ? onCreateService : undefined}
                />
              </li>
            ) : (
              rows.map((row) => (
                <li key={row.id} className="evm-collection-v2__item">
                  <PrimaryListItem
                    className="evm-order-list-v1__card-row"
                    title={row.party}
                    subtitle={row.summary}
                    metaLeft={`${row.issueType} · ${row.assignee}`}
                    metaRight={row.serviceDate}
                    badge={<Badge label={row.priorityLabel} tone={priorityTone(row.priorityLabel)} />}
                    onPress={() => onOpenOrderById(row.salesOrderId, { source: 'orders' })}
                  />
                  <div className="evm-v2-inline-actions" role="group" aria-label="Servis aksiyonlari">
                    <SecondaryButton onClick={() => onOpenOrderById(row.salesOrderId, { source: 'orders' })}>Planla</SecondaryButton>
                    <SecondaryButton onClick={() => onOpenOrderById(row.salesOrderId, { source: 'orders' })}>Baslat</SecondaryButton>
                    <PrimaryButton
                      className="evm-v2-inline-actions__full"
                      disabled={!row.dedupeKey}
                      onClick={() => {
                        if (!row.dedupeKey) return
                        setTaskOverlay(row.dedupeKey, 'completed')
                        toastSuccess('Servis kaydi tamamlandi')
                      }}
                    >
                      Tamamla
                    </PrimaryButton>
                  </div>
                </li>
              ))
            )}
          </ul>
        }
        fab={canCreateService ? <FloatingActionButton label="Yeni Servis" onPress={onCreateService} /> : null}
      />
    </section>
  )
}

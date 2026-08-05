import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import { useShipmentPlans } from '../../hooks/useShipmentPlans.jsx'
import { getOperationalToday } from '../../data/index.js'
import { buildMobileOperationCenterTasks } from '../../mappers/mobile/mobileOperationHubModel.js'
import { fetchMobileHomeSummaries, parseSummaryMetrics } from '../../services/mobileHomeSummaryClient.js'
import { IconChart, IconOrders, IconService, IconTruck, IconUsers, IconWallet } from '../../components/Icons.jsx'
import HomeV2Header from './components/HomeV2Header.jsx'
import HomeV2SearchBar from './components/HomeV2SearchBar.jsx'
import HomeV2OperationSummary from './components/HomeV2OperationSummary.jsx'
import HomeV2FocusList from './components/HomeV2FocusList.jsx'
import HomeV2QuickActions from './components/HomeV2QuickActions.jsx'
import HomeV2RecentActivity from './components/HomeV2RecentActivity.jsx'
import './AppleNativeHomePage.css'

const MODULE_ICONS = {
  collection: IconWallet,
  shipment: IconTruck,
  service: IconService,
  orders: IconOrders,
  customers: IconUsers,
  reports: IconChart,
}

/** @param {number} value */
function formatMoney(value) {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })
}

/** @param {number} value */
function formatCompactCurrency(value) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  if (safe < 1_000) return formatMoney(safe)

  if (safe < 1_000_000) {
    const scaled = safe / 1_000
    const shown = Number(scaled.toFixed(scaled >= 100 ? 0 : 2))
    const text = shown.toLocaleString('tr-TR', {
      minimumFractionDigits: shown % 1 === 0 ? 0 : 2,
      maximumFractionDigits: shown % 1 === 0 ? 0 : 2,
    })
    return `₺${text} Bin`
  }

  const scaled = safe / 1_000_000
  const shown = Number(scaled.toFixed(scaled >= 100 ? 0 : 2))
  const text = shown.toLocaleString('tr-TR', {
    minimumFractionDigits: shown % 1 === 0 ? 0 : 2,
    maximumFractionDigits: shown % 1 === 0 ? 0 : 2,
  })
  return `₺${text} Mn`
}

/** @param {number | null | undefined} value */
function formatCount(value) {
  if (!Number.isFinite(value)) return '—'
  return Math.round(Number(value)).toLocaleString('tr-TR')
}

/** @param {string} fullName */
function firstNameFrom(fullName) {
  const raw = String(fullName || '').trim()
  if (!raw) return 'Murat'
  const first = raw.split(/\s+/)[0]
  if (['Operasyon', 'Admin', 'Manager', 'Sales', 'Service', 'Finance', 'Warehouse'].includes(first)) return 'Murat'
  return first || 'Murat'
}

/** @param {string} fullName */
function initialsFrom(fullName) {
  const raw = String(fullName || '').trim()
  if (!raw) return 'MU'
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
  return 'Operasyon Uzmani'
}

/** @param {'collection' | 'shipment' | 'service' | 'orders' | 'customers' | 'reports'} moduleId */
function routeForModule(moduleId) {
  if (moduleId === 'collection') return 'collection'
  if (moduleId === 'shipment') return 'shipment'
  if (moduleId === 'service') return 'service'
  if (moduleId === 'orders') return 'orders'
  if (moduleId === 'customers') return 'customers'
  return 'reports'
}

/** @param {'collection' | 'shipment' | 'service' | 'orders' | 'customers' | 'reports'} moduleId */
function moduleTitle(moduleId) {
  if (moduleId === 'collection') return 'Tahsilat'
  if (moduleId === 'shipment') return 'Sevkiyat'
  if (moduleId === 'service') return 'Servis'
  if (moduleId === 'orders') return 'Siparis'
  if (moduleId === 'customers') return 'Musteri'
  return 'Raporlar'
}

/** @param {number} count */
function statusFromCount(count) {
  const safe = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0
  if (safe >= 8) return { label: 'Kritik', tone: 'danger' }
  if (safe >= 1) return { label: 'Dikkat', tone: 'warning' }
  return { label: 'Planli', tone: 'success' }
}

/** @param {'collection' | 'shipment' | 'service' | 'orders' | 'customers' | 'reports' | 'missing'} moduleId */
function activityTone(moduleId) {
  if (moduleId === 'collection') return 'danger'
  if (moduleId === 'shipment') return 'warning'
  if (moduleId === 'service') return 'primary'
  if (moduleId === 'orders') return 'primary'
  if (moduleId === 'customers') return 'success'
  return 'neutral'
}

/**
 * @param {{
 *   onNavigate: (page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports') => void
 * }} props
 */
export default function AppleNativeHomePage({ onNavigate }) {
  const { user } = useAuth()
  const { loading, salesOrderListItemDtos, collectionRowVMs } = useOrders()
  const { plans } = useShipmentPlans()
  const todayIso = getOperationalToday()

  const [searchValue, setSearchValue] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryResults, setSummaryResults] = useState([])
  const [showSkeleton, setShowSkeleton] = useState(true)

  const loadingSinceRef = useRef(Date.now())
  const uiLoading = loading || summaryLoading
  const firstName = useMemo(() => firstNameFrom(user?.fullName ?? ''), [user?.fullName])
  const initials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const userRoleLabel = useMemo(() => roleLabel(user?.role), [user?.role])
  const storeLabel = 'Merkez Magaza'

  const refreshSummaries = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const results = await fetchMobileHomeSummaries()
      setSummaryResults(results)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setSummaryLoading(true)

    void fetchMobileHomeSummaries()
      .then((results) => {
        if (!cancelled) setSummaryResults(results)
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let timerId
    if (uiLoading) {
      loadingSinceRef.current = Date.now()
      setShowSkeleton(true)
      timerId = window.setTimeout(() => setShowSkeleton(false), 360)
    } else {
      const elapsed = Date.now() - loadingSinceRef.current
      const minWait = Math.max(0, 160 - elapsed)
      timerId = window.setTimeout(() => setShowSkeleton(false), minWait)
    }

    return () => {
      if (timerId) window.clearTimeout(timerId)
    }
  }, [uiLoading])

  const hasSummaryError = useMemo(
    () => summaryResults.some((item) => item.status === 'error' || item.status === 'unconfigured' || item.status === 'missing'),
    [summaryResults],
  )

  const operationTasks = useMemo(
    () =>
      buildMobileOperationCenterTasks({
        listItemDtos: salesOrderListItemDtos,
        collectionRows: collectionRowVMs,
        shipmentPlans: plans,
        todayIso,
        currentUserName: user?.fullName ?? '',
      }),
    [salesOrderListItemDtos, collectionRowVMs, plans, todayIso, user?.fullName],
  )

  const unreadCount = useMemo(() => operationTasks.filter((task) => task.isCritical || task.isDelayed).length, [operationTasks])

  const moduleData = useMemo(() => {
    const byId = new Map(summaryResults.map((item) => [item.moduleId, item]))
    /** @type {('collection' | 'shipment' | 'service' | 'orders' | 'customers' | 'reports')[]} */
    const ids = ['collection', 'shipment', 'service', 'orders', 'customers', 'reports']

    return ids.map((id) => {
      const item = byId.get(id)
      if (!item || item.status !== 'ok') {
        return { id, value: '—', subtitle: 'Veri bekleniyor', badge: 0 }
      }

      const metrics = parseSummaryMetrics(id, item.data)

      if (id === 'collection') {
        const amount = metrics.amount ?? 0
        const count = metrics.count ?? 0
        return {
          id,
          value: formatCompactCurrency(amount),
          subtitle: `${formatCount(count)} acik tahsilat`,
          badge: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0,
        }
      }

      if (id === 'reports') {
        if (Number.isFinite(metrics.amount)) {
          return { id, value: formatCompactCurrency(metrics.amount), subtitle: 'Guncel satis ozeti', badge: 0 }
        }
        return { id, value: formatCount(metrics.count ?? 0), subtitle: 'Guncel satis ozeti', badge: 0 }
      }

      const count = metrics.count ?? 0
      if (id === 'shipment') {
        return {
          id,
          value: formatCount(count),
          subtitle: count > 0 ? `${formatCount(count)} planli sevkiyat` : 'Bugun sevkiyat plani sakin',
          badge: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0,
        }
      }

      if (id === 'service') {
        return {
          id,
          value: formatCount(count),
          subtitle: count > 0 ? `${formatCount(count)} acik servis` : 'Acil servis yok',
          badge: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0,
        }
      }

      if (id === 'customers') {
        return {
          id,
          value: formatCount(count),
          subtitle: `${formatCount(count)} aktif musteri`,
          badge: 0,
        }
      }

      return {
        id,
        value: formatCount(count),
        subtitle: `${formatCount(count)} acik siparis`,
        badge: Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0,
      }
    })
  }, [summaryResults])

  const moduleById = useMemo(() => new Map(moduleData.map((item) => [item.id, item])), [moduleData])

  const summaryItems = useMemo(() => {
    const operationalKpi = operationTasks.filter((task) => task.isCritical || task.isDelayed).length
    const ordered = [
      { id: 'collection', label: 'Tahsilat', tone: 'danger' },
      { id: 'orders', label: 'Siparis', tone: 'primary' },
      { id: 'shipment', label: 'Sevkiyat', tone: 'warning' },
      { id: 'service', label: 'Servis', tone: 'primary' },
      { id: 'customers', label: 'Musteri', tone: 'success' },
    ]

    const mapped = ordered.map((entry) => {
      const hit = moduleById.get(entry.id)
      return {
        id: entry.id,
        label: entry.label,
        value: hit?.value ?? '—',
        detail: hit?.subtitle ?? 'Veri bekleniyor',
        tone: entry.tone,
        route: routeForModule(entry.id),
      }
    })

    mapped.push({
      id: 'kpi',
      label: 'Bugunku KPI',
      value: formatCount(operationalKpi),
      detail: 'Kritik operasyon sinyali',
      tone: operationalKpi > 0 ? 'warning' : 'success',
      route: 'orders',
    })

    return mapped
  }, [moduleById, operationTasks])

  const focusRows = useMemo(() => {
    const collection = moduleById.get('collection')?.badge ?? 0
    const shipment = moduleById.get('shipment')?.badge ?? 0
    const ordersCount = moduleById.get('orders')?.badge ?? 0
    const service = moduleById.get('service')?.badge ?? 0

    const rows = [
      {
        id: 'focus-collection',
        title: 'Bekleyen Tahsilatlar',
        description: collection > 0 ? `${formatCount(collection)} tahsilat bekliyor` : 'Tahsilat riski gorunmuyor',
        route: 'collection',
        count: collection,
      },
      {
        id: 'focus-shipment',
        title: 'Bugunku Sevkiyat',
        description: shipment > 0 ? `${formatCount(shipment)} planli sevkiyat var` : 'Bugun sevkiyat plani sakin',
        route: 'shipment',
        count: shipment,
      },
      {
        id: 'focus-orders',
        title: 'Kritik Siparisler',
        description: ordersCount > 0 ? `${formatCount(ordersCount)} siparis acik takipte` : 'Kritik siparis yok',
        route: 'orders',
        count: ordersCount,
      },
      {
        id: 'focus-service',
        title: 'Bugunku Servis',
        description: service > 0 ? `${formatCount(service)} servis kaydi acik` : 'Servis tarafi dengede',
        route: 'service',
        count: service,
      },
    ]

    return rows.slice(0, 4).map((row) => {
      const status = statusFromCount(row.count)
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: status.label,
        tone: status.tone,
        route: row.route,
      }
    })
  }, [moduleById])

  const quickActions = useMemo(
    () => [
      { id: 'new-order', label: 'Yeni Siparis', iconKey: 'orders', route: 'orders', tone: 'primary' },
      { id: 'collection', label: 'Tahsilat', iconKey: 'collection', route: 'collection', tone: 'success' },
      { id: 'shipment', label: 'Sevkiyat', iconKey: 'shipment', route: 'shipment', tone: 'warning' },
      { id: 'service', label: 'Servis', iconKey: 'service', route: 'service', tone: 'danger' },
    ],
    [],
  )

  const quickActionItems = useMemo(
    () => quickActions.map((action) => {
      const Icon = MODULE_ICONS[action.iconKey] ?? IconOrders
      return { ...action, icon: <Icon /> }
    }),
    [quickActions],
  )

  const recentRows = useMemo(() => {
    return operationTasks.slice(0, 5).map((task) => {
      const safeModule = task.moduleId === 'missing' || task.moduleId === 'supply' ? 'service' : task.moduleId
      return {
        id: task.id,
        title: task.party,
        detail: task.summary,
        time: task.lastAction,
        route: routeForModule(safeModule),
        tone: activityTone(safeModule),
      }
    })
  }, [operationTasks])

  const filteredFocusRows = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return focusRows
    return focusRows.filter((row) => `${row.title} ${row.description} ${row.status}`.toLowerCase().includes(q))
  }, [focusRows, searchValue])

  const filteredRecentRows = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    if (!q) return recentRows
    return recentRows.filter((row) => `${row.title} ${row.detail} ${moduleTitle(row.route === 'collection' ? 'collection' : row.route === 'shipment' ? 'shipment' : row.route === 'service' ? 'service' : row.route === 'customers' ? 'customers' : row.route === 'reports' ? 'reports' : 'orders')}`.toLowerCase().includes(q))
  }, [recentRows, searchValue])

  return (
    <main className="evm-home-v2" aria-label="EVTREND Mobile Workspace Home">
      <HomeV2Header
        greeting="Gunaydin"
        name={firstName}
        roleLabel={userRoleLabel}
        storeLabel={storeLabel}
        unreadCount={unreadCount}
        initials={initials}
        onOpenMenu={() => onNavigate('menu')}
      />

      <HomeV2SearchBar
        value={searchValue}
        onChange={setSearchValue}
        onRefresh={() => void refreshSummaries()}
      />

      <HomeV2OperationSummary
        title="Operation Summary"
        items={summaryItems}
        loading={showSkeleton}
        hasError={hasSummaryError}
        onRetry={() => void refreshSummaries()}
        onNavigate={onNavigate}
      />

      <HomeV2FocusList
        rows={filteredFocusRows.slice(0, 4)}
        loading={showSkeleton}
        onNavigate={onNavigate}
      />

      <HomeV2QuickActions
        actions={quickActionItems}
        onNavigate={onNavigate}
      />

      <HomeV2RecentActivity
        rows={filteredRecentRows.slice(0, 5)}
        loading={showSkeleton}
        onNavigate={onNavigate}
      />
    </main>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import ExecutiveMiniTrend from '../features/executive/ExecutiveMiniTrend.jsx'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import {
  buildExecutiveCenterView,
  MONTH_FROM,
  MONTH_TO,
  operationScoreTone,
} from '../mappers/executive/executiveCenterModel.js'
import {
  buildDailyOperationSummary,
  buildSystemHealthCard,
} from '../mappers/pilot/pilotReadinessModel.js'
import { formatTry } from '../data/dashboardHelpers.js'
import { DEMO_TODAY } from '../data/constants.js'
import { getDataSourceDisplay, getApiBaseUrl } from '../config/dataSource.js'
import { getProfitabilityAnalytics } from '../services/profitabilityAnalyticsClient.js'
import * as productMasterClient from '../services/productMasterClient.js'
import { getAllMissingItemsSnapshot } from '../services/mockMissingItemStore.js'
import { getWooConnectionHealth } from '../services/wooConnectionClient.js'
import { createApiClient } from '../lib/apiClient.js'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { applyPilotScope, getOrderPilotKind, getProductPilotKind } from '../lib/pilotRecordHeuristics.js'
import { useOrders } from '../state/useOrders.js'
import { useAuth } from '../state/AuthProvider.jsx'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import { formatShortDate } from '../utils/dates.js'
import '../styles/mos-erp-ops.css'
import '../styles/executive-center.css'
import '../styles/pilot-readiness.css'

const SCORE_LABELS = {
  orders: 'Sipariş Sağlığı',
  shipment: 'Sevk Sağlığı',
  collection: 'Tahsilat Sağlığı',
  ssh: 'SSH Sağlığı',
  productHealth: 'Ürün Sağlığı',
  publishReadiness: 'Yayın Hazırlık',
}

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
function toneClass(tone) {
  if (tone === 'success') return 'is-success'
  if (tone === 'warning') return 'is-warning'
  return 'is-critical'
}

/**
 * @param {{ onNavigate?: (page: string) => void }} [props]
 */
export default function ExecutiveCenterPage({ onNavigate }) {
  const { user } = useAuth()
  const { scope, setScope, canToggle, modeHint } = usePilotDataMode()
  const {
    orders,
    salesOrderListItemDtos,
    collectionRowVMs,
    shipmentRowVMs,
    domainEvents,
    operationalTasks,
  } = useOrders()

  const [profitability, setProfitability] = useState(/** @type {import('../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto | null} */ (null))
  const [productItems, setProductItems] = useState(/** @type {import('../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [apiOk, setApiOk] = useState(/** @type {boolean | null} */ (null))
  const [dbOk, setDbOk] = useState(/** @type {boolean | null} */ (null))
  const [wooConfigured, setWooConfigured] = useState(/** @type {boolean | null} */ (null))
  const [wooOk, setWooOk] = useState(/** @type {boolean | null} */ (null))

  const load = useCallback(async () => {
    setError(null)
    try {
      const [profitRes, productRes] = await Promise.all([
        getProfitabilityAnalytics({ from: MONTH_FROM, to: MONTH_TO, groupBy: 'source' }),
        productMasterClient.listProductMaster({ pageSize: 200 }),
      ])
      setProfitability(profitRes)
      setProductItems(productMasterClient.toProductMasterCenterView(productRes).items)
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const apiBase = getApiBaseUrl()
    if (!apiBase) {
      setApiOk(null)
      setDbOk(null)
      setWooConfigured(null)
      setWooOk(null)
      return
    }
    void (async () => {
      try {
        const client = createApiClient(apiBase)
        const health = await client.get('/health')
        setApiOk(Boolean(health?.ok))
        setDbOk(health?.database === 'up')
      } catch {
        setApiOk(false)
        setDbOk(false)
      }
      try {
        const woo = await getWooConnectionHealth()
        setWooConfigured(Boolean(woo?.storeUrl))
        setWooOk(woo?.status === 'CONNECTED')
      } catch {
        setWooConfigured(false)
        setWooOk(false)
      }
    })()
  }, [])

  const scopedOrders = useMemo(
    () => applyPilotScope(orders, scope, getOrderPilotKind),
    [orders, scope],
  )
  const scopedDtos = useMemo(
    () => applyPilotScope(salesOrderListItemDtos, scope, getOrderPilotKind),
    [salesOrderListItemDtos, scope],
  )
  const scopedCollections = useMemo(
    () => applyPilotScope(collectionRowVMs, scope, getOrderPilotKind),
    [collectionRowVMs, scope],
  )
  const scopedShipments = useMemo(
    () => applyPilotScope(shipmentRowVMs, scope, getOrderPilotKind),
    [shipmentRowVMs, scope],
  )
  const scopedProducts = useMemo(
    () => applyPilotScope(productItems, scope, getProductPilotKind),
    [productItems, scope],
  )

  const view = useMemo(() => {
    if (loading && productItems.length === 0) return null
    const apiMode = Boolean(getApiBaseUrl())
    return buildExecutiveCenterView({
      orders: scopedOrders,
      listItemDtos: scopedDtos,
      collectionRows: scopedCollections,
      shipmentRowVMs: scopedShipments,
      missingItems: apiMode ? undefined : getAllMissingItemsSnapshot(),
      productItems: scopedProducts,
      profitability,
      todayIso: DEMO_TODAY,
      domainEvents,
      operationalTasks,
    })
  }, [
    scopedOrders,
    scopedDtos,
    scopedCollections,
    scopedShipments,
    scopedProducts,
    profitability,
    domainEvents,
    operationalTasks,
    loading,
  ])

  const systemHealth = useMemo(
    () =>
      buildSystemHealthCard({
        apiMode: Boolean(getApiBaseUrl()),
        apiOk,
        dbOk,
        wooConfigured,
        wooOk,
      }),
    [apiOk, dbOk, wooConfigured, wooOk],
  )

  const dailySummary = useMemo(
    () =>
      buildDailyOperationSummary({
        orders: scopedOrders,
        listItemDtos: scopedDtos,
        domainEvents,
        productItems: scopedProducts,
        todayIso: DEMO_TODAY,
        role: user?.role,
      }),
    [scopedOrders, scopedDtos, domainEvents, scopedProducts, user?.role],
  )

  if (loading && !view) {
    return <LoadingBlock title="Yönetici Merkezi yükleniyor" hint="Operasyon özeti hazırlanıyor" />
  }

  if (!view) {
    return (
      <div className="mos-page mos-erp-ops mos-erp-ops--executive-center">
        <p className="mos-erp-ops__alert" role="alert">
          {error ?? 'Veri yüklenemedi.'}
        </p>
      </div>
    )
  }

  const handleNav = (target) => {
    if (onNavigate && target) onNavigate(target)
  }

  return (
    <div className="mos-page mos-erp-ops mos-erp-ops--executive-center">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Yönetici Merkezi</h1>
          <span className="mos-erp-ops__sub">
            {formatShortDate(view.todayIso)} · Sabah operasyon özeti · {getDataSourceDisplay().label}
          </span>
        </div>
        <PilotScopeToggle scope={scope} onScopeChange={setScope} canToggle={canToggle} hint={modeHint} />
      </header>

      <section className="mos-exec-health" aria-label="Sistem sağlığı">
        {systemHealth.items.map((item) => (
          <div key={item.id} className={`mos-exec-health__item ${toneClass(item.tone)}`}>
            <span className="mos-exec-health__label">{item.label}</span>
            <span className="mos-exec-health__detail">{item.detail}</span>
          </div>
        ))}
      </section>

      <section className="mos-exec-daily" aria-label="Gün sonu operasyon özeti">
        <h2 className="mos-exec-daily__title">Bugün</h2>
        <div className="mos-exec-daily__grid">
          <div className="mos-exec-daily__item">
            Açılan sipariş
            <strong>{dailySummary.ordersOpened}</strong>
          </div>
          <div className="mos-exec-daily__item">
            Tahsilat girildi
            <strong>{dailySummary.paymentsPosted}</strong>
          </div>
          <div className="mos-exec-daily__item">
            Sevk planlandı
            <strong>{dailySummary.shipmentsPlanned}</strong>
          </div>
          <div className="mos-exec-daily__item">
            SSH açıldı
            <strong>{dailySummary.sshOpened}</strong>
          </div>
          <div className="mos-exec-daily__item">
            Ürün güncellendi
            <strong>{dailySummary.productsUpdated}</strong>
          </div>
        </div>
      </section>

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      {view.urgentActions.length > 0 ? (
        <section className="mos-exec-urgent" aria-label="Acil aksiyonlar">
          <h2 className="mos-exec-urgent__title">Acil Aksiyon</h2>
          <ul className="mos-exec-urgent__list">
            {view.urgentActions.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  className={`mos-exec-urgent__item mos-exec-urgent__item--${action.tone}`}
                  onClick={() => handleNav(action.navTarget)}
                >
                  <span className="mos-exec-urgent__icon" aria-hidden>
                    {action.tone === 'critical' ? '🔴' : '🟡'}
                  </span>
                  {action.text}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ErpOpsSummaryStrip
        metrics={view.kpiStrip}
        ariaLabel="Yönetici KPI özeti"
        summaryClassName="mos-erp-summary--cols-4 mos-exec-kpi-strip"
      />

      <section className="mos-exec-score" aria-label="Operasyon skoru">
        <div className="mos-exec-score__general">
          <span className="mos-exec-score__general-label">Genel Operasyon Skoru</span>
          <span className={`mos-exec-score__general-value ${toneClass(view.generalTone)}`}>
            {view.generalScore}
            <span className="mos-exec-score__max">/100</span>
          </span>
        </div>
        <ul className="mos-exec-score__grid">
          {Object.entries(view.operationScores).map(([key, score]) => {
            const tone = operationScoreTone(score)
            return (
              <li key={key} className={`mos-exec-score__item ${toneClass(tone)}`}>
                <span className="mos-exec-score__item-label">{SCORE_LABELS[/** @type {keyof typeof SCORE_LABELS} */ (key)]}</span>
                <span className="mos-exec-score__item-value">{score}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="mos-exec-trends">
        <h2 className="mos-exec-section-title">Son 7 Gün Trendi</h2>
        <div className="mos-exec-trends__grid">
          <ExecutiveMiniTrend
            title="Ciro"
            labels={view.trend.labels}
            values={view.trend.revenue}
            formatValue={formatTry}
            tone="sales"
          />
          <ExecutiveMiniTrend
            title="Sipariş"
            labels={view.trend.labels}
            values={view.trend.orders}
            tone="orders"
          />
          <ExecutiveMiniTrend
            title="Tahsilat"
            labels={view.trend.labels}
            values={view.trend.collections}
            tone="collect"
          />
          <ExecutiveMiniTrend
            title="Sevk"
            labels={view.trend.labels}
            values={view.trend.shipments}
            tone="ship"
          />
        </div>
      </div>

      <section className="mos-exec-today" aria-label="Bugünün işleri">
        <h2 className="mos-exec-section-title">Bugünün İşleri</h2>
        <div className="mos-exec-today__grid">
          <TaskColumn
            title="Sevki yapılacak"
            rows={view.todayTasks.shipments}
            empty="Bugün sevk planı yok"
            onNavigate={handleNav}
            navTarget="shipment-ops"
          />
          <TaskColumn
            title="Aranacak müşteriler"
            rows={view.todayTasks.callCustomers}
            empty="Aranacak müşteri yok"
            onNavigate={handleNav}
            navTarget="collection"
          />
          <TaskColumn
            title="Kritik SSH"
            rows={view.todayTasks.sshCritical}
            empty="Kritik SSH kaydı yok"
            onNavigate={handleNav}
            navTarget="ssh-service"
          />
          <TaskColumn
            title="Geciken tahsilatlar"
            rows={view.todayTasks.overdueCollections}
            empty="Geciken tahsilat yok"
            onNavigate={handleNav}
            navTarget="collection"
          />
        </div>
      </section>
    </div>
  )
}

/**
 * @param {{
 *   title: string
 *   rows: { orderId: string, customer: string, statusLabel: string, dateLabel: string }[]
 *   empty: string
 *   onNavigate: (target?: string) => void
 *   navTarget: string
 * }} props
 */
function TaskColumn({ title, rows, empty, onNavigate, navTarget }) {
  return (
    <div className="mos-exec-task-col">
      <h3 className="mos-exec-task-col__title">{title}</h3>
      {rows.length === 0 ? (
        <p className="mos-exec-task-col__empty">{empty}</p>
      ) : (
        <ul className="mos-exec-task-col__list">
          {rows.map((row) => (
            <li key={`${title}-${row.orderId}`}>
              <button
                type="button"
                className="mos-exec-task-col__row"
                onClick={() => onNavigate(navTarget)}
              >
                <strong>{row.customer}</strong>
                <span>{row.statusLabel}</span>
                <span className="mos-exec-task-col__meta">{row.dateLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

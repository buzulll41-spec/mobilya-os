import { useCallback, useEffect, useMemo, useState } from 'react'
import LoadingBlock from '../components/LoadingBlock.jsx'
import ExecutiveMiniTrend from '../features/executive/ExecutiveMiniTrend.jsx'
import { buildOperationCenterView } from '../mappers/operation/operationCenterModel.js'
import { MONTH_FROM, MONTH_TO } from '../mappers/executive/executiveCenterModel.js'
import { navigateWithOpsFilter } from '../lib/opsDeepLink.js'
import { DEMO_TODAY } from '../data/constants.js'
import { getDataSourceDisplay, getApiBaseUrl } from '../config/dataSource.js'
import { getProfitabilityAnalytics } from '../services/profitabilityAnalyticsClient.js'
import * as productMasterClient from '../services/productMasterClient.js'
import { getAllMissingItemsSnapshot } from '../services/mockMissingItemStore.js'
import { applyPilotScope, getEffectivePilotScope, getOrderPilotKind, getProductPilotKind } from '../lib/pilotRecordHeuristics.js'
import { useOrders } from '../state/useOrders.js'
import { useAuth } from '../state/AuthProvider.jsx'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import {
  ActionCard,
  Badge,
  Card,
  PrimaryButton,
  SectionHeader,
} from '../components/design-system/DSComponents.jsx'
import '../styles/mos-erp-ops.css'
import '../styles/operation-center.css'

/**
 * @param {'critical' | 'warning' | 'success' | 'neutral'} tone
 */
function toneDot(tone) {
  if (tone === 'critical') return '🔴'
  if (tone === 'warning') return '🟡'
  if (tone === 'success') return '🟢'
  return '⚪'
}

/**
 * @param {'success' | 'warning' | 'critical' | 'neutral'} tone
 */
function toneClass(tone) {
  if (tone === 'success') return 'is-success'
  if (tone === 'warning') return 'is-warning'
  if (tone === 'critical') return 'is-critical'
  return ''
}

/**
 * @param {{ onNavigate?: (page: string, ctx?: { opsFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void }} [props]
 */
export default function OperationCenterPage({ onNavigate }) {
  const { user } = useAuth()
  const {
    orders,
    salesOrderListItemDtos,
    collectionRowVMs,
    shipmentRowVMs,
    domainEvents,
    operationalTasks,
  } = useOrders()

  const [profitability, setProfitability] = useState(
    /** @type {import('../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto | null} */ (null),
  )
  const [productItems, setProductItems] = useState(
    /** @type {import('../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm[]} */ ([]),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const userFirstName = useMemo(() => {
    const name = user?.fullName?.trim()
    if (!name) return 'Murat'
    return name.split(/\s+/)[0]
  }, [user?.fullName])

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

  const scope = useMemo(() => getEffectivePilotScope(user?.role), [user?.role])

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
    return buildOperationCenterView({
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
      userFirstName,
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
    userFirstName,
  ])

  /** @param {string} page @param {import('../lib/opsDeepLink.js').OpsDeepLinkFilterId} [filter] */
  function go(page, filter) {
    if (!onNavigate) return
    if (filter) navigateWithOpsFilter(page, filter, onNavigate)
    else onNavigate(page)
  }

  if (loading && !view) {
    return (
      <div className="mos-operation-center">
        <LoadingBlock label="Operasyon rehberi yükleniyor…" />
      </div>
    )
  }

  if (error && !view) {
    return (
      <div className="mos-operation-center">
        <div className="mos-erp-ops__error">{error}</div>
      </div>
    )
  }

  if (!view) return null

  const historyChart = {
    labels: view.healthHistory.days.map((d) => d.shortLabel),
    values: view.healthHistory.days.map((d) => d.score),
  }

  return (
    <div className="mos-operation-center mos-erp-ops">
      <header className="mos-operation-center__hero">
        <div>
          <SectionHeader
            eyebrow={`Sabah brifingi · ${DEMO_TODAY}`}
            title={view.briefing.greeting}
            body="Bugun:"
          />
          <ul className="mos-operation-center__brief-list">
            {view.briefing.items.map((item) => (
              <li key={item.text} className={toneClass(item.tone)}>
                <Badge tone={item.tone === 'critical' ? 'danger' : item.tone}>
                  {toneDot(item.tone)} {item.text}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        <Card className="mos-operation-center__first-action">
          <p className="mos-operation-center__first-action-label">Önerilen ilk aksiyon</p>
          <PrimaryButton
            className="mos-operation-center__cta"
            onClick={() =>
              go(view.briefing.recommendedAction.navTarget, view.briefing.recommendedAction.navFilter)
            }
          >
            {view.briefing.recommendedAction.label}
          </PrimaryButton>
          <p className={`mos-operation-center__score ${toneClass(view.generalScoreTone)}`}>
            Operasyon skoru: <strong>{view.generalScore}</strong>/100
          </p>
        </Card>
      </header>

      <div className="mos-operation-center__grid">
        <section className="mos-operation-center__panel">
          <h2 className="mos-operation-center__panel-title">Bugünün görevleri</h2>
          <ol className="mos-operation-center__task-list">
            {view.todayTasks.length === 0 ? (
              <li className="mos-operation-center__task-empty">Bugün için acil görev yok.</li>
            ) : (
              view.todayTasks.map((task) => (
                <li key={task.id}>
                  <ActionCard
                    className={`mos-operation-center__task ${toneClass(task.tone)}`}
                    title={`${task.displayRank}. ${task.title}`}
                    body={`→ ${task.detail}`}
                    onClick={() => go(task.navTarget, task.navFilter)}
                  />
                </li>
              ))
            )}
          </ol>
        </section>

        <section className="mos-operation-center__panel">
          <h2 className="mos-operation-center__panel-title">Operasyon sırası</h2>
          <ol className="mos-operation-center__order-list">
            {view.operationOrder.map((item) => (
              <li key={item.id} className="mos-operation-center__order-item">
                <div className="mos-operation-center__order-head">
                  <span className="mos-operation-center__order-rank">{item.rank}</span>
                  <button
                    type="button"
                    className="mos-operation-center__order-link"
                    onClick={() => go(item.navTarget, item.navFilter)}
                  >
                    {item.label}
                  </button>
                </div>
                <p className="mos-operation-center__order-headline">{item.headline}</p>
                <p className="mos-operation-center__order-reason">{item.reason}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mos-operation-center__panel">
          <h2 className="mos-operation-center__panel-title">Akıllı kısayollar</h2>
          <div className="mos-operation-center__shortcuts">
            {view.shortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                type="button"
                className="mos-operation-center__shortcut"
                onClick={() => go(shortcut.navTarget, shortcut.navFilter)}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mos-operation-center__panel mos-operation-center__panel--wide">
          <h2 className="mos-operation-center__panel-title">Operasyon sağlık geçmişi</h2>
          <div className="mos-operation-center__health">
            <div className="mos-operation-center__health-summary">
              <div>
                <span className="mos-operation-center__health-label">Dün</span>
                <strong>{view.healthHistory.yesterdayScore}</strong>
              </div>
              <div>
                <span className="mos-operation-center__health-label">Bugün</span>
                <strong className={toneClass(view.generalScoreTone)}>{view.healthHistory.todayScore}</strong>
              </div>
              <div className={`mos-operation-center__health-delta ${toneClass(view.healthHistory.deltaTone)}`}>
                {view.healthHistory.deltaLabel}
              </div>
            </div>
            <ExecutiveMiniTrend
              title="Son 7 gün"
              labels={historyChart.labels}
              values={historyChart.values}
              formatValue={(n) => String(n)}
              tone="collect"
            />
          </div>
        </section>
      </div>

      <footer className="mos-operation-center__meta">
        {getApiBaseUrl() ? `API · ${getDataSourceDisplay()}` : 'Demo veri'} · Referans gün: {DEMO_TODAY}
      </footer>
    </div>
  )
}

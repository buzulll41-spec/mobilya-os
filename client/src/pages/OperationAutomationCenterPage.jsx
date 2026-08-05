import { useCallback, useEffect, useMemo, useState } from 'react'
import LoadingBlock from '../components/LoadingBlock.jsx'
import { buildOperationAutomationView } from '../mappers/operation/operationAutomationModel.js'
import { navigateWithOpsFilter } from '../lib/opsDeepLink.js'
import { DEMO_TODAY } from '../data/constants.js'
import { getDataSourceDisplay, getApiBaseUrl } from '../config/dataSource.js'
import * as productMasterClient from '../services/productMasterClient.js'
import { getAllMissingItemsSnapshot } from '../services/mockMissingItemStore.js'
import { applyPilotScope, getEffectivePilotScope, getOrderPilotKind, getProductPilotKind } from '../lib/pilotRecordHeuristics.js'
import { useOrders } from '../state/useOrders.js'
import { useAuth } from '../state/AuthProvider.jsx'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import '../styles/mos-erp-ops.css'
import '../styles/operation-automation.css'

/**
 * @param {'critical' | 'warning' | 'success' | 'neutral'} tone
 */
function toneClass(tone) {
  if (tone === 'success') return 'is-success'
  if (tone === 'warning') return 'is-warning'
  if (tone === 'critical') return 'is-critical'
  return ''
}

/**
 * @param {{ label: string, suggestions: string[], navTarget?: string, navFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId, onNavigate?: (page: string, ctx?: { opsFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void }} props
 */
function SuggestionList({ label, suggestions, navTarget, navFilter, onNavigate }) {
  return (
    <div className="mos-op-auto__suggestions">
      <p className="mos-op-auto__suggestions-label">{label}</p>
      <ul>
        {suggestions.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {navTarget && onNavigate ? (
        <button
          type="button"
          className="mos-op-auto__action-link"
          onClick={() =>
            navFilter ? navigateWithOpsFilter(navTarget, navFilter, onNavigate) : onNavigate(navTarget)
          }
        >
          Modülü aç →
        </button>
      ) : null}
    </div>
  )
}

/**
 * @param {{ onNavigate?: (page: string, ctx?: { opsFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void }} [props]
 */
export default function OperationAutomationCenterPage({ onNavigate }) {
  const { user } = useAuth()
  const {
    orders,
    salesOrderListItemDtos,
    collectionRowVMs,
    shipmentRowVMs,
  } = useOrders()

  const [productItems, setProductItems] = useState(
    /** @type {import('../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm[]} */ ([]),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const load = useCallback(async () => {
    setError(null)
    try {
      const productRes = await productMasterClient.listProductMaster({ pageSize: 200 })
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
    return buildOperationAutomationView({
      orders: scopedOrders,
      listItemDtos: scopedDtos,
      collectionRows: scopedCollections,
      shipmentRowVMs: scopedShipments,
      missingItems: apiMode ? undefined : getAllMissingItemsSnapshot(),
      productItems: scopedProducts,
      todayIso: DEMO_TODAY,
    })
  }, [scopedOrders, scopedDtos, scopedCollections, scopedShipments, scopedProducts, loading])

  if (loading && !view) {
    return (
      <div className="mos-op-auto">
        <LoadingBlock label="Operasyon önerileri hazırlanıyor…" />
      </div>
    )
  }

  if (error && !view) {
    return (
      <div className="mos-op-auto">
        <div className="mos-erp-ops__error">{error}</div>
      </div>
    )
  }

  if (!view) return null

  return (
    <div className="mos-op-auto mos-erp-ops">
      <header className="mos-op-auto__gain">
        <div>
          <p className="mos-op-auto__eyebrow">Operasyon kazanımı · {DEMO_TODAY}</p>
          <h1 className="mos-op-auto__title">Operasyon Otomasyon Merkezi</h1>
          <p className="mos-op-auto__gain-headline">{view.gainSummary.headline}</p>
          <ul className="mos-op-auto__gain-list">
            {view.gainSummary.items.map((item) => (
              <li key={item.text} className={toneClass(item.tone)}>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="mos-op-auto__gain-time">
          <span className="mos-op-auto__gain-time-label">Toplam tahmini süre</span>
          <strong>{view.gainSummary.totalEstimatedLabel}</strong>
        </div>
      </header>

      <div className="mos-op-auto__sections">
        <section className="mos-op-auto__section">
          <h2 className="mos-op-auto__section-title">Tahsilat önerileri</h2>
          {view.collectionRecommendations.length === 0 ? (
            <p className="mos-op-auto__empty">Açık tahsilat önerisi yok.</p>
          ) : (
            <div className="mos-op-auto__cards">
              {view.collectionRecommendations.map((rec) => (
                <article key={rec.id} className={`mos-op-auto__card ${toneClass(rec.tone)}`}>
                  <h3 className="mos-op-auto__card-title">{rec.customer}</h3>
                  <p className="mos-op-auto__card-meta">Borç: {rec.debtLabel}</p>
                  <p className="mos-op-auto__card-meta">{rec.overdueLabel}</p>
                  <SuggestionList
                    label="Öneri:"
                    suggestions={rec.suggestions}
                    navTarget={rec.navTarget}
                    navFilter={rec.navFilter}
                    onNavigate={onNavigate}
                  />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mos-op-auto__section">
          <h2 className="mos-op-auto__section-title">Sevk önerileri</h2>
          {view.shipmentRecommendations.length === 0 ? (
            <p className="mos-op-auto__empty">Geciken sevk önerisi yok.</p>
          ) : (
            <div className="mos-op-auto__cards">
              {view.shipmentRecommendations.map((rec) => (
                <article key={rec.id} className={`mos-op-auto__card ${toneClass(rec.tone)}`}>
                  <h3 className="mos-op-auto__card-title">Sipariş: {rec.orderLabel}</h3>
                  <p className="mos-op-auto__card-meta">{rec.statusLabel}</p>
                  <SuggestionList
                    label="Öneri:"
                    suggestions={rec.suggestions}
                    navTarget={rec.navTarget}
                    navFilter={rec.navFilter}
                    onNavigate={onNavigate}
                  />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mos-op-auto__section">
          <h2 className="mos-op-auto__section-title">SSH önerileri</h2>
          {view.sshRecommendations.length === 0 ? (
            <p className="mos-op-auto__empty">Açık SSH önerisi yok.</p>
          ) : (
            <div className="mos-op-auto__cards">
              {view.sshRecommendations.map((rec) => (
                <article key={rec.id} className={`mos-op-auto__card ${toneClass(rec.tone)}`}>
                  <h3 className="mos-op-auto__card-title">{rec.title}</h3>
                  <p className="mos-op-auto__card-meta">{rec.customer}</p>
                  <p className="mos-op-auto__card-meta">{rec.openDaysLabel}</p>
                  <SuggestionList
                    label="Öneri:"
                    suggestions={rec.suggestions}
                    navTarget={rec.navTarget}
                    navFilter={rec.navFilter}
                    onNavigate={onNavigate}
                  />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mos-op-auto__section">
          <h2 className="mos-op-auto__section-title">Ürün önerileri</h2>
          {view.productRecommendations.length === 0 ? (
            <p className="mos-op-auto__empty">Ürün düzeltme önerisi yok.</p>
          ) : (
            <div className="mos-op-auto__cards">
              {view.productRecommendations.map((rec) => (
                <article key={rec.id} className={`mos-op-auto__card ${toneClass(rec.tone)}`}>
                  <h3 className="mos-op-auto__card-title">{rec.name}</h3>
                  <p className="mos-op-auto__card-meta">Sağlık: {rec.healthScore}</p>
                  {rec.missingLabels.length > 0 ? (
                    <div className="mos-op-auto__missing">
                      <p className="mos-op-auto__missing-label">Eksikler:</p>
                      <ul>
                        {rec.missingLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="mos-op-auto__card-meta">Tahmini düzeltme süresi: {rec.fixMinutesLabel}</p>
                  <SuggestionList
                    label="Öneri:"
                    suggestions={rec.suggestions}
                    navTarget={rec.navTarget}
                    navFilter={rec.navFilter}
                    onNavigate={onNavigate}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="mos-op-auto__meta">
        {getApiBaseUrl() ? `API · ${getDataSourceDisplay()}` : 'Demo veri'} · {view.totals.recommendations} hazır
        aksiyon kartı
      </footer>
    </div>
  )
}

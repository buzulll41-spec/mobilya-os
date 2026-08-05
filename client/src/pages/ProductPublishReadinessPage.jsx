import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import PublishReadinessReport from '../features/product/PublishReadinessReport.jsx'
import ProductMasterThumbnail from '../features/product/ProductMasterThumbnail.jsx'
import {
  buildPublishReadinessSummaryMetrics,
  filterPublishReadinessItems,
  PUBLISH_READINESS_FILTERS,
  publishReadinessMissingImage,
  publishReadinessMissingSeo,
  publishReadinessMissingVariant,
  publishReadinessToneClass,
  publishReadinessWooReady,
  resolvePublishReadiness,
} from '../features/product/publishReadinessUi.js'
import { getDataSourceDisplay } from '../config/dataSource.js'
import * as productMasterClient from '../services/productMasterClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import { searchMasterCenterProducts } from '../mappers/product/productMasterCenterModel.js'
import { consumeOpsDeepLink } from '../lib/opsDeepLink.js'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { getProductPilotKind } from '../lib/pilotRecordHeuristics.js'
import '../styles/mos-erp-ops.css'
import '../styles/product-master-v3.css'

const CATALOG_PAGE_SIZE = 200

/** @typedef {import('../features/product/publishReadinessUi.js').PublishReadinessFilterId} PublishReadinessFilterId */

export default function ProductPublishReadinessPage() {
  const { scope, setScope, canToggle, filterItems, modeHint } = usePilotDataMode()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [view, setView] = useState(
    /** @type {ReturnType<typeof productMasterClient.toProductMasterCenterView> | null} */ (null),
  )
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState(/** @type {PublishReadinessFilterId} */ ('all'))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    const filter = consumeOpsDeepLink('product-publish-readiness')
    if (filter === 'missing-image' || filter === 'missing-variant') {
      setQuickFilter(filter)
    }
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await productMasterClient.listProductMaster({ pageSize: CATALOG_PAGE_SIZE })
      setView(productMasterClient.toProductMasterCenterView(res))
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const items = useMemo(() => {
    if (!view) return []
    const scoped = filterItems(view.items, getProductPilotKind)
    const searched = searchMasterCenterProducts(scoped, search)
    return filterPublishReadinessItems(searched, quickFilter)
  }, [view, search, quickFilter, filterItems])

  const summaryMetrics = useMemo(() => {
    if (!view) return []
    const scoped = filterItems(view.items, getProductPilotKind)
    const searched = searchMasterCenterProducts(scoped, search)
    return buildPublishReadinessSummaryMetrics(searched)
  }, [view, search, filterItems])

  const selectedProduct = useMemo(
    () => items.find((p) => p.id === selectedId) ?? null,
    [items, selectedId],
  )

  const totals = useMemo(() => {
    if (!view) return { ready: 0, notReady: 0, total: 0 }
    const scoped = filterItems(view.items, getProductPilotKind)
    const all = searchMasterCenterProducts(scoped, search)
    const ready = all.filter((p) => resolvePublishReadiness(p).isReadyToPublish).length
    return { ready, notReady: all.length - ready, total: all.length }
  }, [view, search, filterItems])

  if (loading) {
    return (
      <LoadingBlock title="Yayına Hazır Merkezi yükleniyor" hint="Yayın hazırlık skorları hesaplanıyor" />
    )
  }

  return (
    <div className="mos-page mos-erp-ops mos-erp-ops--publish-readiness">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Yayına Hazır Merkezi</h1>
          <span className="mos-erp-ops__sub">
            EVTREND yayın hazırlığı · {totals.total} ürün · {getDataSourceDisplay().label}
          </span>
        </div>
        <PilotScopeToggle scope={scope} onScopeChange={setScope} canToggle={canToggle} hint={modeHint} />
      </header>

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      <ErpOpsSummaryStrip
        metrics={summaryMetrics}
        ariaLabel="Yayın hazırlık özeti"
        summaryClassName="mos-erp-summary--cols-6"
        activeMetricId={quickFilter === 'all' ? null : quickFilter}
        onMetricClick={(metricId) => {
          const filterId = /** @type {PublishReadinessFilterId} */ (metricId)
          setQuickFilter((prev) => (prev === filterId ? 'all' : filterId))
        }}
      />

      <div className="mos-phc-workspace">
        <section className="mos-phc-table-panel" aria-label="Yayın hazırlık tablosu">
          <div className="mos-pmc-list__toolbar">
            <input
              type="search"
              className="mos-erp-filters__search"
              placeholder="Ürün adı, kod, marka…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Ürün ara"
            />
          </div>

          <div
            className="mos-pmc-list__quick-filters mos-erp-ops__quick-filters"
            role="toolbar"
            aria-label="Yayın hazırlık filtreleri"
          >
            {PUBLISH_READINESS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`mos-erp-ops__quick-filter${quickFilter === filter.id ? ' is-active' : ''}`}
                onClick={() =>
                  setQuickFilter((prev) =>
                    prev === filter.id ? 'all' : /** @type {PublishReadinessFilterId} */ (filter.id),
                  )
                }
              >
                <span>{filter.label}</span>
              </button>
            ))}
          </div>

          <div className="mos-phc-table-wrap">
            <table className="mos-phc-table">
              <thead>
                <tr>
                  <th scope="col">Ürün</th>
                  <th scope="col">Hazırlık Skoru</th>
                  <th scope="col">Görsel</th>
                  <th scope="col">SEO</th>
                  <th scope="col">Varyant</th>
                  <th scope="col">Woo Hazır</th>
                  <th scope="col">Durum</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="mos-phc-table__empty">
                      Bu filtreye uygun ürün bulunamadı.
                    </td>
                  </tr>
                ) : (
                  items.map((product) => {
                    const readiness = resolvePublishReadiness(product)
                    const missingImage = publishReadinessMissingImage(product)
                    const missingSeo = publishReadinessMissingSeo(product)
                    const missingVariant = publishReadinessMissingVariant(product)
                    const wooReady = publishReadinessWooReady(product)

                    return (
                      <tr
                        key={product.id}
                        className={selectedId === product.id ? 'is-selected' : ''}
                        onClick={() => setSelectedId(product.id)}
                      >
                        <td>
                          <div className="mos-phc-product-cell">
                            <ProductMasterThumbnail
                              name={product.name}
                              url={product.thumbnailUrl ?? product.media?.mainImageUrl}
                              size="sm"
                            />
                            <div>
                              <strong>{product.name}</strong>
                              <span className="mos-phc-product-cell__code">{product.productCode}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="mos-phc-score-muted">{readiness.score}/100</span>
                        </td>
                        <td>{missingImage ? 'Eksik' : 'Tamam'}</td>
                        <td>{missingSeo ? 'Eksik' : 'Tamam'}</td>
                        <td>{missingVariant ? 'Eksik' : 'Tamam'}</td>
                        <td>{wooReady ? 'Evet' : 'Hayır'}</td>
                        <td>
                          <span className={`mos-ppr-badge mos-ppr-badge--compact ${publishReadinessToneClass(readiness.tone)}`}>
                            <span className="mos-ppr-badge__dot" aria-hidden />
                            {readiness.statusLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="mos-phc-detail" aria-label="Seçili ürün yayın hazırlık raporu">
          {selectedProduct ? (
            <PublishReadinessReport product={selectedProduct} productName={selectedProduct.name} />
          ) : (
            <p className="mos-pmc-drawer__hint">Detay için tablodan bir ürün seçin.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

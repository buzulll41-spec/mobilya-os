import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import ProductMasterHealthBadge from '../features/product/ProductMasterHealthBadge.jsx'
import ProductMasterHealthReport from '../features/product/ProductMasterHealthReport.jsx'
import ProductMasterThumbnail from '../features/product/ProductMasterThumbnail.jsx'
import {
  buildProductHealthSummaryMetrics,
  filterProductMasterItems,
  PRODUCT_MASTER_QUICK_FILTERS,
  productHasMissingMedia,
  productHasMissingSeo,
  productNeedsVariants,
  resolveProductHealthScore,
} from '../features/product/productMasterCenterUi.js'
import { getDataSourceDisplay } from '../config/dataSource.js'
import * as productMasterClient from '../services/productMasterClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import { searchMasterCenterProducts } from '../mappers/product/productMasterCenterModel.js'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { getProductPilotKind } from '../lib/pilotRecordHeuristics.js'
import '../styles/mos-erp-ops.css'
import '../styles/product-master-v3.css'

const CATALOG_PAGE_SIZE = 200

/** @typedef {import('../features/product/productMasterCenterUi.js').ProductMasterQuickFilterId} ProductMasterQuickFilterId */

const HEALTH_FILTERS = PRODUCT_MASTER_QUICK_FILTERS.filter((f) =>
  ['all', 'health-100', 'health-80-plus', 'health-50-79', 'health-under-50', 'missing-media', 'missing-seo', 'missing-variants'].includes(
    f.id,
  ),
)

export default function ProductHealthPage() {
  const { scope, setScope, canToggle, filterItems, modeHint } = usePilotDataMode()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [view, setView] = useState(
    /** @type {ReturnType<typeof productMasterClient.toProductMasterCenterView> | null} */ (null),
  )
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState(/** @type {ProductMasterQuickFilterId} */ ('all'))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))

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
    return filterProductMasterItems(searched, quickFilter)
  }, [view, search, quickFilter, filterItems])

  const healthMetrics = useMemo(() => {
    if (!view) return []
    const scoped = filterItems(view.items, getProductPilotKind)
    const searched = searchMasterCenterProducts(scoped, search)
    return buildProductHealthSummaryMetrics(searched)
  }, [view, search, filterItems])

  const selectedProduct = useMemo(
    () => items.find((p) => p.id === selectedId) ?? null,
    [items, selectedId],
  )

  if (loading) {
    return <LoadingBlock title="Ürün Sağlık Merkezi yükleniyor" hint="Kalite kontrol raporu hazırlanıyor" />
  }

  return (
    <div className="mos-page mos-erp-ops mos-erp-ops--product-health">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Ürün Sağlık Merkezi</h1>
          <span className="mos-erp-ops__sub">
            Product Master kalite kontrol · {items.length} kayıt · {getDataSourceDisplay().label}
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
        metrics={healthMetrics}
        ariaLabel="Ürün sağlık özeti"
        summaryClassName="mos-erp-summary--cols-4"
      />

      <div className="mos-phc-workspace">
        <section className="mos-phc-table-panel" aria-label="Ürün sağlık tablosu">
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
            aria-label="Sağlık filtreleri"
          >
            {HEALTH_FILTERS.filter((f) => f.id !== 'all').map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`mos-erp-ops__quick-filter${quickFilter === filter.id ? ' is-active' : ''}`}
                onClick={() =>
                  setQuickFilter((prev) =>
                    prev === filter.id ? 'all' : /** @type {ProductMasterQuickFilterId} */ (filter.id),
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
                  <th scope="col">Sağlık</th>
                  <th scope="col">Eksik Medya</th>
                  <th scope="col">Eksik SEO</th>
                  <th scope="col">Eksik Varyant</th>
                  <th scope="col">Woo Hazır</th>
                </tr>
              </thead>
              <tbody>
                {items.map((product) => {
                  const health = resolveProductHealthScore(product)
                  const missingMedia = productHasMissingMedia(product)
                  const missingSeo = productHasMissingSeo(product)
                  const missingVariant = productNeedsVariants(product)
                  const wooReady = product.woo?.readiness === 'READY'

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
                        <ProductMasterHealthBadge product={product} compact />
                        <span className="mos-phc-score-muted">{health.score}/100</span>
                      </td>
                      <td>{missingMedia ? 'Evet' : '—'}</td>
                      <td>{missingSeo ? 'Evet' : '—'}</td>
                      <td>{missingVariant ? 'Evet' : '—'}</td>
                      <td>{wooReady ? 'Evet' : 'Hayır'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="mos-phc-detail" aria-label="Seçili ürün sağlık raporu">
          {selectedProduct ? (
            <ProductMasterHealthReport product={selectedProduct} productName={selectedProduct.name} />
          ) : (
            <p className="mos-pmc-drawer__hint">Detay için tablodan bir ürün seçin.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

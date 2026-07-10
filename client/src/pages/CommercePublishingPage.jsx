import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import CommercePublishingDrawer from '../features/commerce/CommercePublishingDrawer.jsx'
import { getDataSourceDisplay } from '../config/dataSource.js'
import {
  buildCommercePublishingView,
  COMMERCE_PUBLISH_FILTERS,
  filterCommercePublishRows,
} from '../mappers/commerce/commercePublishingModel.js'
import * as productsClient from '../services/productsClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import '../styles/mos-erp-ops.css'

/** @typedef {import('../mappers/commerce/commercePublishingModel.js').CommercePublishFilterId} CommercePublishFilterId */
/** @typedef {import('../mappers/commerce/commercePublishingModel.js').CommercePublishRowVm} CommercePublishRowVm */

const CATALOG_PAGE_SIZE = 100

/**
 * @param {'success' | 'warning' | 'neutral'} tone
 */
function statusPillClass(tone) {
  if (tone === 'success') return 'mos-pmc-status mos-pmc-status--published'
  if (tone === 'warning') return 'mos-pmc-status mos-pmc-status--draft'
  return 'mos-pmc-status mos-pmc-status--passive'
}

/**
 * @param {'ok' | 'miss'} status
 */
function assetStatusClass(status) {
  return status === 'ok' ? 'mos-cp-asset--ok' : 'mos-cp-asset--miss'
}

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
function readinessClass(tone) {
  if (tone === 'success') return 'mos-cp-readiness--success'
  if (tone === 'warning') return 'mos-cp-readiness--warning'
  return 'mos-cp-readiness--critical'
}

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function CommercePublishingPage({ embedded = false }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [view, setView] = useState(
    /** @type {ReturnType<typeof buildCommercePublishingView> | null} */ (null),
  )
  const [filterId, setFilterId] = useState(/** @type {CommercePublishFilterId | 'all'} */ ('all'))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await productsClient.listProducts({
        activeOnly: false,
        pageSize: CATALOG_PAGE_SIZE,
      })
      setView(buildCommercePublishingView(res.items))
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void load()
    })
    return () => cancelAnimationFrame(id)
  }, [load])

  const filteredItems = useMemo(() => {
    if (!view) return []
    return filterCommercePublishRows(view.items, filterId)
  }, [view, filterId])

  const selectedRow = useMemo(
    () => filteredItems.find((r) => r.id === selectedId) ?? null,
    [filteredItems, selectedId],
  )

  /** @param {string} id */
  function handleRowSelect(id) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  /** @param {CommercePublishFilterId | 'all'} id */
  function handleFilterClick(id) {
    setFilterId((prev) => (prev === id ? 'all' : id))
  }

  if (loading) {
    return (
      <LoadingBlock title="E-Ticaret Yayın Merkezi yükleniyor" hint="EVTREND yayın öncesi kontrol" />
    )
  }

  return (
    <div
      className={
        embedded
          ? 'mos-hub-pane mos-erp-ops mos-erp-ops--commerce-publishing'
          : 'mos-page mos-erp-ops mos-erp-ops--commerce-publishing'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">E-Ticaret Yayın Merkezi</h1>
            <span className="mos-erp-ops__sub">
              EVTREND · WooCommerce · Marketplace yayın motoru · {filteredItems.length} kayıt ·{' '}
              {getDataSourceDisplay().label}
              {view?.today ? ` · ${view.today}` : ''}
            </span>
          </div>
        </header>
      ) : null}

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      {view ? (
        <>
          <ErpOpsSummaryStrip
            metrics={view.summaryMetrics}
            ariaLabel="Yayın KPI özeti"
            summaryClassName="mos-erp-summary--cols-6 mos-cp-kpis"
            onMetricClick={(id) => {
              if (id === 'total') setFilterId('all')
              else if (
                id === 'ready' ||
                id === 'seo-missing' ||
                id === 'media-missing' ||
                id === 'draft' ||
                id === 'published'
              ) {
                handleFilterClick(id)
              }
            }}
          />

          <div className="mos-cp-filters" role="toolbar" aria-label="Yayın filtreleri">
            <button
              type="button"
              className={`mos-cp-filter${filterId === 'all' ? ' is-active' : ''}`}
              onClick={() => setFilterId('all')}
            >
              Tümü
            </button>
            {COMMERCE_PUBLISH_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`mos-cp-filter${filterId === f.id ? ' is-active' : ''}`}
                onClick={() => handleFilterClick(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mos-cp-workspace">
          <section className="mos-erp-ops__panel mos-cp-list" aria-label="Yayın listesi">
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl mos-erp-tbl--cp">
                <thead>
                  <tr>
                    <th className="mos-cp-th--thumb" aria-label="Görsel" />
                    <th>Ürün</th>
                    <th>Kod</th>
                    <th>Kategori</th>
                    <th>Durum</th>
                    <th>SEO</th>
                    <th>Medya</th>
                    <th className="is-num">Yayın Hazırlık %</th>
                    <th>Son Güncelleme</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={9}>Bu filtrede ürün bulunamadı.</td>
                    </tr>
                  ) : (
                    filteredItems.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`mos-erp-tbl-row mos-cp-row${idx % 2 === 1 ? ' is-zebra' : ''}${selectedId === row.id && drawerOpen ? ' is-selected' : ''}`}
                        onClick={() => handleRowSelect(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleRowSelect(row.id)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-selected={selectedId === row.id && drawerOpen}
                      >
                        <td className="mos-cp-td--thumb">
                          {row.thumbnailUrl ? (
                            <img src={row.thumbnailUrl} alt="" className="mos-cp-thumb" />
                          ) : (
                            <span className="mos-cp-thumb mos-cp-thumb--empty" aria-hidden="true" />
                          )}
                        </td>
                        <td className="mos-cp-td--name">{row.name}</td>
                        <td className="mos-cp-td--code">{row.productCode}</td>
                        <td>{row.category}</td>
                        <td>
                          <span className={statusPillClass(row.publishStatusTone)}>
                            {row.publishStatusLabel}
                          </span>
                        </td>
                        <td className={assetStatusClass(row.seoStatus)}>{row.seoStatusLabel}</td>
                        <td className={assetStatusClass(row.mediaStatus)}>{row.mediaStatusLabel}</td>
                        <td className={`is-num ${readinessClass(row.readinessTone)}`}>
                          %{row.readinessScore}
                        </td>
                        <td className="mos-cp-td--muted">{row.lastUpdated}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <CommercePublishingDrawer
            open={drawerOpen && Boolean(selectedRow)}
            row={selectedRow}
            onClose={() => setDrawerOpen(false)}
          />
          </div>
        </>
      ) : null}
    </div>
  )
}

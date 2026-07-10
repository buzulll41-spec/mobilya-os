import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import WooCommerceConnectorDrawer from '../features/commerce/WooCommerceConnectorDrawer.jsx'
import { getDataSourceDisplay } from '../config/dataSource.js'
import { buildWooCommerceConnectorView } from '../mappers/commerce/woocommerceConnectorModel.js'
import * as productsClient from '../services/productsClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import '../styles/mos-erp-ops.css'

/** @typedef {import('../mappers/commerce/woocommerceConnectorModel.js').WooConnectorRowVm} WooConnectorRowVm */

const CATALOG_PAGE_SIZE = 100

/**
 * @param {'success' | 'warning' | 'neutral'} tone
 */
function publishPillClass(tone) {
  if (tone === 'success') return 'mos-pmc-status mos-pmc-status--published'
  if (tone === 'warning') return 'mos-pmc-status mos-pmc-status--draft'
  return 'mos-pmc-status mos-pmc-status--passive'
}

/**
 * @param {'success' | 'warning' | 'critical' | 'info' | 'neutral'} tone
 */
function wooPillClass(tone) {
  if (tone === 'success') return 'mos-woo-status mos-woo-status--sent'
  if (tone === 'info') return 'mos-woo-status mos-woo-status--sendable'
  if (tone === 'warning') return 'mos-woo-status mos-woo-status--pending'
  if (tone === 'critical') return 'mos-woo-status mos-woo-status--error'
  return 'mos-woo-status mos-woo-status--blocked'
}

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function WooCommerceConnectorPage({ embedded = false }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [view, setView] = useState(
    /** @type {ReturnType<typeof buildWooCommerceConnectorView> | null} */ (null),
  )
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await productsClient.listProducts({
        activeOnly: false,
        pageSize: CATALOG_PAGE_SIZE,
      })
      setView(buildWooCommerceConnectorView(res.items))
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

  const selectedRow = useMemo(
    () => view?.items.find((r) => r.id === selectedId) ?? null,
    [view, selectedId],
  )

  /** @param {string} id */
  function handleRowSelect(id) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  if (loading) {
    return (
      <LoadingBlock title="WooCommerce Connector yükleniyor" hint="EVTREND mock entegrasyon katmanı" />
    )
  }

  return (
    <div
      className={
        embedded
          ? 'mos-hub-pane mos-erp-ops mos-erp-ops--woocommerce-connector'
          : 'mos-page mos-erp-ops mos-erp-ops--woocommerce-connector'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">WooCommerce Connector</h1>
            <span className="mos-erp-ops__sub">
              EVTREND WooCommerce · yayına hazır ürün senkronu · {view?.items.length ?? 0} kayıt ·{' '}
              {getDataSourceDisplay().label}
              {view?.today ? ` · ${view.today}` : ''}
            </span>
          </div>
          {view?.connection ? (
            <div className="mos-woo-connection" aria-label="Bağlantı durumu">
              <span className="mos-woo-connection__dot" aria-hidden />
              <span className="mos-woo-connection__label">{view.connection.label}</span>
              <span className="mos-woo-connection__mode">{view.connection.mode}</span>
            </div>
          ) : null}
        </header>
      ) : view?.connection ? (
        <div className="mos-woo-connection mos-hub-pane__toolbar" aria-label="Bağlantı durumu">
          <span className="mos-woo-connection__dot" aria-hidden />
          <span className="mos-woo-connection__label">{view.connection.label}</span>
          <span className="mos-woo-connection__mode">{view.connection.mode}</span>
        </div>
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
            ariaLabel="WooCommerce KPI özeti"
            summaryClassName="mos-erp-summary--cols-5 mos-woo-kpis"
          />

          <p className="mos-woo-endpoint">
            Mock endpoint · <code>{view.connection.endpoint}</code>
          </p>

          <div className="mos-woo-workspace">
            <section className="mos-erp-ops__panel mos-woo-list" aria-label="WooCommerce senkron listesi">
              <div className="mos-erp-tbl-wrap">
                <table className="mos-erp-tbl mos-erp-tbl--woo">
                  <thead>
                    <tr>
                      <th className="mos-woo-th--thumb" aria-label="Görsel" />
                      <th>Ürün</th>
                      <th>Kod</th>
                      <th>Yayın Durumu</th>
                      <th>Woo Durumu</th>
                      <th>Son Senkron</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.items.length === 0 ? (
                      <tr className="mos-erp-tbl-empty">
                        <td colSpan={6}>Ürün bulunamadı.</td>
                      </tr>
                    ) : (
                      view.items.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={`mos-erp-tbl-row mos-woo-row${idx % 2 === 1 ? ' is-zebra' : ''}${selectedId === row.id && drawerOpen ? ' is-selected' : ''}`}
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
                          <td className="mos-woo-td--thumb">
                            {row.thumbnailUrl ? (
                              <img src={row.thumbnailUrl} alt="" className="mos-woo-thumb" />
                            ) : (
                              <span className="mos-woo-thumb mos-woo-thumb--empty" aria-hidden="true" />
                            )}
                          </td>
                          <td className="mos-woo-td--name">{row.name}</td>
                          <td className="mos-woo-td--code">{row.productCode}</td>
                          <td>
                            <span className={publishPillClass(row.publishStatusTone)}>
                              {row.publishStatusLabel}
                            </span>
                          </td>
                          <td>
                            <span className={wooPillClass(row.wooStatusTone)}>{row.wooStatusLabel}</span>
                          </td>
                          <td className="mos-woo-td--sync">
                            <span>{row.lastSync}</span>
                            {row.lastSync !== '—' ? (
                              <span className="mos-woo-td-sub">{row.lastSyncDetail}</span>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <WooCommerceConnectorDrawer
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

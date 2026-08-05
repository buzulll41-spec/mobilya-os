import { useCallback, useEffect, useMemo, useState } from 'react'

import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getManagerCockpit } from '../services/managerCockpitClient.js'
import { getProfitabilityAnalytics } from '../services/profitabilityAnalyticsClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import { useOrders } from '../state/useOrders.js'
import { buildCashRadarView } from '../mappers/cashRadar/cashRadarModel.js'
import { MONTH_FROM, MONTH_TO } from '../mappers/executive/executiveWarRoomModel.js'

import '../styles/mos-erp-ops.css'

/**
 * @param {'critical'|'warning'|'success'|undefined} tone
 */
function riskToneClass(tone) {
  if (tone === 'critical') return 'is-critical'
  if (tone === 'warning') return 'is-warning'
  return 'is-success'
}

/**
 * @param {'P1'|'P2'|'P3'} tier
 */
function priorityTierClass(tier) {
  if (tier === 'P1') return 'is-p1'
  if (tier === 'P2') return 'is-p2'
  return 'is-p3'
}

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function CashRadarPage({ embedded = false }) {
  const { collectionRowVMs } = useOrders()
  const [payload, setPayload] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const limitedView = useMemo(() => {
    const role = getCurrentAuthUser()?.role
    return role === 'SALES' || role === 'sales'
  }, [])

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)

    const query = limitedView ? { limitedView: 'true' } : {}

    Promise.all([
      getManagerCockpit(query),
      getProfitabilityAnalytics({ from: MONTH_FROM, to: MONTH_TO, groupBy: 'source' }),
    ])
      .then(([cockpit, profitability]) => {
        if (!alive) return
        setPayload({ cockpit, profitability })
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Nakit radarı yüklenemedi')
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [limitedView])

  useEffect(() => load(), [load])

  const view = useMemo(() => {
    if (!payload) return null
    return buildCashRadarView({
      collectionRows: collectionRowVMs,
      cockpit: payload.cockpit,
      profitability: payload.profitability,
    })
  }, [payload, collectionRowVMs])

  return (
    <div
      className={
        embedded ? 'mos-hub-pane mos-erp-ops mos-erp-ops--cash-radar' : 'mos-page mos-erp-ops mos-erp-ops--cash-radar'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">Nakit Radarı</h1>
            <span className="mos-erp-ops__sub">
              Cash Radar · kasaya girecek para ve riskli alacaklar
              {view?.today ? ` · ${view.today}` : ''}
            </span>
          </div>
        </header>
      ) : null}

      {loading && (
        <div className="mos-erp-detail mos-erp-detail--empty">
          <span className="mos-erp-detail__empty">Yükleniyor…</span>
        </div>
      )}

      {!loading && error && (
        <div className="mos-erp-detail mos-erp-detail--empty">
          <span className="mos-erp-detail__empty">{error}</span>
        </div>
      )}

      {!loading && !error && view && (
        <>
          <ErpOpsSummaryStrip
            metrics={view.kpiMetrics}
            ariaLabel="Nakit KPI özeti"
            summaryClassName="mos-erp-summary--cols-4 mos-erp-ops__cash-kpis"
          />

          <section className="mos-erp-ops__panel" aria-label="En büyük borçlular">
            <h2 className="mos-erp-ops__panel-title">EN BÜYÜK BORÇLULAR</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl mos-erp-tbl--cash-debtors">
                <thead>
                  <tr>
                    <th>Müşteri</th>
                    <th>Açık Bakiye</th>
                    <th>Son Ödeme</th>
                    <th>Risk</th>
                    <th>Öneri</th>
                  </tr>
                </thead>
                <tbody>
                  {view.topDebtors.length === 0 ? (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={5}>Açık bakiye bulunamadı.</td>
                    </tr>
                  ) : (
                    view.topDebtors.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}
                      >
                        <td className="mos-erp-tbl-td--customer">{row.customer}</td>
                        <td className="mos-erp-tbl-td--amount">{row.openBalance}</td>
                        <td className="mos-erp-tbl-td--muted">{row.lastPayment}</td>
                        <td
                          className={`mos-erp-tbl-td--risk ${riskToneClass(row.riskTone)}`}
                        >
                          {row.risk}
                        </td>
                        <td className="mos-erp-tbl-td--action">{row.suggestion}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-ops__panel" aria-label="Tahsilat öncelik listesi">
            <h2 className="mos-erp-ops__panel-title">TAHSİLAT ÖNCELİK LİSTESİ</h2>
            <div className="mos-erp-ops__cash-priority-grid">
              {(['P1', 'P2', 'P3']).map((tier) => (
                <div key={tier} className="mos-erp-ops__cash-priority-col">
                  <h3 className="mos-erp-ops__cash-priority-title">
                    <span className={`mos-erp-prio-badge ${priorityTierClass(tier)}`}>{tier}</span>
                  </h3>
                  <div className="mos-erp-tbl-wrap">
                    <table className="mos-erp-tbl mos-erp-tbl--compact">
                      <thead>
                        <tr>
                          <th>Müşteri</th>
                          <th>Kalan</th>
                          <th>Öneri</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.priorityBuckets[tier].length === 0 ? (
                          <tr className="mos-erp-tbl-empty">
                            <td colSpan={3}>Kayıt yok.</td>
                          </tr>
                        ) : (
                          view.priorityBuckets[tier].map((row, idx) => (
                            <tr
                              key={row.id}
                              className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}
                            >
                              <td className="mos-erp-tbl-td--customer">
                                <span className="mos-erp-ops__cash-customer">{row.customer}</span>
                                <span className="mos-erp-ops__cash-order">{row.orderNo}</span>
                              </td>
                              <td className="mos-erp-tbl-td--amount">{row.remaining}</td>
                              <td className="mos-erp-tbl-td--action">{row.action}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mos-erp-ops__cash-mid-grid">
            <section className="mos-erp-ops__panel" aria-label="Riskli alacak dağılımı">
              <h2 className="mos-erp-ops__panel-title">RİSKLİ ALACAK DAĞILIMI</h2>
              <div className="mos-erp-ops__cash-aging-grid">
                {view.agingBuckets.map((bucket) => (
                  <div key={bucket.id} className="mos-erp-ops__cash-aging-card">
                    <span className="mos-erp-ops__cash-aging-label">{bucket.label}</span>
                    <span className="mos-erp-ops__cash-aging-value">{bucket.amount}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mos-erp-ops__panel" aria-label="Bugün aranacak müşteriler">
              <h2 className="mos-erp-ops__panel-title">BUGÜN ARANACAK MÜŞTERİLER</h2>
              <div className="mos-erp-tbl-wrap">
                <table className="mos-erp-tbl mos-erp-tbl--cash-calls">
                  <thead>
                    <tr>
                      <th>Müşteri</th>
                      <th>Kalan</th>
                      <th>Telefon</th>
                      <th>Risk</th>
                      <th>Öneri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.callToday.length === 0 ? (
                      <tr className="mos-erp-tbl-empty">
                        <td colSpan={5}>Bugün aranacak müşteri yok.</td>
                      </tr>
                    ) : (
                      view.callToday.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}
                        >
                          <td className="mos-erp-tbl-td--customer">
                            <span className="mos-erp-ops__cash-customer">{row.customer}</span>
                            <span className="mos-erp-ops__cash-order">{row.orderNo}</span>
                          </td>
                          <td className="mos-erp-tbl-td--amount">{row.remaining}</td>
                          <td className="mos-erp-tbl-td--muted">{row.phones}</td>
                          <td className="mos-erp-tbl-td--muted">{row.risk}</td>
                          <td className="mos-erp-tbl-td--action">{row.action}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

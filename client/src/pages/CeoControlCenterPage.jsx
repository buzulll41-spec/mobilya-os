import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getActionCenter } from '../services/actionCenterClient.js'
import { getBusinessRules } from '../services/businessRuleClient.js'
import { getDataQuality } from '../services/dataQualityClient.js'
import { getForecastEngine } from '../services/forecastEngineClient.js'
import { getManagerCockpit } from '../services/managerCockpitClient.js'
import { getOperationCases } from '../services/operationCaseClient.js'
import { getOperationsAdvisor } from '../services/operationsAdvisorClient.js'
import { getOperationsAgents } from '../services/operationsAgentsClient.js'
import { getProfitabilityAnalytics } from '../services/profitabilityAnalyticsClient.js'
import { getSupplyOperationsBoard, getSupplierLedgerCenter } from '../services/supplyOperationsClient.js'
import { getAllPaymentsSnapshot } from '../services/mockPaymentStore.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import { useOrders } from '../state/useOrders.js'
import {
  buildCeoControlCenterView,
  MONTH_FROM,
  MONTH_TO,
} from '../mappers/ceo/ceoControlCenterModel.js'
import '../styles/mos-erp-ops.css'

/**
 * @param {'success'|'warning'|'critical'|undefined} tone
 */
function healthToneClass(tone) {
  if (tone === 'critical') return 'is-critical'
  if (tone === 'warning') return 'is-warning'
  return 'is-success'
}

/**
 * @param {'green'|'orange'|'red'} status
 */
function heatClass(status) {
  if (status === 'red') return 'is-red'
  if (status === 'orange') return 'is-orange'
  return 'is-green'
}

/**
 * @param {'CRITICAL'|'WARNING'|'INFO'|string} severity
 */
function severityTone(severity) {
  if (severity === 'CRITICAL') return 'critical'
  if (severity === 'WARNING') return 'warning'
  return 'info'
}

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function CeoControlCenterPage({ embedded = false }) {
  const { orders, salesOrderListItemDtos, collectionRowVMs } = useOrders()
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
      getProfitabilityAnalytics({ from: MONTH_FROM, to: MONTH_TO, groupBy: 'salesPerson' }),
      getActionCenter(query),
      getOperationCases(query),
      getOperationsAgents(),
      getDataQuality({ from: MONTH_FROM, to: MONTH_TO }),
      getSupplyOperationsBoard({ sort: 'health' }),
      getSupplierLedgerCenter({ sort: 'balance_desc' }),
      getForecastEngine(query),
      getOperationsAdvisor(query),
      getBusinessRules({}),
    ])
      .then(
        ([
          cockpit,
          profitability,
          staffProfitability,
          actionRes,
          casesRes,
          agents,
          dataQuality,
          supplyBoard,
          ledgerCenter,
          forecast,
          advisories,
          rules,
        ]) => {
          if (!alive) return
          setPayload({
            cockpit,
            profitability,
            staffProfitability,
            actions: actionRes.actions ?? [],
            casesResponse: casesRes,
            agents,
            dataQuality,
            supplyBoard,
            ledgerCenter,
            forecast,
            advisories,
            rules,
            payments: getAllPaymentsSnapshot(),
          })
          setLoading(false)
        },
      )
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'CEO Kontrol Merkezi yüklenemedi')
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [limitedView])

  useEffect(() => load(), [load])

  const view = useMemo(() => {
    if (!payload) return null
    return buildCeoControlCenterView({
      ...payload,
      orders,
      listItemDtos: salesOrderListItemDtos ?? [],
      collectionRows: collectionRowVMs ?? [],
      payments: payload.payments ?? [],
    })
  }, [payload, orders, salesOrderListItemDtos, collectionRowVMs])

  return (
    <div
      className={
        embedded
          ? 'mos-hub-pane mos-erp-ops mos-erp-ops--ceo-control-center'
          : 'mos-page mos-erp-ops mos-erp-ops--ceo-control-center'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">CEO Kontrol Merkezi</h1>
            <span className="mos-erp-ops__sub">
              Yönetim Savaş Odası · Nakit Radarı · Operasyon Merkezi sentezi
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
          <section className="mos-erp-ops__panel mos-erp-ops__panel--score" aria-label="Şirket skoru">
            <h2 className="mos-erp-ops__panel-title">ŞİRKET SKORU</h2>
            <div className="mos-erp-ops__ceo-score-row">
              <div
                className={`mos-erp-ops__health-kpi mos-erp-ops__ceo-score-card ${healthToneClass(view.companyScore.tone)}`}
              >
                <span className="mos-erp-summary__label">Genel Skor</span>
                <span className="mos-erp-summary__value">{view.companyScore.score} / 100</span>
                <span className="mos-erp-ops__health-kpi-label">{view.companyScore.label}</span>
              </div>
              <ErpOpsSummaryStrip
                metrics={[
                  { id: 'margin', label: 'Kâr Marjı', value: `%${view.companyScore.components.profitMargin.rawScore}` },
                  { id: 'collection', label: 'Tahsilat', value: `%${view.companyScore.components.collectionRatio.rawScore}` },
                  { id: 'risky', label: 'Alacak Riski', value: `%${view.companyScore.components.riskyReceivableShare.rawScore}` },
                  { id: 'ops', label: 'Operasyon', value: `%${view.companyScore.components.operationsDiscipline.rawScore}` },
                  { id: 'tasks', label: 'Görevler', value: `%${view.companyScore.components.taskCompletion.rawScore}` },
                  { id: 'dq', label: 'Veri Kalitesi', value: `%${view.companyScore.components.dataQuality.rawScore}` },
                  { id: 'target', label: 'Ay Sonu Hedef', value: `%${view.companyScore.components.monthEndTarget.rawScore}` },
                ]}
                ariaLabel="Skor bileşenleri"
                summaryClassName="mos-erp-summary--cols-7 mos-erp-ops__ceo-score-components"
              />
            </div>
          </section>

          <section className="mos-erp-ops__panel" aria-label="Bugünün durumu">
            <h2 className="mos-erp-ops__panel-title">BUGÜNÜN DURUMU</h2>
            <ErpOpsSummaryStrip
              metrics={view.todayMetrics}
              ariaLabel="Bugünün durumu KPI"
              summaryClassName="mos-erp-summary--cols-4 mos-erp-ops__ceo-today-kpis"
            />
          </section>

          <section
            className="mos-erp-ops__panel mos-erp-ops__panel--briefing-top mos-erp-ops__panel--ceo-briefing"
            aria-label="CEO brifingi"
          >
            <h2 className="mos-erp-ops__panel-title">CEO BRİFİNGİ</h2>
            <p className="mos-erp-ops__ceo-briefing-headline">{view.briefing.headline}</p>
            <ul className="mos-erp-ops__briefing-list">
              {view.briefing.bullets.map((line) => (
                <li key={line} className="mos-erp-ops__briefing-item">
                  {line}
                </li>
              ))}
            </ul>
            <ErpOpsSummaryStrip
              metrics={view.briefing.highlights.map((h, i) => ({
                id: `bh-${i}`,
                label: h.label,
                value: h.value,
                valueTone: h.tone,
              }))}
              ariaLabel="Brifing öne çıkanlar"
              summaryClassName="mos-erp-summary--cols-5"
            />
          </section>

          <div className="mos-erp-ops__executive-grid mos-erp-ops__executive-grid--mid">
            <section className="mos-erp-ops__panel" aria-label="En büyük riskler">
              <h2 className="mos-erp-ops__panel-title">EN BÜYÜK RİSKLER</h2>
              <div className="mos-erp-tbl-wrap">
                <table className="mos-erp-tbl mos-erp-tbl--ceo-risks">
                  <thead>
                    <tr>
                      <th>Önem</th>
                      <th>Kategori</th>
                      <th>Başlık</th>
                      <th>Etki</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.topRisks.length === 0 && (
                      <tr className="mos-erp-tbl-empty">
                        <td colSpan={4}>Risk kaydı yok.</td>
                      </tr>
                    )}
                    {view.topRisks.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}${row.severity === 'CRITICAL' ? ' is-critical' : ''}`}
                      >
                        <td>
                          <span className={`mos-erp-tag mos-erp-tag--${severityTone(row.severity)}`}>
                            {row.severity}
                          </span>
                        </td>
                        <td>{row.category}</td>
                        <td className="mos-erp-tbl-td--customer">{row.title}</td>
                        <td className="mos-erp-tbl-td--action">{row.impact}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mos-erp-ops__panel" aria-label="En büyük fırsatlar">
              <h2 className="mos-erp-ops__panel-title">EN BÜYÜK FIRSATLAR</h2>
              <div className="mos-erp-tbl-wrap">
                <table className="mos-erp-tbl mos-erp-tbl--ceo-opportunities">
                  <thead>
                    <tr>
                      <th>Fırsat</th>
                      <th>Etki</th>
                      <th>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.topOpportunities.length === 0 && (
                      <tr className="mos-erp-tbl-empty">
                        <td colSpan={3}>Fırsat kaydı yok.</td>
                      </tr>
                    )}
                    {view.topOpportunities.map((row, idx) => (
                      <tr key={row.id} className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}>
                        <td className="mos-erp-tbl-td--customer">{row.title}</td>
                        <td className="mos-erp-tbl-td--gain">{row.impact}</td>
                        <td className="mos-erp-tbl-td--muted">{row.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="mos-erp-ops__panel mos-erp-ops__panel--money" aria-label="Finans omurgası">
            <h2 className="mos-erp-ops__panel-title">FİNANS OMURGASI</h2>
            <div className="mos-erp-ops__money-grid mos-erp-ops__money-grid--ceo">
              {view.financialBackbone.cards.map((box) => (
                <div key={box.id} className={`mos-erp-ops__money-box is-${box.tone}`}>
                  <span className="mos-erp-ops__money-label">{box.label}</span>
                  <span className="mos-erp-ops__money-value">{box.value}</span>
                  {box.sub ? <span className="mos-erp-ops__money-sub">{box.sub}</span> : null}
                </div>
              ))}
            </div>
          </section>

          <section className="mos-erp-ops__panel mos-erp-ops__panel--money" aria-label="Para özeti">
            <h2 className="mos-erp-ops__panel-title">PARA ÖZETİ</h2>
            <div className="mos-erp-ops__money-grid mos-erp-ops__money-grid--ceo">
              {view.moneySummary.map((box) => (
                <div key={box.id} className={`mos-erp-ops__money-box is-${box.tone}`}>
                  <span className="mos-erp-ops__money-label">{box.label}</span>
                  <span className="mos-erp-ops__money-value">{box.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mos-erp-ops__panel mos-erp-ops__panel--heatmap" aria-label="Departman sağlığı">
            <h2 className="mos-erp-ops__panel-title">DEPARTMAN SAĞLIĞI</h2>
            <div className="mos-erp-tbl-wrap mos-erp-tbl-wrap--heatmap">
              <table className="mos-erp-tbl mos-erp-tbl--executive-heatmap">
                <thead>
                  <tr>
                    <th>Departman</th>
                    <th>Durum</th>
                    <th>Özet</th>
                  </tr>
                </thead>
                <tbody>
                  {view.departmentHealth.map((dept, idx) => (
                    <tr
                      key={dept.id}
                      className={`mos-erp-tbl-row mos-erp-tbl-row--heat ${heatClass(dept.status)}${idx % 2 === 1 ? ' is-zebra' : ''}`}
                    >
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{dept.label}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--heat-status">
                        {dept.status === 'green' ? 'Yeşil' : dept.status === 'orange' ? 'Turuncu' : 'Kırmızı'}
                      </td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{dept.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-ops__panel mos-erp-ops__panel--actions" aria-label="İlk yapılacaklar">
            <h2 className="mos-erp-ops__panel-title">İLK YAPILACAKLAR</h2>
            <div className="mos-erp-tbl-wrap mos-erp-tbl-wrap--actions">
              <table className="mos-erp-tbl mos-erp-tbl--executive-actions">
                <thead>
                  <tr>
                    <th>Öncelik</th>
                    <th>Müşteri</th>
                    <th>Konu</th>
                    <th>Öncelik Etkisi</th>
                    <th>Etki</th>
                    <th>Önerilen Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {view.topActions.length === 0 && (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={6}>Açık aksiyon yok.</td>
                    </tr>
                  )}
                  {view.topActions.map((row, idx) => (
                    <tr key={row.id} className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}>
                      <td
                        className={`mos-erp-tbl-td mos-erp-tbl-td--prio ${row.priority === 'P1' ? 'is-p1' : row.priority === 'P2' ? 'is-p2' : 'is-p3'}`}
                      >
                        <span className="mos-erp-prio-badge">{row.priority}</span>
                      </td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{row.customer}</td>
                      <td className="mos-erp-tbl-td">{row.topic}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--prio-impact">{row.priorityImpact}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--gain">{row.impact}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--action">{row.recommendedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

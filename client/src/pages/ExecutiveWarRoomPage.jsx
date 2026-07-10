import { useCallback, useEffect, useMemo, useState } from 'react'

import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'

import { getActionCenter } from '../services/actionCenterClient.js'

import { getDataQuality } from '../services/dataQualityClient.js'

import { getManagerCockpit } from '../services/managerCockpitClient.js'

import { getOperationCases } from '../services/operationCaseClient.js'

import { getOperationsAgents } from '../services/operationsAgentsClient.js'

import { getProfitabilityAnalytics } from '../services/profitabilityAnalyticsClient.js'

import { getSupplyOperationsBoard } from '../services/supplyOperationsClient.js'

import { getCurrentAuthUser } from '../lib/operationActor.js'

import { useOrders } from '../state/useOrders.js'

import {

  buildExecutiveWarRoomView,

  MONTH_FROM,

  MONTH_TO,

} from '../mappers/executive/executiveWarRoomModel.js'

import '../styles/mos-erp-ops.css'



/**

 * @param {import('../mappers/operationCase/operationCaseWarRoomModel.js').OperationCaseTableRow} row

 */

function casePriorityClass(row) {

  if (row.isClosed) return 'is-closed'

  if (row.priority === 'P1') return 'is-p1'

  if (row.priority === 'P2') return 'is-p2'

  if (row.priority === 'P3') return 'is-p3'

  return 'is-p4'

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

 * @param {'success'|'warning'|'critical'|undefined} tone

 */

function healthToneClass(tone) {

  if (tone === 'critical') return 'is-critical'

  if (tone === 'warning') return 'is-warning'

  return 'is-success'

}



/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function ExecutiveWarRoomPage({ embedded = false }) {

  const { orders, salesOrderListItemDtos } = useOrders()

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

    ])

      .then(([cockpit, profitability, staffProfitability, actionRes, casesRes, agents, dataQuality, supplyBoard]) => {

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

        })

        setLoading(false)

      })

      .catch((err) => {

        if (!alive) return

        setError(err?.message ?? 'Yönetim savaş odası yüklenemedi')

        setLoading(false)

      })



    return () => {

      alive = false

    }

  }, [limitedView])



  useEffect(() => load(), [load])



  const view = useMemo(() => {

    if (!payload) return null

    return buildExecutiveWarRoomView({

      ...payload,

      orders,

      listItemDtos: salesOrderListItemDtos ?? [],

    })

  }, [payload, orders, salesOrderListItemDtos])



  const stripMetrics = useMemo(

    () => view?.kpiMetrics.filter((m) => m.id !== 'ops-health') ?? [],

    [view?.kpiMetrics],

  )



  return (

    <div
      className={
        embedded
          ? 'mos-hub-pane mos-erp-ops mos-erp-ops--executive-war-room'
          : 'mos-page mos-erp-ops mos-erp-ops--executive-war-room'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">Yönetim Savaş Odası</h1>
            <span className="mos-erp-ops__sub">
              Executive War Room · şirket durumu 30 saniyede
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

          <div className="mos-erp-ops__executive-kpi-row" aria-label="Yönetim KPI özeti">

            <ErpOpsSummaryStrip

              metrics={stripMetrics}

              ariaLabel="Yönetim KPI özeti"

              summaryClassName="mos-erp-summary--cols-5 mos-erp-ops__executive-kpis"

            />

            <div

              className={`mos-erp-summary__item mos-erp-ops__health-kpi ${healthToneClass(view.opsHealth.tone)}`}

              role="listitem"

            >

              <span className="mos-erp-summary__label">Operasyon Sağlık Skoru</span>

              <span className="mos-erp-summary__value">{view.opsHealth.score} / 100</span>

              <span className="mos-erp-ops__health-kpi-label">{view.opsHealth.label}</span>

            </div>

          </div>



          <section className="mos-erp-ops__panel mos-erp-ops__panel--briefing-top" aria-label="AI yönetici brifingi">

            <h2 className="mos-erp-ops__panel-title">AI YÖNETİCİ BRİFİNGİ</h2>

            <ul className="mos-erp-ops__briefing-list">

              {view.briefingBullets.map((line) => (

                <li key={line} className="mos-erp-ops__briefing-item">

                  {line}

                </li>

              ))}

            </ul>

          </section>



          <section className="mos-erp-ops__today-focus" aria-label="Bugün odaklan">

            <h2 className="mos-erp-ops__today-focus-title">BUGÜN ODAKLAN</h2>

            <ul className="mos-erp-ops__today-focus-list">

              {view.todayFocusItems.length === 0 ? (

                <li className="mos-erp-ops__today-focus-item">Bugün kritik operasyon uyarısı yok</li>

              ) : (

                view.todayFocusItems.map((item) => (

                  <li key={item.id} className="mos-erp-ops__today-focus-item">

                    <span className="mos-erp-ops__today-focus-icon" aria-hidden>

                      ⚠

                    </span>

                    <span className="mos-erp-ops__today-focus-copy">

                      <span>

                        {item.count} {item.label}

                      </span>

                      {item.impact ? (

                        <span className="mos-erp-ops__today-focus-impact">→ {item.impact}</span>

                      ) : null}

                    </span>

                  </li>

                ))

              )}

            </ul>

          </section>



          <div className="mos-erp-ops__executive-grid">

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

                        <td className={`mos-erp-tbl-td mos-erp-tbl-td--prio ${row.priority === 'P1' ? 'is-p1' : row.priority === 'P2' ? 'is-p2' : 'is-p3'}`}>

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



            <section className="mos-erp-ops__panel mos-erp-ops__panel--money" aria-label="Para nerede">

              <h2 className="mos-erp-ops__panel-title">PARA NEREDE?</h2>

              <div className="mos-erp-ops__money-grid">

                {view.moneyBoxes.map((box) => (

                  <div key={box.id} className={`mos-erp-ops__money-box is-${box.tone}`}>

                    <span className="mos-erp-ops__money-label">{box.label}</span>

                    <span className="mos-erp-ops__money-value">{box.value}</span>

                  </div>

                ))}

              </div>

            </section>

          </div>



          <section className="mos-erp-ops__panel mos-erp-ops__panel--heatmap" aria-label="Departman ısı haritası">

            <h2 className="mos-erp-ops__panel-title">DEPARTMAN ISI HARİTASI</h2>

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

                  {view.departmentHeatmap.map((dept, idx) => (

                    <tr key={dept.id} className={`mos-erp-tbl-row mos-erp-tbl-row--heat ${heatClass(dept.status)}${idx % 2 === 1 ? ' is-zebra' : ''}`}>

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



          <section className="mos-erp-ops__panel" aria-label="Personel performansı">

            <h2 className="mos-erp-ops__panel-title">PERSONEL PERFORMANSI</h2>

            <div className="mos-erp-tbl-wrap mos-erp-tbl-wrap--staff">

              <table className="mos-erp-tbl mos-erp-tbl--executive-staff">

                <thead>

                  <tr>

                    <th>Personel</th>

                    <th className="is-num">Satış</th>

                    <th className="is-num">Tahsilat</th>

                    <th className="is-num">Kâr</th>

                    <th className="is-num">Ortalama Sipariş</th>

                  </tr>

                </thead>

                <tbody>

                  {view.staffRows.map((row, idx) => (

                    <tr key={row.id} className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}>

                      <td className="mos-erp-tbl-td">{row.staff}</td>

                      <td className="mos-erp-tbl-td is-num">{row.sales}</td>

                      <td className="mos-erp-tbl-td is-num">{row.collection}</td>

                      <td className="mos-erp-tbl-td is-num">{row.profit}</td>

                      <td className="mos-erp-tbl-td is-num">{row.avgOrder}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </section>



          <section className="mos-erp-ops__panel" aria-label="Tedarikçi riskleri">

            <h2 className="mos-erp-ops__panel-title">TEDARİKÇİ RİSKLERİ</h2>

            <div className="mos-erp-tbl-wrap mos-erp-tbl-wrap--suppliers">

              <table className="mos-erp-tbl mos-erp-tbl--executive-suppliers">

                <thead>

                  <tr>

                    <th>Tedarikçi</th>

                    <th className="is-num">SSH</th>

                    <th>Gecikme</th>

                    <th>Risk</th>

                  </tr>

                </thead>

                <tbody>

                  {view.supplierRows.map((row, idx) => (

                    <tr key={row.id} className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}>

                      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{row.supplier}</td>

                      <td className="mos-erp-tbl-td is-num">{row.ssh}</td>

                      <td className="mos-erp-tbl-td">{row.delay}</td>

                      <td className={`mos-erp-tbl-td mos-erp-tbl-td--status${row.riskTone === 'critical' ? ' is-critical' : row.riskTone === 'warning' ? ' is-warning' : ' is-success'}`}>

                        {row.risk}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </section>



          <section className="mos-erp-ops__panel mos-erp-ops__panel--cases" aria-label="Son kritik vakalar">

            <h2 className="mos-erp-ops__panel-title">SON 10 KRİTİK VAKA</h2>

            <div className="mos-erp-tbl-wrap mos-erp-tbl-wrap--cases">

              <table className="mos-erp-tbl mos-erp-tbl--cases mos-erp-tbl--executive-cases">

                <thead>

                  <tr>

                    <th>Öncelik</th>

                    <th>Vaka No</th>

                    <th>Müşteri</th>

                    <th>Kategori</th>

                    <th>Risk</th>

                    <th>Durum</th>

                    <th>Sonraki Aksiyon</th>

                  </tr>

                </thead>

                <tbody>

                  {view.criticalCases.map((row, idx) => (

                    <tr key={row.id} className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}>

                      <td className={`mos-erp-tbl-td mos-erp-tbl-td--prio ${casePriorityClass(row)}`}>

                        <span className="mos-erp-prio-badge">{row.priority}</span>

                      </td>

                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.caseNumber}</td>

                      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{row.customer}</td>

                      <td className="mos-erp-tbl-td">{row.category}</td>

                      <td className="mos-erp-tbl-td">{row.risk}</td>

                      <td className={`mos-erp-tbl-td mos-erp-tbl-td--status${row.priority === 'P1' ? ' is-critical' : ''}`}>

                        {row.statusLabel}

                      </td>

                      <td className="mos-erp-tbl-td mos-erp-tbl-td--action">{row.nextAction}</td>

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



import { useEffect, useMemo, useState } from 'react'

import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'

import { getLearningEngine } from '../services/learningEngineClient.js'

import '../styles/mos-erp-ops.css'



function Tag({ tone, children }) {

  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>

}



function trendTone(trend) {

  if (trend === 'UP') return 'positive'

  if (trend === 'DOWN') return 'critical'

  return 'info'

}



export default function LearningEnginePage() {

  const [data, setData] = useState(/** @type {any} */ (null))

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState(/** @type {string | null} */ (null))



  useEffect(() => {

    let alive = true

    setLoading(true)

    getLearningEngine()

      .then((res) => {

        if (!alive) return

        setData(res)

        setLoading(false)

      })

      .catch((err) => {

        if (!alive) return

        setError(err?.message ?? 'Kurumsal Öğrenme Motoru yüklenemedi')

        setLoading(false)

      })

    return () => {

      alive = false

    }

  }, [])



  const metrics = useMemo(() => {

    if (!data) return []

    return [

      {

        id: 'score',

        label: 'Learning Score',

        value: String(data.learningScore),

        valueTone: data.learningScore < 55 ? 'critical' : data.learningScore < 70 ? 'warning' : 'positive',

      },

      {

        id: 'best',

        label: 'Best Strategy',

        value: data.bestStrategy?.strategy ?? '—',

      },

      {

        id: 'bestRate',

        label: 'Best Rate',

        value: data.bestStrategy ? `%${data.bestStrategy.successRate}` : '—',

        valueTone: 'positive',

      },

      {

        id: 'worst',

        label: 'Worst Strategy',

        value: data.worstStrategy?.strategy ?? '—',

      },

      {

        id: 'worstRate',

        label: 'Worst Rate',

        value: data.worstStrategy ? `%${data.worstStrategy.successRate}` : '—',

        valueTone: data.worstStrategy?.successRate < 50 ? 'critical' : 'warning',

      },

    ]

  }, [data])



  if (loading && !data) {

    return (

      <div className="mos-page mos-erp-ops">

        <p className="mos-erp-muted">Kurumsal Öğrenme Motoru yükleniyor…</p>

      </div>

    )

  }



  const strategyTable = data?.strategyTable ?? []

  const agentLearning = data?.agentLearning ?? []

  const trend = data?.decisionTrend

  const lessons = data?.lessonsLearned ?? []

  const recommendations = data?.recommendations ?? []



  return (

    <div className="mos-page mos-erp-ops">

      <header className="mos-erp-ops__head">

        <div className="mos-erp-ops__head-copy">

          <h1 className="mos-erp-ops__title">Kurumsal Öğrenme Motoru</h1>

          <p className="mos-erp-ops__subtitle">

            Karar → Aksiyon → Ölçüm → Öğrenme · {data?.today ?? '—'}

          </p>

        </div>

      </header>



      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}

      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}



      <section className="mos-erp-panel">

        <h2 className="mos-erp-panel__title">Özet</h2>

        <p className="mos-erp-prose">{data?.summary}</p>

      </section>



      <section className="mos-erp-panel">

        <h2 className="mos-erp-panel__title">Strateji Tablosu</h2>

        <table className="mos-erp-tbl mos-erp-tbl--compact">

          <thead>

            <tr>

              <th>Strateji</th>

              <th>Kullanım</th>

              <th>Başarı %</th>

              <th>Etki</th>

              <th>Genel</th>

            </tr>

          </thead>

          <tbody>

            {strategyTable.map((s) => (

              <tr key={s.strategy}>

                <td>{s.strategy}</td>

                <td>{s.usageCount}</td>

                <td>%{s.successRate}</td>

                <td>{s.impactScore}</td>

                <td>{s.overallScore}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </section>



      <section className="mos-erp-panel">

        <h2 className="mos-erp-panel__title">Ajan Öğrenimi</h2>

        <table className="mos-erp-tbl mos-erp-tbl--compact">

          <thead>

            <tr>

              <th>Ajan</th>

              <th>Görev</th>

              <th>Başarı %</th>

              <th>Etki</th>

            </tr>

          </thead>

          <tbody>

            {agentLearning.map((a) => (

              <tr key={a.agent}>

                <td>{a.agent}</td>

                <td>{a.taskCount}</td>

                <td><Tag tone={a.successRate >= 65 ? 'positive' : a.successRate < 50 ? 'critical' : 'warning'}>%{a.successRate}</Tag></td>

                <td>{a.impactScore}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </section>



      {trend ? (

        <section className="mos-erp-panel">

          <h2 className="mos-erp-panel__title">Karar Trendi</h2>

          <table className="mos-erp-tbl mos-erp-tbl--compact">

            <thead>

              <tr>

                <th>Pencere</th>

                <th>Skor</th>

                <th>Trend</th>

              </tr>

            </thead>

            <tbody>

              <tr>

                <td>30 Gün</td>

                <td>{trend.days30.score}</td>

                <td><Tag tone={trendTone(trend.days30.trend)}>{trend.days30.trend}</Tag></td>

              </tr>

              <tr>

                <td>90 Gün</td>

                <td>{trend.days90.score}</td>

                <td><Tag tone={trendTone(trend.days90.trend)}>{trend.days90.trend}</Tag></td>

              </tr>

              <tr>

                <td>180 Gün</td>

                <td>{trend.days180.score}</td>

                <td><Tag tone={trendTone(trend.days180.trend)}>{trend.days180.trend}</Tag></td>

              </tr>

            </tbody>

          </table>

        </section>

      ) : null}



      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">

        <section className="mos-erp-panel">

          <h2 className="mos-erp-panel__title">Öğrenilen Dersler</h2>

          <table className="mos-erp-tbl mos-erp-tbl--compact">

            <thead>

              <tr>

                <th>Kategori</th>

                <th>Ders</th>

                <th>Güven</th>

              </tr>

            </thead>

            <tbody>

              {lessons.map((l) => (

                <tr key={l.id}>

                  <td>{l.category}</td>

                  <td>{l.lesson}</td>

                  <td>%{l.confidence}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </section>



        <section className="mos-erp-panel">

          <h2 className="mos-erp-panel__title">Öneriler</h2>

          <table className="mos-erp-tbl mos-erp-tbl--compact">

            <thead>

              <tr>

                <th>Öncelik</th>

                <th>Başlık</th>

                <th>Gerekçe</th>

              </tr>

            </thead>

            <tbody>

              {recommendations.map((r) => (

                <tr key={r.id}>

                  <td><Tag tone={r.priority === 'P1' ? 'critical' : r.priority === 'P2' ? 'warning' : 'info'}>{r.priority}</Tag></td>

                  <td>{r.title}</td>

                  <td>{r.rationale}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </section>

      </div>

    </div>

  )

}



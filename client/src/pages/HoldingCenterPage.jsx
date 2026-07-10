import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { formatTry } from '../data/dashboardHelpers.js'
import { getHoldingCenter } from '../services/holdingCenterClient.js'
import '../styles/mos-erp-ops.css'

const DECISION_TONE = {
  INVEST: 'positive',
  GROW: 'positive',
  MAINTAIN: 'warning',
  REDUCE: 'critical',
  EXIT: 'critical',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

function formatRevenue(tl) {
  if (tl == null) return '—'
  return formatTry(tl)
}

export default function HoldingCenterPage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getHoldingCenter()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Holding Yönetim Merkezi yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const metrics = useMemo(() => {
    if (!data?.summary) return []
    const s = data.summary
    return [
      {
        id: 'score',
        label: 'Holding Skoru',
        value: String(s.holdingScore),
        valueTone: s.holdingScore < 55 ? 'critical' : s.holdingScore < 70 ? 'warning' : 'positive',
      },
      { id: 'band', label: 'Bant', value: s.holdingScoreBand },
      { id: 'decision', label: 'Holding Kararı', value: s.holdingDecision },
      { id: 'best', label: 'En İyi Şirket', value: s.bestCompany },
      { id: 'worst', label: 'En Zayıf Şirket', value: s.worstCompany },
      { id: 'count', label: 'Şirket Sayısı', value: String(s.companyCount) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Holding Yönetim Merkezi yükleniyor…</p>
      </div>
    )
  }

  const companies = data?.companies ?? []
  const allocation = data?.capitalAllocation ?? []
  const opportunities = data?.holdingOpportunities ?? []
  const risks = data?.holdingRisks ?? []
  const briefing = data?.holdingBriefing ?? []
  const vision = data?.fiveYearVision ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Holding Yönetim Merkezi</h1>
          <p className="mos-erp-ops__subtitle">
            Portföy sentezi · Sermaye tahsisi · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Holding Kararı</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Metrik</th>
              <th>Değer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Holding Skoru</td>
              <td>
                <strong>{data?.holdingScore ?? '—'}</strong> ({data?.summary?.holdingScoreBand ?? '—'})
              </td>
            </tr>
            <tr>
              <td>Holding Kararı</td>
              <td>
                <Tag tone={DECISION_TONE[data?.holdingDecision]}>{data?.holdingDecision ?? '—'}</Tag>
              </td>
            </tr>
            <tr>
              <td>En İyi Şirket</td>
              <td>{data?.bestCompany ?? '—'}</td>
            </tr>
            <tr>
              <td>En Zayıf Şirket</td>
              <td>{data?.worstCompany ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Grup Şirketleri</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Şirket</th>
              <th>Sektör</th>
              <th>Skor</th>
              <th>Sağlık</th>
              <th>Risk</th>
              <th>Büyüme</th>
              <th>Kârlılık</th>
              <th>Ciro</th>
              <th>Yatırım Sırası</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.sector}</td>
                <td>{c.companyScore}</td>
                <td>{c.companyHealth}</td>
                <td>{c.riskScore}</td>
                <td>{c.growthScore}</td>
                <td>{c.profitabilityScore}</td>
                <td>{formatRevenue(c.revenueTl)}</td>
                <td>#{c.investmentRank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Sermaye Tahsisi</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Şirket</th>
              <th>Pay (%)</th>
            </tr>
          </thead>
          <tbody>
            {allocation.map((a) => (
              <tr key={a.companyId}>
                <td>{a.companyName}</td>
                <td>%{a.percentage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Sıralamalar</h2>
        <div className="mos-erp-panel__grid">
          {[
            { title: 'Büyüme', items: data?.growthRanking ?? [] },
            { title: 'Risk', items: data?.riskRanking ?? [] },
            { title: 'Kârlılık', items: data?.profitabilityRanking ?? [] },
            { title: 'Yatırım', items: data?.investmentRanking ?? [] },
          ].map((block) => (
            <div key={block.title} className="mos-erp-panel__section">
              <h3 className="mos-erp-panel__subtitle">{block.title} Sıralaması</h3>
              <table className="mos-erp-tbl mos-erp-tbl--compact">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Şirket</th>
                    <th>Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {block.items.map((r) => (
                    <tr key={`${block.title}-${r.companyId}`}>
                      <td>{r.rank}</td>
                      <td>{r.companyName}</td>
                      <td>{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Holding Riskleri ({risks.length})</h2>
        <ol className="mos-erp-panel__body">
          {risks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Holding Fırsatları ({opportunities.length})</h2>
        <ol className="mos-erp-panel__body">
          {opportunities.map((o, i) => (
            <li key={i}>{o}</li>
          ))}
        </ol>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Holding Brifingi</h2>
        {briefing.map((p, i) => (
          <p key={i} className="mos-erp-panel__body">
            {p}
          </p>
        ))}
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Beş Yıllık Vizyon ({vision.length})</h2>
        <ol className="mos-erp-panel__body">
          {vision.map((v, i) => (
            <li key={i}>{v}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}

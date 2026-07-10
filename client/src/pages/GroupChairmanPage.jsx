import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getGroupChairman } from '../services/groupChairmanClient.js'
import '../styles/mos-erp-ops.css'

const DECISION_TONE = {
  AGGRESSIVE_GROWTH: 'positive',
  CONTROLLED_GROWTH: 'positive',
  MAINTAIN: 'warning',
  RESTRUCTURE: 'warning',
  DEFENSIVE: 'critical',
  CRISIS: 'critical',
  INVEST: 'positive',
  GROW: 'positive',
  REDUCE: 'critical',
  EXIT: 'critical',
}

const COMPANY_DECISION_TONE = {
  INVEST: 'positive',
  GROW: 'positive',
  MAINTAIN: 'warning',
  REDUCE: 'critical',
  EXIT: 'critical',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function GroupChairmanPage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getGroupChairman()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Otonom Holding Başkanı yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const metrics = useMemo(() => {
    if (!data?.summary) return []
    const s = data.summary
    const a = data.alignmentAnalysis
    return [
      {
        id: 'score',
        label: 'Grup Başkanı Skoru',
        value: String(s.groupChairmanScore),
        valueTone: s.groupChairmanScore < 55 ? 'critical' : s.groupChairmanScore < 70 ? 'warning' : 'positive',
      },
      { id: 'band', label: 'Bant', value: s.groupChairmanScoreBand },
      { id: 'health', label: 'Grup Sağlığı', value: String(s.groupHealth) },
      { id: 'decision', label: 'Grup Kararı', value: s.groupDecision },
      { id: 'capital', label: 'Sermaye Stratejisi', value: s.capitalStrategy },
      { id: 'align', label: 'Genel Uyum', value: a ? `%${a.overallAlignment}` : '—' },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Otonom Holding Başkanı yükleniyor…</p>
      </div>
    )
  }

  const decisions = data?.companyDecisions ?? []
  const allocation = data?.recommendedCapitalAllocation ?? []
  const threats = data?.groupThreats ?? []
  const opportunities = data?.groupOpportunities ?? []
  const actions = data?.strategicActions ?? []
  const briefing = data?.chairmanBriefing ?? []
  const alignment = data?.alignmentAnalysis

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Holding Başkanı</h1>
          <p className="mos-erp-ops__subtitle">
            Grup stratejik karar · Sermaye yönetimi · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Ana Karar</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Metrik</th>
              <th>Değer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Grup Kararı</td>
              <td>
                <Tag tone={DECISION_TONE[data?.groupDecision] ?? 'info'}>{data?.groupDecision ?? '—'}</Tag>
              </td>
            </tr>
            <tr>
              <td>Sermaye Stratejisi</td>
              <td>{data?.capitalStrategy ?? '—'}</td>
            </tr>
            <tr>
              <td>Grup Sağlığı</td>
              <td>{data?.groupHealth ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Şirket Kararları</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Şirket</th>
              <th>Karar</th>
              <th>Gerekçe</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
              <tr key={d.companyId}>
                <td>{d.companyName}</td>
                <td>
                  <Tag tone={COMPANY_DECISION_TONE[d.decision] ?? 'info'}>{d.decision}</Tag>
                </td>
                <td>{d.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Sermaye Dağılımı</h2>
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

      {alignment ? (
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Uyum Analizi</h2>
          <table className="mos-erp-tbl mos-erp-tbl--compact">
            <thead>
              <tr>
                <th>Katman</th>
                <th>Uyum (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>CEO</td><td>%{alignment.ceoAlignment}</td></tr>
              <tr><td>Başkan</td><td>%{alignment.chairmanAlignment}</td></tr>
              <tr><td>Yatırımcı</td><td>%{alignment.investorAlignment}</td></tr>
              <tr><td>Holding</td><td>%{alignment.holdingAlignment}</td></tr>
              <tr><td><strong>Genel</strong></td><td><strong>%{alignment.overallAlignment}</strong></td></tr>
            </tbody>
          </table>
          <p className="mos-erp-muted" style={{ marginTop: '0.75rem' }}>{alignment.summary}</p>
        </section>
      ) : null}

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">1 Yıllık Plan</h2>
          <ol className="mos-erp-list">
            {(data?.oneYearPlan ?? []).map((item, i) => (
              <li key={`1y-${i}`}>{item}</li>
            ))}
          </ol>
        </section>
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">3 Yıllık Plan</h2>
          <ol className="mos-erp-list">
            {(data?.threeYearPlan ?? []).map((item, i) => (
              <li key={`3y-${i}`}>{item}</li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">5 Yıllık Plan</h2>
        <ol className="mos-erp-list">
          {(data?.fiveYearPlan ?? []).map((item, i) => (
            <li key={`5y-${i}`}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="mos-erp-ops__grid mos-erp-ops__grid--2">
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Holding Fırsatları</h2>
          <ul className="mos-erp-list">
            {opportunities.map((o, i) => (
              <li key={`opp-${i}`}>{o}</li>
            ))}
          </ul>
        </section>
        <section className="mos-erp-panel">
          <h2 className="mos-erp-panel__title">Holding Tehditleri</h2>
          <ul className="mos-erp-list">
            {threats.map((t, i) => (
              <li key={`thr-${i}`}>{t}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Stratejik Aksiyonlar</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Öncelik</th>
              <th>Aksiyon</th>
              <th>Ufuk</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.priority}>
                <td>{a.priority}</td>
                <td>{a.action}</td>
                <td>{a.horizon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Holding Başkanı Brifingi</h2>
        {briefing.map((p, i) => (
          <p key={`brief-${i}`} className="mos-erp-prose" style={{ marginBottom: '1rem' }}>
            {p}
          </p>
        ))}
      </section>
    </div>
  )
}

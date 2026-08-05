import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getBoardDirectors } from '../services/boardDirectorsClient.js'
import '../styles/mos-erp-ops.css'

const SEVERITY_TONE = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' }

const BOARD_HEADLINE = {
  OPEN_NEW_STORE: 'Yeni mağaza açılışı onaylansın; sevk kapasitesi planı hazırlansın.',
  DELAY_NEW_STORE: 'Yeni mağaza açılışı 90 gün ertelensin.',
  FOCUS_COLLECTION: 'Tahsilat performansı önceliklendirilsin; riskli alacaklar yönetilsin.',
  FOCUS_OPERATIONS: 'Operasyon disiplini güçlendirilsin; sevk ve eksik kalem önceliklendirilsin.',
  FOCUS_PROFITABILITY: 'Kârlılık ve tedarikçi maliyet yapısı optimize edilsin.',
  FOCUS_RISK_REDUCTION: 'Risk azaltma programı başlatılsın; kritik vakalar kapatılsın.',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function BoardDirectorsPage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getBoardDirectors()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Yönetim Kurulu raporu yüklenemedi')
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
        label: 'Kurul Skoru',
        value: String(s.boardScore),
        valueTone: s.boardScore < 55 ? 'critical' : s.boardScore < 70 ? 'warning' : 'positive',
      },
      { id: 'band', label: 'Bant', value: s.boardScoreBand },
      { id: 'health', label: 'Şirket Sağlığı', value: String(s.companyHealthScore) },
      { id: 'decision', label: 'Karar', value: s.boardDecision },
      { id: 'directors', label: 'Direktör', value: String(s.directorCount) },
      { id: 'month', label: 'Dönem', value: s.analysisMonth },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Otonom Yönetim Kurulu yükleniyor…</p>
      </div>
    )
  }

  const headline = BOARD_HEADLINE[data?.boardDecision] ?? data?.boardReason ?? '—'
  const directors = data?.directors ?? []
  const risks = data?.topRisks ?? []
  const opportunities = data?.topOpportunities ?? []
  const actions = data?.whatBoardWouldDoToday ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Yönetim Kurulu</h1>
          <p className="mos-erp-ops__subtitle">
            6 direktör oylaması — deterministik kurul kararı · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yönetim Kurulu Skoru</h2>
        <p className="mos-erp-panel__body">
          Kurul skoru: <strong>{data?.boardScore ?? '—'}</strong> ({data?.summary?.boardScoreBand ?? '—'})
          {' · '}
          Şirket sağlığı: {data?.summary?.companyHealthScore ?? '—'}
        </p>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Direktör Oyları</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Direktör</th>
              <th>Karar</th>
              <th>Güven</th>
              <th>Gerekçe</th>
            </tr>
          </thead>
          <tbody>
            {directors.map((d) => (
              <tr key={d.code}>
                <td>{d.label}</td>
                <td>{d.voteLabel}</td>
                <td>%{d.confidence}</td>
                <td>{d.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yönetim Kurulu Kararı</h2>
        <p className="mos-erp-ops__decision-headline">{headline}</p>
        <p className="mos-erp-muted mos-erp-panel__hint">{data?.boardReason}</p>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">En Büyük Riskler</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Risk</th>
              <th>Önem</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>
                  <Tag tone={SEVERITY_TONE[r.severity]}>{r.severity}</Tag>
                </td>
                <td>{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">En Büyük Fırsatlar</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Fırsat</th>
              <th>Etki</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => (
              <tr key={o.id}>
                <td>{o.title}</td>
                <td>{o.impact}</td>
                <td>{o.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Bugün Yönetim Kurulu Ne Yapardı?</h2>
        <ol className="mos-erp-panel__body">
          {actions.map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ol>
      </section>
    </div>
  )
}

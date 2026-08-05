import { useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getChairmanIntelligence } from '../services/chairmanClient.js'
import '../styles/mos-erp-ops.css'

const SEVERITY_TONE = { CRITICAL: 'critical', WARNING: 'warning', INFO: 'info' }
const ALIGNMENT_TONE = { ALIGNED: 'positive', PARTIAL: 'warning', MISALIGNED: 'critical' }

const CHAIRMAN_HEADLINE = {
  MAINTAIN_DIRECTION: 'Mevcut stratejik yön korunsun; çeyreklik performans izlensin.',
  FOCUS_GROWTH: 'Önümüzdeki yıl kontrollü büyüme stratejisi uygulansın.',
  FOCUS_PROFITABILITY: 'Kârlılık ve maliyet yapısı uzun vadeli öncelik olsun.',
  FOCUS_COLLECTION: 'Şirket önceliği tahsilat ve nakit disiplini olsun.',
  FOCUS_DIGITALIZATION: 'Dijital operasyon ve veri altyapısı yatırımı hızlandırılsın.',
  FOCUS_EXPANSION: 'Bölgesel genişleme için hazırlık başlasın.',
  PREPARE_NEW_BRANCH: 'Yeni şube fizibilitesi ve yatırım planı hazırlansın.',
  STABILIZE_FIRST: 'Büyümeden önce stabilizasyon; risk ve tahsilat önceliklendirilsin.',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

export default function ChairmanIntelligencePage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let alive = true
    setLoading(true)
    getChairmanIntelligence()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Başkan raporu yüklenemedi')
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
        label: 'Başkan Skoru',
        value: String(s.chairmanScore),
        valueTone: s.chairmanScore < 55 ? 'critical' : s.chairmanScore < 70 ? 'warning' : 'positive',
      },
      { id: 'band', label: 'Bant', value: s.chairmanScoreBand },
      { id: 'ceo', label: 'CEO Skoru', value: String(s.ceoScore) },
      { id: 'board', label: 'Kurul Skoru', value: String(s.boardScore) },
      { id: 'decision', label: 'Karar', value: s.chairmanDecision },
      { id: 'health', label: 'Sağlık', value: String(s.companyHealthScore) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Otonom Şirket Başkanı yükleniyor…</p>
      </div>
    )
  }

  const headline = CHAIRMAN_HEADLINE[data?.chairmanDecision] ?? data?.chairmanDecision ?? '—'
  const reasons = data?.chairmanReason ?? []
  const threats = data?.topThreats ?? []
  const opportunities = data?.topOpportunities ?? []
  const oneYear = data?.oneYearPlan ?? []
  const threeYear = data?.threeYearPlan ?? []
  const fiveYear = data?.fiveYearVision ?? []
  const boardAlign = data?.boardAlignment
  const ceoAlign = data?.ceoAlignment

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Şirket Başkanı</h1>
          <p className="mos-erp-ops__subtitle">
            CEO ve Kurul denetimi — 1/3/5 yıl vizyonu · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Başkan Skoru</h2>
        <p className="mos-erp-panel__body">
          Başkan skoru: <strong>{data?.chairmanScore ?? '—'}</strong> ({data?.summary?.chairmanScoreBand ?? '—'})
          {' · '}
          CEO: {data?.summary?.ceoScore ?? '—'} · Kurul: {data?.summary?.boardScore ?? '—'}
        </p>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Başkan Kararı</h2>
        <p className="mos-erp-ops__decision-headline">{headline}</p>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Başkan Gerekçesi</h2>
        <ol className="mos-erp-panel__body">
          {reasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ol>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">1 Yıllık Plan</h2>
        <ul className="mos-erp-panel__body">
          {oneYear.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">3 Yıllık Plan</h2>
        <ul className="mos-erp-panel__body">
          {threeYear.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">5 Yıllık Vizyon</h2>
        <ul className="mos-erp-panel__body">
          {fiveYear.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">En Büyük Tehditler</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Tehdit</th>
              <th>Önem</th>
              <th>Ufuk</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {threats.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>
                  <Tag tone={SEVERITY_TONE[t.severity]}>{t.severity}</Tag>
                </td>
                <td>{t.horizon}</td>
                <td>{t.description}</td>
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
              <th>Ufuk</th>
              <th>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => (
              <tr key={o.id}>
                <td>{o.title}</td>
                <td>{o.impact}</td>
                <td>{o.horizon}</td>
                <td>{o.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">CEO ve Yönetim Kurulu Uyum Analizi</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Analiz</th>
              <th>Skor</th>
              <th>Durum</th>
              <th>Özet</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>CEO ↔ Kurul</td>
              <td>{boardAlign?.score ?? '—'}</td>
              <td>
                <Tag tone={ALIGNMENT_TONE[boardAlign?.status]}>{boardAlign?.status ?? '—'}</Tag>
              </td>
              <td>{boardAlign?.summary ?? '—'}</td>
            </tr>
            <tr>
              <td>Başkan ↔ CEO</td>
              <td>{ceoAlign?.score ?? '—'}</td>
              <td>
                <Tag tone={ALIGNMENT_TONE[ceoAlign?.status]}>{ceoAlign?.status ?? '—'}</Tag>
              </td>
              <td>{ceoAlign?.summary ?? '—'}</td>
            </tr>
          </tbody>
        </table>
        {boardAlign?.details?.length ? (
          <ul className="mos-erp-panel__body mos-erp-muted">
            {boardAlign.details.map((d, i) => (
              <li key={`b-${i}`}>{d}</li>
            ))}
          </ul>
        ) : null}
        {ceoAlign?.details?.length ? (
          <ul className="mos-erp-panel__body mos-erp-muted">
            {ceoAlign.details.map((d, i) => (
              <li key={`c-${i}`}>{d}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

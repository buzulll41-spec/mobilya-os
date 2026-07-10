import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getEnterpriseCommandCenter } from '../services/enterpriseCommandCenterClient.js'
import '../styles/mos-erp-ops.css'

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

function severityTone(severity) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'critical'
  if (severity === 'WARNING' || severity === 'MEDIUM') return 'warning'
  return 'info'
}

function priorityTone(priority) {
  if (priority === 'P1') return 'critical'
  if (priority === 'P2') return 'warning'
  return 'info'
}

export default function EnterpriseCommandCenterPage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const load = useCallback(() => {
    setLoading(true)
    return getEnterpriseCommandCenter()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'Kurumsal Kumanda Merkezi yüklenemedi')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const metrics = useMemo(() => {
    if (!data) return []
    return [
      {
        id: 'health',
        label: 'Şirket Sağlığı',
        value: String(data.companyHealthScore),
        valueTone: data.companyHealthScore < 55 ? 'critical' : data.companyHealthScore < 70 ? 'warning' : 'positive',
      },
      { id: 'decision', label: 'Komuta Kararı', value: data.commandDecision },
      { id: 'goals', label: 'Hedef', value: `${data.goalStatus?.achieved ?? 0}/${data.goalStatus?.total ?? 0}` },
      { id: 'risks', label: 'Kritik Risk', value: String(data.criticalRisks?.length ?? 0) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Kurumsal Kumanda Merkezi yükleniyor…</p>
      </div>
    )
  }

  const actions = data?.todayActions ?? []
  const risks = data?.criticalRisks ?? []
  const opportunities = data?.opportunities ?? []
  const briefing = data?.managementBriefing ?? []
  const learning = data?.learningSummary ?? { topSuccessful: [], bottomFailed: [] }
  const optimization = data?.optimizationSummary ?? {}
  const operations = data?.operationsSummary ?? {}

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Kurumsal Kumanda Merkezi</h1>
          <p className="mos-erp-ops__subtitle">
            Faz 1–29 Sentez · {data?.today ?? '—'}
          </p>
        </div>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Bugünkü Aksiyonlar</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Öncelik</th>
              <th>Kaynak</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td><Tag tone={priorityTone(a.priority)}>{a.priority}</Tag></td>
                <td>{a.source}</td>
                <td>{a.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Kritik Riskler</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Şiddet</th>
              <th>Kaynak</th>
              <th>Başlık</th>
              <th>Öneri</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id}>
                <td><Tag tone={severityTone(r.severity)}>{r.severity}</Tag></td>
                <td>{r.source}</td>
                <td>{r.title}</td>
                <td>{r.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Fırsatlar</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Kaynak</th>
              <th>Başlık</th>
              <th>Etki</th>
              <th>Öneri</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o) => (
              <tr key={o.id}>
                <td>{o.source}</td>
                <td>{o.title}</td>
                <td>{o.impact}</td>
                <td>{o.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Operasyon Özeti</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Açık Vaka</th>
              <th>Kritik Vaka</th>
              <th>Bekleyen Görev</th>
              <th>Otomasyon Kuyruğu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{operations.openCases ?? 0}</td>
              <td>{operations.criticalCases ?? 0}</td>
              <td>{operations.pendingTasks ?? 0}</td>
              <td>{operations.automationQueue ?? 0}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Hedef Durumu</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Toplam</th>
              <th>Riskte</th>
              <th>Başarılan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data?.goalStatus?.total ?? 0}</td>
              <td>{data?.goalStatus?.atRisk ?? 0}</td>
              <td>{data?.goalStatus?.achieved ?? 0}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Öğrenme Özeti</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Tür</th>
              <th>Strateji</th>
              <th>Başarı %</th>
              <th>Etki</th>
            </tr>
          </thead>
          <tbody>
            {learning.topSuccessful?.map((s) => (
              <tr key={`top-${s.strategy}`}>
                <td><Tag tone="positive">Başarılı</Tag></td>
                <td>{s.strategy}</td>
                <td>%{s.successRate}</td>
                <td>{s.impactScore}</td>
              </tr>
            ))}
            {learning.bottomFailed?.map((s) => (
              <tr key={`bot-${s.strategy}`}>
                <td><Tag tone="critical">Zayıf</Tag></td>
                <td>{s.strategy}</td>
                <td>%{s.successRate}</td>
                <td>{s.impactScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Optimizasyon Özeti</h2>
        <table className="mos-erp-tbl mos-erp-tbl--compact">
          <thead>
            <tr>
              <th>Strateji Değişikliği</th>
              <th>Ajan Değişikliği</th>
              <th>Öncelikli Strateji</th>
              <th>Öncelikli Ajan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{optimization.strategyChanges ?? 0}</td>
              <td>{optimization.agentChanges ?? 0}</td>
              <td>{optimization.topStrategyChange ?? '—'}</td>
              <td>{optimization.topAgentChange ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yönetim Brifingi</h2>
        <ul className="mos-erp-briefing-list">
          {briefing.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

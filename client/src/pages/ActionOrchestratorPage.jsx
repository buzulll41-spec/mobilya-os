import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getActionOrchestrator, runActionOrchestrator } from '../services/actionOrchestratorClient.js'
import '../styles/mos-erp-ops.css'

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

function AffectedTable({ title, items }) {
  if (!items?.length) return null
  return (
    <section className="mos-erp-panel">
      <h2 className="mos-erp-panel__title">{title}</h2>
      <table className="mos-erp-tbl mos-erp-tbl--compact">
        <thead>
          <tr>
            <th>Ad</th>
            <th>Kategori</th>
            <th>Eski</th>
            <th>Yeni</th>
            <th>Boost</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>{item.originalPriority}</td>
              <td>
                <Tag tone={item.boostedPriority === 'P1' ? 'critical' : 'warning'}>
                  {item.boostedPriority}
                </Tag>
              </td>
              <td>+{item.boost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export default function ActionOrchestratorPage() {
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const load = useCallback(() => {
    setLoading(true)
    return getActionOrchestrator()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'Aksiyon Orkestratörü yüklenemedi')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRun = () => {
    setRunning(true)
    setError(null)
    runActionOrchestrator()
      .then((res) => {
        setData(res)
        setRunning(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'Orkestrasyon çalıştırılamadı')
        setRunning(false)
      })
  }

  const metrics = useMemo(() => {
    if (!data) return []
    return [
      {
        id: 'score',
        label: 'Orchestrator Score',
        value: String(data.orchestratorScore),
        valueTone: data.orchestratorScore < 55 ? 'critical' : data.orchestratorScore < 70 ? 'warning' : 'positive',
      },
      { id: 'strategy', label: 'Aktif Strateji', value: data.activeStrategy },
      { id: 'brain', label: 'Brain Score', value: String(data.brainScore) },
      { id: 'status', label: 'Durum', value: data.runStatus },
      { id: 'tasks', label: 'Etkilenen Görev', value: String(data.affectedTasks?.length ?? 0) },
      { id: 'agents', label: 'Etkilenen Ajan', value: String(data.affectedAgents?.length ?? 0) },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Aksiyon Orkestratörü yükleniyor…</p>
      </div>
    )
  }

  const overrides = data?.priorityOverrides ?? []
  const plan = data?.executionPlan ?? []

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Aksiyon Orkestratörü</h1>
          <p className="mos-erp-ops__subtitle">
            Karar → Görev → Vaka → Otomasyon · {data?.today ?? '—'}
          </p>
        </div>
        <button
          type="button"
          className="mos-erp-btn mos-erp-btn--primary"
          disabled={running}
          onClick={handleRun}
        >
          {running ? 'Çalışıyor…' : 'Orkestrasyonu Çalıştır'}
        </button>
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Priority Overrides</h2>
        <table className="mos-erp-tbl">
          <thead>
            <tr>
              <th>Hedef</th>
              <th>Tür</th>
              <th>Boost</th>
              <th>Gerekçe</th>
            </tr>
          </thead>
          <tbody>
            {overrides.map((o) => (
              <tr key={`${o.targetType}-${o.target}`}>
                <td>{o.target}</td>
                <td>{o.targetType}</td>
                <td>+{o.boost}</td>
                <td>{o.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Execution Plan</h2>
        <ol className="mos-erp-list">
          {plan.map((step, i) => (
            <li key={`plan-${i}`}>{step}</li>
          ))}
        </ol>
      </section>

      <AffectedTable title="Görev Etkileri" items={data?.affectedTasks} />
      <AffectedTable title="Vaka Etkileri" items={data?.affectedCases} />
      <AffectedTable title="Job Etkileri" items={data?.affectedJobs} />
      <AffectedTable title="Ajan Etkileri" items={data?.affectedAgents} />
    </div>
  )
}

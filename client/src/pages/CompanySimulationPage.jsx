import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { getCompanySimulation, runCompanySimulation } from '../services/companySimulationClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import { USER_ROLE } from '../contracts/v1/user.js'
import { parseCurrencyInput } from '../lib/formatCurrencyInput.js'
import MosCurrencyInput from '../components/MosCurrencyInput.jsx'
import '../styles/mos-erp-ops.css'

function canRunSimulation(role) {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER
}

function ComparisonRow({ label, before, after, tone }) {
  const delta = after - before
  const deltaLabel = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)
  const deltaTone = delta > 0 ? 'positive' : delta < 0 ? 'critical' : 'neutral'
  return (
    <tr>
      <td>{label}</td>
      <td>{typeof before === 'number' ? before.toFixed(1) : before}</td>
      <td>{typeof after === 'number' ? after.toFixed(1) : after}</td>
      <td>
        <span className={`mos-erp-tag mos-erp-tag--${tone ?? deltaTone}`}>{deltaLabel}</span>
      </td>
    </tr>
  )
}

function ScenarioTable({ scenario }) {
  if (!scenario) return null
  const b = scenario.before
  const a = scenario.after
  return (
    <table className="mos-erp-tbl mos-erp-tbl--compact">
      <thead>
        <tr>
          <th>Metrik</th>
          <th>Önce</th>
          <th>Sonra</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>
        <ComparisonRow label="Health Score" before={b.companyHealthScore} after={a.companyHealthScore} />
        <ComparisonRow label="Risk" before={b.riskScore} after={a.riskScore} tone={a.riskScore < b.riskScore ? 'positive' : 'critical'} />
        <ComparisonRow label="Ciro" before={b.revenue} after={a.revenue} />
        <ComparisonRow label="Kâr" before={b.profit} after={a.profit} />
        <ComparisonRow label="Açık Bakiye" before={b.openBalance} after={a.openBalance} />
        <ComparisonRow label="Riskli Alacak" before={b.riskyReceivable} after={a.riskyReceivable} />
      </tbody>
    </table>
  )
}

export default function CompanySimulationPage() {
  const user = getCurrentAuthUser()
  const runAllowed = canRunSimulation(user?.role)

  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const [collectionChangePercent, setCollectionChangePercent] = useState(-20)
  const [newStoreRevenue, setNewStoreRevenue] = useState('1500000')
  const [additionalSalesStaff, setAdditionalSalesStaff] = useState(2)
  const [additionalVehicles, setAdditionalVehicles] = useState(1)
  const [externalSupplyIncreasePercent, setExternalSupplyIncreasePercent] = useState(50)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return getCompanySimulation()
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message ?? 'Simülasyon yüklenemedi')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let alive = true
    load().then(() => {
      if (!alive) return
    })
    return () => {
      alive = false
    }
  }, [load])

  const handleRun = async () => {
    if (!runAllowed) return
    setRunning(true)
    setError(null)
    try {
      const res = await runCompanySimulation({
        collectionChangePercent,
        newStoreRevenue: parseCurrencyInput(newStoreRevenue),
        additionalSalesStaff,
        additionalVehicles,
        externalSupplyIncreasePercent,
      })
      setData(res)
    } catch (err) {
      setError(err?.message ?? 'Simülasyon çalıştırılamadı')
    } finally {
      setRunning(false)
    }
  }

  const metrics = useMemo(() => {
    if (!data?.summary) return []
    const s = data.summary
    return [
      { id: 'baseline', label: 'Baseline Sağlık', value: String(s.baselineHealthScore) },
      { id: 'best', label: 'Best Case', value: String(s.bestCaseHealthAfter), valueTone: 'positive' },
      { id: 'worst', label: 'Worst Case', value: String(s.worstCaseHealthAfter), valueTone: 'critical' },
      { id: 'scenarios', label: 'Senaryo', value: String(s.scenarioCount) },
      { id: 'run', label: 'Son Çalıştırma', value: s.lastRunAt ? new Date(s.lastRunAt).toLocaleString('tr-TR') : '—' },
      { id: 'virtual', label: 'Mod', value: 'Sanal' },
    ]
  }, [data])

  if (loading && !data) {
    return (
      <div className="mos-page mos-erp-ops">
        <p className="mos-erp-muted">Otonom Şirket Simülasyonu yükleniyor…</p>
      </div>
    )
  }

  const scenarios = data?.scenarios ?? []
  const bestCase = data?.bestCase
  const worstCase = data?.worstCase

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Otonom Şirket Simülasyonu</h1>
          <p className="mos-erp-ops__subtitle">
            Dijital Şirket İkizi — gerçek veri değiştirilmez · {data?.today ?? '—'}
          </p>
        </div>
        {runAllowed ? (
          <button
            type="button"
            className="mos-erp-btn mos-erp-btn--primary"
            onClick={handleRun}
            disabled={running}
          >
            {running ? 'Simülasyon çalışıyor…' : 'Simülasyonu Çalıştır'}
          </button>
        ) : null}
      </header>

      {error ? <div className="mos-erp-banner mos-erp-banner--error">{error}</div> : null}
      {metrics.length > 0 ? <ErpOpsSummaryStrip metrics={metrics} /> : null}

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Senaryo Oluştur</h2>
        <div className="mos-erp-form-grid">
          <label className="mos-erp-field">
            <span className="mos-erp-field__label">Tahsilat değişimi (%)</span>
            <input
              type="number"
              className="mos-erp-input"
              value={collectionChangePercent}
              onChange={(e) => setCollectionChangePercent(Number(e.target.value))}
            />
          </label>
          <label className="mos-erp-field">
            <span className="mos-erp-field__label">Yeni mağaza ciro (₺)</span>
            <MosCurrencyInput
              className="mos-erp-input"
              value={newStoreRevenue}
              onChange={setNewStoreRevenue}
              integerOnly
            />
          </label>
          <label className="mos-erp-field">
            <span className="mos-erp-field__label">Yeni satış personeli</span>
            <input
              type="number"
              className="mos-erp-input"
              min={0}
              value={additionalSalesStaff}
              onChange={(e) => setAdditionalSalesStaff(Number(e.target.value))}
            />
          </label>
          <label className="mos-erp-field">
            <span className="mos-erp-field__label">Yeni sevk aracı</span>
            <input
              type="number"
              className="mos-erp-input"
              min={0}
              value={additionalVehicles}
              onChange={(e) => setAdditionalVehicles(Number(e.target.value))}
            />
          </label>
          <label className="mos-erp-field">
            <span className="mos-erp-field__label">Dış tedarik artışı (%)</span>
            <input
              type="number"
              className="mos-erp-input"
              value={externalSupplyIncreasePercent}
              onChange={(e) => setExternalSupplyIncreasePercent(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Önce / Sonra Karşılaştırması</h2>
        {scenarios.map((scenario) => (
          <div key={scenario.scenarioId} className="mos-erp-panel__section">
            <h3 className="mos-erp-panel__subtitle">{scenario.scenarioName}</h3>
            <p className="mos-erp-muted mos-erp-panel__hint">{scenario.basis}</p>
            <ScenarioTable scenario={scenario} />
            <p className="mos-erp-panel__recommendation">
              <strong>Tavsiye:</strong> {scenario.recommendation}
            </p>
          </div>
        ))}
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Best Case</h2>
        {bestCase ? (
          <>
            <p className="mos-erp-muted">{bestCase.basis}</p>
            <ScenarioTable scenario={bestCase} />
          </>
        ) : null}
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Worst Case</h2>
        {worstCase ? (
          <>
            <p className="mos-erp-muted">{worstCase.basis}</p>
            <ScenarioTable scenario={worstCase} />
          </>
        ) : null}
      </section>

      <section className="mos-erp-panel">
        <h2 className="mos-erp-panel__title">Yönetim Tavsiyesi</h2>
        <p className="mos-erp-panel__body">{data?.managementAdvice ?? '—'}</p>
      </section>
    </div>
  )
}

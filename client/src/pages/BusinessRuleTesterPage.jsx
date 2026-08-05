import { useState } from 'react'
import { testBusinessRule } from '../services/businessRuleClient.js'
import '../styles/mos-erp-ops.css'

export default function BusinessRuleTesterPage({ onBack, initialCode = '', initialValue = '' }) {
  const [code, setCode] = useState(initialCode)
  const [value, setValue] = useState(initialValue)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function simulate() {
    setLoading(true)
    setError(null)
    try {
      const res = await testBusinessRule({ code, value })
      setResult(res)
    } catch (err) {
      setError(err?.body?.message ?? err?.message ?? 'Simülasyon başarısız')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mos-page mos-erp-ops">
      <header className="mos-erp-ops__head">
        {onBack && <button type="button" className="mos-erp-detail__action" onClick={onBack}>← Geri</button>}
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Rule Tester</h1>
          <span className="mos-erp-ops__sub">Kural değişikliğinin modül çıktılarına etkisini simüle edin</span>
        </div>
      </header>

      <div className="mos-erp-cockpit-filters">
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="rt-code">Kural Kodu</label>
          <input id="rt-code" type="text" className="mos-erp-filters__field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="COLLECTION_HIGH_RISK_RATIO" />
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="rt-val">Önerilen Değer</label>
          <input id="rt-val" type="text" className="mos-erp-filters__field" value={value} onChange={(e) => setValue(e.target.value)} placeholder="40" />
        </div>
        <button type="button" className="mos-erp-detail__action mos-erp-detail__action--primary" disabled={loading || !code || !value} onClick={simulate}>
          {loading ? 'Simüle ediliyor…' : 'Simüle Et'}
        </button>
      </div>

      {error && <div className="mos-erp-detail mos-erp-detail--empty"><span className="mos-erp-detail__empty">{error}</span></div>}

      {result && (
        <section className="mos-erp-cockpit-section">
          <h2 className="mos-erp-cockpit-section__title">Simülasyon Sonucu</h2>
          <div className="mos-erp-detail">
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Kural</span>
              <span className="mos-erp-detail__field-value">{result.ruleCode}: {result.currentValue} → {result.proposedValue}</span>
            </div>
            {result.metrics?.map((m) => (
              <div key={m.label} className="mos-erp-detail__field">
                <span className="mos-erp-detail__field-label">{m.label}</span>
                <span className="mos-erp-detail__field-value">{m.before} → {m.after} (Δ {m.delta >= 0 ? '+' : ''}{m.delta})</span>
              </div>
            ))}
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Danışman</span>
              <span className="mos-erp-detail__field-value">{result.advisoriesBefore} → {result.advisoriesAfter}</span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Görevler</span>
              <span className="mos-erp-detail__field-value">{result.actionsBefore} → {result.actionsAfter}</span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Vakalar</span>
              <span className="mos-erp-detail__field-value">{result.casesBefore} → {result.casesAfter}</span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Otomasyon</span>
              <span className="mos-erp-detail__field-value">{result.automationJobsBefore} → {result.automationJobsAfter}</span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Depo Katı</span>
              <span className="mos-erp-detail__field-value">{result.depoKatiMentioned ? 'Etkilendi (HATA)' : 'Etkilenmedi ✓'}</span>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

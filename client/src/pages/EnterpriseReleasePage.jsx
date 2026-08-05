import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOperationalToday } from '../data/constants.js'
import { useOrders } from '../state/useOrders.js'
import { fetchEnterpriseReleaseReport } from '../services/enterpriseReleaseClient.js'
import { ENTERPRISE_VERSION } from '../contracts/v1/enterpriseRelease.js'
import '../styles/enterprise-release.css'

function statusClass(status) {
  if (status === 'pass') return 'ent-release__check--pass'
  if (status === 'warn') return 'ent-release__check--warn'
  return 'ent-release__check--fail'
}

/** @param {{ onNavigate?: (pageId: string) => void }} props */
export default function EnterpriseReleasePage({ onNavigate }) {
  const { orders, salesOrderListItemDtos: dtos } = useOrders()
  const todayIso = getOperationalToday()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  const runtimeCtx = useMemo(() => ({ orders, dtos, todayIso }), [orders, dtos, todayIso])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchEnterpriseReleaseReport(runtimeCtx)
      setReport(res)
    } finally {
      setLoading(false)
    }
  }, [runtimeCtx])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !report) {
    return <div className="ent-release"><p>Yükleniyor…</p></div>
  }

  if (!report) return null

  const score = report.finalScore

  return (
    <div className="ent-release">
      <header className="ent-release__hero">
        <p className="ent-release__kicker">{report.release.PRODUCT}</p>
        <h1 className="ent-release__title">{report.release.EDITION}</h1>
        <p className="ent-release__success">{report.successMessage}</p>
        <div className={`ent-release__rc ${report.releaseCandidateReady ? 'is-ready' : ''}`}>
          {report.releaseCandidateReady ? 'Release Candidate READY' : 'Release Candidate NOT READY'}
        </div>
      </header>

      <section className="ent-release__meta">
        <div><span>Version</span><strong>{report.release.VERSION}</strong></div>
        <div><span>Build</span><strong>{report.release.BUILD}</strong></div>
        <div><span>Release Date</span><strong>{report.releaseDate}</strong></div>
        <div><span>Database</span><strong>{report.release.DATABASE_VERSION}</strong></div>
        <div><span>API</span><strong>{report.release.API_VERSION}</strong></div>
        <div><span>AI</span><strong>{report.release.AI_VERSION}</strong></div>
      </section>

      <section className="ent-release__score">
        <h2>Final Score · {score.totalScore}/100</h2>
        <p>{score.label}</p>
        <div className="ent-release__score-grid">
          <div>System Health<span>{score.systemHealth}</span></div>
          <div>Performance<span>{score.performance}</span></div>
          <div>Security<span>{score.security}</span></div>
          <div>AI Score<span>{score.aiScore}</span></div>
          <div>Prediction<span>{score.predictionAccuracy}</span></div>
          <div>Learning<span>{score.learningScore}</span></div>
          <div>Decision<span>{score.decisionScore}</span></div>
          <div>Optimization<span>{score.optimizationScore}</span></div>
        </div>
      </section>

      <section className="ent-release__section">
        <h3>Enterprise ERP Checklist</h3>
        <ul className="ent-release__checks">
          {report.erpChecklist.map((c) => (
            <li key={c.id} className={statusClass(c.status)}>✓ {c.label}</li>
          ))}
        </ul>
      </section>

      <section className="ent-release__section">
        <h3>Production Validation · {report.productionValidation.simulatedHours}h</h3>
        <ul className="ent-release__checks">
          {report.productionValidation.checks.map((c) => (
            <li key={c.id} className={statusClass(c.status)}>{c.label} — {c.detail}</li>
          ))}
        </ul>
      </section>

      <section className="ent-release__section">
        <h3>Stress Test</h3>
        <ul className="ent-release__checks">
          {report.stressTest.checks.map((c) => (
            <li key={c.id} className={statusClass(c.status)}>{c.label} — {c.detail}</li>
          ))}
        </ul>
      </section>

      <div className="ent-release__columns">
        <section className="ent-release__section">
          <h3>Security</h3>
          <ul className="ent-release__checks">{report.securityChecks.map((c) => <li key={c.id} className={statusClass(c.status)}>{c.label}</li>)}</ul>
        </section>
        <section className="ent-release__section">
          <h3>Recovery</h3>
          <ul className="ent-release__checks">{report.recoveryChecks.map((c) => <li key={c.id} className={statusClass(c.status)}>{c.label}</li>)}</ul>
        </section>
        <section className="ent-release__section">
          <h3>Performance</h3>
          <ul className="ent-release__checks">{report.performanceChecks.map((c) => <li key={c.id} className={statusClass(c.status)}>{c.label} — {c.detail}</li>)}</ul>
        </section>
        <section className="ent-release__section">
          <h3>Quality</h3>
          <ul className="ent-release__checks">{report.qualityChecks.map((c) => <li key={c.id} className={statusClass(c.status)}>{c.label}</li>)}</ul>
        </section>
      </div>

      <footer className="ent-release__footer">
        <p>Artık sistem geliştirme modundan çıkar. Yeni geliştirmeler Enterprise 1.x / Enterprise 2.0 şeklinde devam eder.</p>
        <button type="button" className="mos-btn mos-btn-primary" onClick={() => onNavigate?.('enterprise-ceo-dashboard')}>
          CEO Dashboard →
        </button>
      </footer>
    </div>
  )
}

export { ENTERPRISE_VERSION }

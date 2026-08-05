import { useEffect } from 'react'
import {
  buildAutomationTimeline,
  JOB_TYPE_LABEL,
  riskLabelForPriority,
  STATUS_LABEL,
} from '../../mappers/automation/automationCenterWarRoomModel.js'
import './automation-center-drawer.css'

const PRIORITY_TONE = { P1: 'critical', P2: 'warning', P3: 'info', P4: 'info', P5: 'info' }
const PRIORITY_LABEL = {
  P1: 'P1 · Acil',
  P2: 'P2 · Yüksek',
  P3: 'P3 · Orta',
  P4: 'P4 · Normal',
  P5: 'P5 · Düşük',
}

const STATUS_TONE = {
  CREATED: 'info',
  WAITING_APPROVAL: 'warning',
  APPROVED: 'info',
  EXECUTING: 'warning',
  COMPLETED: 'success',
  FAILED: 'critical',
  CANCELLED: 'muted',
}

function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

/**
 * @param {{
 *   open: boolean
 *   job: import('../../contracts/v1/automationJob.js').AutomationJobDto | null
 *   busy?: boolean
 *   actionError?: string | null
 *   onClose: () => void
 *   onApprove?: () => void
 *   onRun?: () => void
 *   onCancel?: () => void
 *   canApprove?: boolean
 *   canRun?: boolean
 *   canCancel?: boolean
 * }} props
 */
export default function AutomationCenterErpDrawer({
  open,
  job,
  busy = false,
  actionError = null,
  onClose,
  onApprove,
  onRun,
  onCancel,
  canApprove = false,
  canRun = false,
  canCancel = false,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open || !job) return null

  const timeline = buildAutomationTimeline(job)
  const jobNumber = job.id.replace(/^job:/, 'AUTO-').replace(/:/g, '-')

  return (
    <>
      <button
        type="button"
        className="auto-erp-drawer__scrim"
        aria-label="Otomasyon detayını kapat"
        onClick={onClose}
      />
      <aside className="auto-erp-drawer" role="complementary" aria-label="Otomasyon detayı">
        <header className="auto-erp-drawer__hero">
          <div className="auto-erp-drawer__head-row">
            <div>
              <h2 className="auto-erp-drawer__title">{job.title ?? JOB_TYPE_LABEL[job.jobType]}</h2>
              <span className="auto-erp-drawer__sub">{jobNumber}</span>
            </div>
            <button type="button" className="auto-erp-drawer__close" aria-label="Kapat" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="auto-erp-drawer__tags">
            <Tag tone={PRIORITY_TONE[job.priority]}>{PRIORITY_LABEL[job.priority] ?? job.priority}</Tag>
            <Tag>{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}</Tag>
            <Tag tone={STATUS_TONE[job.status]}>{STATUS_LABEL[job.status] ?? job.status}</Tag>
          </div>
          <div className="auto-erp-drawer__actions">
            {canApprove ? (
              <button
                type="button"
                className="auto-erp-drawer__action auto-erp-drawer__action--primary"
                disabled={busy}
                onClick={onApprove}
              >
                Onayla
              </button>
            ) : null}
            {canRun ? (
              <button
                type="button"
                className="auto-erp-drawer__action auto-erp-drawer__action--primary"
                disabled={busy}
                onClick={onRun}
              >
                Çalıştır
              </button>
            ) : null}
            {canCancel ? (
              <button type="button" className="auto-erp-drawer__action" disabled={busy} onClick={onCancel}>
                İptal Et
              </button>
            ) : null}
            <button type="button" className="auto-erp-drawer__action" onClick={onClose}>
              Detay
            </button>
          </div>
          {actionError ? <p className="auto-erp-drawer__alert">{actionError}</p> : null}
        </header>

        <div className="auto-erp-drawer__body">
          <section className="auto-erp-drawer__section" aria-label="Otomasyon özeti">
            <h3 className="auto-erp-drawer__section-title">Otomasyon Özeti</h3>
            <dl className="auto-erp-drawer__kv">
              <div className="auto-erp-drawer__kv-row">
                <dt>Kaynak</dt>
                <dd>{job.triggerSource}</dd>
              </div>
              <div className="auto-erp-drawer__kv-row">
                <dt>Önerilen Aksiyon</dt>
                <dd>{job.recommendedAction}</dd>
              </div>
              <div className="auto-erp-drawer__kv-row">
                <dt>Onay</dt>
                <dd>{job.requiresApproval ? (job.approvedBy ? `Onaylandı (${job.approvedBy})` : 'Gerekli') : 'Gerekmez'}</dd>
              </div>
              <div className="auto-erp-drawer__kv-row">
                <dt>Oluşturma</dt>
                <dd>{(job.createdAt ?? '').slice(0, 16).replace('T', ' ')}</dd>
              </div>
            </dl>
          </section>

          <section className="auto-erp-drawer__section" aria-label="Neden üretildi">
            <h3 className="auto-erp-drawer__section-title">Neden Üretildi?</h3>
            <p className="auto-erp-drawer__empty">{job.reason ?? 'Sebep kaydı yok.'}</p>
          </section>

          <section className="auto-erp-drawer__section" aria-label="Bağlı vaka">
            <h3 className="auto-erp-drawer__section-title">Hangi Vakaya Bağlı?</h3>
            <p className="auto-erp-drawer__empty">{job.relatedCaseId ?? 'Vaka bağlı değil.'}</p>
          </section>

          <section className="auto-erp-drawer__section" aria-label="Bağlı sipariş">
            <h3 className="auto-erp-drawer__section-title">Hangi Siparişe Bağlı?</h3>
            <p className="auto-erp-drawer__empty">{job.relatedOrderId ?? 'Sipariş bağlı değil.'}</p>
          </section>

          <section className="auto-erp-drawer__section" aria-label="Beklenen etki">
            <h3 className="auto-erp-drawer__section-title">Beklenen Etki</h3>
            <p className="auto-erp-drawer__empty">{job.recommendedAction}</p>
          </section>

          <section className="auto-erp-drawer__section" aria-label="Risk">
            <h3 className="auto-erp-drawer__section-title">Risk</h3>
            <p className="auto-erp-drawer__empty">{riskLabelForPriority(job.priority)}</p>
          </section>

          <section className="auto-erp-drawer__section" aria-label="Timeline">
            <h3 className="auto-erp-drawer__section-title">Timeline</h3>
            {timeline.length === 0 ? (
              <p className="auto-erp-drawer__empty">Kayıt yok.</p>
            ) : (
              <ol className="auto-erp-drawer__timeline">
                {timeline.map((ev, i) => (
                  <li key={`${ev.at}-${i}`} className="auto-erp-drawer__timeline-item">
                    <span className="auto-erp-drawer__timeline-msg">{ev.message}</span>
                    <span className="auto-erp-drawer__timeline-meta">
                      {(ev.at ?? '').slice(0, 16).replace('T', ' ')}
                      {ev.actor ? ` · ${ev.actor}` : ''}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="auto-erp-drawer__section" aria-label="Notlar">
            <h3 className="auto-erp-drawer__section-title">Notlar</h3>
            <p className="auto-erp-drawer__empty">{job.reason ? job.reason : 'Henüz not yok.'}</p>
          </section>
        </div>
      </aside>
    </>
  )
}

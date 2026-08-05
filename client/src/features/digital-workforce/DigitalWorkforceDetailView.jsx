import ErpOpsSummaryStrip from '../../components/erp-ops/ErpOpsSummaryStrip.jsx'

/**
 * @param {{ tone?: string; children: import('react').ReactNode }} props
 */
function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

/**
 * @param {{
 *   detail: {
 *     name: string
 *     code: string
 *     role: string
 *     department: string
 *     icon: string
 *     description: string
 *     statusLabel: string
 *     statusTone: string
 *     enabled: boolean
 *     priorityLabel: string
 *     tasksPending: number
 *     tasksRunning: number
 *     lastActionLabel: string
 *     createdAtLabel: string
 *     updatedAtLabel: string
 *     futureTabs: { id: string; label: string }[]
 *     performance: {
 *       totalTasks: number
 *       successfulTasks: number
 *       failedTasks: number
 *       averageDurationLabel: string
 *       successRate: number
 *     }
 *     taskHistory: {
 *       id: string
 *       title: string
 *       createdBy: string | null
 *       startedAt: string | null
 *       finishedAt: string | null
 *       durationLabel: string
 *       status: string
 *     }[]
 *     queuePreview: {
 *       id: string
 *       title: string
 *       priority: string
 *       description: string
 *     }[]
 *   }
 *   onBack: () => void
 * }} props
 */
export default function DigitalWorkforceDetailView({ detail, onBack }) {
  return (
    <div className="mos-page mos-erp-ops dw-detail">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <button type="button" className="mos-btn mos-btn--ghost dw-detail__back" onClick={onBack}>
            ← Digital Workforce
          </button>
          <div className="dw-detail__title-row">
            <span className="dw-detail__icon" aria-hidden="true">
              {detail.icon}
            </span>
            <h1 className="mos-erp-ops__title">{detail.name}</h1>
          </div>
          <span className="mos-erp-ops__sub">
            {detail.role} · {detail.department} · Kod: {detail.code}
          </span>
        </div>
        <Tag tone={detail.statusTone}>{detail.statusLabel}</Tag>
      </header>

      <section className="mos-erp-cockpit-section" aria-label="Performans özeti">
        <ErpOpsSummaryStrip
          metrics={[
            { id: 'total', label: 'Toplam görev', value: String(detail.performance.totalTasks) },
            {
              id: 'success',
              label: 'Başarılı',
              value: String(detail.performance.successfulTasks),
              valueTone: 'success',
            },
            {
              id: 'failed',
              label: 'Başarısız',
              value: String(detail.performance.failedTasks),
              valueTone: detail.performance.failedTasks > 0 ? 'critical' : 'neutral',
            },
            {
              id: 'avg',
              label: 'Ort. süre',
              value: detail.performance.averageDurationLabel,
            },
            {
              id: 'rate',
              label: 'Başarı oranı',
              value: `${detail.performance.successRate}%`,
              valueTone: detail.performance.successRate >= 80 ? 'success' : 'warning',
            },
          ]}
          ariaLabel="Performans özeti"
          summaryClassName="mos-erp-summary--cols-5"
        />
      </section>

      <section className="mos-erp-cockpit-section" aria-label="Görev kuyruğu">
        <h2 className="mos-erp-cockpit-section__title">Görev Kuyruğu</h2>
        {detail.queuePreview.length === 0 ? (
          <div className="mos-erp-panel dw-detail__empty">Bekleyen görev yok.</div>
        ) : (
          <ul className="dw-detail__queue">
            {detail.queuePreview.map((task) => (
              <li key={task.id} className="dw-detail__queue-item">
                <strong>{task.title}</strong>
                <span>{task.description}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mos-erp-cockpit-section" aria-label="Görev geçmişi">
        <h2 className="mos-erp-cockpit-section__title">Görev Geçmişi</h2>
        {detail.taskHistory.length === 0 ? (
          <div className="mos-erp-panel dw-detail__empty">Henüz tamamlanan görev yok.</div>
        ) : (
          <div className="dw-detail__history">
            {detail.taskHistory.map((entry) => (
              <article key={entry.id} className="dw-detail__history-row">
                <div className="dw-detail__history-main">
                  <strong>{entry.title}</strong>
                  <span>{entry.createdBy ?? 'Sistem'}</span>
                </div>
                <div className="dw-detail__history-meta">
                  <span>{entry.durationLabel}</span>
                  <span>{entry.finishedAt?.slice(0, 10) ?? '—'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mos-erp-cockpit-section" aria-label="Çalışan bilgisi">
        <h2 className="mos-erp-cockpit-section__title">Kayıt Bilgisi</h2>
        <div className="mos-erp-panel dw-detail__info">
          <p>{detail.description}</p>
          <dl className="dw-detail__meta">
            <div>
              <dt>Öncelik</dt>
              <dd>{detail.priorityLabel}</dd>
            </div>
            <div>
              <dt>Etkin</dt>
              <dd>{detail.enabled ? 'Evet' : 'Hayır'}</dd>
            </div>
            <div>
              <dt>Bekleyen görev</dt>
              <dd>{detail.tasksPending}</dd>
            </div>
            <div>
              <dt>Son işlem</dt>
              <dd>{detail.lastActionLabel}</dd>
            </div>
            <div>
              <dt>Oluşturulma</dt>
              <dd>{detail.createdAtLabel}</dd>
            </div>
            <div>
              <dt>Güncelleme</dt>
              <dd>{detail.updatedAtLabel}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mos-erp-cockpit-section" aria-label="Gelecek modüller">
        <h2 className="mos-erp-cockpit-section__title">Gelecek Modüller</h2>
        <div className="dw-detail__future-tabs" role="list" aria-label="Yakında eklenecek sekmeler">
          {detail.futureTabs.map((tab) => (
            <span key={tab.id} className="dw-detail__future-tab" role="listitem">
              {tab.label}
              <span className="dw-detail__future-badge">Yakında</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}

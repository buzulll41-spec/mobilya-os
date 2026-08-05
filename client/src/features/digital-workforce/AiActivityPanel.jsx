import { memo } from 'react'

/**
 * @typedef {{
 *   workerId: string
 *   workerName: string
 *   phase: string
 *   statusLabel: string
 *   statusEmoji: string
 *   tone: string
 *   currentStep: string
 *   orderId: string | null
 *   taskTitle: string | null
 *   lastTool: string | null
 *   lastResponse: string | null
 *   tokenUsageLabel: string
 *   executionTimeLabel: string
 *   elapsedSeconds: number
 *   isActive: boolean
 *   isWaiting: boolean
 *   isExecutingTool: boolean
 *   activityLog: { phase: string, message: string, at: string }[]
 * }} AiActivityRowVm
 */

/**
 * @param {{ rows: AiActivityRowVm[], onOpenWorker?: (workerId: string) => void }} props
 */
function AiActivityPanel({ rows, onOpenWorker }) {
  return (
    <section className="mos-erp-cockpit-section dw-ai-activity" aria-label="AI Activity">
      <h2 className="mos-erp-cockpit-section__title">AI Activity</h2>
      <p className="dw-ai-activity__sub">Canlı dijital çalışan akışı — FAZ 44</p>
      <ul className="dw-ai-activity__list">
        {rows.map((row) => (
          <li key={row.workerId}>
            <button
              type="button"
              className={`dw-ai-activity__row dw-ai-activity__row--${row.tone}${row.isActive ? ' dw-ai-activity__row--active' : ''}`}
              onClick={() => onOpenWorker?.(row.workerId)}
            >
              <div className="dw-ai-activity__head">
                <span className="dw-ai-activity__name">{row.workerName}</span>
                <span className="dw-ai-activity__status">
                  {row.statusEmoji} {row.statusLabel}
                </span>
              </div>
              <p className="dw-ai-activity__step">{row.currentStep}</p>
              <dl className="dw-ai-activity__meta">
                <div>
                  <dt>Sipariş</dt>
                  <dd>{row.orderId ?? '—'}</dd>
                </div>
                <div>
                  <dt>Süre</dt>
                  <dd>{row.isActive ? `${row.elapsedSeconds}s` : row.executionTimeLabel}</dd>
                </div>
                <div>
                  <dt>Tool</dt>
                  <dd>{row.lastTool ?? '—'}</dd>
                </div>
                <div>
                  <dt>Token</dt>
                  <dd>{row.tokenUsageLabel}</dd>
                </div>
              </dl>
              {row.isWaiting ? (
                <span className="dw-ai-activity__badge dw-ai-activity__badge--wait">Onay bekliyor</span>
              ) : null}
              {row.isExecutingTool ? (
                <span className="dw-ai-activity__badge dw-ai-activity__badge--tool">Tool çalışıyor</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default memo(AiActivityPanel)

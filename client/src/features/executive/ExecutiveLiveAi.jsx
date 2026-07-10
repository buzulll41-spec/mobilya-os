import { memo } from 'react'

/**
 * @typedef {{
 *   active: boolean
 *   workerName: string
 *   workerId: string | null
 *   phaseLabel: string
 *   currentStep: string
 *   orderId: string | null
 *   taskTitle?: string | null
 *   elapsedSeconds: number
 *   isWaiting: boolean
 *   isExecutingTool: boolean
 *   lastTool?: string | null
 *   tokenUsageLabel?: string
 *   executionTimeLabel?: string
 * }} CeoLiveAiVm
 */

/**
 * @param {{ liveAi: CeoLiveAiVm, onOpenWorker?: (workerId: string) => void }} props
 */
function ExecutiveLiveAi({ liveAi, onOpenWorker }) {
  return (
    <section className="ecc-section ecc-section--live-ai" aria-label="LIVE AI">
      <h2 className="ecc-section__title">LIVE AI</h2>
      <div className={`ecc-live-ai${liveAi.active ? ' ecc-live-ai--active' : ''}`}>
        <div className="ecc-live-ai__head">
          <span className="ecc-live-ai__pulse" aria-hidden="true" />
          <strong>{liveAi.active ? liveAi.workerName : 'Şu anda çalışan AI yok'}</strong>
          <span className="ecc-live-ai__phase">{liveAi.phaseLabel}</span>
        </div>
        <p className="ecc-live-ai__step">{liveAi.currentStep}</p>
        <dl className="ecc-live-ai__grid">
          <div>
            <dt>Sipariş</dt>
            <dd>{liveAi.orderId ?? '—'}</dd>
          </div>
          <div>
            <dt>Süre</dt>
            <dd>{liveAi.active ? `${liveAi.elapsedSeconds} sn` : liveAi.executionTimeLabel ?? '—'}</dd>
          </div>
          <div>
            <dt>Bekliyor mu</dt>
            <dd>{liveAi.isWaiting ? 'Evet' : 'Hayır'}</dd>
          </div>
          <div>
            <dt>Tool</dt>
            <dd>{liveAi.isExecutingTool ? liveAi.lastTool ?? 'Çalışıyor' : liveAi.lastTool ?? '—'}</dd>
          </div>
        </dl>
        {liveAi.tokenUsageLabel ? (
          <p className="ecc-live-ai__tokens">Token: {liveAi.tokenUsageLabel}</p>
        ) : null}
        {liveAi.workerId ? (
          <button
            type="button"
            className="ecc-live-ai__link"
            onClick={() => onOpenWorker?.(liveAi.workerId)}
          >
            Digital Workforce&apos;ta aç
          </button>
        ) : null}
      </div>
    </section>
  )
}

export default memo(ExecutiveLiveAi)

import { memo } from 'react'

/**
 * @param {{
 *   workers: {
 *     id: string
 *     name: string
 *     statusLabel: string
 *     tone?: string
 *     message: string
 *     isActive?: boolean
 *     progress?: number
 *   }[]
 *   onOpenWorker?: (workerId: string) => void
 * }} props
 */
function ExecutiveAiActivity({ workers, onOpenWorker }) {
  return (
    <section className="ecc-section ecc-section--ai" aria-label="AI Activity">
      <h2 className="ecc-section__title">AI Activity</h2>
      <ul className="ecc-ai-activity">
        {workers.map((worker) => (
          <li key={worker.id}>
            <button
              type="button"
              className={`ecc-ai-activity__row ecc-ai-activity__row--${worker.tone ?? 'neutral'}${worker.isActive ? ' ecc-ai-activity__row--active' : ''}`}
              onClick={() => onOpenWorker?.(worker.id)}
            >
              <span className="ecc-ai-activity__name">{worker.name}</span>
              <span className="ecc-ai-activity__status">{worker.statusLabel}</span>
              <span className="ecc-ai-activity__msg">{worker.message}</span>
              {typeof worker.progress === 'number' ? (
                <span className="ecc-ai-activity__progress">{worker.progress}%</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default memo(ExecutiveAiActivity)

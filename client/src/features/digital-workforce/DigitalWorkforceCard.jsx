/**

 * @param {{ tone?: string; children: import('react').ReactNode }} props

 */

function Tag({ tone, children }) {

  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>

}



/**

 * @param {{

 *   card: {

 *     id: string

 *     displayName: string

 *     name: string

 *     role: string

 *     department: string

 *     icon: string

 *     avatar: string

 *     description: string

 *     experienceStatusLabel: string

 *     experienceStatusTone: string

 *     theme: { id: string, accent: string, accentSoft: string, accentBorder: string }

 *     tasksToday: number

 *     tasksPending: number

 *     tasksCompleted: number

 *     successRate: number

 *     averageDurationLabel: string

 *     lastActionLabel: string

 *     lastCompletedTaskTitle: string

 *     isPulsing?: boolean

 *     livingStatusLabel?: string

 *     livingStatusEmoji?: string

 *     livingStatusTone?: string

 *     livingMessage?: string

 *     livingCardClass?: string

 *     livingProgress?: number

 *     livingProgressLabel?: string

 *     livingProgressBlocks?: string

 *     showLivingCompleted?: boolean

 *     showLivingNewTask?: boolean

 *   }

 *   isGlowing?: boolean

 *   showSuccessTick?: boolean

 *   onOpen: (workerId: string) => void

 * }} props

 */

export default function DigitalWorkforceCard({ card, isGlowing = false, showSuccessTick = false, onOpen }) {

  const style = {

    '--dw-accent': card.theme.accent,

    '--dw-accent-soft': card.theme.accentSoft,

    '--dw-accent-border': card.theme.accentBorder,

  }



  const statusLabel = card.livingStatusLabel ?? card.experienceStatusLabel

  const statusTone = card.livingStatusTone ?? card.experienceStatusTone

  const showTick = showSuccessTick || card.showLivingCompleted



  return (

    <button

      type="button"

      className={`dw-card dw-card--experience dw-card--living dw-card--${card.theme.id}${card.livingCardClass ?? ''}${card.isPulsing ? ' dw-card--pulse' : ''}${isGlowing || card.showLivingNewTask ? ' dw-card--glow dw-card--new-task' : ''}${showTick ? ' dw-card--success' : ''}`}

      style={style}

      onClick={() => onOpen(card.id)}

      aria-label={`${card.displayName} detayını aç`}

    >

      <span className="dw-card__live-indicator" aria-hidden="true">

        <span className={`dw-card__live-dot dw-card__live-dot--${statusTone}`} />

        <span className="dw-card__live-status">

          {card.livingStatusEmoji} {statusLabel}

        </span>

      </span>



      {showTick ? (

        <span className="dw-card__success-tick" aria-hidden="true">

          ✓

        </span>

      ) : null}



      {card.livingCardClass?.includes('calling') ? (

        <span className="dw-card__calling-icon" aria-hidden="true">

          📞

        </span>

      ) : null}



      <div className="dw-card__head">

        <div className="dw-card__identity">

          <span className={`dw-card__avatar${card.livingCardClass?.includes('thinking') ? ' dw-card__avatar--thinking' : ''}`} aria-hidden="true">

            {card.avatar}

          </span>

          <div>

            <h3 className="dw-card__title">{card.displayName}</h3>

            <p className="dw-card__role">

              {card.role} · {card.department}

            </p>

          </div>

        </div>

        <Tag tone={statusTone}>{statusLabel}</Tag>

      </div>



      {card.livingMessage ? (

        <p className="dw-card__live-message" aria-live="polite">

          {card.livingMessage}

        </p>

      ) : (

        <p className="dw-card__desc">{card.description}</p>

      )}



      {typeof card.livingProgress === 'number' ? (

        <div className="dw-card__progress" aria-label={`Görev ilerlemesi ${card.livingProgressLabel}`}>

          <div className="dw-card__progress-track">

            <span className="dw-card__progress-fill" style={{ width: `${card.livingProgress}%` }} />

          </div>

          <span className="dw-card__progress-meta">

            <span className="dw-card__progress-blocks" aria-hidden="true">

              {card.livingProgressBlocks}

            </span>

            <span className="dw-card__progress-pct">{card.livingProgressLabel}</span>

          </span>

        </div>

      ) : null}



      {card.employeeCurrentStep ? (

        <dl className="dw-card__employee-metrics" aria-label="Canlı dijital çalışan metrikleri">

          <div>

            <dt>Step</dt>

            <dd>{card.employeeCurrentStep}</dd>

          </div>

          <div>

            <dt>Last Tool</dt>

            <dd>{card.employeeLastTool ?? '—'}</dd>

          </div>

          <div>

            <dt>Tokens</dt>

            <dd>{card.employeeTokenUsageLabel ?? '—'}</dd>

          </div>

          <div>

            <dt>Exec Time</dt>

            <dd>{card.employeeExecutionTimeLabel ?? (card.employeeElapsedSeconds ? `${card.employeeElapsedSeconds}s` : '—')}</dd>

          </div>

        </dl>

      ) : null}



      {card.employeeLastResponse ? (

        <p className="dw-card__employee-response" aria-live="polite">

          <span className="dw-card__foot-label">Last Response</span>

          <span className="dw-card__foot-value">{card.employeeLastResponse}</span>

        </p>

      ) : null}



      <dl className="dw-card__stats dw-card__stats--quad">

        <div className="dw-card__stat">

          <dt>Bugünkü</dt>

          <dd>{card.tasksToday}</dd>

        </div>

        <div className="dw-card__stat">

          <dt>Bekleyen</dt>

          <dd>{card.tasksPending}</dd>

        </div>

        <div className="dw-card__stat">

          <dt>Tamamlanan</dt>

          <dd>{card.tasksCompleted}</dd>

        </div>

        <div className="dw-card__stat">

          <dt>Başarı %</dt>

          <dd>{card.successRate}%</dd>

        </div>

      </dl>



      <dl className="dw-card__meta-row">

        <div>

          <dt>Ort. süre</dt>

          <dd>{card.averageDurationLabel}</dd>

        </div>

        <div>

          <dt>Son işlem</dt>

          <dd className="dw-card__last-action">{card.lastActionLabel}</dd>

        </div>

      </dl>



      <p className="dw-card__last-task">

        <span className="dw-card__foot-label">Son tamamlanan görev</span>

        <span className="dw-card__foot-value">{card.lastCompletedTaskTitle}</span>

      </p>

    </button>

  )

}



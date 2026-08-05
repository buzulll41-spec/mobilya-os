import { memo } from 'react'

/**
 * @param {{ tone?: string; children: import('react').ReactNode }} props
 */
function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}

/**
 * @param {{ card: object, onOpen: (workerId: string) => void }} props
 */
function CompanyManagerCard({ card, onOpen }) {
  const style = {
    '--dw-accent': card.theme.accent,
    '--dw-accent-soft': card.theme.accentSoft,
    '--dw-accent-border': card.theme.accentBorder,
  }

  return (
    <button
      type="button"
      className="dw-card dw-card--experience dw-card--manager dw-card--company-manager"
      style={style}
      onClick={() => onOpen(card.id)}
      aria-label="Company Manager detayı"
    >
      <div className="dw-card__head">
        <div className="dw-card__identity">
          <span className="dw-card__avatar" aria-hidden="true">
            {card.avatar}
          </span>
          <div>
            <h3 className="dw-card__title">{card.displayName}</h3>
            <p className="dw-card__role">
              {card.role} · {card.department}
            </p>
          </div>
        </div>
        <Tag tone="info">{card.managerStatusLabel ?? card.experienceStatusLabel}</Tag>
      </div>

      <p className="dw-card__live-message">{card.managerDecisionLabel ?? card.description}</p>

      <dl className="dw-card__employee-metrics">
        <div>
          <dt>Durum</dt>
          <dd>{card.statusLabel}</dd>
        </div>
        <div>
          <dt>Karar</dt>
          <dd>{card.managerLastDecisionType ?? '—'}</dd>
        </div>
        <div>
          <dt>Aktif worker</dt>
          <dd>{card.managerActiveWorkers ?? 0}</dd>
        </div>
        <div>
          <dt>İş yükü</dt>
          <dd>{card.managerWorkloadLabel ?? '—'}</dd>
        </div>
      </dl>

      <p className="dw-card__last-task">
        <span className="dw-card__foot-label">Son karar</span>
        <span className="dw-card__foot-value">{card.managerDecisionLabel ?? '—'}</span>
      </p>
    </button>
  )
}

export default memo(CompanyManagerCard)

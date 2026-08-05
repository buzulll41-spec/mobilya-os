/** @typedef {import('../../utils/orderTimeline.js').TimelineStep} TimelineStep */

/** @param {{ steps: TimelineStep[] }} props */
export default function OperationTimeline({ steps }) {
  return (
    <ol className="mos-timeline" aria-label="Operasyon zaman çizelgesi">
      {steps.map((s, i) => (
        <li
          key={s.key}
          className={`mos-timeline-item mos-timeline-item--${s.state}${s.variant === 'risk' ? ' mos-timeline-item--risk' : s.variant === 'task' ? ' mos-timeline-item--task' : ''}`}
        >
          <div className="mos-timeline-track" aria-hidden>
            <span className="mos-timeline-dot" />
            {i < steps.length - 1 ? <span className="mos-timeline-line" /> : null}
          </div>
          <div className="mos-timeline-body">
            {s.showDayHead && s.groupLabel ? (
              <p className="mos-timeline-dayhead">{s.groupLabel}</p>
            ) : null}
            <p className="mos-timeline-label">{s.label}</p>
            {s.dateLabel ? (
              <p className="mos-timeline-date">{s.dateLabel}</p>
            ) : (
              <p className="mos-timeline-date mos-timeline-date--muted">—</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

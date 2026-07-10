import { memo } from 'react'

/**
 * @param {{ metrics: { id: string, label: string, value: string, valueTone?: string }[] }} props
 */
function AiCompanyStatusPanel({ metrics }) {
  return (
    <section className="mos-erp-cockpit-section dw-company-status" aria-label="AI Company Status">
      <h2 className="mos-erp-cockpit-section__title">AI COMPANY STATUS</h2>
      <dl className="dw-company-status__grid dw-company-status__grid--8">
        {metrics.map((m) => (
          <div
            key={m.id}
            className={`dw-company-status__item dw-company-status__item--${m.valueTone ?? 'neutral'}`}
          >
            <dt>{m.label}</dt>
            <dd>{m.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default memo(AiCompanyStatusPanel)

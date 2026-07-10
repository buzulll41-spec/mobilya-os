import { memo } from 'react'

/**
 * @param {{ metrics: { id: string, label: string, value: string, valueTone?: string }[] }} props
 */
function DigitalCompanyStatusPanel({ metrics }) {
  return (
    <section className="mos-erp-cockpit-section dw-company-status" aria-label="Digital Company Status">
      <h2 className="mos-erp-cockpit-section__title">DIGITAL COMPANY STATUS</h2>
      <dl className="dw-company-status__grid">
        {metrics.map((m) => (
          <div key={m.id} className={`dw-company-status__item dw-company-status__item--${m.valueTone ?? 'neutral'}`}>
            <dt>{m.label}</dt>
            <dd>{m.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default memo(DigitalCompanyStatusPanel)

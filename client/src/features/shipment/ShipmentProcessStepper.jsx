/** @typedef {import('../../mappers/shipment/shipmentStepperModel.js').ShipmentStepperStep} ShipmentStepperStep */

/**
 * @param {{ steps: ShipmentStepperStep[] }} props
 */
export default function ShipmentProcessStepper({ steps }) {
  if (!steps.length) {
    return <p className="som-muted">Henüz sevk süreci başlamadı.</p>
  }

  return (
    <div className="som-stepper" role="list" aria-label="Sevk süreci">
      {steps.map((step, i) => (
        <div
          key={step.key}
          className={`som-stepper__item som-stepper__item--${step.state}`}
          role="listitem"
        >
          {i > 0 ? <span className="som-stepper__connector" aria-hidden /> : null}
          <div className="som-stepper__card">
            <span className="som-stepper__icon" aria-hidden>
              {step.icon}
            </span>
            <span className="som-stepper__num">{step.stepNumber}</span>
            <p className="som-stepper__label">{step.label}</p>
            {step.subHint ? (
              <p className="som-stepper__sub">{step.subHint}</p>
            ) : null}
            <p className="som-stepper__time">{step.occurredAtLabel ?? '—'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

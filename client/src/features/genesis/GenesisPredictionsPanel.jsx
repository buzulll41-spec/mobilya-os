import { memo } from 'react'

/**
 * @param {{ predictions: { id: string, label: string, detail: string, severityLabel: string }[] }} props
 */
function GenesisPredictionsPanel({ predictions }) {
  return (
    <section className="mos-erp-cockpit-section genesis-predictions" aria-label="Genesis Predictions">
      <h2 className="mos-erp-cockpit-section__title">PREDICTION — YARIN</h2>
      <ul className="genesis-predictions__list">
        {predictions.length === 0 ? (
          <li className="genesis-predictions__empty">Kritik tahmin yok</li>
        ) : (
          predictions.map((p) => (
            <li key={p.id} className={`genesis-predictions__item genesis-predictions__item--${p.severityLabel?.toLowerCase() ?? 'low'}`}>
              <strong>{p.label}</strong>
              <span>{p.detail}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

export default memo(GenesisPredictionsPanel)

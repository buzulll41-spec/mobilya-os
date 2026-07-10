/** @typedef {import('../../../mappers/order/orderHealthBarModel.js').OrderHealthBarModel} OrderHealthBarModel */

/**
 * @param {{ model: OrderHealthBarModel }} props
 */
export default function OrderPanelHealthBar({ model }) {
  const icon =
    model.tone === 'healthy' ? '🟢' : model.tone === 'warning' ? '🟡' : '🔴'

  return (
    <p
      className={`oop-health-bar oop-health-bar--${model.tone}`}
      role="status"
      aria-label={`Sipariş sağlığı: ${model.label}`}
    >
      <span className="oop-health-bar__icon" aria-hidden>
        {icon}
      </span>
      <span className="oop-health-bar__label">{model.label}</span>
      {model.detail ? <span className="oop-health-bar__detail">· {model.detail}</span> : null}
    </p>
  )
}

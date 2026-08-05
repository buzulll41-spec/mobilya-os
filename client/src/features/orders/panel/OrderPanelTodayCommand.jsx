/** @typedef {import('../../../mappers/order/orderTodayCommandModel.js').TodayCommandModel} TodayCommandModel */

/**
 * @param {{ command: TodayCommandModel, onAction?: () => void }} props
 */
export default function OrderPanelTodayCommand({ command, onAction }) {
  return (
    <section
      className={`oop-card oop-card--saas oop-today-command oop-today-command--${command.tone}`}
      aria-labelledby="oop-today-command-title"
    >
      <p id="oop-today-command-title" className="oop-today-command__kicker">
        Bugün bu siparişte
      </p>
      <p className="oop-today-command__message">
        <span className="oop-today-command__icon" aria-hidden>
          {command.icon}
        </span>
        {command.message}
      </p>
      {command.tabTarget && onAction ? (
        <button type="button" className="oop-btn oop-btn--ghost oop-btn--sm" onClick={onAction}>
          İlgili sekmeye git
        </button>
      ) : null}
    </section>
  )
}

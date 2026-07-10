/**
 * @param {{
 *   items: import('../../../mappers/order/orderCommandCenterModel.js').ChecklistItem[]
 * }} props
 */
export default function OperationChecklistCard({ items }) {
  return (
    <section className="oop-card oop-card--checklist" aria-labelledby="oop-checklist-title">
      <h3 id="oop-checklist-title" className="oop-card-title">
        Bugün yapılacaklar
      </h3>
      <ul className="oop-checklist">
        {items.map((item) => (
          <li
            key={item.id}
            className={`oop-checklist__item${item.done ? ' oop-checklist__item--done' : ''}${item.critical ? ' oop-checklist__item--critical' : ''}`}
          >
            <span className="oop-checklist__box" aria-hidden>
              {item.done ? '✓' : ''}
            </span>
            <span className="oop-checklist__label">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

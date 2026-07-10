/** @typedef {import('./collectionPriorityActionsUi.js').CollectionPriorityAction} CollectionPriorityAction */

/**
 * @param {{
 *   actions: CollectionPriorityAction[]
 *   onOpenOrder?: (row: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM) => void
 *   onOpenPayment?: (row: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM) => void
 * }} props
 */
export default function CollectionPriorityActionsPanel({ actions, onOpenOrder, onOpenPayment }) {
  return (
    <aside className="coll-hybrid-aside" aria-labelledby="coll-hybrid-aside-title">
      <h2 id="coll-hybrid-aside-title" className="coll-hybrid-aside__title">
        Öncelikli aksiyonlar
      </h2>
      <p className="coll-hybrid-aside__sub">İlk {actions.length} müşteri — bugün müdahale</p>

      {actions.length === 0 ? (
        <p className="coll-hybrid-aside__empty">Öncelikli kayıt yok.</p>
      ) : (
        <ul className="coll-hybrid-priority-list">
          {actions.map((item, index) => (
            <li key={item.id} className="coll-hybrid-priority-item">
              <button
                type="button"
                className="coll-hybrid-priority-item__main"
                onClick={() => onOpenOrder?.(item.row)}
              >
                <span className="coll-hybrid-priority-item__rank">{index + 1}</span>
                <span className="coll-hybrid-priority-item__body">
                  <span className="coll-hybrid-priority-item__customer">{item.customer}</span>
                  <span className="coll-hybrid-priority-item__meta">
                    {item.orderNo} · {item.actionLabel}
                  </span>
                  <span className="coll-hybrid-priority-item__amount">{item.remainingLabel}</span>
                </span>
              </button>
              <button
                type="button"
                className="coll-hybrid-priority-item__pay"
                onClick={() => onOpenPayment?.(item.row)}
              >
                Ödeme al
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

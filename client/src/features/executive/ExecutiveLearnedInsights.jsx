/**
 * FAZ 41 — CEO Öğrenilenler (kritik AI hafızası).
 * @param {{ items: { id: string, message: string, importance: string, workerLabel: string, entityLabel: string, createdAt: string }[] }} props
 */
export default function ExecutiveLearnedInsights({ items = [] }) {
  return (
    <section className="ecc-learned" aria-label="Öğrenilenler">
      <h2 className="ecc-learned__title">Öğrenilenler</h2>
      {items.length === 0 ? (
        <p className="ecc-empty">Henüz kritik öğrenme kaydı yok.</p>
      ) : (
        <ul className="ecc-learned__list">
          {items.map((item) => (
            <li
              key={item.id}
              className={`ecc-learned__item ecc-learned__item--${item.importance.toLowerCase()}`}
            >
              <span className="ecc-learned__worker">{item.workerLabel}</span>
              <p className="ecc-learned__message">{item.message}</p>
              <span className="ecc-learned__meta">
                {item.entityLabel} · {item.createdAt.slice(0, 10)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

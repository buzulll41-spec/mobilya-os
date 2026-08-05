/**
 * @param {{
 *   moves: { id: string, label: string, at: string }[]
 *   onViewAll?: () => void
 * }} props
 */
export default function OrderPanelRecentMoves({ moves, onViewAll }) {
  return (
    <section className="oop-card oop-card--recent-moves" aria-labelledby="oop-recent-moves-title">
      <div className="oop-card__head oop-card__head--compact">
        <h3 id="oop-recent-moves-title" className="oop-card-title">
          Son hareketler
        </h3>
        {onViewAll ? (
          <button type="button" className="oop-btn oop-btn--ghost oop-btn--sm" onClick={onViewAll}>
            Tümü
          </button>
        ) : null}
      </div>
      {moves.length > 0 ? (
        <ul className="oop-recent-moves">
          {moves.map((m) => (
            <li key={m.id} className="oop-recent-moves__item">
              {m.at} — {m.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="oop-muted oop-recent-moves__empty">Kayıtlı hareket yok.</p>
      )}
    </section>
  )
}

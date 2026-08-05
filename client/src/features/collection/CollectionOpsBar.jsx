/**
 * @param {{
 *   callCount: number
 *   collectibleTotalLabel: string
 *   deliveredOpenCount: number
 *   overdueCount: number
 * }} props
 */
export default function CollectionOpsBar({
  callCount,
  collectibleTotalLabel,
  deliveredOpenCount,
  overdueCount,
}) {
  return (
    <div className="coll-ops-bar" role="status" aria-label="Bugünün operasyon özeti">
      <span className="coll-ops-bar__label">Bugün:</span>
      <span className="coll-ops-bar__item">
        <strong>{callCount}</strong> müşteri aranacak
      </span>
      <span className="coll-ops-bar__sep" aria-hidden>
        ·
      </span>
      <span className="coll-ops-bar__item">
        <strong>{collectibleTotalLabel}</strong> tahsilat potansiyeli
      </span>
      <span className="coll-ops-bar__sep" aria-hidden>
        ·
      </span>
      <span className="coll-ops-bar__item">
        <strong>{deliveredOpenCount}</strong> teslim edilmiş açık bakiye
      </span>
      <span className="coll-ops-bar__sep" aria-hidden>
        ·
      </span>
      <span className="coll-ops-bar__item coll-ops-bar__item--alert">
        <strong>{overdueCount}</strong> gecikmiş tahsilat
      </span>
    </div>
  )
}

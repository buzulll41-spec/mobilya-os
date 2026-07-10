/**
 * @param {{
 *   callCount: number
 *   collectibleTotalLabel: string
 *   deliveredOpenCount: number
 *   overdueCount: number
 * }} props
 */
export default function CollectionTodayTargetCard({
  callCount,
  collectibleTotalLabel,
  deliveredOpenCount,
  overdueCount,
}) {
  return (
    <section className="coll-ops-hero" aria-labelledby="coll-ops-hero-title">
      <h2 id="coll-ops-hero-title" className="coll-ops-hero__title">
        Bugünün operasyon hedefi
      </h2>

      <div className="coll-ops-hero__primary">
        <p className="coll-ops-hero__calls">
          <strong>{callCount}</strong> müşteri aranacak
        </p>
        <p className="coll-ops-hero__amount">{collectibleTotalLabel}</p>
        <p className="coll-ops-hero__amount-label">Tahsil edilebilir bakiye</p>
      </div>

      <div className="coll-ops-hero__foot">
        <span className="coll-ops-hero__chip">
          <strong>{deliveredOpenCount}</strong> teslim edilmiş açık bakiye
        </span>
        <span className="coll-ops-hero__chip coll-ops-hero__chip--alert">
          <strong>{overdueCount}</strong> gecikmiş tahsilat
        </span>
      </div>
    </section>
  )
}

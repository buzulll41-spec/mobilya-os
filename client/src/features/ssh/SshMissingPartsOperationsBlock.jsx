/** @typedef {import('../../mappers/ssh/sshMissingPartsModel.js').SshMissingPartCard} SshMissingPartCard */

/**
 * @param {{
 *   cards: SshMissingPartCard[]
 *   onOpenOrder?: (orderId: string, options?: { tab?: string }) => void
 * }} props
 */
export default function SshMissingPartsOperationsBlock({ cards, onOpenOrder }) {
  return (
    <section className="ssh-ops-block" aria-labelledby="ssh-ops-block-title">
      <header className="ssh-ops-block-head">
        <h2 id="ssh-ops-block-title" className="ssh-ops-block-title">
          Eksik Parça Operasyonları
        </h2>
        <p className="ssh-ops-block-sub">SSH / satış sonrası — sevkten ayrı takip</p>
      </header>

      {cards.length === 0 ? (
        <p className="ssh-ops-empty">Açık eksik parça operasyonu yok.</p>
      ) : (
        <ul className="ssh-ops-card-grid">
          {cards.map((card) => (
            <li key={card.id}>
              <article className={`ssh-ops-card${card.locksShipment ? ' ssh-ops-card--locked' : ''}`}>
                <p className="ssh-ops-card-customer">{card.customer}</p>
                <p className="ssh-ops-card-order">Sipariş: {card.orderNumber}</p>
                <p className="ssh-ops-card-part">
                  <span className="ssh-ops-card-label">Eksik</span> {card.partTitle}
                </p>
                <p className="ssh-ops-card-meta">
                  Tahmini geliş: <strong>{card.estimatedArrivalLabel}</strong>
                </p>
                <p className="ssh-ops-card-row">
                  <span className={`ssh-ops-status ssh-ops-status--${card.uiStatus}`}>
                    {card.statusLabel}
                  </span>
                  <span className={`ssh-ops-risk${card.locksShipment ? ' ssh-ops-risk--high' : ''}`}>
                    Risk: {card.riskLabel}
                  </span>
                </p>
                <button
                  type="button"
                  className="ssh-ops-card-btn"
                  onClick={() => onOpenOrder?.(card.orderId, { tab: 'ssh' })}
                >
                  SSH takibini aç
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

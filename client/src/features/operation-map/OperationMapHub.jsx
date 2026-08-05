import { buildOperationMapHubCounts, OPERATION_MAP_BOARDS } from '../../mappers/operation-map/operationMapModel.js'

/**
 * @param {{
 *   counts: ReturnType<typeof buildOperationMapHubCounts>
 *   onSelectBoard: (boardId: string) => void
 * }} props
 */
export default function OperationMapHub({ counts, onSelectBoard }) {
  return (
    <section className="opmap-hub" aria-label="Operasyon haritası panoları">
      <div className="opmap-hub__grid">
        {OPERATION_MAP_BOARDS.map((board) => {
          const count =
            board.id === 'order'
              ? counts.order
              : board.id === 'shipment'
                ? counts.shipment
                : board.id === 'collection'
                  ? counts.collection
                  : board.id === 'supply'
                    ? counts.supply
                    : board.id === 'ssh'
                      ? counts.ssh
                      : null

          return (
            <button
              key={board.id}
              type="button"
              className={`opmap-hub__card${board.comingSoon ? ' opmap-hub__card--soon' : ''}`}
              disabled={board.comingSoon}
              onClick={() => onSelectBoard(board.id)}
            >
              <span className="opmap-hub__card-head">
                <strong className="opmap-hub__card-title">{board.label}</strong>
                {count != null ? <span className="opmap-hub__card-count">{count}</span> : null}
              </span>
              <span className="opmap-hub__card-desc">{board.description}</span>
              {board.comingSoon ? (
                <span className="opmap-hub__soon-badge">Yakında</span>
              ) : (
                <span className="opmap-hub__card-cta">Akışı aç →</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

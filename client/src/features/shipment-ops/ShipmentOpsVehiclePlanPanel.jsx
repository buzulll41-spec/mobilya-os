/** @typedef {import('../../mappers/shipment-ops/shipmentVehiclePlanModel.js').VehiclePlanColumn} VehiclePlanColumn */

/**
 * @param {{
 *   columns: VehiclePlanColumn[]
 *   selectedDate: string
 *   onOpenDispatchSheet?: (vehicle: string) => void
 * }} props
 */
export default function ShipmentOpsVehiclePlanPanel({ columns, onOpenDispatchSheet }) {
  return (
    <section className="sops-v5-vehicle-plan" aria-label="Günlük araç planı">
      <header className="sops-v5-vehicle-plan__head">
        <h2 className="sops-v5-vehicle-plan__title">Günlük Araç Planı</h2>
      </header>

      <div className="sops-v5-vehicle-plan__grid">
        {columns.map((column) => (
          <article key={column.vehicle} className="sops-v5-vehicle-card">
            <header className="sops-v5-vehicle-card__head">
              <h3 className="sops-v5-vehicle-card__title">{column.vehicle}</h3>
              <span
                className={`sops-v5-vehicle-card__occ sops-v5-vehicle-card__occ--${
                  column.occupancyPercent >= 80 ? 'high' : column.lowOccupancy ? 'low' : 'mid'
                }`}
              >
                %{column.occupancyPercent} dolu
              </span>
            </header>

            {column.lowOccupancy && column.occupancyHint ? (
              <p className="sops-v5-vehicle-card__hint">{column.occupancyHint}</p>
            ) : null}

            {!column.stops.length ? (
              <p className="sops-v5-vehicle-card__empty">Atanmış sevk yok</p>
            ) : (
              <ul className="sops-v5-vehicle-card__stops">
                {column.stops.map((stop) => (
                  <li key={`${column.vehicle}-${stop.orderId}`} className="sops-v5-stop">
                    <div className="sops-v5-stop__time">{stop.hasTime ? stop.time : '—'}</div>
                    <div className="sops-v5-stop__body">
                      <strong>{stop.customer}</strong>
                      <span>{stop.region}</span>
                      <span className="sops-v5-stop__meta">
                        {stop.orderNumber} · {stop.statusLabel}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="sds-vehicle-card__dispatch"
              disabled={!column.stops.length}
              onClick={() => onOpenDispatchSheet?.(column.vehicle)}
            >
              Çıkış fişi
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

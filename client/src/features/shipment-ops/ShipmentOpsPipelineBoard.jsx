import { SHIPMENT_OPS_PIPELINE_COLUMNS } from '../../mappers/shipment/shipmentOpsPipeline.js'
import ShipmentOpsCard from './ShipmentOpsCard.jsx'

/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../mappers/shipment/shipmentOpsPipeline.js').ShipmentPipelineColumnId} ShipmentPipelineColumnId */

/**
 * @param {{
 *   groups: Record<ShipmentPipelineColumnId, ShipmentRowVM[]>
 *   onOpenRow?: (row: ShipmentRowVM) => void
 * }} props
 */
export default function ShipmentOpsPipelineBoard({ groups, onOpenRow }) {
  return (
    <div className="sops-pipeline" role="region" aria-label="Sevk pipeline">
      {SHIPMENT_OPS_PIPELINE_COLUMNS.map((col) => {
        const rows = groups[col.id] ?? []
        return (
          <section key={col.id} className="sops-pipeline__col" data-column={col.id}>
            <header className="sops-pipeline__head">
              <h2 className="sops-pipeline__title">{col.label}</h2>
              <span className="sops-pipeline__count">{rows.length}</span>
            </header>
            <ul className="sops-pipeline__list">
              {rows.length === 0 ? (
                <li className="sops-pipeline__empty">—</li>
              ) : (
                rows.map((row) => (
                  <li key={row.shipmentId ? `${row.id}-${row.shipmentId}` : row.id}>
                    <ShipmentOpsCard row={row} onOpen={onOpenRow} />
                  </li>
                ))
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

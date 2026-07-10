import { useState } from 'react'
import { formatTry } from '../../data/index.js'
import { formatRegionDisplayLabel } from '../../mappers/shipment-ops/shipmentRegionNormalize.js'
import { buildAutoGroupPlans } from '../../mappers/shipment-ops/shipmentVehiclePlanModel.js'
import ShipmentOpsGroupModal from './ShipmentOpsGroupModal.jsx'

/** @typedef {import('../../mappers/shipment-ops/shipmentOpportunityEngine.js').ShipmentOpportunityGroup} ShipmentOpportunityGroup */
/** @typedef {import('../../mappers/shipment-ops/shipmentOpportunityEngine.js').RegionShipmentSummary} RegionShipmentSummary */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @param {{
 *   savingsOpportunities: ShipmentOpportunityGroup[]
 *   regionMap: RegionShipmentSummary[]
 *   allPlans: ShipmentPlan[]
 *   selectedDate: string
 *   onCreateGroup: (input: {
 *     group: ShipmentOpportunityGroup
 *     plans: ShipmentPlan[]
 *   }) => Promise<{
 *     id?: string
 *     groupNo: string
 *     region: string
 *     vehicle: string
 *     crewLabel: string
 *     plannedDate?: string
 *     orderIds?: string[]
 *     orderCount: number
 *     totalAmount: number
 *     estimatedSavings: number
 *     createdAt?: string
 *   }>
 * }} props
 */
export default function ShipmentOpsOpportunityPanel({
  savingsOpportunities,
  regionMap,
  allPlans,
  selectedDate,
  onCreateGroup,
}) {
  const [modalGroup, setModalGroup] = useState(/** @type {ShipmentOpportunityGroup | null} */ (null))
  const [createdGroup, setCreatedGroup] = useState(/** @type {Awaited<ReturnType<typeof onCreateGroup>> | null} */ (null))
  const [creating, setCreating] = useState(false)

  /** @param {ShipmentOpportunityGroup} opp */
  async function handleAutoCreate(opp) {
    setCreating(true)
    try {
      const plans = buildAutoGroupPlans(opp, selectedDate, allPlans)
      const group = await onCreateGroup({ group: opp, plans })
      setCreatedGroup(group)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <aside className="sops-v3-opportunities sops-v5-side" aria-label="Sevk optimizasyonu">
        <section className="sops-v5-side__block">
          <h2 className="sops-v3-opportunities__title">Sevk Tasarruf Fırsatları</h2>
          <p className="sops-v3-opportunities__sub">Aynı bölge · tek araç · maliyet düşürme</p>

          {!savingsOpportunities.length ? (
            <p className="mos-empty sops-v3-opportunities__empty">Bu gün için tasarruf fırsatı yok.</p>
          ) : (
            <div className="sops-v3-opportunities__list">
              {savingsOpportunities.map((opp) => (
                <article key={opp.id} className="sops-v5-savings-card">
                  <h3 className="sops-v5-savings-card__title">⚡ {formatRegionDisplayLabel(opp.region)}</h3>
                  <p className="sops-v5-savings-card__line">{opp.orderCount} sipariş</p>
                  <p className="sops-v5-savings-card__line">{opp.vehiclesNeeded} araç yeterli</p>
                  <p className="sops-v5-savings-card__savings">
                    Tahmini tasarruf: {formatTry(opp.estimatedSavings)}
                  </p>
                  <div className="sops-v3-opp-card__actions">
                    <button
                      type="button"
                      className="mos-btn mos-btn-primary"
                      disabled={creating}
                      onClick={() => handleAutoCreate(opp)}
                    >
                      Sevk grubu oluştur
                    </button>
                    <button type="button" className="mos-btn mos-btn--ghost" onClick={() => setModalGroup(opp)}>
                      Detay / düzenle
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="sops-v5-side__block">
          <h2 className="sops-v5-region-map__title">Bölge Haritası</h2>
          {!regionMap.length ? (
            <p className="mos-empty sops-v3-opportunities__empty">Bölge eşleşmesi yok.</p>
          ) : (
            <ul className="sops-v5-region-map__list">
              {regionMap.map((entry) => (
                <li key={entry.region} className="sops-v5-region-map__row">
                  <strong>{formatRegionDisplayLabel(entry.region)}</strong>
                  <span>{entry.orderCount} sipariş</span>
                  {entry.orderCount >= 2 ? (
                    <span className="sops-v5-region-map__save">{formatTry(entry.estimatedSavings)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      <ShipmentOpsGroupModal
        group={modalGroup}
        allPlans={allPlans}
        selectedDate={selectedDate}
        onCreateGroup={async (input) => {
          const group = await onCreateGroup(input)
          setCreatedGroup(group)
          setModalGroup(null)
        }}
        onClose={() => setModalGroup(null)}
      />

      {createdGroup ? (
        <div className="sops-v3-modal-backdrop" role="presentation" onClick={() => setCreatedGroup(null)}>
          <div
            className="sops-v3-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sops-v3-modal__head">
              <div>
                <h2 className="sops-v3-modal__title">Sevk grubu oluşturuldu</h2>
                <p className="sops-v3-modal__sub">{createdGroup.groupNo}</p>
              </div>
            </header>
            <div className="sops-v3-modal__body">
              <ul className="sops-v5-group-summary">
                <li>
                  <span>Grup No</span>
                  <strong>{createdGroup.groupNo}</strong>
                </li>
                <li>
                  <span>Araç</span>
                  <strong>{createdGroup.vehicle}</strong>
                </li>
                <li>
                  <span>Ekip</span>
                  <strong>{createdGroup.crewLabel}</strong>
                </li>
                <li>
                  <span>Toplam sipariş</span>
                  <strong>{createdGroup.orderCount}</strong>
                </li>
                <li>
                  <span>Toplam tutar</span>
                  <strong>{formatTry(createdGroup.totalAmount)}</strong>
                </li>
                <li>
                  <span>Tahmini tasarruf</span>
                  <strong>{formatTry(createdGroup.estimatedSavings)}</strong>
                </li>
              </ul>
            </div>
            <footer className="sops-v3-modal__foot">
              <button type="button" className="mos-btn mos-btn-primary" onClick={() => setCreatedGroup(null)}>
                Tamam
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  )
}

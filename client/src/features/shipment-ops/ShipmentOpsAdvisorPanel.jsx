import { useState } from 'react'
import { buildAutoGroupPlans } from '../../mappers/shipment-ops/shipmentVehiclePlanModel.js'

/** @typedef {import('../../mappers/shipment-ops/dispatchAdvisorEngine.js').DispatchAdviceItem} DispatchAdviceItem */
/** @typedef {import('../../mappers/shipment-ops/dispatchAdvisorEngine.js').DispatchAdvisorView} DispatchAdvisorView */
/** @typedef {import('../../mappers/shipment-ops/shipmentOpportunityEngine.js').ShipmentOpportunityGroup} ShipmentOpportunityGroup */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @param {{
 *   advisor: DispatchAdvisorView
 *   selectedDate: string
 *   allPlans: ShipmentPlan[]
 *   onAutoPlan: (input: { group: ShipmentOpportunityGroup, plans: ShipmentPlan[] }) => Promise<void>
 *   onRecordRisks?: () => void
 * }} props
 */
export default function ShipmentOpsAdvisorPanel({
  advisor,
  selectedDate,
  allPlans,
  onAutoPlan,
}) {
  const [planningId, setPlanningId] = useState(/** @type {string | null} */ (null))
  const [plannedId, setPlannedId] = useState(/** @type {string | null} */ (null))

  /** @param {DispatchAdviceItem} item */
  async function handleAutoPlan(item) {
    if (!item.group) return
    setPlanningId(item.id)
    try {
      const plans = buildAutoGroupPlans(item.group, selectedDate, allPlans)
      await onAutoPlan({ group: item.group, plans })
      setPlannedId(item.id)
    } finally {
      setPlanningId(null)
    }
  }

  const totalAdvice =
    advisor.savings.length + advisor.wait.length + advisor.risks.length

  return (
    <section className="sops-v8-advisor" aria-label="Operasyon tavsiyeleri">
      <header className="sops-v8-advisor__head">
        <div>
          <h2 className="sops-v8-advisor__title">Operasyon Tavsiyeleri</h2>
          <p className="sops-v8-advisor__sub">
            AI Dispatch Advisor — {totalAdvice} aktif öneri
          </p>
        </div>
        <div className="sops-v8-advisor__health">
          <span className="sops-v8-advisor__health-label">Operasyon Sağlığı</span>
          <strong className="sops-v8-advisor__health-value">{advisor.health.label}</strong>
        </div>
      </header>

      <div className="sops-v8-advisor__grid">
        <AdviceColumn
          tone="green"
          emoji="🟢"
          title="Tasarruf Fırsatları"
          items={advisor.savings}
          empty="Bu gün için birleştirme fırsatı yok."
          renderAction={(item) =>
            item.canAutoPlan && item.group ? (
              <button
                type="button"
                className="sops-v8-advisor__action"
                disabled={planningId === item.id || plannedId === item.id}
                onClick={() => void handleAutoPlan(item)}
              >
                {plannedId === item.id
                  ? 'Planlandı ✓'
                  : planningId === item.id
                    ? 'Planlanıyor…'
                    : 'Otomatik Planla'}
              </button>
            ) : null
          }
        />

        <AdviceColumn
          tone="yellow"
          emoji="🟡"
          title="Bekleme Fırsatları"
          items={advisor.wait}
          empty="Erteleme avantajı görünmüyor."
        />

        <AdviceColumn
          tone="red"
          emoji="🔴"
          title="Riskler"
          items={advisor.risks}
          empty="Kritik risk tespit edilmedi."
        />
      </div>
    </section>
  )
}

/**
 * @param {{
 *   tone: 'green' | 'yellow' | 'red'
 *   emoji: string
 *   title: string
 *   items: DispatchAdviceItem[]
 *   empty: string
 *   renderAction?: (item: DispatchAdviceItem) => import('react').ReactNode
 * }} props
 */
function AdviceColumn({ tone, emoji, title, items, empty, renderAction }) {
  return (
    <div className={`sops-v8-advisor__col sops-v8-advisor__col--${tone}`}>
      <h3 className="sops-v8-advisor__col-title">
        {emoji} {title}
      </h3>
      {!items.length ? (
        <p className="sops-v8-advisor__empty">{empty}</p>
      ) : (
        <ul className="sops-v8-advisor__list">
          {items.map((item) => (
            <li key={item.id} className="sops-v8-advisor__card">
              <strong className="sops-v8-advisor__card-title">{item.title}</strong>
              {item.lines.map((line) => (
                <p key={line} className="sops-v8-advisor__card-line">
                  {line}
                </p>
              ))}
              {item.recommendation ? (
                <p className="sops-v8-advisor__card-rec">{item.recommendation}</p>
              ) : null}
              {renderAction?.(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import {
  COMMERCIAL_STATE_LABELS,
  FINANCIAL_STATE_LABELS,
  FULFILLMENT_STATE_LABELS,
  INSTALLATION_STATE_LABELS,
  OPERATIONAL_RISK_STATE_LABELS,
  PRODUCTION_STATE_LABELS,
  labelFor,
} from '../../mappers/operational/operationalStateLabelsTr.js'

/** @typedef {import('../../contracts/v1/orderOperationalState.js').OrderOperationalState} OrderOperationalState */

const ROWS = [
  ['Ticari', COMMERCIAL_STATE_LABELS, 'commercialState'],
  ['Finans', FINANCIAL_STATE_LABELS, 'financialState'],
  ['Üretim', PRODUCTION_STATE_LABELS, 'productionState'],
  ['Sevk / Teslim', FULFILLMENT_STATE_LABELS, 'fulfillmentState'],
  ['Montaj', INSTALLATION_STATE_LABELS, 'installationState'],
  ['Risk', OPERATIONAL_RISK_STATE_LABELS, 'riskState'],
]

/**
 * @param {{ operationalState?: OrderOperationalState }} props
 */
export default function OperationalStateLayers({ operationalState }) {
  if (!operationalState) {
    return <p className="mos-drawer-p-meta">Operasyon katmanları yüklenemedi.</p>
  }

  return (
    <dl className="mos-op-state-layers">
      {ROWS.map(([title, labels, key]) => (
        <div key={key}>
          <dt>{title}</dt>
          <dd>{labelFor(labels, operationalState[/** @type {keyof OrderOperationalState} */ (key)])}</dd>
        </div>
      ))}
    </dl>
  )
}

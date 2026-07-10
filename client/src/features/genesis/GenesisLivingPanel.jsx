import { memo } from 'react'

/**
 * @param {{ living: { phaseLabel: string, riskLevel: string, riskScore: number, heartbeatCount: number, breathing?: boolean } }} props
 */
function GenesisLivingPanel({ living }) {
  return (
    <section className="mos-erp-cockpit-section genesis-living" aria-label="Genesis Living State">
      <h2 className="mos-erp-cockpit-section__title">GENESIS — YAŞAYAN ŞİRKET</h2>
      <div className={`genesis-living__pulse ${living.breathing ? 'is-breathing' : ''}`}>
        <span className="genesis-living__phase">{living.phaseLabel}</span>
        <span className="genesis-living__meta">
          Risk: {living.riskLevel} ({living.riskScore}) · Nabız #{living.heartbeatCount}
        </span>
      </div>
    </section>
  )
}

export default memo(GenesisLivingPanel)

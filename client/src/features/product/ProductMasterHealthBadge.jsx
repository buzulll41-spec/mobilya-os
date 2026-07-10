import { resolveProductHealthScore } from './productMasterCenterUi.js'

/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
function healthToneClass(tone) {
  if (tone === 'success') return 'mos-pmc-health--success'
  if (tone === 'warning') return 'mos-pmc-health--warning'
  return 'mos-pmc-health--critical'
}

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
function healthDot(tone) {
  if (tone === 'success') return '🟢'
  if (tone === 'warning') return '🟡'
  return '🔴'
}

/**
 * @param {{
 *   product: ProductMasterCenterRowVm
 *   compact?: boolean
 *   showDot?: boolean
 * }} props
 */
export default function ProductMasterHealthBadge({ product, compact = false, showDot = true }) {
  const health = resolveProductHealthScore(product)
  const title =
    health.missingLabels.length > 0
      ? `Eksik: ${health.missingLabels.join(', ')}`
      : 'Ürün kaydı tam'

  return (
    <span
      className={`mos-pmc-health mos-pmc-health-badge${compact ? ' mos-pmc-health-badge--compact' : ''} ${healthToneClass(health.tone)}`}
      title={title}
    >
      {showDot ? <span className="mos-pmc-health-badge__dot">{healthDot(health.tone)}</span> : null}
      <span className="mos-pmc-health-badge__score">{health.score}</span>
    </span>
  )
}

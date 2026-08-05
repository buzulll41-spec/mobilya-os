import {
  healthMissingIcon,
  healthScoreDot,
  healthToneClass,
  resolveProductHealthScore,
} from './productMasterCenterUi.js'

/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */

/**
 * @param {{
 *   product: ProductMasterCenterRowVm
 *   productName?: string
 * }} props
 */
export default function ProductMasterHealthReport({ product, productName }) {
  const health = resolveProductHealthScore(product)
  const name = productName ?? product.name
  const missing = health.items.filter((item) => !item.earned)
  const completed = health.items.filter((item) => item.earned)

  return (
    <section className="mos-pmc-health-report" aria-label="Ürün sağlık raporu">
      <header className="mos-pmc-health-report__head">
        <h3 className="mos-pmc-health-report__title">ÜRÜN SAĞLIK RAPORU</h3>
        <p className="mos-pmc-health-report__product">{name}</p>
        <div className={`mos-pmc-health-score ${healthToneClass(health.tone)}`}>
          <span className="mos-pmc-health-score__label">Sağlık:</span>
          <span className="mos-pmc-health-score__value">{health.score}</span>
          <span className="mos-pmc-health-score__max">/100</span>
        </div>
      </header>

      {missing.length > 0 ? (
        <div className="mos-pmc-health-report__block">
          <h4 className="mos-pmc-health-report__block-title">Eksikler</h4>
          <ul className="mos-pmc-health-report__list">
            {missing.map((item) => (
              <li key={item.id} className="mos-pmc-health-report__item is-missing">
                <span className="mos-pmc-health-report__icon">
                  {healthMissingIcon(item.missingSeverity)}
                </span>
                <span>{item.missingLabel}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mos-pmc-health-missing mos-pmc-health-missing--ok">
          Tüm sağlık kriterleri tamam — 100/100
        </p>
      )}

      {completed.length > 0 ? (
        <div className="mos-pmc-health-report__block">
          <h4 className="mos-pmc-health-report__block-title">Tamamlananlar</h4>
          <ul className="mos-pmc-health-report__list">
            {completed.map((item) => (
              <li key={item.id} className="mos-pmc-health-report__item is-ok">
                <span className="mos-pmc-health-report__icon">{healthScoreDot('success')}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mos-pmc-health-report__breakdown" aria-label="Puan dağılımı">
        {health.items.map((item) => (
          <li key={item.id} className={item.earned ? 'is-ok' : 'is-miss'}>
            <span className="mos-pmc-health-report__group">{item.group}</span>
            <span>{item.label}</span>
            <span className="mos-pmc-health-report__points">
              {item.earned ? item.points : 0}/{item.points}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

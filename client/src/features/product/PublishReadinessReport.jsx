import {
  publishReadinessToneClass,
  resolvePublishReadiness,
} from './publishReadinessUi.js'

/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */

/**
 * @param {{
 *   product: ProductMasterCenterRowVm
 *   productName?: string
 * }} props
 */
export default function PublishReadinessReport({ product, productName }) {
  const readiness = resolvePublishReadiness(product)
  const name = productName ?? product.name
  const missing = readiness.items.filter((item) => !item.earned)
  const completed = readiness.items.filter((item) => item.earned)

  return (
    <section className="mos-pmc-health-report mos-ppr-report" aria-label="Yayın hazırlık raporu">
      <header className="mos-pmc-health-report__head">
        <h3 className="mos-pmc-health-report__title">YAYIN HAZIRLIK RAPORU</h3>
        <p className="mos-pmc-health-report__product">{name}</p>
        <div className={`mos-ppr-badge ${publishReadinessToneClass(readiness.tone)}`}>
          <span className="mos-ppr-badge__dot" aria-hidden />
          <span>{readiness.statusLabel}</span>
          <span className="mos-ppr-badge__score">{readiness.score}/100</span>
        </div>
      </header>

      {missing.length > 0 ? (
        <div className="mos-pmc-health-report__block">
          <h4 className="mos-pmc-health-report__block-title">Yayına çıkması için gereken eksikler</h4>
          <ul className="mos-pmc-health-report__list">
            {missing.map((item) => (
              <li key={item.id} className="mos-pmc-health-report__item is-missing">
                <span className="mos-pmc-health-report__icon" aria-hidden>
                  ✗
                </span>
                <span>{item.missingLabel}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mos-pmc-health-missing mos-pmc-health-missing--ok">
          Tüm yayın kriterleri tamam — EVTREND&apos;e yayınlanabilir
        </p>
      )}

      {completed.length > 0 ? (
        <div className="mos-pmc-health-report__block">
          <h4 className="mos-pmc-health-report__block-title">Tamamlananlar</h4>
          <ul className="mos-pmc-health-report__list">
            {completed.map((item) => (
              <li key={item.id} className="mos-pmc-health-report__item is-ok">
                <span className="mos-pmc-health-report__icon" aria-hidden>
                  ✓
                </span>
                <span>{item.okLabel}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mos-pmc-health-report__breakdown" aria-label="Puan dağılımı">
        {readiness.items.map((item) => (
          <li key={item.id} className={item.earned ? 'is-ok' : 'is-miss'}>
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

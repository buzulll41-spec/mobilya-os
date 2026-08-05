import { memo } from 'react'
import { CATALOG_NAV_CATEGORIES } from '../../../constants/productCatalog.js'

/**
 * @param {{
 *   activeCategory: string
 *   countsByKey: Record<string, number>
 *   onSelect: (categoryValue: string, navKey: string) => void
 * }} props
 */
function CatalogPickerCategoryNav({ activeCategory, countsByKey, onSelect }) {
  return (
    <nav className="catalog-picker-categories" aria-label="Kategoriler">
      <p className="catalog-picker-categories__title">Kategoriler</p>
      <ul className="catalog-picker-categories__list">
        {CATALOG_NAV_CATEGORIES.map((nav) => {
          const isActive =
            activeCategory === nav.value ||
            (activeCategory === '' && nav.key === 'all')
          return (
            <li key={nav.key}>
              <button
                type="button"
                className={`catalog-picker-categories__item${isActive ? ' is-active' : ''}`}
                onClick={() => onSelect(nav.value, nav.key)}
              >
                <span className="catalog-picker-categories__label">{nav.label}</span>
                <span className="catalog-picker-categories__count" aria-hidden>
                  {countsByKey[nav.key] ?? '—'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default memo(CatalogPickerCategoryNav)

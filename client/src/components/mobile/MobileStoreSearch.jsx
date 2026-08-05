import GlobalSearchInput from '../GlobalSearchInput.jsx'

/**
 * @param {{
 *   value: string
 *   onChange: (v: string) => void
 *   orders?: import('../../data/seedOrders.js').Order[]
 *   onSelectResult?: (result: import('../../utils/globalSearchExperience.js').GlobalSearchResult) => void
 *   onCommitSearch?: (query: string, results: import('../../utils/globalSearchExperience.js').GlobalSearchResult[]) => void
 * }} props
 */
export default function MobileStoreSearch({
  value,
  onChange,
  orders = [],
  onSelectResult,
  onCommitSearch,
}) {
  return (
    <div className="mos-mobile-store-search">
      <GlobalSearchInput
        className="mos-mobile-store-search__input"
        value={value}
        onChange={onChange}
        orders={orders}
        onSelectResult={onSelectResult}
        onCommitSearch={onCommitSearch}
        placeholder="Telefon, müşteri adı veya sipariş no…"
      />
      <p className="mos-mobile-store-search__hint">Örn: 0532, Aykut, MO-2024</p>
    </div>
  )
}

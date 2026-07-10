import { memo } from 'react'
import { formatTry } from '../../../data/dashboardHelpers.js'

/** @typedef {import('../../../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */

/**
 * @param {{
 *   items: ProductListItemDto[]
 *   loading: boolean
 *   emptyMessage?: string
 *   onToggle: (product: ProductListItemDto) => void
 *   selectedIds: Set<string>
 * }} props
 */
function CatalogPickerProductTable({
  items,
  loading,
  emptyMessage = 'Bu kategoride ürün yok.',
  onToggle,
  selectedIds,
}) {
  if (loading && items.length === 0) {
    return <p className="catalog-picker-list__loading mos-muted">Yükleniyor…</p>
  }

  if (!loading && items.length === 0) {
    return <p className="catalog-picker-list__empty mos-muted">{emptyMessage}</p>
  }

  return (
    <div className="catalog-picker-table-wrap">
      <table className="catalog-picker-table">
        <thead>
          <tr>
            <th scope="col">Ürün</th>
            <th scope="col">Kod</th>
            <th scope="col">Takım / Grup</th>
            <th scope="col" className="catalog-picker-table__num">
              Satış Fiyatı
            </th>
            <th scope="col">Tedarikçi</th>
            <th scope="col" className="catalog-picker-table__select-col">
              Seç
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((product) => (
            <CatalogPickerRow
              key={product.id}
              product={product}
              onToggle={onToggle}
              isSelected={selectedIds.has(product.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * @param {{
 *   product: ProductListItemDto
 *   onToggle: (p: ProductListItemDto) => void
 *   isSelected: boolean
 * }} props
 */
const CatalogPickerRow = memo(function CatalogPickerRow({ product, onToggle, isSelected }) {
  const sale = Number.parseFloat(product.defaultSalePrice)

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(product)
    }
  }

  return (
    <tr
      className={`catalog-picker-table__row--clickable${isSelected ? ' catalog-picker-table__row--selected' : ''}`}
      onClick={() => onToggle(product)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${product.productName} seç`}
    >
      <td className="catalog-picker-table__product-cell">
        <div className="catalog-picker-product-cell">
          <span className="catalog-picker-thumb" aria-hidden title="Görsel yakında">
            ◫
          </span>
          <div className="catalog-picker-product-cell__text">
            <strong className="catalog-picker-table__name">{product.productName}</strong>
            <span className="catalog-picker-table__code">{product.productCode}</span>
          </div>
        </div>
      </td>
      <td className="mos-muted">{product.productCode}</td>
      <td className="mos-muted">{product.suiteType ?? '—'}</td>
      <td className="catalog-picker-table__num catalog-picker-table__price">
        {formatTry(Number.isFinite(sale) ? sale : 0)}
      </td>
      <td className="mos-muted catalog-picker-table__supplier">
        {product.defaultSupplierName ?? '—'}
      </td>
      <td className="catalog-picker-table__select-col">
        <span
          className={`catalog-picker-checkbox${isSelected ? ' catalog-picker-checkbox--checked' : ''}`}
          aria-hidden
        >
          {isSelected ? (
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden>
              <path d="M6.2 11.2 3.4 8.4l-1 1 3.8 3.8 8-8-1-1-7 7.2z" />
            </svg>
          ) : null}
        </span>
      </td>
    </tr>
  )
})

export default memo(CatalogPickerProductTable)

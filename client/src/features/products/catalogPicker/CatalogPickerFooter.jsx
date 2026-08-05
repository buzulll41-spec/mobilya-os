import { memo } from 'react'
import { formatTry } from '../../../data/dashboardHelpers.js'
import {
  CATALOG_PICKER_WIZARD_CONFIRM_LABEL,
  isCatalogPickerConfirmEnabled,
} from './catalogPickerModel.js'

/** @typedef {import('../../../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */

/**
 * @param {{
 *   selected: ProductListItemDto[]
 *   totalAmount: number
 *   onRemoveAt: (index: number) => void
 *   onCancel: () => void
 *   onConfirm: () => void
 *   confirmLabel?: string
 * }} props
 */
function CatalogPickerFooter({
  selected,
  totalAmount,
  onRemoveAt,
  onCancel,
  onConfirm,
  confirmLabel = CATALOG_PICKER_WIZARD_CONFIRM_LABEL,
}) {
  const count = selected.length
  const confirmEnabled = isCatalogPickerConfirmEnabled(count)

  return (
    <footer className="catalog-picker-footer">
      <div className="catalog-picker-footer__left">
        <p className="catalog-picker-footer__heading">
          Seçilen ürünler <span className="catalog-picker-footer__count">({count})</span>
        </p>
        {count === 0 ? (
          <p className="catalog-picker-footer__hint">Henüz ürün seçilmedi.</p>
        ) : (
          <ul className="catalog-picker-chips" aria-label="Seçilen ürünler">
            {selected.map((p, i) => (
              <li key={`${p.id}-${i}`} className="catalog-picker-chip">
                <span className="catalog-picker-chip__label">{p.productName}</span>
                <button
                  type="button"
                  className="catalog-picker-chip__remove"
                  aria-label={`${p.productName} kaldır`}
                  onClick={() => onRemoveAt(i)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="catalog-picker-footer__right">
        <div className="catalog-picker-footer__totals">
          <span className="catalog-picker-footer__total-label">Toplam:</span>
          <strong className="catalog-picker-footer__total-value">{formatTry(totalAmount)}</strong>
          <span className="mos-muted catalog-picker-footer__item-count">{count} ürün</span>
        </div>
        <div className="catalog-picker-footer__actions">
          <button type="button" className="mos-btn mos-btn-ghost" onClick={onCancel}>
            Vazgeç
          </button>
          <button
            type="button"
            className={`catalog-picker-footer__confirm${confirmEnabled ? ' catalog-picker-footer__confirm--ready' : ''}`}
            disabled={!confirmEnabled}
            aria-disabled={!confirmEnabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </footer>
  )
}

export default memo(CatalogPickerFooter)

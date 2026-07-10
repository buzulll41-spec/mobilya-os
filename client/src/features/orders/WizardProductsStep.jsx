import { useMemo, useRef, useState } from 'react'
import ProductCatalogPicker from '../products/ProductCatalogPicker.jsx'
import {
  CATALOG_PICKER_WIZARD_CONFIRM_LABEL,
  mergeCatalogIntoWizardProducts,
} from '../products/catalogPicker/catalogPickerModel.js'
import { validateLineConfiguration } from '../../constants/productConfigurationSchema.js'
import {
  buildWizardLineConfiguration,
  hasWizardProducts,
  isWizardLineFilled,
  PRODUCT_GROUPS,
  wizardLineConfigContext,
} from './newOrderWizardModel.js'
import ProductLineConfiguration from './ProductLineConfiguration.jsx'
import { shouldAutoOpenProductsCatalog } from './wizardProductsCatalogFlow.js'
import WizardProductPriceInput from './WizardProductPriceInput.jsx'
import {
  computeProductsStepSummary,
  formatWizardMoney,
  wizardLineTotal,
} from './wizardProductsUi.js'

/** @typedef {import('./newOrderWizardModel.js').NewOrderWizardForm} NewOrderWizardForm */
/** @typedef {import('./newOrderWizardModel.js').WizardProductLine} WizardProductLine */

/**
 * @param {{
 *   form: NewOrderWizardForm
 *   locked: boolean
 *   totals: { total: number; kapora: number; remaining: number }
 *   patchProduct: (id: string, patch: Partial<WizardProductLine>) => void
 *   addProduct: () => void
 *   removeProduct: (id: string) => void
 *   replaceProducts: (products: WizardProductLine[]) => void
 * }} props
 */
export default function WizardProductsStep({
  form,
  locked,
  totals,
  patchProduct,
  addProduct,
  removeProduct,
  replaceProducts,
}) {
  const summary = computeProductsStepSummary(form)
  const hasProducts = hasWizardProducts(form)
  const catalogDismissedRef = useRef(false)
  const [catalogOpen, setCatalogOpen] = useState(() =>
    shouldAutoOpenProductsCatalog({
      locked,
      hasProducts,
      userDismissed: false,
    }),
  )

  function openCatalog() {
    if (locked) return
    catalogDismissedRef.current = false
    setCatalogOpen(true)
  }

  function closeCatalog() {
    setCatalogOpen(false)
    catalogDismissedRef.current = true
  }

  function handleCatalogConfirm(picked) {
    const merged = mergeCatalogIntoWizardProducts(form.products, picked, null)
    replaceProducts(merged)
    setCatalogOpen(false)
    catalogDismissedRef.current = false
  }

  const showEmptyPanel = !hasProducts && !catalogOpen

  return (
    <div className="now-products-step">
      <ProductCatalogPicker
        open={catalogOpen}
        onClose={closeCatalog}
        selectionMode="cart"
        confirmLabel={CATALOG_PICKER_WIZARD_CONFIRM_LABEL}
        onConfirm={handleCatalogConfirm}
      />

      <div className="now-products-scroll">
        {showEmptyPanel ? (
          <div className="now-products-empty" role="status">
            <p className="now-products-empty__text">
              Henüz ürün eklenmedi. Katalogdan ürün ekleyerek başlayın.
            </p>
            <button type="button" className="now-catalog-cta" disabled={locked} onClick={openCatalog}>
              Katalogdan ürün ekle
            </button>
            <button type="button" className="now-catalog-manual-link" disabled={locked} onClick={addProduct}>
              Katalog dışı ürün ekle
            </button>
          </div>
        ) : null}

        {hasProducts ? (
          <>
            <ul className="now-product-lines" aria-label="Seçilen ürünler">
              {form.products.map((line, index) => (
                <ProductLineItem
                  key={line.id}
                  line={line}
                  index={index}
                  locked={locked}
                  patchProduct={patchProduct}
                  removeProduct={removeProduct}
                />
              ))}
            </ul>
            <footer className="now-products-list-foot">
              <button type="button" className="now-catalog-text-link" disabled={locked} onClick={openCatalog}>
                Katalogdan ürün ekle
              </button>
              <span className="now-products-list-foot__sep" aria-hidden>
                ·
              </span>
              <button type="button" className="now-catalog-manual-link" disabled={locked} onClick={addProduct}>
                Katalog dışı ürün ekle
              </button>
            </footer>
          </>
        ) : null}
      </div>

      <div className="now-products-summary" aria-live="polite">
        <p className="now-products-summary-count">
          Ürün sayısı: <strong>{summary.productCount}</strong>
        </p>
        <p className="now-products-summary-total">
          Toplam: <strong>{formatWizardMoney(totals.subtotal)}</strong>
        </p>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   line: WizardProductLine
 *   index: number
 *   locked: boolean
 *   patchProduct: (id: string, patch: Partial<WizardProductLine>) => void
 *   removeProduct: (id: string) => void
 * }} props
 */
function ProductLineItem({ line, index, locked, patchProduct, removeProduct }) {
  const lineTotal = wizardLineTotal(line)
  const isCatalog = Boolean(line.productId || line.fromCatalog)
  const isManual = !isCatalog
  const showRow = isWizardLineFilled(line) || isManual
  const configCtx = useMemo(() => wizardLineConfigContext(line), [line])
  const configValidation = useMemo(() => {
    return validateLineConfiguration(configCtx, buildWizardLineConfiguration(line))
  }, [line, configCtx])

  if (!showRow) return null

  return (
    <li className="now-product-line-wrap">
      <article className="now-product-line" aria-label={`Ürün ${index + 1}`}>
        <div className="now-product-line__main">
          <div className="now-product-line__info">
            {isCatalog ? (
              <p className="now-product-line__name now-product-line__name--hero">{line.name || '—'}</p>
            ) : (
              <label className="now-product-line__name-edit">
                <span className="now-sr-only">Ürün adı</span>
                <input
                  className="now-product-line__name-input now-product-line__name-input--hero"
                  value={line.name}
                  onChange={(e) => patchProduct(line.id, { name: e.target.value })}
                  disabled={locked}
                  placeholder="Ürün adı yazın"
                  required
                />
              </label>
            )}
            <div className="now-product-line__meta">
              {line.productCode ? <span className="now-product-line__code">{line.productCode}</span> : null}
              {line.defaultSupplierName ? (
                <span className="now-product-line__supplier">{line.defaultSupplierName}</span>
              ) : null}
              {line.group ? <span className="now-product-line__badge">{line.group}</span> : null}
              {line.fromCatalog ? <span className="now-pl-catalog-tag">Katalog</span> : null}
            </div>
          </div>

          <div className="now-product-line__commerce">
            <div className="now-product-line__field">
              <span className="now-product-line__field-label">Adet</span>
              <div className="now-pl-qty-stepper">
                <button
                  type="button"
                  className="now-pl-qty-stepper__btn"
                  disabled={locked}
                  aria-label="Adet azalt"
                  onClick={() => stepWizardQty(line, -1, patchProduct)}
                >
                  −
                </button>
                <input
                  className="now-pl-input now-pl-input--qty"
                  type="number"
                  min="0.01"
                  step="1"
                  value={line.qty}
                  onChange={(e) => patchProduct(line.id, { qty: e.target.value })}
                  disabled={locked}
                  required
                  aria-label="Adet"
                />
                <button
                  type="button"
                  className="now-pl-qty-stepper__btn"
                  disabled={locked}
                  aria-label="Adet artır"
                  onClick={() => stepWizardQty(line, 1, patchProduct)}
                >
                  +
                </button>
              </div>
            </div>
            <label className="now-product-line__field now-product-line__field--price">
              <span className="now-product-line__field-label">Birim fiyat</span>
              <WizardProductPriceInput
                value={line.unitPrice}
                onChange={(v) => patchProduct(line.id, { unitPrice: v })}
                disabled={locked}
                className="now-pl-input now-pl-input--price"
              />
            </label>
          </div>

          <div className="now-product-line__end">
            <div className="now-product-line__total">
              <span className="now-product-line__field-label">Toplam</span>
              <strong className="now-product-line__total-value">{formatWizardMoney(lineTotal)}</strong>
            </div>
            <button
              type="button"
              className="now-pl-remove"
              disabled={locked}
              onClick={() => removeProduct(line.id)}
              aria-label="Satırı sil"
              title="Sil"
            >
              <span aria-hidden>×</span>
            </button>
          </div>
        </div>

        <div className="now-product-line__config-row">
          {isManual ? (
            <label className="now-product-line__note-group">
              <span className="now-sr-only">Grup</span>
              <select
                className="now-product-line__group-select"
                value={line.group}
                onChange={(e) => patchProduct(line.id, { group: e.target.value })}
                disabled={locked}
                aria-label="Ürün grubu"
              >
                {PRODUCT_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <ProductLineConfiguration
            ctx={configCtx}
            productTitle={line.name.trim() || undefined}
            configuration={line.configuration ?? {}}
            onChange={(configuration) => patchProduct(line.id, { configuration })}
            disabled={locked}
            warnings={configValidation.warnings}
            errors={configValidation.errors}
          />
        </div>
      </article>
    </li>
  )
}

/** @param {WizardProductLine} line */
function parseWizardQty(line) {
  const n = Number.parseFloat(String(line.qty ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** @param {number} n */
function formatWizardQtyValue(n) {
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n))
  return String(Math.round(n * 100) / 100)
}

/**
 * @param {WizardProductLine} line
 * @param {number} delta
 * @param {(id: string, patch: Partial<WizardProductLine>) => void} patchProduct
 */
function stepWizardQty(line, delta, patchProduct) {
  const next = Math.max(0.01, parseWizardQty(line) + delta)
  patchProduct(line.id, { qty: formatWizardQtyValue(next) })
}

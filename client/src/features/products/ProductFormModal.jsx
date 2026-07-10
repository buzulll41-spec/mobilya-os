import { useEffect, useState } from 'react'
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STOCK_TYPE,
  PRODUCT_STOCK_TYPE_LABELS,
  PRODUCT_SUITE_TYPES,
} from '../../constants/productCatalog.js'
import {
  SALES_SOURCE_TYPE,
  SALES_SOURCE_TYPE_OPTIONS,
  DISPLAY_FLOOR_OPTIONS,
  EXTERNAL_SUPPLY_TYPE_OPTIONS,
  PHYSICAL_LOCATION_OPTIONS,
  validateProductSourceSelection,
} from '../../constants/productSource.js'
import { useModalDismiss } from '../../hooks/useModalDismiss.js'

const SOURCE_ERROR_LABELS = {
  salesSourceType: 'Satış kaynağı seçin.',
  displayFloor: 'Sergi katı seçin.',
  externalSupplyType: 'Dış tedarik tipi seçin.',
  physicalLocation: 'Geçersiz fiziksel lokasyon.',
}

/** @typedef {import('../../contracts/v1/product.js').ProductDetailDto} ProductDetailDto */
/** @typedef {import('../../contracts/v1/product.js').CreateProductRequest} CreateProductRequest */
/** @typedef {import('../../contracts/v1/supplier.js').SupplierListItemDto} SupplierListItemDto */

/**
 * @param {{
 *   open: boolean
 *   initial?: ProductDetailDto | null
 *   suppliers: SupplierListItemDto[]
 *   saving?: boolean
 *   error?: string | null
 *   onClose: () => void
 *   onSubmit: (body: CreateProductRequest) => Promise<void>
 * }} props
 */
export default function ProductFormModal({
  open,
  initial,
  suppliers,
  saving,
  error,
  onClose,
  onSubmit,
}) {
  const [productCode, setProductCode] = useState('')
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0])
  const [suiteType, setSuiteType] = useState(PRODUCT_SUITE_TYPES[0])
  const [defaultSalePrice, setDefaultSalePrice] = useState('')
  const [minSalePrice, setMinSalePrice] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [defaultSupplierId, setDefaultSupplierId] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('14')
  const [stockType, setStockType] = useState(/** @type {import('../../contracts/v1/product.js').ProductStockType} */ ('ORDER'))
  const [description, setDescription] = useState('')
  const [salesSourceType, setSalesSourceType] = useState(SALES_SOURCE_TYPE.IN_STORE_DISPLAY)
  const [displayFloor, setDisplayFloor] = useState('')
  const [externalSupplyType, setExternalSupplyType] = useState('')
  const [physicalLocation, setPhysicalLocation] = useState('')
  const [sourceError, setSourceError] = useState('')

  useModalDismiss(open, onClose)

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect -- modal açılışında form sıfırlanır */
    if (initial) {
      setProductCode(initial.productCode)
      setProductName(initial.productName)
      setCategory(initial.category)
      setSuiteType(initial.suiteType ?? PRODUCT_SUITE_TYPES[0])
      setDefaultSalePrice(String(Number.parseFloat(initial.defaultSalePrice)))
      setMinSalePrice(String(Number.parseFloat(initial.minSalePrice)))
      setPurchasePrice(String(Number.parseFloat(initial.purchasePrice)))
      setDefaultSupplierId(initial.defaultSupplierId ?? '')
      setDeliveryDays(String(initial.deliveryDays))
      setStockType(initial.stockType)
      setDescription(initial.description ?? '')
      setSalesSourceType(initial.salesSourceType ?? SALES_SOURCE_TYPE.IN_STORE_DISPLAY)
      setDisplayFloor(initial.displayFloor ?? '')
      setExternalSupplyType(initial.externalSupplyType ?? '')
      setPhysicalLocation(initial.physicalLocation ?? '')
    } else {
      setProductCode('')
      setProductName('')
      setCategory(PRODUCT_CATEGORIES[0])
      setSuiteType(PRODUCT_SUITE_TYPES[0])
      setDefaultSalePrice('')
      setMinSalePrice('')
      setPurchasePrice('')
      setDefaultSupplierId(suppliers[0]?.id ?? '')
      setDeliveryDays('14')
      setStockType(PRODUCT_STOCK_TYPE.ORDER)
      setDescription('')
      setSalesSourceType(SALES_SOURCE_TYPE.IN_STORE_DISPLAY)
      setDisplayFloor('')
      setExternalSupplyType('')
      setPhysicalLocation('')
    }
    setSourceError('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initial, suppliers])

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    const sale = Number.parseFloat(defaultSalePrice.replace(',', '.'))
    const min = Number.parseFloat(minSalePrice.replace(',', '.'))
    const purchase = Number.parseFloat(purchasePrice.replace(',', '.'))
    const days = Number.parseInt(deliveryDays, 10)
    if (!productCode.trim() || !productName.trim()) return
    if (!Number.isFinite(sale) || !Number.isFinite(min) || !Number.isFinite(purchase)) return

    const sourceSelection = validateProductSourceSelection({
      salesSourceType,
      displayFloor,
      externalSupplyType,
      physicalLocation,
    })
    if (!sourceSelection.valid) {
      setSourceError(SOURCE_ERROR_LABELS[sourceSelection.field] ?? 'Satış kaynağı bilgisi eksik.')
      return
    }
    setSourceError('')

    /** @type {CreateProductRequest} */
    const body = {
      productCode: productCode.trim(),
      productName: productName.trim(),
      category,
      suiteType,
      defaultSalePrice: sale,
      minSalePrice: min,
      purchasePrice: purchase,
      deliveryDays: Number.isFinite(days) && days > 0 ? days : 14,
      stockType,
      salesSourceType,
      ...(salesSourceType === SALES_SOURCE_TYPE.IN_STORE_DISPLAY ? { displayFloor } : {}),
      ...(salesSourceType === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY ? { externalSupplyType } : {}),
      ...(physicalLocation ? { physicalLocation } : {}),
      ...(defaultSupplierId ? { defaultSupplierId } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      isActive: true,
    }
    await onSubmit(body)
  }

  return (
    <div className="mos-modal-root" role="presentation">
      <button type="button" className="mos-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <form
        className="mos-modal product-form-modal"
        role="dialog"
        aria-modal="true"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <header className="mos-modal-head">
          <h2 className="mos-modal-title">{initial ? 'Ürün kartını düzenle' : 'Yeni ürün kartı'}</h2>
          <button type="button" className="mos-modal-close" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>
        <div className="mos-modal-body product-form-grid">
          {error ? <p className="mos-api-error-text">{error}</p> : null}
          <label className="mos-field">
            <span>Ürün kodu</span>
            <input
              className="mos-input"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              required
              disabled={Boolean(initial)}
            />
          </label>
          <label className="mos-field">
            <span>Ürün adı</span>
            <input
              className="mos-input"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </label>
          <label className="mos-field">
            <span>Kategori</span>
            <select className="mos-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="mos-field">
            <span>Takım tipi</span>
            <select className="mos-input" value={suiteType} onChange={(e) => setSuiteType(e.target.value)}>
              {PRODUCT_SUITE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="mos-field">
            <span>Varsayılan satış</span>
            <input
              className="mos-input"
              inputMode="decimal"
              value={defaultSalePrice}
              onChange={(e) => setDefaultSalePrice(e.target.value)}
              required
            />
          </label>
          <label className="mos-field">
            <span>Minimum satış</span>
            <input
              className="mos-input"
              inputMode="decimal"
              value={minSalePrice}
              onChange={(e) => setMinSalePrice(e.target.value)}
              required
            />
          </label>
          <label className="mos-field">
            <span>Alış fiyatı</span>
            <input
              className="mos-input"
              inputMode="decimal"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              required
            />
          </label>
          <label className="mos-field">
            <span>Tedarikçi</span>
            <select
              className="mos-input"
              value={defaultSupplierId}
              onChange={(e) => setDefaultSupplierId(e.target.value)}
            >
              <option value="">— Seçilmedi —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.companyName}
                </option>
              ))}
            </select>
          </label>
          <label className="mos-field">
            <span>Teslim süresi (gün)</span>
            <input
              className="mos-input"
              inputMode="numeric"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(e.target.value)}
            />
          </label>
          <label className="mos-field">
            <span>Stok tipi</span>
            <select
              className="mos-input"
              value={stockType}
              onChange={(e) =>
                setStockType(/** @type {import('../../contracts/v1/product.js').ProductStockType} */ (e.target.value))
              }
            >
              {Object.entries(PRODUCT_STOCK_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="mos-field">
            <span>Satış kaynağı</span>
            <select
              className="mos-input"
              value={salesSourceType}
              onChange={(e) => {
                setSalesSourceType(e.target.value)
                setSourceError('')
              }}
              required
            >
              {SALES_SOURCE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {salesSourceType === SALES_SOURCE_TYPE.IN_STORE_DISPLAY ? (
            <label className="mos-field">
              <span>Sergi katı</span>
              <select
                className="mos-input"
                value={displayFloor}
                onChange={(e) => {
                  setDisplayFloor(e.target.value)
                  setSourceError('')
                }}
                required
              >
                <option value="">— Seçilmedi —</option>
                {DISPLAY_FLOOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {salesSourceType === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY ? (
            <label className="mos-field">
              <span>Dış tedarik tipi</span>
              <select
                className="mos-input"
                value={externalSupplyType}
                onChange={(e) => {
                  setExternalSupplyType(e.target.value)
                  setSourceError('')
                }}
                required
              >
                <option value="">— Seçilmedi —</option>
                {EXTERNAL_SUPPLY_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="mos-field">
            <span>Fiziksel lokasyon</span>
            <select
              className="mos-input"
              value={physicalLocation}
              onChange={(e) => setPhysicalLocation(e.target.value)}
            >
              <option value="">— Seçilmedi —</option>
              {PHYSICAL_LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {sourceError ? (
            <p className="mos-api-error-text product-form-note">{sourceError}</p>
          ) : null}
          <label className="mos-field product-form-note">
            <span>Not</span>
            <textarea
              className="mos-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <footer className="mos-modal-foot">
          <button type="button" className="mos-btn mos-btn-ghost" onClick={onClose}>
            İptal
          </button>
          <button type="submit" className="mos-btn mos-btn-primary" disabled={saving}>
            {saving ? 'Kaydediliyor…' : initial ? 'Güncelle' : 'Oluştur'}
          </button>
        </footer>
      </form>
    </div>
  )
}

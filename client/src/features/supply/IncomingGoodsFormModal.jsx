import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEMO_TODAY } from '../../data/constants.js'
import { INCOMING_GOODS_PURPOSE } from '../../contracts/v1/incomingGoodsPurpose.js'
import { useModalDismiss } from '../../hooks/useModalDismiss.js'
import { erpOpsButtonClass } from '../../lib/actionButtonVariants.js'
import { parseCurrencyInput, formatCurrencyInput } from '../../lib/formatCurrencyInput.js'
import MosCurrencyInput from '../../components/MosCurrencyInput.jsx'
import PendingOrderLinePicker from './PendingOrderLinePicker.jsx'
import ProductCatalogPicker from '../products/ProductCatalogPicker.jsx'
import * as productsClient from '../../services/productsClient.js'
import {
  pendingQtyFromLine,
  resolveIncomingFormSupplier,
  resolveSupplierIdForPendingLine,
  resolveSupplierNameForPendingLine,
  isSupplierEditableForIncomingPurpose,
  isSupplierLockedForIncomingForm,
  SUPPLIER_LOCKED_HINT,
} from './incomingCustomerOrderForm.js'

/** @typedef {import('../../contracts/v1/incomingGoods.js').CreateIncomingGoodsRequest} CreateIncomingGoodsRequest */
/** @typedef {import('../../contracts/v1/supplier.js').SupplierListItemDto} SupplierListItemDto */
/** @typedef {import('../../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto} PendingOrderLineForIncomingDto */

const PURPOSE_OPTIONS = [
  { value: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER, label: 'Müşteri siparişi' },
  { value: INCOMING_GOODS_PURPOSE.STOCK, label: 'Stok' },
  { value: INCOMING_GOODS_PURPOSE.DISPLAY, label: 'Teşhir' },
]

/**
 * @param {{
 *   open: boolean
 *   suppliers: SupplierListItemDto[]
 *   defaultSupplierId?: string | null
 *   saving?: boolean
 *   error?: string | null
 *   pendingSearch?: string
 *   pendingOrderId?: string
 *   preferredLineId?: string
 *   aiProcurementOrderIds?: Set<string>
 *   onClose: () => void
 *   onSubmit: (body: CreateIncomingGoodsRequest) => Promise<void>
 * }} props
 */
export default function IncomingGoodsFormModal({
  open,
  suppliers,
  defaultSupplierId,
  saving,
  error,
  pendingSearch = '',
  pendingOrderId = '',
  preferredLineId = '',
  aiProcurementOrderIds = new Set(),
  onClose,
  onSubmit,
}) {
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? '')
  const [receivedAt, setReceivedAt] = useState(DEMO_TODAY)
  const [productTitle, setProductTitle] = useState('')
  const [productGroup, setProductGroup] = useState('')
  const [qty, setQty] = useState('')
  const [unitPurchasePrice, setUnitPurchasePrice] = useState('')
  const [purpose, setPurpose] = useState(INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [documentNo, setDocumentNo] = useState('')
  const [note, setNote] = useState('')
  const [selectedLine, setSelectedLine] = useState(/** @type {PendingOrderLineForIncomingDto | null} */ (null))
  const [productId, setProductId] = useState('')
  const [catalogOpen, setCatalogOpen] = useState(false)

  useModalDismiss(open, onClose)

  useEffect(() => {
    if (!open) return
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- modal her açılışta form sıfırlanır */
    setSupplierId('')
    setReceivedAt(DEMO_TODAY)
    setProductTitle('')
    setProductGroup('')
    setQty('')
    setUnitPurchasePrice('')
    setPurpose(INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER)
    setInvoiceNo('')
    setDocumentNo('')
    setNote('')
    setSelectedLine(null)
    setProductId('')
    setCatalogOpen(false)
  }, [open, suppliers])

  const isCustomerOrder = purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER
  const isSupplierLocked = isSupplierLockedForIncomingForm(purpose, selectedLine)
  const isSupplierEditable = isSupplierEditableForIncomingPurpose(purpose)
  const lockedSupplierName = selectedLine
    ? resolveSupplierNameForPendingLine(selectedLine, suppliers)
    : ''

  useEffect(() => {
    if (!open || !selectedLine?.productId || isSupplierLocked) return
    let cancelled = false
    ;(async () => {
      try {
        const product = await productsClient.getProduct(selectedLine.productId)
        if (cancelled || !product) return
        setProductId(product.id)
        if (
          isSupplierEditable &&
          product.defaultSupplierId &&
          suppliers.some((s) => s.id === product.defaultSupplierId)
        ) {
          setSupplierId(product.defaultSupplierId)
        }
        const purchase = Number.parseFloat(product.purchasePrice)
        if (Number.isFinite(purchase)) setUnitPurchasePrice(String(purchase))
        if (!productGroup.trim()) setProductGroup(product.category)
      } catch {
        /* katalog yüklenemezse elle giriş devam eder */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, selectedLine?.productId, selectedLine?.orderLineId, suppliers, productGroup, isSupplierLocked, isSupplierEditable])

  const lineTotal = useMemo(() => {
    const q = Number.parseFloat(qty.replace(',', '.'))
    const p = parseCurrencyInput(unitPurchasePrice)
    if (!Number.isFinite(q) || !Number.isFinite(p)) return null
    return formatCurrencyInput(q * p)
  }, [qty, unitPurchasePrice])

  const supplierPickerOptions = useMemo(
    () =>
      suppliers
        .filter((s) => s.isActive)
        .map((s) => ({ id: s.id, label: s.companyName })),
    [suppliers],
  )

  const applyPendingLineSelection = useCallback(
    /** @param {PendingOrderLineForIncomingDto | null} row */
    (row) => {
      setSelectedLine(row)
      if (!row) {
        setProductId('')
        if (purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) setSupplierId('')
        return
      }
      setProductTitle(row.productTitle)
      if (row.productId) setProductId(row.productId)
      else setProductId('')
      const supplierForLine = resolveSupplierIdForPendingLine(row, suppliers)
      if (supplierForLine) setSupplierId(supplierForLine)
      const pending = pendingQtyFromLine(row)
      if (pending != null) setQty(String(pending))
    },
    [purpose, suppliers],
  )

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    const q = Number.parseFloat(qty.replace(',', '.'))
    const p = parseCurrencyInput(unitPurchasePrice)
    const effectiveSupplierId = resolveIncomingFormSupplier(
      selectedLine,
      purpose,
      suppliers,
      supplierId,
    )
    if (!effectiveSupplierId || !Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p < 0) return

    /** @type {CreateIncomingGoodsRequest} */
    const body = {
      supplierId: effectiveSupplierId,
      receivedAt,
      productTitle: productTitle.trim(),
      qty: q,
      unitPurchasePrice: p,
      purpose,
      ...(productGroup.trim() ? { productGroup: productGroup.trim() } : {}),
      ...(invoiceNo.trim() ? { invoiceNo: invoiceNo.trim() } : {}),
      ...(documentNo.trim() ? { documentNo: documentNo.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(productId ? { productId } : {}),
      ...(isCustomerOrder && selectedLine ? { orderLineId: selectedLine.orderLineId } : {}),
    }
    await onSubmit(body)
  }

  return (
    <div className="mos-modal-root" role="presentation">
      <ProductCatalogPicker
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        selectionMode="immediate"
        title="Gelen ürün — katalogdan seç"
        subtitle="Ürün seçildiğinde alış fiyatı ve tedarikçi otomatik doldurulur."
        onSelect={(p) => {
          setProductId(p.id)
          setProductTitle(p.productName)
          setProductGroup(p.category)
          setUnitPurchasePrice(String(Math.round(Number.parseFloat(p.purchasePrice))))
          if (isSupplierEditable && p.defaultSupplierId) setSupplierId(p.defaultSupplierId)
          setCatalogOpen(false)
        }}
      />
      <button type="button" className="mos-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="mos-modal mos-modal--wide mos-modal--v1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incoming-goods-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="mos-modal-head">
          <h2 id="incoming-goods-title" className="mos-modal-title">
            Gelen ürün kaydı
          </h2>
          <button type="button" className="mos-modal-x" aria-label="Kapat" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="mos-modal-body mos-erp-modal-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="mos-form-grid mos-form-grid--2">
            <label className="mos-field">
              <span className="mos-label">Tedarikçi</span>
              {isSupplierLocked ? (
                <>
                  <input
                    className="mos-input mos-input--readonly"
                    value={lockedSupplierName || '—'}
                    readOnly
                    disabled
                    aria-readonly="true"
                  />
                  <p className="mos-incoming-supplier-lock-hint">{SUPPLIER_LOCKED_HINT}</p>
                </>
              ) : isCustomerOrder ? (
                <>
                  <select className="mos-input" value="" disabled aria-disabled="true">
                    <option value="">Bekleyen sipariş kalemi seçin</option>
                  </select>
                </>
              ) : (
                <select
                  className="mos-input"
                  value={supplierId}
                  required
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">Seçin</option>
                  {suppliers.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.companyName}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="mos-field">
              <span className="mos-label">Geliş tarihi</span>
              <input
                type="date"
                className="mos-input"
                value={receivedAt}
                required
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </label>
            <label className="mos-field">
              <span className="mos-label">Ürün adı</span>
              <button
                type="button"
                className="mos-erp-ops__btn mos-erp-modal-inline-btn"
                onClick={() => setCatalogOpen(true)}
              >
                Katalogdan seç
              </button>
              <input
                className="mos-input"
                value={productTitle}
                required
                onChange={(e) => {
                  setProductTitle(e.target.value)
                  setProductId('')
                }}
              />
            </label>
            <label className="mos-field">
              <span className="mos-label">Ürün grubu</span>
              <input className="mos-input" value={productGroup} onChange={(e) => setProductGroup(e.target.value)} />
            </label>
            <label className="mos-field">
              <span className="mos-label">Adet</span>
              <input
                className="mos-input"
                inputMode="decimal"
                value={qty}
                required
                onChange={(e) => setQty(e.target.value)}
              />
            </label>
            <label className="mos-field">
              <span className="mos-label">Alış fiyatı (birim)</span>
              <MosCurrencyInput
                className="mos-input"
                value={unitPurchasePrice}
                required
                onChange={setUnitPurchasePrice}
              />
            </label>
          </div>

          {lineTotal ? (
            <p className="mos-incoming-line-total">
              Satır toplamı: <strong>{lineTotal}</strong>
            </p>
          ) : null}

          <fieldset className="mos-field">
            <legend className="mos-label">Ürün amacı</legend>
            <div className="mos-incoming-purpose">
              {PURPOSE_OPTIONS.map((opt) => (
                <label key={opt.value} className="mos-incoming-purpose__opt">
                  <input
                    type="radio"
                    name="purpose"
                    value={opt.value}
                    checked={purpose === opt.value}
                    onChange={() => {
                      const next = opt.value
                      setPurpose(next)
                      setSelectedLine(null)
                      if (next === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) {
                        setSupplierId('')
                      } else {
                        setSupplierId(defaultSupplierId ?? suppliers.find((s) => s.isActive)?.id ?? '')
                      }
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {isCustomerOrder ? (
            <section className="mos-incoming-picker-section">
              <h3 className="mos-incoming-picker-section__title">Bekleyen sipariş kalemi</h3>
              <PendingOrderLinePicker
                selectedId={selectedLine?.orderLineId ?? null}
                initialSearch={pendingSearch}
                orderIdFilter={pendingOrderId}
                preferredLineId={preferredLineId}
                supplierOptions={supplierPickerOptions}
                listResetKey={open}
                aiProcurementOrderIds={aiProcurementOrderIds}
                onSelect={applyPendingLineSelection}
              />
            </section>
          ) : null}

          <div className="mos-form-grid mos-form-grid--2">
            <label className="mos-field">
              <span className="mos-label">Fatura no</span>
              <input className="mos-input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
            </label>
            <label className="mos-field">
              <span className="mos-label">Belge no</span>
              <input className="mos-input" value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} />
            </label>
          </div>

          <label className="mos-field">
            <span className="mos-label">Not</span>
            <textarea className="mos-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {error ? <p className="mos-form-toast mos-form-toast--error">{error}</p> : null}

          <div className="mos-modal-actions">
            <button type="button" className={erpOpsButtonClass('Vazgeç')} onClick={onClose}>
              Vazgeç
            </button>
            <button
              type="submit"
              className={erpOpsButtonClass('Kaydet')}
              disabled={saving || (isCustomerOrder && !selectedLine)}
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

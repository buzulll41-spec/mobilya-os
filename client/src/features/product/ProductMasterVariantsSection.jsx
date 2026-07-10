import { useMemo, useState } from 'react'
import {
  VARIANT_STOCK_STATUS_LABELS,
  buildVariantWritePayload,
  emptyVariantForm,
  variantToForm,
} from '../../lib/productMasterVariantForm.js'
import MosCurrencyInput from '../../components/MosCurrencyInput.jsx'

/** @typedef {import('../../contracts/v1/productMaster.js').ProductMasterVariantDto} ProductMasterVariantDto */

/**
 * @param {{
 *   mode: 'create' | 'edit'
 *   productCode: string
 *   variants: ProductMasterVariantDto[]
 *   saving?: boolean
 *   onCreate: (payload: Record<string, unknown>) => Promise<void>
 *   onUpdate: (variantId: string, payload: Record<string, unknown>) => Promise<void>
 *   onPassive: (variantId: string) => Promise<void>
 *   embedded?: boolean
 * }} props
 */
export default function ProductMasterVariantsSection({
  mode,
  productCode,
  variants,
  saving = false,
  onCreate,
  onUpdate,
  onPassive,
  embedded = false,
}) {
  const [editingId, setEditingId] = useState(/** @type {string | null} */ (null))
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(() => emptyVariantForm(productCode))
  const [localError, setLocalError] = useState(/** @type {string | null} */ (null))

  const activeVariants = useMemo(() => variants.filter((v) => v.isActive !== false), [variants])

  const Wrapper = embedded ? 'div' : 'section'
  const wrapperClass = embedded ? 'mos-pmc-variant-panel' : 'mos-pmc-drawer__section'
  const wrapperLabel = embedded ? undefined : 'Varyantlar'

  if (mode === 'create') {
    return (
      <Wrapper className={wrapperClass} aria-label={wrapperLabel}>
        {!embedded ? <h3 className="mos-pmc-drawer__section-title">VARYANTLAR</h3> : null}
        <p className="mos-pmc-drawer__hint">Önce ürünü kaydedin, ardından varyant ekleyebilirsiniz.</p>
      </Wrapper>
    )
  }

  /** @param {keyof ReturnType<typeof emptyVariantForm>} key */
  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function startAdd() {
    setLocalError(null)
    setEditingId(null)
    setAdding(true)
    setForm(emptyVariantForm(productCode))
  }

  /** @param {ProductMasterVariantDto} variant */
  function startEdit(variant) {
    setLocalError(null)
    setAdding(false)
    setEditingId(variant.id)
    setForm(variantToForm(variant))
  }

  function cancelForm() {
    setLocalError(null)
    setAdding(false)
    setEditingId(null)
    setForm(emptyVariantForm(productCode))
  }

  async function handleSave() {
    if (!form.variantCode.trim() || !form.name.trim()) {
      setLocalError('Varyant kodu ve adı zorunludur')
      return
    }
    setLocalError(null)
    const payload = buildVariantWritePayload(form)
    try {
      if (adding) {
        await onCreate(payload)
        cancelForm()
      } else if (editingId) {
        await onUpdate(editingId, payload)
        cancelForm()
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Varyant kaydedilemedi')
    }
  }

  /** @param {string} variantId */
  async function handlePassive(variantId) {
    setLocalError(null)
    try {
      await onPassive(variantId)
      if (editingId === variantId) cancelForm()
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Varyant pasifleştirilemedi')
    }
  }

  const showForm = adding || editingId

  return (
    <Wrapper className={wrapperClass} aria-label={wrapperLabel}>
      <div className="mos-pmc-drawer__head-row">
        {!embedded ? <h3 className="mos-pmc-drawer__section-title">VARYANTLAR</h3> : null}
        {!showForm ? (
          <button type="button" className="mos-erp-ops__btn" disabled={saving} onClick={startAdd}>
            + Varyant ekle
          </button>
        ) : null}
      </div>

      {localError ? (
        <p className="mos-erp-ops__alert" role="alert">
          {localError}
        </p>
      ) : null}

      {activeVariants.length === 0 && !showForm ? (
        <p className="mos-pmc-drawer__hint">Henüz varyant yok. Renk, kumaş veya ölçü varyantı ekleyin.</p>
      ) : (
        <div className="mos-pmc-variant-list">
          {activeVariants.map((v) => (
            <div key={v.id} className="mos-pmc-variant-row">
              <div className="mos-pmc-variant-row__main">
                <strong>{v.name}</strong>
                <span className="mos-pmc-variant-row__code">{v.variantCode}</span>
                {v.isDefault ? <span className="mos-pmc-variant-row__badge">Varsayılan</span> : null}
              </div>
              <div className="mos-pmc-variant-row__meta">
                {[v.color, v.fabric, v.sizeLabel].filter(Boolean).join(' · ') || '—'}
                {v.stockStatusLabel ? ` · ${v.stockStatusLabel}` : ''}
              </div>
              <div className="mos-pmc-variant-row__actions">
                <button type="button" className="mos-erp-ops__btn" disabled={saving} onClick={() => startEdit(v)}>
                  Düzenle
                </button>
                <button
                  type="button"
                  className="mos-erp-ops__btn"
                  disabled={saving}
                  onClick={() => void handlePassive(v.id)}
                >
                  Pasifleştir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="mos-pmc-variant-form">
          <h4 className="mos-pmc-drawer__sub">{adding ? 'Yeni varyant' : 'Varyant düzenle'}</h4>
          <div className="mos-pmc-section__grid">
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Varyant kodu *</span>
              <input
                className="mos-pmc-field__input"
                value={form.variantCode}
                onChange={(e) => setField('variantCode', e.target.value)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Ad *</span>
              <input
                className="mos-pmc-field__input"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Barkod</span>
              <input
                className="mos-pmc-field__input"
                value={form.barcode}
                onChange={(e) => setField('barcode', e.target.value)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Satış fiyatı</span>
              <MosCurrencyInput
                className="mos-pmc-field__input"
                value={form.salePrice}
                onChange={(v) => setField('salePrice', v)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Alış fiyatı</span>
              <MosCurrencyInput
                className="mos-pmc-field__input"
                value={form.purchasePrice}
                onChange={(v) => setField('purchasePrice', v)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Stok adedi</span>
              <input
                className="mos-pmc-field__input"
                type="number"
                value={form.stockQuantity}
                onChange={(e) => setField('stockQuantity', e.target.value)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Stok durumu</span>
              <select
                className="mos-pmc-field__input"
                value={form.stockStatus}
                onChange={(e) => setField('stockStatus', e.target.value)}
              >
                {Object.entries(VARIANT_STOCK_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Renk</span>
              <input
                className="mos-pmc-field__input"
                value={form.color}
                onChange={(e) => setField('color', e.target.value)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Kumaş</span>
              <input
                className="mos-pmc-field__input"
                value={form.fabric}
                onChange={(e) => setField('fabric', e.target.value)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit">
              <span className="mos-pmc-field__label">Ölçü etiketi</span>
              <input
                className="mos-pmc-field__input"
                value={form.sizeLabel}
                onChange={(e) => setField('sizeLabel', e.target.value)}
              />
            </label>
            <label className="mos-pmc-field mos-pmc-field--edit mos-pmc-field--checkbox">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setField('isDefault', e.target.checked)}
              />
              <span className="mos-pmc-field__label">Varsayılan varyant</span>
            </label>
          </div>
          <div className="mos-pmc-drawer__actions">
            <button
              type="button"
              className="mos-erp-ops__btn mos-erp-ops__btn--primary"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? 'Kaydediliyor…' : 'Varyantı kaydet'}
            </button>
            <button type="button" className="mos-erp-ops__btn" disabled={saving} onClick={cancelForm}>
              İptal
            </button>
          </div>
        </div>
      ) : null}
    </Wrapper>
  )
}

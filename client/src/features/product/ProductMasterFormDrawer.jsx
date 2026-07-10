import { useEffect, useMemo, useState } from 'react'
import { CATALOG_FILTER_CATEGORIES, PRODUCT_STOCK_TYPE_LABELS } from '../../constants/productCatalog.js'
import {
  ASSEMBLY_TYPE_OPTIONS,
  COATING_TYPE_OPTIONS,
  MECHANISM_TYPE_OPTIONS,
  PRODUCT_TYPE_LABELS,
} from '../../constants/productMasterCore.js'
import {
  DISPLAY_FLOOR_OPTIONS,
  EXTERNAL_SUPPLY_TYPE_OPTIONS,
  PHYSICAL_LOCATION_OPTIONS,
  SALES_SOURCE_TYPE,
  SALES_SOURCE_TYPE_LABELS,
} from '../../constants/productSource.js'
import {
  PUBLISH_STATUS,
  PUBLISH_STATUS_LABELS,
} from '../../mappers/product/productMasterCenterModel.js'
import { erpOpsButtonClass } from '../../lib/actionButtonVariants.js'
import { formatProductMoney } from '../../lib/formatProductMoney.js'
import MosCurrencyInput from '../../components/MosCurrencyInput.jsx'

import ProductMasterVariantsSection from './ProductMasterVariantsSection.jsx'
import ProductMasterMediaSection from './ProductMasterMediaSection.jsx'
import ProductMasterWooSection from './ProductMasterWooSection.jsx'
import ProductMasterHealthReport from './ProductMasterHealthReport.jsx'
import { computeNetPurchasePrice } from '../../lib/productPurchaseCost.js'
import { computeProductHealthReport } from '../../mappers/product/productMasterCenterModel.js'

/** @typedef {import('./productMasterFormTypes.js').ProductMasterFormState} ProductMasterFormState */
/** @typedef {import('../../mappers/product/productMasterCenterModel.js').PublishStatus} PublishStatus */
/** @typedef {import('../../contracts/v1/productMaster.js').ProductMasterVariantDto} ProductMasterVariantDto */

/** @typedef {'genel' | 'operasyon' | 'fiyat' | 'varyantlar' | 'medya' | 'saglik' | 'woocommerce' | 'yayin' | 'teknik'} DrawerTabId */

const DRAWER_TABS = /** @type {{ id: DrawerTabId; label: string }[]} */ ([
  { id: 'genel', label: 'Genel' },
  { id: 'operasyon', label: 'Operasyon' },
  { id: 'fiyat', label: 'Fiyat' },
  { id: 'varyantlar', label: 'Varyantlar' },
  { id: 'medya', label: 'Medya' },
  { id: 'saglik', label: 'Sağlık' },
  { id: 'woocommerce', label: 'WooCommerce' },
  { id: 'yayin', label: 'Yayın' },
  { id: 'teknik', label: 'Teknik' },
])

/**
 * @param {{ profitAmount: number; profitPercent: number }} profit
 */
function formatProfit(profit) {
  return {
    amount: formatProductMoney(String(profit.profitAmount)),
    percent: `%${profit.profitPercent}`,
  }
}

/**
 * @param {ProductMasterFormState} form
 */
function computeFormProfit(form) {
  const wholesale = Number(form.wholesalePrice) || 0
  const discount = Number(form.wholesaleDiscountRate) || 0
  const cost =
    wholesale > 0
      ? computeNetPurchasePrice(wholesale, discount)
      : Number(form.costPrice) || 0
  const sale = Number(form.salePrice) || Number(form.listPrice) || 0
  const profitAmount = sale - cost
  const profitPercent = sale > 0 ? Math.round((profitAmount / sale) * 100) : 0
  return { profitAmount, profitPercent }
}

/**
 * @param {{
 *   label: string
 *   value: string | number
 *   onChange: (v: string) => void
 *   type?: string
 *   multiline?: boolean
 *   required?: boolean
 * }} props
 */
function FormField({ label, value, onChange, type = 'text', multiline = false, required = false }) {
  return (
    <label className="mos-pmc-field mos-pmc-field--edit">
      <span className="mos-pmc-field__label">
        {label}
        {required ? ' *' : ''}
      </span>
      {multiline ? (
        <textarea
          className="mos-pmc-field__input mos-pmc-field__input--area"
          value={String(value ?? '')}
          rows={label.includes('Galeri') ? 3 : label.includes('Uzun') ? 5 : 3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : type === 'currency' ? (
        <MosCurrencyInput
          className="mos-pmc-field__input"
          value={String(value ?? '')}
          onChange={onChange}
          required={required}
        />
      ) : (
        <input
          className="mos-pmc-field__input"
          type={type}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}

/**
 * @param {{ label: string; value: string; className?: string }} props
 */
function ReadField({ label, value, className = '' }) {
  return (
    <div className={`mos-pmc-field mos-pmc-field--read${className ? ` ${className}` : ''}`}>
      <span className="mos-pmc-field__label">{label}</span>
      <span className="mos-pmc-field__value">{value || '—'}</span>
    </div>
  )
}

/**
 * @param {{
 *   open: boolean
 *   mode: 'create' | 'edit'
 *   form: ProductMasterFormState
 *   saving?: boolean
 *   error?: string | null
 *   suppliers?: { id: string; companyName: string }[]
 *   onClose: () => void
 *   onChange: (patch: Partial<ProductMasterFormState>) => void
 *   onSave: () => void
 *   onPassive?: () => void
 *   variants?: ProductMasterVariantDto[]
 *   onCreateVariant?: (payload: Record<string, unknown>) => Promise<void>
 *   onUpdateVariant?: (variantId: string, payload: Record<string, unknown>) => Promise<void>
 *   onPassiveVariant?: (variantId: string) => Promise<void>
 *   productId?: string | null
 *   onMediaSaved?: () => void
 *   woo?: import('../../contracts/v1/productMaster.js').ProductMasterWooDto | null
 *   onPrepareWooSync?: () => void
 *   onPublishWooDraft?: () => void
 *   healthProduct?: import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm | null
 * }} props
 */
export default function ProductMasterFormDrawer({
  open,
  mode,
  form,
  saving = false,
  error = null,
  suppliers = [],
  variants = [],
  onClose,
  onChange,
  onSave,
  onPassive,
  onCreateVariant,
  onUpdateVariant,
  onPassiveVariant,
  productId = null,
  onMediaSaved,
  woo = null,
  onPrepareWooSync,
  onPublishWooDraft,
  healthProduct = null,
}) {
  const [activeTab, setActiveTab] = useState(/** @type {DrawerTabId} */ ('genel'))

  useEffect(() => {
    if (!open) return
    setActiveTab('genel')
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  const profit = useMemo(() => formatProfit(computeFormProfit(form)), [form])
  const netPurchasePrice = useMemo(() => {
    const wholesale = Number(form.wholesalePrice) || 0
    const discount = Number(form.wholesaleDiscountRate) || 0
    if (wholesale > 0) return computeNetPurchasePrice(wholesale, discount)
    return Number(form.costPrice) || 0
  }, [form.wholesalePrice, form.wholesaleDiscountRate, form.costPrice])

  const healthSnapshot = useMemo(() => {
    const base = healthProduct ?? {
      name: form.name,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      shortDescription: form.shortDescription,
      longDescription: form.longDescription,
      technicalSpecs: [],
      technicalAttributes: form.technicalAttributes ?? [],
      media: {
        mainImageUrl: form.mainImageUrl ?? null,
        galleryImageUrls: [],
        videoUrl: null,
        catalogPdfUrl: null,
      },
      thumbnailUrl: form.mainImageUrl ?? null,
      variants: variants.map((v) => ({ label: v.name, code: v.sku ?? v.code ?? '' })),
    }
    return {
      ...base,
      name: form.name || base.name,
      seoTitle: form.seoTitle ?? base.seoTitle,
      seoDescription: form.seoDescription ?? base.seoDescription,
      shortDescription: form.shortDescription ?? base.shortDescription,
      longDescription: form.longDescription ?? base.longDescription,
      technicalAttributes: form.technicalAttributes ?? base.technicalAttributes ?? [],
      variants: variants.length
        ? variants.map((v) => ({ label: v.name, code: v.sku ?? v.code ?? '' }))
        : base.variants,
      healthReport: computeProductHealthReport({
        ...base,
        name: form.name || base.name,
        seoTitle: form.seoTitle ?? base.seoTitle,
        seoDescription: form.seoDescription ?? base.seoDescription,
        shortDescription: form.shortDescription ?? base.shortDescription,
        longDescription: form.longDescription ?? base.longDescription,
        technicalAttributes: form.technicalAttributes ?? base.technicalAttributes ?? [],
        variants: variants.length
          ? variants.map((v) => ({ label: v.name, code: v.sku ?? v.code ?? '' }))
          : base.variants,
      }),
    }
  }, [form, healthProduct, variants])

  if (!open) return null

  /** @param {keyof ProductMasterFormState} key */
  function setField(key, value) {
    onChange({ [key]: value })
  }

  const title = mode === 'create' ? 'Yeni Ürün' : form.name || 'Ürün Düzenle'
  const hasVariantHandlers = Boolean(onCreateVariant && onUpdateVariant && onPassiveVariant)

  return (
    <>
      <button
        type="button"
        className="mos-pmc-drawer__scrim"
        aria-label="Formu kapat"
        onClick={onClose}
      />
      <aside
        className="mos-pmc-drawer mos-pmc-drawer--form mos-pmc-drawer--form-v2"
        role="dialog"
        aria-label={title}
      >
        <header className="mos-pmc-drawer__hero">
          <div className="mos-pmc-drawer__head-row">
            <div>
              <h2 className="mos-pmc-drawer__title">{title}</h2>
              <span className="mos-pmc-drawer__sub">
                {mode === 'create' ? 'Product Master kaydı oluştur' : `${form.code} · düzenleme`}
              </span>
            </div>
            <button type="button" className="mos-pmc-drawer__close" aria-label="Kapat" onClick={onClose}>
              ×
            </button>
          </div>
        </header>

        <nav className="mos-pmc-drawer__tabs mos-erp-tabs" aria-label="Ürün form sekmeleri">
          {DRAWER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mos-erp-tab${activeTab === tab.id ? ' is-active' : ''}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="mos-pmc-drawer__body">
          {error ? (
            <p className="mos-erp-ops__alert" role="alert">
              {error}
            </p>
          ) : null}

          {activeTab === 'genel' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="Genel">
              <div className="mos-pmc-section__grid">
                <FormField label="Ürün adı" value={form.name} onChange={(v) => setField('name', v)} required />
                <FormField label="Ürün kodu" value={form.code} onChange={(v) => setField('code', v)} required />
                <FormField label="Barkod" value={form.barcode} onChange={(v) => setField('barcode', v)} />
                <FormField label="Marka" value={form.brand} onChange={(v) => setField('brand', v)} />
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Kategori *</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                  >
                    <option value="">Seçin</option>
                    {CATALOG_FILTER_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
                <FormField
                  label="Alt kategori"
                  value={form.subCategory}
                  onChange={(v) => setField('subCategory', v)}
                />
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Ürün tipi</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.productType}
                    onChange={(e) => setField('productType', e.target.value)}
                  >
                    {Object.entries(PRODUCT_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <FormField
                  label="Koleksiyon kodu"
                  value={form.collectionCode}
                  onChange={(v) => setField('collectionCode', v)}
                />
                <FormField label="Sezon kodu" value={form.seasonCode} onChange={(v) => setField('seasonCode', v)} />
              </div>
            </div>
          ) : null}

          {activeTab === 'operasyon' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="Operasyon">
              <div className="mos-pmc-section__grid">
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Tedarikçi</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.supplierId}
                    onChange={(e) => setField('supplierId', e.target.value)}
                  >
                    <option value="">Atanmamış</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </label>
                <FormField
                  label="Termin (gün)"
                  value={form.deliveryTimeDays}
                  onChange={(v) => setField('deliveryTimeDays', v)}
                  type="number"
                />
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Stok tipi</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.stockType}
                    onChange={(e) => setField('stockType', e.target.value)}
                  >
                    {Object.entries(PRODUCT_STOCK_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Satış kaynağı</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.salesSourceType}
                    onChange={(e) => setField('salesSourceType', e.target.value)}
                  >
                    <option value="">Seçilmedi</option>
                    {Object.entries(SALES_SOURCE_TYPE_LABELS)
                      .filter(([k]) => k !== SALES_SOURCE_TYPE.UNKNOWN)
                      .map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>
                {form.salesSourceType === SALES_SOURCE_TYPE.IN_STORE_DISPLAY ? (
                  <label className="mos-pmc-field mos-pmc-field--edit">
                    <span className="mos-pmc-field__label">Sergi katı</span>
                    <select
                      className="mos-pmc-field__input"
                      value={form.displayFloor}
                      onChange={(e) => setField('displayFloor', e.target.value)}
                    >
                      <option value="">Seçilmedi</option>
                      {DISPLAY_FLOOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {form.salesSourceType === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY ? (
                  <label className="mos-pmc-field mos-pmc-field--edit">
                    <span className="mos-pmc-field__label">Dış tedarik tipi</span>
                    <select
                      className="mos-pmc-field__input"
                      value={form.externalSupplyType}
                      onChange={(e) => setField('externalSupplyType', e.target.value)}
                    >
                      <option value="">Seçilmedi</option>
                      {EXTERNAL_SUPPLY_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Fiziksel lokasyon</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.physicalLocation}
                    onChange={(e) => setField('physicalLocation', e.target.value)}
                  >
                    <option value="">Seçilmedi</option>
                    {PHYSICAL_LOCATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {activeTab === 'fiyat' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="Fiyat">
              <div className="mos-pmc-section__grid">
                <FormField
                  label="Toptan fiyat"
                  value={form.wholesalePrice}
                  onChange={(v) => setField('wholesalePrice', v)}
                  type="currency"
                />
                <FormField
                  label="Toptan iskonto %"
                  value={form.wholesaleDiscountRate}
                  onChange={(v) => setField('wholesaleDiscountRate', v)}
                  type="number"
                />
                <ReadField label="Net alış fiyatı" value={formatProductMoney(String(netPurchasePrice))} />
                <FormField
                  label="Net alış (manuel)"
                  value={form.costPrice}
                  onChange={(v) => setField('costPrice', v)}
                  type="currency"
                />
                <FormField
                  label="Perakende satış fiyatı"
                  value={form.salePrice}
                  onChange={(v) => setField('salePrice', v)}
                  type="currency"
                />
                <FormField
                  label="Liste fiyatı"
                  value={form.listPrice}
                  onChange={(v) => setField('listPrice', v)}
                  type="currency"
                />
                <FormField label="KDV %" value={form.vatRate} onChange={(v) => setField('vatRate', v)} type="number" />
                <ReadField label="Para birimi" value="TRY" />
                <ReadField
                  label="Kar"
                  value={profit.amount}
                  className={`mos-pmc-field--profit${computeFormProfit(form).profitAmount <= 0 ? ' is-critical' : ''}`}
                />
                <ReadField
                  label="Kar %"
                  value={profit.percent}
                  className={`mos-pmc-field--profit${computeFormProfit(form).profitPercent <= 0 ? ' is-critical' : ''}`}
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'varyantlar' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="Varyantlar">
              {hasVariantHandlers ? (
                <ProductMasterVariantsSection
                  embedded
                  mode={mode}
                  productCode={form.code}
                  variants={variants}
                  saving={saving}
                  onCreate={onCreateVariant}
                  onUpdate={onUpdateVariant}
                  onPassive={onPassiveVariant}
                />
              ) : (
                <p className="mos-pmc-drawer__hint">Varyant yönetimi bu oturumda kullanılamıyor.</p>
              )}
            </div>
          ) : null}

          {activeTab === 'medya' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="Medya">
              <ProductMasterMediaSection
                productId={productId}
                mode={mode}
                saving={saving}
                onSaved={() => onMediaSaved?.()}
              />
            </div>
          ) : null}

          {activeTab === 'saglik' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="Sağlık">
              <ProductMasterHealthReport product={healthSnapshot} productName={form.name || healthSnapshot.name} />
            </div>
          ) : null}

          {activeTab === 'woocommerce' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="WooCommerce">
              <ProductMasterWooSection
                woo={woo}
                canPrepare={mode === 'edit' && Boolean(onPrepareWooSync)}
                canPublishDraft={mode === 'edit' && Boolean(onPublishWooDraft)}
                saving={saving}
                onPrepare={onPrepareWooSync}
                onPublishDraft={onPublishWooDraft}
              />
            </div>
          ) : null}

          {activeTab === 'yayin' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="Yayın">
              <label className="mos-pmc-field mos-pmc-field--edit">
                <span className="mos-pmc-field__label">Yayın durumu</span>
                <select
                  className="mos-pmc-field__input"
                  value={form.publishStatus}
                  onChange={(e) => setField('publishStatus', /** @type {PublishStatus} */ (e.target.value))}
                >
                  <option value={PUBLISH_STATUS.DRAFT}>{PUBLISH_STATUS_LABELS.DRAFT}</option>
                  <option value={PUBLISH_STATUS.PUBLISHED}>{PUBLISH_STATUS_LABELS.PUBLISHED}</option>
                  <option value={PUBLISH_STATUS.PASSIVE}>{PUBLISH_STATUS_LABELS.PASSIVE}</option>
                </select>
              </label>
              <div className="mos-pmc-section__grid">
                <label className="mos-pmc-field mos-pmc-field--edit mos-pmc-field--checkbox">
                  <input
                    type="checkbox"
                    checked={form.webEnabled}
                    onChange={(e) => setField('webEnabled', e.target.checked)}
                  />
                  <span className="mos-pmc-field__label">Web (EVTREND)</span>
                </label>
                <label className="mos-pmc-field mos-pmc-field--edit mos-pmc-field--checkbox">
                  <input
                    type="checkbox"
                    checked={form.mobileEnabled}
                    onChange={(e) => setField('mobileEnabled', e.target.checked)}
                  />
                  <span className="mos-pmc-field__label">Mobil uygulama</span>
                </label>
                <label className="mos-pmc-field mos-pmc-field--edit mos-pmc-field--checkbox">
                  <input
                    type="checkbox"
                    checked={form.marketplaceEnabled}
                    onChange={(e) => setField('marketplaceEnabled', e.target.checked)}
                  />
                  <span className="mos-pmc-field__label">Marketplace</span>
                </label>
              </div>
              <div className="mos-pmc-section__stack">
                <FormField label="SEO başlığı" value={form.seoTitle} onChange={(v) => setField('seoTitle', v)} />
                <FormField
                  label="SEO açıklaması"
                  value={form.seoDescription}
                  onChange={(v) => setField('seoDescription', v)}
                  multiline
                />
                <FormField label="Slug" value={form.slug} onChange={(v) => setField('slug', v)} />
                <FormField
                  label="Kısa açıklama"
                  value={form.shortDescription}
                  onChange={(v) => setField('shortDescription', v)}
                  multiline
                />
                <FormField
                  label="Uzun açıklama"
                  value={form.longDescription}
                  onChange={(v) => setField('longDescription', v)}
                  multiline
                />
                <FormField label="Etiketler (virgülle ayırın)" value={form.tags} onChange={(v) => setField('tags', v)} />
                <FormField
                  label="İlişkili ürün ID (virgülle ayırın)"
                  value={form.relatedProductIds}
                  onChange={(v) => setField('relatedProductIds', v)}
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'teknik' ? (
            <div className="mos-pmc-drawer__tab-panel" role="tabpanel" aria-label="Teknik">
              <div className="mos-pmc-section__grid">
                <FormField label="Genişlik (cm)" value={form.width} onChange={(v) => setField('width', v)} type="number" />
                <FormField label="Derinlik (cm)" value={form.depth} onChange={(v) => setField('depth', v)} type="number" />
                <FormField label="Yükseklik (cm)" value={form.height} onChange={(v) => setField('height', v)} type="number" />
                <FormField
                  label="Paket genişlik (cm)"
                  value={form.packageWidthCm}
                  onChange={(v) => setField('packageWidthCm', v)}
                  type="number"
                />
                <FormField
                  label="Paket derinlik (cm)"
                  value={form.packageDepthCm}
                  onChange={(v) => setField('packageDepthCm', v)}
                  type="number"
                />
                <FormField
                  label="Paket yükseklik (cm)"
                  value={form.packageHeightCm}
                  onChange={(v) => setField('packageHeightCm', v)}
                  type="number"
                />
                <FormField
                  label="Koli / paket adedi"
                  value={form.packageCount}
                  onChange={(v) => setField('packageCount', v)}
                  type="number"
                />
                <FormField
                  label="Ağırlık (kg)"
                  value={form.weightKg}
                  onChange={(v) => setField('weightKg', v)}
                  type="number"
                />
                <FormField label="Malzeme" value={form.material} onChange={(v) => setField('material', v)} />
                <FormField
                  label="Garanti (ay)"
                  value={form.warrantyMonths}
                  onChange={(v) => setField('warrantyMonths', v)}
                  type="number"
                />
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Montaj tipi</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.assemblyType}
                    onChange={(e) => setField('assemblyType', e.target.value)}
                  >
                    <option value="">Seçilmedi</option>
                    {ASSEMBLY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Kaplama</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.coating}
                    onChange={(e) => setField('coating', e.target.value)}
                  >
                    <option value="">Seçilmedi</option>
                    {COATING_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Mekanizma</span>
                  <select
                    className="mos-pmc-field__input"
                    value={form.mechanism}
                    onChange={(e) => setField('mechanism', e.target.value)}
                  >
                    <option value="">Seçilmedi</option>
                    {MECHANISM_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mos-pmc-section__stack">
                <FormField
                  label="Teknik özellikler (Etiket: Değer, satır başına bir)"
                  value={form.technicalAttributes}
                  onChange={(v) => setField('technicalAttributes', v)}
                  multiline
                />
                <FormField
                  label="Renk seçenekleri (virgülle ayırın)"
                  value={form.colorOptions}
                  onChange={(v) => setField('colorOptions', v)}
                />
                <FormField
                  label="Kumaş seçenekleri (virgülle ayırın)"
                  value={form.fabricOptions}
                  onChange={(v) => setField('fabricOptions', v)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <footer className="mos-pmc-drawer__foot mos-pmc-drawer__foot--actions">
          <div className="mos-pmc-drawer__actions">
            <button
              type="button"
              className={erpOpsButtonClass(mode === 'create' ? 'Oluştur' : 'Kaydet')}
              disabled={saving}
              onClick={onSave}
            >
              {saving ? 'Kaydediliyor…' : mode === 'create' ? 'Oluştur' : 'Kaydet'}
            </button>
            {mode === 'edit' && onPassive ? (
              <button
                type="button"
                className={erpOpsButtonClass('Pasife al')}
                disabled={saving}
                onClick={onPassive}
              >
                Pasife al
              </button>
            ) : null}
            <button type="button" className={erpOpsButtonClass('İptal')} disabled={saving} onClick={onClose}>
              İptal
            </button>
          </div>
        </footer>
      </aside>
    </>
  )
}

import { useEffect, useMemo } from 'react'
import { publishStatusTone, PUBLISH_STATUS, PUBLISH_STATUS_LABELS } from '../../mappers/product/productMasterCenterModel.js'
import { healthToneClass, resolveProductHealthScore } from './productMasterCenterUi.js'
import ProductMasterHealthReport from './ProductMasterHealthReport.jsx'

/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */
/** @typedef {import('../../mappers/product/productMasterCenterModel.js').PublishStatus} PublishStatus */

/**
 * @param {PublishStatus} status
 */
function statusPillClass(status) {
  const tone = publishStatusTone(status)
  if (tone === 'success') return 'mos-pmc-status mos-pmc-status--published'
  if (tone === 'warning') return 'mos-pmc-status mos-pmc-status--draft'
  return 'mos-pmc-status mos-pmc-status--passive'
}

/**
 * @param {string} label
 * @param {string} value
 * @param {string} [className]
 */
function ReadField({ label, value, className = '' }) {
  return (
    <div className={`mos-pmc-field ${className}`.trim()}>
      <span className="mos-pmc-field__label">{label}</span>
      <span className="mos-pmc-field__value">{value || '—'}</span>
    </div>
  )
}

/**
 * @param {{
 *   label: string
 *   value: string
 *   onChange: (v: string) => void
 *   multiline?: boolean
 * }} props
 */
function EditField({ label, value, onChange, multiline = false }) {
  return (
    <label className="mos-pmc-field mos-pmc-field--edit">
      <span className="mos-pmc-field__label">{label}</span>
      {multiline ? (
        <textarea
          className="mos-pmc-field__input mos-pmc-field__input--area"
          value={value}
          rows={multiline && label.includes('Uzun') ? 5 : 3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="mos-pmc-field__input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  )
}

/**
 * @param {{
 *   open: boolean
 *   product: ProductMasterCenterRowVm | null
 *   draft?: Partial<ProductMasterCenterRowVm>
 *   isManagerView?: boolean
 *   onClose: () => void
 *   onDraftChange?: (patch: Partial<ProductMasterCenterRowVm>) => void
 * }} props
 */
export default function ProductDetailErpDrawer({
  open,
  product,
  draft = {},
  isManagerView = false,
  onClose,
  onDraftChange,
}) {
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

  const merged = useMemo(() => (product ? { ...product, ...draft } : null), [product, draft])

  const health = useMemo(() => {
    if (!merged) return null
    return resolveProductHealthScore(merged)
  }, [merged])

  if (!open || !merged) return null

  const canEdit = typeof onDraftChange === 'function'

  /** @param {keyof ProductMasterCenterRowVm} key */
  function setField(key, value) {
    onDraftChange?.({ [key]: value })
  }

  return (
    <>
      <button
        type="button"
        className="mos-pmc-drawer__scrim"
        aria-label="Ürün detayını kapat"
        onClick={onClose}
      />
      <aside className="mos-pmc-drawer" role="complementary" aria-label="Ürün detayı">
        <header className="mos-pmc-drawer__hero">
          <div className="mos-pmc-drawer__head-row">
            <div>
              <h2 className="mos-pmc-drawer__title">{merged.name}</h2>
              <span className="mos-pmc-drawer__sub">
                {merged.productCode} · {merged.barcode} · {merged.brand}
              </span>
            </div>
            <button type="button" className="mos-pmc-drawer__close" aria-label="Kapat" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="mos-pmc-drawer__tags">
            <span className={statusPillClass(merged.publishStatus)}>
              {PUBLISH_STATUS_LABELS[merged.publishStatus]}
            </span>
            <span className="mos-erp-tag mos-erp-tag--info">{merged.category}</span>
            {health ? (
              <span
                className={`mos-pmc-health ${healthToneClass(health.tone)}`}
                title={health.missingLabels.join(' · ') || 'Ürün kartı tam'}
              >
                Sağlık {health.score}/100
              </span>
            ) : null}
          </div>
        </header>

        <div className="mos-pmc-drawer__body">
          {health ? (
            <div className="mos-pmc-drawer__section mos-pmc-drawer__section--health">
              <ProductMasterHealthReport product={merged} productName={merged.name} />
            </div>
          ) : null}

          <section className="mos-pmc-drawer__section" aria-label="Temel bilgiler">
            <h3 className="mos-pmc-drawer__section-title">TEMEL</h3>
            <div className="mos-pmc-section__grid">
              {canEdit ? (
                <EditField label="Ürün adı" value={merged.name} onChange={(v) => setField('name', v)} />
              ) : (
                <ReadField label="Ürün adı" value={merged.name} />
              )}
              {canEdit ? (
                <EditField label="Marka" value={merged.brand} onChange={(v) => setField('brand', v)} />
              ) : (
                <ReadField label="Marka" value={merged.brand} />
              )}
              <ReadField label="Kategori" value={merged.category} />
              <ReadField label="Alt kategori" value={merged.subCategory} />
              <ReadField label="Ürün kodu" value={merged.productCode} />
              <ReadField label="Barkod" value={merged.barcode} />
            </div>
          </section>

          <section className="mos-pmc-drawer__section" aria-label="Satış bilgileri">
            <h3 className="mos-pmc-drawer__section-title">SATIŞ</h3>
            <div className="mos-pmc-section__grid">
              <ReadField
                label="Liste fiyatı"
                value={merged.listPriceFormatted}
                className="mos-pmc-field--emphasis"
              />
              <ReadField
                label="İndirimli fiyat"
                value={merged.discountedPriceFormatted}
                className="mos-pmc-field--emphasis"
              />
              <ReadField label="KDV" value={merged.vatRate} />
            </div>
            {isManagerView ? (
              <div className="mos-pmc-finance mos-pmc-finance--drawer">
                <ReadField label="Alış" value={merged.purchaseCostFormatted} className="mos-pmc-field--emphasis" />
                <ReadField label="Satış" value={merged.salePriceFormatted} className="mos-pmc-field--emphasis" />
                <ReadField
                  label="Kar"
                  value={merged.profitAmountFormatted}
                  className={`mos-pmc-field--emphasis mos-pmc-field--profit${merged.profitAmount <= 0 ? ' is-critical' : ''}`}
                />
                <ReadField
                  label="Kar %"
                  value={merged.profitPercentFormatted}
                  className={`mos-pmc-field--emphasis mos-pmc-field--profit${merged.profitPercent <= 0 ? ' is-critical' : ''}`}
                />
              </div>
            ) : null}
          </section>

          <section className="mos-pmc-drawer__section" aria-label="Tedarik bilgileri">
            <h3 className="mos-pmc-drawer__section-title">TEDARİK</h3>
            <div className="mos-pmc-section__grid">
              <ReadField label="Tedarikçi" value={merged.supplierName ?? 'Atanmamış'} />
              <ReadField
                label="Alış fiyatı"
                value={merged.purchaseCostFormatted}
                className="mos-pmc-field--emphasis"
              />
              <ReadField label="Teslim süresi" value={`${merged.deliveryDays} gün`} />
            </div>
          </section>

          <section className="mos-pmc-drawer__section" aria-label="E-ticaret içerikleri">
            <h3 className="mos-pmc-drawer__section-title">E-TİCARET</h3>
            <div className="mos-pmc-section__stack">
              {canEdit ? (
                <>
                  <EditField
                    label="SEO başlığı"
                    value={merged.seoTitle}
                    onChange={(v) => setField('seoTitle', v)}
                  />
                  <EditField
                    label="SEO açıklaması"
                    value={merged.seoDescription}
                    onChange={(v) => setField('seoDescription', v)}
                    multiline
                  />
                  <EditField
                    label="Kısa açıklama"
                    value={merged.shortDescription}
                    onChange={(v) => setField('shortDescription', v)}
                    multiline
                  />
                  <EditField
                    label="Uzun açıklama"
                    value={merged.longDescription}
                    onChange={(v) => setField('longDescription', v)}
                    multiline
                  />
                  <EditField label="Slug" value={merged.slug} onChange={(v) => setField('slug', v)} />
                </>
              ) : (
                <>
                  <ReadField label="SEO başlığı" value={merged.seoTitle} />
                  <ReadField label="SEO açıklaması" value={merged.seoDescription} />
                  <ReadField label="Kısa açıklama" value={merged.shortDescription} />
                  <ReadField label="Uzun açıklama" value={merged.longDescription} />
                  <ReadField label="Slug" value={merged.slug} />
                </>
              )}
            </div>
          </section>

          <section className="mos-pmc-drawer__section" aria-label="Teknik özellikler">
            <h3 className="mos-pmc-drawer__section-title">Teknik Özellikler</h3>
            <div className="mos-pmc-section__grid">
              <ReadField label="Ürün ölçüsü" value={merged.dimensions.productMeasure} />
              <ReadField label="Genişlik" value={merged.dimensions.width} />
              <ReadField label="Derinlik" value={merged.dimensions.depth} />
              <ReadField label="Yükseklik" value={merged.dimensions.height} />
              {merged.dimensions.bedSize ? (
                <ReadField label="Yatak ölçüsü" value={merged.dimensions.bedSize} />
              ) : null}
              {merged.dimensions.tableSize ? (
                <ReadField label="Masa ölçüsü" value={merged.dimensions.tableSize} />
              ) : null}
              <ReadField label="Ağırlık" value={merged.dimensions.weight} />
            </div>
            {merged.technicalSpecs.length > 0 ? (
              <dl className="mos-pmc-drawer__kv mos-pmc-drawer__kv--specs">
                {merged.technicalSpecs.map((spec) => (
                  <div key={spec.label} className="mos-pmc-drawer__kv-row">
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mos-pmc-drawer__empty">Teknik özellik kaydı yok.</p>
            )}
          </section>

          <section className="mos-pmc-drawer__section" aria-label="Renkler">
            <h3 className="mos-pmc-drawer__section-title">Renkler</h3>
            {merged.colorOptions.length === 0 ? (
              <p className="mos-pmc-drawer__empty">Renk seçeneği tanımlı değil.</p>
            ) : (
              <div className="mos-pmc-drawer__chips">
                {merged.colorOptions.map((color) => (
                  <span key={color} className="mos-pmc-drawer__chip">
                    {color}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="mos-pmc-drawer__section" aria-label="Kumaşlar">
            <h3 className="mos-pmc-drawer__section-title">Kumaşlar</h3>
            {merged.fabricOptions.length === 0 ? (
              <p className="mos-pmc-drawer__empty">Kumaş seçeneği tanımlı değil.</p>
            ) : (
              <div className="mos-pmc-drawer__chips">
                {merged.fabricOptions.map((fabric) => (
                  <span key={fabric} className="mos-pmc-drawer__chip">
                    {fabric}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="mos-pmc-drawer__section" aria-label="Varyantlar">
            <h3 className="mos-pmc-drawer__section-title">Varyantlar</h3>
            {merged.variants.length === 0 ? (
              <p className="mos-pmc-drawer__empty">Varyant tanımlı değil.</p>
            ) : (
              <ul className="mos-pmc-variant-list">
                {merged.variants.map((variant) => (
                  <li key={variant.code} className="mos-pmc-variant-list__item">
                    <span className="mos-pmc-variant-list__label">{variant.label}</span>
                    <span className="mos-pmc-variant-list__code">{variant.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mos-pmc-drawer__section" aria-label="Galeri">
            <h3 className="mos-pmc-drawer__section-title">Galeri</h3>
            <div className="mos-pmc-gallery-split">
              <div className="mos-pmc-gallery-split__main">
                <span className="mos-pmc-media__label">Ana görsel</span>
                <div className="mos-pmc-media__main">
                  {merged.media.mainImageUrl ? (
                    <img src={merged.media.mainImageUrl} alt="" className="mos-pmc-media__img" />
                  ) : (
                    <span className="mos-pmc-media__placeholder">Görsel yüklenmedi</span>
                  )}
                </div>
              </div>
              <div className="mos-pmc-gallery-split__grid">
                <span className="mos-pmc-media__label">Galeri görselleri</span>
                <div className="mos-pmc-media__gallery">
                  {merged.media.galleryImageUrls.length > 0 ? (
                    merged.media.galleryImageUrls.map((url, i) => (
                      <div key={url} className="mos-pmc-media__thumb">
                        <img src={url} alt={`Galeri ${i + 1}`} />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="mos-pmc-media__thumb mos-pmc-media__thumb--empty">+</div>
                      <div className="mos-pmc-media__thumb mos-pmc-media__thumb--empty">+</div>
                      <div className="mos-pmc-media__thumb mos-pmc-media__thumb--empty">+</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mos-pmc-drawer__section" aria-label="Medya">
            <h3 className="mos-pmc-drawer__section-title">MEDYA</h3>
            <div className="mos-pmc-section__stack">
              <div className="mos-pmc-media__block">
                <span className="mos-pmc-media__label">Video</span>
                <div className="mos-pmc-media__slot">
                  {merged.media.videoUrl ? (
                    <span className="mos-pmc-media__file">{merged.media.videoUrl}</span>
                  ) : (
                    <span className="mos-pmc-media__placeholder">Video eklenmedi</span>
                  )}
                </div>
              </div>
              <div className="mos-pmc-media__block">
                <span className="mos-pmc-media__label">PDF katalog</span>
                <div className="mos-pmc-media__slot">
                  {merged.media.catalogPdfUrl ? (
                    <span className="mos-pmc-media__file">{merged.media.catalogPdfUrl}</span>
                  ) : (
                    <span className="mos-pmc-media__placeholder">PDF eklenmedi</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mos-pmc-drawer__section mos-pmc-section--status" aria-label="Yayın durumu">
            <h3 className="mos-pmc-drawer__section-title">DURUM</h3>
            {canEdit ? (
              <div className="mos-pmc-status-row">
                <label className="mos-pmc-field mos-pmc-field--edit">
                  <span className="mos-pmc-field__label">Yayın durumu</span>
                  <select
                    className="mos-pmc-field__input"
                    value={merged.publishStatus}
                    onChange={(e) =>
                      setField('publishStatus', /** @type {PublishStatus} */ (e.target.value))
                    }
                  >
                    <option value={PUBLISH_STATUS.DRAFT}>{PUBLISH_STATUS_LABELS.DRAFT}</option>
                    <option value={PUBLISH_STATUS.PUBLISHED}>{PUBLISH_STATUS_LABELS.PUBLISHED}</option>
                    <option value={PUBLISH_STATUS.PASSIVE}>{PUBLISH_STATUS_LABELS.PASSIVE}</option>
                  </select>
                </label>
                <p className="mos-pmc-status-hint">
                  EVTREND, mobil uygulama ve marketplace entegrasyonları bu karttan beslenir.
                </p>
              </div>
            ) : (
              <div className="mos-pmc-status-row">
                <ReadField label="Yayın durumu" value={PUBLISH_STATUS_LABELS[merged.publishStatus]} />
              </div>
            )}
          </section>
        </div>

        <footer className="mos-pmc-drawer__foot">
          <span className="mos-pmc-drawer__hint">
            Single Source of Truth · EVTREND · Mobil · Marketplace · değişiklikler oturum içinde saklanır
          </span>
        </footer>
      </aside>
    </>
  )
}

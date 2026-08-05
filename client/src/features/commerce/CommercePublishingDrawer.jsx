import { useEffect } from 'react'
import { PUBLISH_STATUS_LABELS } from '../../mappers/product/productMasterCenterModel.js'

/** @typedef {import('../../mappers/commerce/commercePublishingModel.js').CommercePublishRowVm} CommercePublishRowVm */

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
function readinessClass(tone) {
  if (tone === 'success') return 'mos-cp-drawer__score--success'
  if (tone === 'warning') return 'mos-cp-drawer__score--warning'
  return 'mos-cp-drawer__score--critical'
}

/**
 * @param {'ok' | 'miss'} status
 */
function checkClass(status) {
  return status === 'ok' ? 'is-ok' : 'is-miss'
}

/**
 * @param {{
 *   open: boolean
 *   row: CommercePublishRowVm | null
 *   onClose: () => void
 * }} props
 */
export default function CommercePublishingDrawer({ open, row, onClose }) {
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

  if (!open || !row) return null

  const { master } = row

  return (
    <>
      <button
        type="button"
        className="mos-cp-drawer__scrim"
        aria-label="Yayın detayını kapat"
        onClick={onClose}
      />
      <aside className="mos-cp-drawer" role="complementary" aria-label="E-ticaret yayın detayı">
        <header className="mos-cp-drawer__hero">
          <div className="mos-cp-drawer__head-row">
            <div>
              <h2 className="mos-cp-drawer__title">{row.name}</h2>
              <span className="mos-cp-drawer__sub">
                {row.productCode} · {row.category} · EVTREND
              </span>
            </div>
            <button type="button" className="mos-cp-drawer__close" aria-label="Kapat" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="mos-cp-drawer__tags">
            <span className={`mos-pmc-status mos-pmc-status--${row.publishStatus === 'PUBLISHED' ? 'published' : row.publishStatus === 'DRAFT' ? 'draft' : 'passive'}`}>
              {row.publishStatusLabel}
            </span>
            <span className={`mos-cp-drawer__score ${readinessClass(row.readinessTone)}`}>
              Hazırlık %{row.readinessScore}
            </span>
          </div>
        </header>

        <div className="mos-cp-drawer__body">
          <section className="mos-cp-drawer__section" aria-label="Ürün özeti">
            <h3 className="mos-cp-drawer__section-title">Ürün Özeti</h3>
            <dl className="mos-cp-drawer__kv">
              <div className="mos-cp-drawer__kv-row">
                <dt>Ürün adı</dt>
                <dd>{row.name}</dd>
              </div>
              <div className="mos-cp-drawer__kv-row">
                <dt>Ürün kodu</dt>
                <dd>{row.productCode}</dd>
              </div>
              <div className="mos-cp-drawer__kv-row">
                <dt>Kategori</dt>
                <dd>{row.category}</dd>
              </div>
              <div className="mos-cp-drawer__kv-row">
                <dt>Yayın durumu</dt>
                <dd>{PUBLISH_STATUS_LABELS[row.publishStatus]}</dd>
              </div>
              <div className="mos-cp-drawer__kv-row">
                <dt>Son güncelleme</dt>
                <dd>{row.lastUpdated}</dd>
              </div>
              <div className="mos-cp-drawer__kv-row">
                <dt>Slug</dt>
                <dd>{master.slug || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="mos-cp-drawer__section" aria-label="SEO durumu">
            <h3 className="mos-cp-drawer__section-title">SEO Durumu</h3>
            <ul className="mos-cp-drawer__checks">
              <li className={checkClass(row.checks.hasSeo ? 'ok' : 'miss')}>
                SEO başlığı & açıklaması
              </li>
              <li className={checkClass(row.checks.hasSlug ? 'ok' : 'miss')}>Slug</li>
            </ul>
            <dl className="mos-cp-drawer__kv mos-cp-drawer__kv--compact">
              <div className="mos-cp-drawer__kv-row">
                <dt>SEO başlığı</dt>
                <dd>{master.seoTitle || '—'}</dd>
              </div>
              <div className="mos-cp-drawer__kv-row">
                <dt>SEO açıklaması</dt>
                <dd>{master.seoDescription || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="mos-cp-drawer__section" aria-label="Medya durumu">
            <h3 className="mos-cp-drawer__section-title">Medya Durumu</h3>
            <ul className="mos-cp-drawer__checks">
              <li className={checkClass(master.media.mainImageUrl ? 'ok' : 'miss')}>Ana görsel</li>
              <li className={checkClass(master.media.galleryImageUrls.length > 0 ? 'ok' : 'miss')}>
                Galeri ({master.media.galleryImageUrls.length})
              </li>
              <li className={checkClass(master.media.videoUrl ? 'ok' : 'miss')}>Video</li>
              <li className={checkClass(master.media.catalogPdfUrl ? 'ok' : 'miss')}>PDF katalog</li>
            </ul>
            {master.media.mainImageUrl ? (
              <div className="mos-cp-drawer__preview">
                <img src={master.media.mainImageUrl} alt="" />
              </div>
            ) : null}
          </section>

          <section className="mos-cp-drawer__section" aria-label="Eksik alanlar">
            <h3 className="mos-cp-drawer__section-title">Eksik Alanlar</h3>
            {row.missingFields.length === 0 ? (
              <p className="mos-cp-drawer__ready">WooCommerce / EVTREND yayınına hazır</p>
            ) : (
              <ul className="mos-cp-drawer__missing">
                {row.missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="mos-cp-drawer__section" aria-label="Yayın hazırlık puanı">
            <h3 className="mos-cp-drawer__section-title">Yayın Hazırlık Puanı</h3>
            <div className={`mos-cp-drawer__readiness ${readinessClass(row.readinessTone)}`}>
              <span className="mos-cp-drawer__readiness-value">%{row.readinessScore}</span>
              <span className="mos-cp-drawer__readiness-label">
                {row.isReadyToPublish ? 'Yayına hazır' : 'Eksikler tamamlanmalı'}
              </span>
            </div>
            <ul className="mos-cp-drawer__checks">
              <li className={checkClass(row.checks.hasSeo ? 'ok' : 'miss')}>SEO (%25)</li>
              <li className={checkClass(row.checks.hasMedia ? 'ok' : 'miss')}>Medya (%25)</li>
              <li className={checkClass(row.checks.hasDescription ? 'ok' : 'miss')}>Açıklama (%25)</li>
              <li className={checkClass(row.checks.hasSlug ? 'ok' : 'miss')}>Slug (%25)</li>
            </ul>
          </section>
        </div>

        <footer className="mos-cp-drawer__foot">
          <span className="mos-cp-drawer__hint">
            WooCommerce · EVTREND · Marketplace · yayın öncesi kontrol
          </span>
        </footer>
      </aside>
    </>
  )
}

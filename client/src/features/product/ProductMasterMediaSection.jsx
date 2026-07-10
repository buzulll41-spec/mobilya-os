import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getProductMediaBundle,
  listMediaAssets,
  putProductMediaLinks,
} from '../../services/mediaAssetsClient.js'

/** @typedef {import('../../contracts/v1/mediaAsset.js').MediaAssetDto} MediaAssetDto */
/** @typedef {import('../../contracts/v1/mediaAsset.js').ProductMediaBundleDto} ProductMediaBundleDto */

/**
 * @param {{
 *   productId: string | null
 *   mode: 'create' | 'edit'
 *   saving?: boolean
 *   onSaved?: (bundle: ProductMediaBundleDto) => void
 * }} props
 */
export default function ProductMasterMediaSection({ productId, mode, saving = false, onSaved }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [assets, setAssets] = useState(/** @type {MediaAssetDto[]} */ ([]))
  const [bundle, setBundle] = useState(/** @type {ProductMediaBundleDto | null} */ (null))
  const [heroAssetId, setHeroAssetId] = useState(/** @type {string} */ (''))
  const [galleryAssetIds, setGalleryAssetIds] = useState(/** @type {string[]} */ ([]))
  const [videoAssetId, setVideoAssetId] = useState(/** @type {string} */ (''))
  const [pdfAssetId, setPdfAssetId] = useState(/** @type {string} */ (''))

  const load = useCallback(async () => {
    if (!productId || mode !== 'edit') return
    setLoading(true)
    setError(null)
    try {
      const [assetRes, mediaBundle] = await Promise.all([
        listMediaAssets({ pageSize: 200 }),
        getProductMediaBundle(productId),
      ])
      setAssets(assetRes.assets)
      setBundle(mediaBundle)
      setHeroAssetId(mediaBundle.hero?.assetId ?? '')
      setGalleryAssetIds(mediaBundle.gallery.map((g) => g.assetId))
      setVideoAssetId(mediaBundle.video?.assetId ?? '')
      setPdfAssetId(mediaBundle.pdf?.assetId ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Medya yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [productId, mode])

  useEffect(() => {
    void load()
  }, [load])

  const imageAssets = useMemo(() => assets.filter((a) => a.type === 'IMAGE'), [assets])
  const videoAssets = useMemo(() => assets.filter((a) => a.type === 'VIDEO'), [assets])
  const pdfAssets = useMemo(() => assets.filter((a) => a.type === 'PDF'), [assets])

  async function handleSaveMedia() {
    if (!productId) return
    setError(null)
    try {
      const updated = await putProductMediaLinks(productId, {
        heroAssetId: heroAssetId || null,
        galleryAssetIds,
        videoAssetId: videoAssetId || null,
        pdfAssetId: pdfAssetId || null,
      })
      setBundle(updated)
      onSaved?.(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Medya kaydedilemedi')
    }
  }

  /** @param {string} assetId */
  function toggleGallery(assetId) {
    setGalleryAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId],
    )
  }

  if (mode === 'create') {
    return (
      <p className="mos-pmc-drawer__hint">
        Medya bağlantısı için önce ürünü kaydedin. Ardından hero, galeri, video ve PDF varlıkları
        seçebilirsiniz.
      </p>
    )
  }

  if (loading) {
    return <p className="mos-pmc-drawer__hint">Medya varlıkları yükleniyor…</p>
  }

  return (
    <div className="mos-pmc-media-section">
      <p className="mos-pmc-drawer__hint">
        Kurumsal medya varlıklarından seçim yapın. Gerçek dosya yükleme sonraki fazda — şimdilik mock
        asset kütüphanesi kullanılır.
      </p>

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mos-pmc-drawer__section" aria-label="Hero görsel">
        <h3 className="mos-pmc-drawer__section-title">HERO GÖRSEL</h3>
        <label className="mos-pmc-field mos-pmc-field--edit">
          <span className="mos-pmc-field__label">Ana görsel varlığı</span>
          <select
            className="mos-pmc-field__input"
            value={heroAssetId}
            onChange={(e) => setHeroAssetId(e.target.value)}
          >
            <option value="">Seçilmedi</option>
            {imageAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fileName} ({a.fileSizeLabel})
              </option>
            ))}
          </select>
        </label>
        {heroAssetId ? (
          <AssetPreview asset={imageAssets.find((a) => a.id === heroAssetId) ?? bundle?.hero?.asset} />
        ) : null}
      </section>

      <section className="mos-pmc-drawer__section" aria-label="Galeri görselleri">
        <h3 className="mos-pmc-drawer__section-title">GALERİ GÖRSELLERİ</h3>
        <ul className="mos-pmc-media-pick-list">
          {imageAssets.map((a) => (
            <li key={a.id}>
              <label className="mos-pmc-media-pick">
                <input
                  type="checkbox"
                  checked={galleryAssetIds.includes(a.id)}
                  onChange={() => toggleGallery(a.id)}
                />
                <span>{a.fileName}</span>
                <span className="mos-pmc-media-pick__meta">{a.fileSizeLabel}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="mos-pmc-drawer__section" aria-label="Video">
        <h3 className="mos-pmc-drawer__section-title">VİDEO</h3>
        <label className="mos-pmc-field mos-pmc-field--edit">
          <span className="mos-pmc-field__label">Video varlığı</span>
          <select
            className="mos-pmc-field__input"
            value={videoAssetId}
            onChange={(e) => setVideoAssetId(e.target.value)}
          >
            <option value="">Seçilmedi</option>
            {videoAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fileName} ({a.fileSizeLabel})
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="mos-pmc-drawer__section" aria-label="PDF">
        <h3 className="mos-pmc-drawer__section-title">PDF</h3>
        <label className="mos-pmc-field mos-pmc-field--edit">
          <span className="mos-pmc-field__label">PDF katalog varlığı</span>
          <select
            className="mos-pmc-field__input"
            value={pdfAssetId}
            onChange={(e) => setPdfAssetId(e.target.value)}
          >
            <option value="">Seçilmedi</option>
            {pdfAssets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fileName} ({a.fileSizeLabel})
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="mos-pmc-drawer__actions">
        <button
          type="button"
          className="mos-erp-ops__btn mos-erp-ops__btn--primary"
          disabled={saving}
          onClick={() => void handleSaveMedia()}
        >
          Medya Bağlantılarını Kaydet
        </button>
      </div>
    </div>
  )
}

/**
 * @param {{ asset?: MediaAssetDto | null }} props
 */
function AssetPreview({ asset }) {
  if (!asset?.previewUrl) return null
  return (
    <div className="mos-pmc-media-preview">
      <img src={asset.previewUrl} alt="" className="mos-pmc-media-preview__img" />
      <span className="mos-pmc-media-preview__name">{asset.fileName}</span>
    </div>
  )
}

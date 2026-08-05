import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import { getDataSourceDisplay } from '../config/dataSource.js'
import { buildMediaCenterView } from '../mappers/media/mediaCenterModel.js'
import * as productsClient from '../services/productsClient.js'
import * as productMasterClient from '../services/productMasterClient.js'
import { listMediaAssets } from '../services/mediaAssetsClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import '../styles/mos-erp-ops.css'

const CATALOG_PAGE_SIZE = 100

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
function healthToneClass(tone) {
  if (tone === 'success') return 'mos-mc-health--success'
  if (tone === 'warning') return 'mos-mc-health--warning'
  return 'mos-mc-health--critical'
}

/**
 * @param {'IMAGE' | 'VIDEO' | 'PDF' | 'CAMPAIGN'} type
 */
function recentTypeClass(type) {
  if (type === 'VIDEO') return 'mos-mc-recent--video'
  if (type === 'PDF') return 'mos-mc-recent--pdf'
  if (type === 'CAMPAIGN') return 'mos-mc-recent--campaign'
  return 'mos-mc-recent--image'
}

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function MediaCenterPage({ embedded = false }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [view, setView] = useState(/** @type {ReturnType<typeof buildMediaCenterView> | null} */ (null))

  const load = useCallback(async () => {
    setError(null)
    try {
      const [assetRes, productRes] = await Promise.all([
        listMediaAssets({ pageSize: 200 }),
        productMasterClient.listProductMaster({ pageSize: CATALOG_PAGE_SIZE, activeOnly: false }).catch(() =>
          productsClient.listProducts({ activeOnly: false, pageSize: CATALOG_PAGE_SIZE }).then((r) => ({
            items: r.items,
          })),
        ),
      ])
      setView(buildMediaCenterView(productRes.items, assetRes.assets))
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void load()
    })
    return () => cancelAnimationFrame(id)
  }, [load])

  const providerTags = useMemo(() => view?.storage.futureProviders ?? [], [view])

  if (loading) {
    return <LoadingBlock title="Medya Merkezi yükleniyor" hint="Ürün görselleri · video · katalog · kampanya" />
  }

  return (
    <div
      className={
        embedded ? 'mos-hub-pane mos-erp-ops mos-erp-ops--media-center' : 'mos-page mos-erp-ops mos-erp-ops--media-center'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">Medya Merkezi</h1>
            <span className="mos-erp-ops__sub">
              EVTREND · Mobil · Marketplace medya omurgası · {view?.productGalleries.length ?? 0} ürün ·{' '}
              {getDataSourceDisplay().label}
              {view?.today ? ` · ${view.today}` : ''}
            </span>
          </div>
          <div className="mos-mc-providers" aria-label="Gelecek depolama altyapısı">
            {providerTags.map((tag) => (
              <span key={tag} className="mos-mc-provider-tag">
                {tag}
              </span>
            ))}
          </div>
        </header>
      ) : (
        <div className="mos-mc-providers mos-hub-pane__toolbar" aria-label="Gelecek depolama altyapısı">
          {providerTags.map((tag) => (
            <span key={tag} className="mos-mc-provider-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      {view ? (
        <>
          <ErpOpsSummaryStrip
            metrics={view.summaryMetrics}
            ariaLabel="Medya merkezi özeti"
            summaryClassName="mos-erp-summary--cols-4"
          />

          <div className="mos-mc-grid">
            <section className="mos-erp-ops__panel mos-mc-panel" aria-label="Medya sağlık skoru">
              <h2 className="mos-erp-ops__panel-title">MEDYA SAĞLIK SKORU</h2>
              <div className="mos-mc-health-panel">
                <div className={`mos-mc-health-score ${healthToneClass(view.health.tone)}`}>
                  <span className="mos-mc-health-score__value">{view.health.score}</span>
                  <span className="mos-mc-health-score__max">/100</span>
                </div>
                <ul className="mos-mc-health-checks">
                  <li className={view.health.missingImageCount === 0 ? 'is-ok' : 'is-miss'}>
                    Eksik görsel · {view.health.missingImageCount}
                  </li>
                  <li className={view.health.missingGalleryCount === 0 ? 'is-ok' : 'is-miss'}>
                    Eksik galeri · {view.health.missingGalleryCount}
                  </li>
                  <li className={view.health.missingCatalogCount === 0 ? 'is-ok' : 'is-miss'}>
                    Eksik katalog · {view.health.missingCatalogCount}
                  </li>
                </ul>
              </div>
              <div className="mos-mc-coverage">
                <div className="mos-mc-coverage__item">
                  <span className="mos-mc-coverage__label">Görsel kapsama</span>
                  <span className="mos-mc-coverage__value">%{view.health.imageCoveragePct}</span>
                </div>
                <div className="mos-mc-coverage__item">
                  <span className="mos-mc-coverage__label">Galeri kapsama</span>
                  <span className="mos-mc-coverage__value">%{view.health.galleryCoveragePct}</span>
                </div>
                <div className="mos-mc-coverage__item">
                  <span className="mos-mc-coverage__label">Katalog kapsama</span>
                  <span className="mos-mc-coverage__value">%{view.health.catalogCoveragePct}</span>
                </div>
              </div>
            </section>

            <section className="mos-erp-ops__panel mos-mc-panel" aria-label="Depolama özeti">
              <h2 className="mos-erp-ops__panel-title">DEPOLAMA ÖZETİ</h2>
              <div className="mos-mc-storage-grid">
                <div className="mos-mc-storage-card">
                  <span className="mos-mc-storage-card__label">Toplam görsel</span>
                  <span className="mos-mc-storage-card__value">{view.storage.totalImages}</span>
                </div>
                <div className="mos-mc-storage-card">
                  <span className="mos-mc-storage-card__label">Toplam video</span>
                  <span className="mos-mc-storage-card__value">{view.storage.totalVideos}</span>
                </div>
                <div className="mos-mc-storage-card">
                  <span className="mos-mc-storage-card__label">Toplam PDF</span>
                  <span className="mos-mc-storage-card__value">{view.storage.totalPdfs}</span>
                </div>
              </div>
              <p className="mos-mc-storage-note">
                {view.storage.providerLabel} · tahmini {view.storage.estimatedSizeLabel} · ileride{' '}
                {view.storage.futureProviders.join(' · ')}
              </p>
            </section>
          </div>

          <section className="mos-erp-ops__panel" aria-label="Eksik medya">
            <h2 className="mos-erp-ops__panel-title">EKSİK MEDYA</h2>
            <p className="mos-mc-panel-desc">Ana görseli olmayan ürünler</p>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl mos-erp-tbl--mc">
                <thead>
                  <tr>
                    <th className="mos-mc-th--thumb" aria-label="Görsel" />
                    <th>Ürün</th>
                    <th>Kod</th>
                    <th>Kategori</th>
                    <th>Görsel</th>
                    <th>Galeri</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {view.missingMedia.length === 0 ? (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={7}>Tüm ürünlerde ana görsel mevcut.</td>
                    </tr>
                  ) : (
                    view.missingMedia.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}
                      >
                        <td className="mos-mc-td--thumb">
                          <span className="mos-mc-thumb mos-mc-thumb--missing" aria-hidden="true" />
                        </td>
                        <td className="mos-mc-td--name">{row.name}</td>
                        <td className="mos-mc-td--code">{row.productCode}</td>
                        <td>{row.category}</td>
                        <td className="is-miss">Eksik</td>
                        <td className={row.hasGallery ? 'is-ok' : 'is-miss'}>
                          {row.hasGallery ? row.imageCount : 'Eksik'}
                        </td>
                        <td className={row.hasCatalog ? 'is-ok' : 'is-miss'}>
                          {row.hasCatalog ? 'Var' : 'Eksik'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mos-erp-ops__panel" aria-label="Ürün galerileri">
            <h2 className="mos-erp-ops__panel-title">ÜRÜN GALERİLERİ</h2>
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl mos-erp-tbl--mc">
                <thead>
                  <tr>
                    <th className="mos-mc-th--thumb" aria-label="Görsel" />
                    <th>Ürün</th>
                    <th className="is-num">Görsel Sayısı</th>
                    <th className="is-num">Video Sayısı</th>
                    <th className="is-num">PDF Sayısı</th>
                  </tr>
                </thead>
                <tbody>
                  {view.productGalleries.length === 0 ? (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={5}>Ürün bulunamadı.</td>
                    </tr>
                  ) : (
                    view.productGalleries.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}
                      >
                        <td className="mos-mc-td--thumb">
                          {row.thumbnailUrl ? (
                            <img src={row.thumbnailUrl} alt="" className="mos-mc-thumb" />
                          ) : (
                            <span className="mos-mc-thumb mos-mc-thumb--empty" aria-hidden="true" />
                          )}
                        </td>
                        <td className="mos-mc-td--name">{row.name}</td>
                        <td className="is-num">{row.imageCount}</td>
                        <td className="is-num">{row.videoCount}</td>
                        <td className="is-num">{row.pdfCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {view.assetRegistry.length > 0 ? (
            <section className="mos-erp-ops__panel" aria-label="Medya varlık kütüphanesi">
              <h2 className="mos-erp-ops__panel-title">MEDYA VARLIKLARI</h2>
              <p className="mos-mc-panel-desc">Kurumsal asset tablosu · önizleme · kullanım sayısı</p>
              <div className="mos-erp-tbl-wrap">
                <table className="mos-erp-tbl mos-erp-tbl--mc">
                  <thead>
                    <tr>
                      <th className="mos-mc-th--thumb" aria-label="Önizleme" />
                      <th>Dosya adı</th>
                      <th>Tür</th>
                      <th className="is-num">Boyut</th>
                      <th className="is-num">Ürün</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.assetRegistry.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}
                      >
                        <td className="mos-mc-td--thumb">
                          {row.previewUrl ? (
                            <img src={row.previewUrl} alt="" className="mos-mc-thumb" />
                          ) : (
                            <span className="mos-mc-thumb mos-mc-thumb--empty" aria-hidden="true" />
                          )}
                        </td>
                        <td className="mos-mc-td--name">{row.fileName}</td>
                        <td>{row.typeLabel}</td>
                        <td className="is-num">{row.fileSizeLabel}</td>
                        <td className="is-num">{row.usageCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <div className="mos-mc-grid">
            <section className="mos-erp-ops__panel mos-mc-panel" aria-label="Katalog merkezi">
              <h2 className="mos-erp-ops__panel-title">KATALOG MERKEZİ</h2>
              <p className="mos-mc-panel-desc">PDF kataloglar</p>
              <div className="mos-erp-tbl-wrap">
                <table className="mos-erp-tbl mos-erp-tbl--mc mos-erp-tbl--compact">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Dosya</th>
                      <th>Boyut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.catalogs.length === 0 ? (
                      <tr className="mos-erp-tbl-empty">
                        <td colSpan={3}>PDF katalog bulunamadı.</td>
                      </tr>
                    ) : (
                      view.catalogs.map((cat, idx) => (
                        <tr
                          key={cat.id}
                          className={`mos-erp-tbl-row${idx % 2 === 1 ? ' is-zebra' : ''}`}
                        >
                          <td className="mos-mc-td--name">
                            <span>{cat.productName}</span>
                            <span className="mos-mc-td-sub">{cat.productCode}</span>
                          </td>
                          <td className="mos-mc-td--file">{cat.fileName}</td>
                          <td className="is-num">{cat.sizeLabel}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mos-erp-ops__panel mos-mc-panel" aria-label="Son yüklenenler">
              <h2 className="mos-erp-ops__panel-title">SON YÜKLENENLER</h2>
              <ul className="mos-mc-recent-list">
                {view.recentUploads.length === 0 ? (
                  <li className="mos-mc-recent-list__empty">Henüz yükleme yok.</li>
                ) : (
                  view.recentUploads.map((item) => (
                    <li key={item.id} className={`mos-mc-recent-item ${recentTypeClass(item.type)}`}>
                      <div className="mos-mc-recent-item__preview">
                        {item.previewUrl ? (
                          <img src={item.previewUrl} alt="" />
                        ) : (
                          <span className="mos-mc-recent-item__icon" aria-hidden>
                            {item.type === 'PDF' ? 'PDF' : item.type === 'VIDEO' ? '▶' : '—'}
                          </span>
                        )}
                      </div>
                      <div className="mos-mc-recent-item__copy">
                        <span className="mos-mc-recent-item__title">{item.title}</span>
                        <span className="mos-mc-recent-item__meta">
                          {item.typeLabel} · {item.sourceLabel} · {item.uploadedAt}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        </>
      ) : null}
    </div>
  )
}

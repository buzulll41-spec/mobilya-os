import { mapProductToMasterCenterRow, mapProductMasterDtoToRowVm } from '../product/productMasterCenterModel.js'

/** @typedef {import('../../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */
/** @typedef {import('../../contracts/v1/productMaster.js').ProductMasterListItemDto} ProductMasterListItemDto */

/**
 * @typedef {import('../../contracts/v1/mediaAsset.js').MediaAssetDto} MediaAssetDto
 */

/**
 * @typedef {Object} MediaCenterAssetRowVm
 * @property {string} id
 * @property {string} fileName
 * @property {string} typeLabel
 * @property {string} fileSizeLabel
 * @property {number} usageCount
 * @property {string | null} previewUrl
 */

/**
 * @typedef {Object} MediaCenterProductRowVm
 * @property {string} id
 * @property {string} productCode
 * @property {string} name
 * @property {string} category
 * @property {number} imageCount
 * @property {number} videoCount
 * @property {number} pdfCount
 * @property {boolean} hasMainImage
 * @property {boolean} hasGallery
 * @property {boolean} hasCatalog
 * @property {string | null} thumbnailUrl
 */

/**
 * @typedef {Object} MediaCenterCatalogVm
 * @property {string} id
 * @property {string} productName
 * @property {string} productCode
 * @property {string} fileName
 * @property {string} url
 * @property {string} sizeLabel
 */

/**
 * @typedef {Object} MediaCenterRecentVm
 * @property {string} id
 * @property {string} title
 * @property {'IMAGE' | 'VIDEO' | 'PDF' | 'CAMPAIGN'} type
 * @property {string} typeLabel
 * @property {string} sourceLabel
 * @property {string} uploadedAt
 * @property {string | null} previewUrl
 */

/**
 * @typedef {Object} MediaCenterHealthVm
 * @property {number} score
 * @property {'success' | 'warning' | 'critical'} tone
 * @property {number} missingImageCount
 * @property {number} missingGalleryCount
 * @property {number} missingCatalogCount
 * @property {number} imageCoveragePct
 * @property {number} galleryCoveragePct
 * @property {number} catalogCoveragePct
 */

/**
 * @typedef {Object} MediaCenterStorageVm
 * @property {number} totalImages
 * @property {number} totalVideos
 * @property {number} totalPdfs
 * @property {string} estimatedSizeLabel
 * @property {string} providerLabel
 * @property {string[]} futureProviders
 */

const DEMO_TODAY = '2026-05-14'

const TYPE_LABELS = {
  IMAGE: 'Görsel',
  VIDEO: 'Video',
  PDF: 'PDF',
  CAMPAIGN: 'Kampanya',
}

/**
 * @param {string} seed
 */
function hashSeed(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * @param {number} daysAgo
 */
function isoDaysAgo(daysAgo) {
  const d = new Date(`${DEMO_TODAY}T12:00:00`)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

/**
 * @param {ReturnType<typeof mapProductToMasterCenterRow>} row
 * @returns {MediaCenterProductRowVm}
 */
function mapProductMediaRow(row) {
  const imageCount = (row.media.mainImageUrl ? 1 : 0) + row.media.galleryImageUrls.length
  const videoCount = row.media.videoUrl ? 1 : 0
  const pdfCount = row.media.catalogPdfUrl ? 1 : 0
  return {
    id: row.id,
    productCode: row.productCode,
    name: row.name,
    category: row.category,
    imageCount,
    videoCount,
    pdfCount,
    hasMainImage: Boolean(row.media.mainImageUrl),
    hasGallery: row.media.galleryImageUrls.length > 0,
    hasCatalog: Boolean(row.media.catalogPdfUrl),
    thumbnailUrl: row.thumbnailUrl,
  }
}

/**
 * @param {MediaCenterProductRowVm[]} rows
 * @returns {MediaCenterHealthVm}
 */
function computeMediaHealth(rows) {
  const total = rows.length || 1
  const missingImageCount = rows.filter((r) => !r.hasMainImage).length
  const missingGalleryCount = rows.filter((r) => !r.hasGallery).length
  const missingCatalogCount = rows.filter((r) => !r.hasCatalog).length
  const imageCoveragePct = Math.round(((total - missingImageCount) / total) * 100)
  const galleryCoveragePct = Math.round(((total - missingGalleryCount) / total) * 100)
  const catalogCoveragePct = Math.round(((total - missingCatalogCount) / total) * 100)
  const score = Math.round((imageCoveragePct + galleryCoveragePct + catalogCoveragePct) / 3)
  const tone = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'critical'
  return {
    score,
    tone,
    missingImageCount,
    missingGalleryCount,
    missingCatalogCount,
    imageCoveragePct,
    galleryCoveragePct,
    catalogCoveragePct,
  }
}

/**
 * @param {MediaCenterProductRowVm[]} rows
 * @returns {MediaCenterStorageVm}
 */
function computeStorage(rows) {
  const totalImages = rows.reduce((sum, r) => sum + r.imageCount, 0) + 6
  const totalVideos = rows.reduce((sum, r) => sum + r.videoCount, 0) + 2
  const totalPdfs = rows.reduce((sum, r) => sum + r.pdfCount, 0) + 3
  const mb = Math.round(totalImages * 0.42 + totalVideos * 8.5 + totalPdfs * 2.1)
  return {
    totalImages,
    totalVideos,
    totalPdfs,
    estimatedSizeLabel: `${mb} MB`,
    providerLabel: 'Yerel mock depo',
    futureProviders: ['Cloudflare R2', 'AWS S3', 'CDN'],
  }
}

/**
 * @param {ReturnType<typeof mapProductToMasterCenterRow>[]} masterRows
 * @returns {MediaCenterRecentVm[]}
 */
function buildRecentUploads(masterRows) {
  const productUploads = masterRows
    .filter((r) => r.media.mainImageUrl || r.media.videoUrl || r.media.catalogPdfUrl)
    .slice(0, 12)
    .map((row, idx) => {
      const h = hashSeed(`${row.id}-recent`)
      const types = []
      if (row.media.mainImageUrl) types.push({ type: /** @type {const} */ ('IMAGE'), url: row.media.mainImageUrl })
      if (row.media.videoUrl) types.push({ type: /** @type {const} */ ('VIDEO'), url: null })
      if (row.media.catalogPdfUrl) types.push({ type: /** @type {const} */ ('PDF'), url: null })
      const pick = types[h % types.length] ?? types[0]
      return {
        id: `recent-${row.id}`,
        title: pick.type === 'PDF' ? `${row.name} katalog` : row.name,
        type: pick.type,
        typeLabel: TYPE_LABELS[pick.type],
        sourceLabel: row.productCode,
        uploadedAt: isoDaysAgo(idx % 14),
        previewUrl: pick.url,
      }
    })

  const campaigns = [
    {
      id: 'camp-yaz-2026',
      title: 'Yaz İndirimi Ana Banner',
      type: /** @type {const} */ ('CAMPAIGN'),
      typeLabel: TYPE_LABELS.CAMPAIGN,
      sourceLabel: 'EVTREND Kampanya',
      uploadedAt: isoDaysAgo(1),
      previewUrl: 'https://placehold.co/320x120/eceff3/5c6678?text=Yaz+Indirimi',
    },
    {
      id: 'camp-instagram',
      title: 'Instagram Mağaza Kapak',
      type: /** @type {const} */ ('CAMPAIGN'),
      typeLabel: TYPE_LABELS.CAMPAIGN,
      sourceLabel: 'Sosyal Mağaza',
      uploadedAt: isoDaysAgo(3),
      previewUrl: 'https://placehold.co/320x120/eceff3/5c6678?text=Instagram',
    },
    {
      id: 'camp-marketplace',
      title: 'Marketplace Hero Görsel',
      type: /** @type {const} */ ('CAMPAIGN'),
      typeLabel: TYPE_LABELS.CAMPAIGN,
      sourceLabel: 'Marketplace',
      uploadedAt: isoDaysAgo(5),
      previewUrl: 'https://placehold.co/320x120/eceff3/5c6678?text=Marketplace',
    },
  ]

  return [...campaigns, ...productUploads]
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .slice(0, 10)
}

/**
 * @param {ReturnType<typeof mapProductToMasterCenterRow>[]} masterRows
 * @returns {MediaCenterCatalogVm[]}
 */
function buildCatalogCenter(masterRows) {
  return masterRows
    .filter((r) => r.media.catalogPdfUrl)
    .map((row) => ({
      id: `cat-${row.id}`,
      productName: row.name,
      productCode: row.productCode,
      fileName: `${row.slug || row.productCode}.pdf`,
      url: row.media.catalogPdfUrl ?? '',
      sizeLabel: `${1.2 + (hashSeed(row.id) % 8) / 10} MB`,
    }))
}

/**
 * @param {MediaAssetDto[]} assets
 * @returns {MediaCenterAssetRowVm[]}
 */
function mapAssetRegistryRows(assets) {
  return assets.map((a) => ({
    id: a.id,
    fileName: a.fileName,
    typeLabel: a.typeLabel,
    fileSizeLabel: a.fileSizeLabel,
    usageCount: a.usageCount,
    previewUrl: a.previewUrl,
  }))
}

/**
 * @param {MediaAssetDto[]} assets
 * @returns {MediaCenterRecentVm[]}
 */
function buildRecentFromAssets(assets) {
  return [...assets]
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      title: a.fileName,
      type: a.type === 'OTHER' ? /** @type {const} */ ('IMAGE') : a.type,
      typeLabel: a.typeLabel,
      sourceLabel: `${a.usageCount} ürün`,
      uploadedAt: a.uploadedAt.slice(0, 10),
      previewUrl: a.previewUrl,
    }))
}

/**
 * @param {MediaAssetDto[]} assets
 * @returns {MediaCenterStorageVm}
 */
function computeStorageFromAssets(assets) {
  const totalImages = assets.filter((a) => a.type === 'IMAGE').length
  const totalVideos = assets.filter((a) => a.type === 'VIDEO').length
  const totalPdfs = assets.filter((a) => a.type === 'PDF').length
  const bytes = assets.reduce((sum, a) => sum + a.fileSize, 0)
  const mb = Math.max(1, Math.round(bytes / (1024 * 1024)))
  return {
    totalImages,
    totalVideos,
    totalPdfs,
    estimatedSizeLabel: `${mb} MB`,
    providerLabel: 'Media Asset DB',
    futureProviders: ['Cloudflare R2', 'AWS S3', 'CDN'],
  }
}

/**
 * @param {ProductListItemDto | ProductMasterListItemDto} row
 */
function toMasterCenterRow(row) {
  if ('healthScore' in row && row.media) {
    return mapProductMasterDtoToRowVm(/** @type {ProductMasterListItemDto} */ (row))
  }
  return mapProductToMasterCenterRow(/** @type {ProductListItemDto} */ (row))
}

/**
 * @param {ProductListItemDto[] | ProductMasterListItemDto[]} products
 * @param {MediaAssetDto[]} [assets]
 */
export function buildMediaCenterView(products, assets = []) {
  const masterRows = products.map(toMasterCenterRow)
  const productRows = masterRows.map(mapProductMediaRow)
  const missingMedia = productRows.filter((r) => !r.hasMainImage)
  const health = computeMediaHealth(productRows)
  const storage =
    assets.length > 0 ? computeStorageFromAssets(assets) : computeStorage(productRows)
  const catalogs = buildCatalogCenter(masterRows)
  const recentUploads =
    assets.length > 0 ? buildRecentFromAssets(assets) : buildRecentUploads(masterRows)
  const assetRegistry = assets.length > 0 ? mapAssetRegistryRows(assets) : []

  return {
    today: DEMO_TODAY,
    summaryMetrics: [
      { id: 'health', label: 'Medya Sağlık', value: `${health.score}/100`, valueTone: health.tone },
      {
        id: 'missing',
        label: 'Eksik Ana Görsel',
        value: String(missingMedia.length),
        valueTone: missingMedia.length > 0 ? /** @type {const} */ ('warning') : /** @type {const} */ ('success'),
      },
      { id: 'images', label: 'Toplam Görsel', value: String(storage.totalImages) },
      { id: 'storage', label: 'Depolama', value: storage.estimatedSizeLabel },
    ],
    missingMedia,
    productGalleries: productRows,
    catalogs,
    recentUploads,
    assetRegistry,
    health,
    storage,
  }
}

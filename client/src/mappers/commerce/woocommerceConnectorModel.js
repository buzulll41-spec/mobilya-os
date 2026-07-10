import { buildCommercePublishingView } from './commercePublishingModel.js'

/** @typedef {import('./commercePublishingModel.js').CommercePublishRowVm} CommercePublishRowVm */
/** @typedef {import('../../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */

/** @typedef {'SENDABLE' | 'SENT' | 'PENDING' | 'ERROR' | 'BLOCKED'} WooSyncStatus */

/**
 * @typedef {Object} WooSendFieldVm
 * @property {string} group
 * @property {string} label
 * @property {string} value
 * @property {boolean} ready
 */

/**
 * @typedef {Object} WooConnectorRowVm
 * @property {string} id
 * @property {string} productCode
 * @property {string} name
 * @property {string | null} thumbnailUrl
 * @property {string} publishStatusLabel
 * @property {'success' | 'warning' | 'neutral'} publishStatusTone
 * @property {WooSyncStatus} wooStatus
 * @property {string} wooStatusLabel
 * @property {'success' | 'warning' | 'critical' | 'info' | 'neutral'} wooStatusTone
 * @property {string} lastSync
 * @property {string} lastSyncDetail
 * @property {boolean} isSendable
 * @property {WooSendFieldVm[]} sendFields
 * @property {CommercePublishRowVm} publish
 */

const DEMO_TODAY = '2026-05-14'

/** @type {Record<WooSyncStatus, string>} */
export const WOO_STATUS_LABELS = {
  SENDABLE: 'Gönderilebilir',
  SENT: 'Gönderildi',
  PENDING: 'Bekleyen',
  ERROR: 'Hatalı',
  BLOCKED: 'Hazır değil',
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
 * @param {string} isoDate
 */
function formatSyncDate(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * @param {CommercePublishRowVm} publish
 * @returns {WooSyncStatus}
 */
function resolveWooStatus(publish) {
  if (!publish.isReadyToPublish) return 'BLOCKED'
  const h = hashSeed(`${publish.id}-woo`)
  if (h % 11 === 0) return 'ERROR'
  if (h % 9 === 0) return 'PENDING'
  if (h % 4 === 0) return 'SENT'
  return 'SENDABLE'
}

/**
 * @param {WooSyncStatus} status
 */
function wooStatusTone(status) {
  if (status === 'SENT') return 'success'
  if (status === 'SENDABLE') return 'info'
  if (status === 'PENDING') return 'warning'
  if (status === 'ERROR') return 'critical'
  return 'neutral'
}

/**
 * @param {CommercePublishRowVm} publish
 * @param {WooSyncStatus} wooStatus
 */
function buildLastSync(publish, wooStatus) {
  const h = hashSeed(`${publish.id}-sync`)
  const daysAgo =
    wooStatus === 'SENT' ? 1 + (h % 14) : wooStatus === 'PENDING' ? 0 : wooStatus === 'ERROR' ? 2 + (h % 5) : 0
  if (wooStatus === 'SENDABLE' || wooStatus === 'BLOCKED') {
    return { lastSync: '—', lastSyncDetail: 'Henüz senkron yok' }
  }
  const d = new Date(`${DEMO_TODAY}T12:00:00`)
  d.setDate(d.getDate() - daysAgo)
  const iso = d.toISOString().slice(0, 10)
  const detail =
    wooStatus === 'SENT'
      ? 'EVTREND WooCommerce · mock başarılı'
      : wooStatus === 'PENDING'
        ? 'Kuyrukta · mock bekliyor'
        : 'Senkron hatası · mock retry'
  return { lastSync: formatSyncDate(iso), lastSyncDetail: detail }
}

/**
 * @param {CommercePublishRowVm} publish
 * @returns {WooSendFieldVm[]}
 */
function buildSendFields(publish) {
  const { master } = publish
  return [
    { group: 'SEO', label: 'SEO başlığı', value: master.seoTitle || '—', ready: publish.checks.hasSeo },
    { group: 'SEO', label: 'SEO açıklaması', value: master.seoDescription || '—', ready: publish.checks.hasSeo },
    { group: 'SEO', label: 'Slug', value: master.slug || '—', ready: publish.checks.hasSlug },
    {
      group: 'Medya',
      label: 'Ana görsel',
      value: master.media.mainImageUrl ? 'Var' : 'Eksik',
      ready: Boolean(master.media.mainImageUrl),
    },
    {
      group: 'Medya',
      label: 'Galeri',
      value: `${master.media.galleryImageUrls.length} görsel`,
      ready: master.media.galleryImageUrls.length > 0,
    },
    {
      group: 'Medya',
      label: 'Video',
      value: master.media.videoUrl ? 'Var' : '—',
      ready: Boolean(master.media.videoUrl),
    },
    {
      group: 'Fiyat',
      label: 'Liste fiyatı',
      value: master.listPriceFormatted,
      ready: true,
    },
    {
      group: 'Fiyat',
      label: 'İndirimli fiyat',
      value: master.discountedPriceFormatted,
      ready: true,
    },
    { group: 'Kategori', label: 'Kategori', value: master.category, ready: true },
    { group: 'Kategori', label: 'Alt kategori', value: master.subCategory, ready: true },
    {
      group: 'Varyantlar',
      label: 'Varyant sayısı',
      value: master.variants.length > 0 ? String(master.variants.length) : '—',
      ready: master.variants.length > 0,
    },
    ...(master.variants.length > 0
      ? master.variants.map((v) => ({
          group: 'Varyantlar',
          label: v.label,
          value: v.code,
          ready: true,
        }))
      : []),
  ]
}

/**
 * @param {CommercePublishRowVm} publish
 * @returns {WooConnectorRowVm}
 */
function mapWooConnectorRow(publish) {
  const wooStatus = resolveWooStatus(publish)
  const sync = buildLastSync(publish, wooStatus)
  return {
    id: publish.id,
    productCode: publish.productCode,
    name: publish.name,
    thumbnailUrl: publish.thumbnailUrl,
    publishStatusLabel: publish.publishStatusLabel,
    publishStatusTone: publish.publishStatusTone,
    wooStatus,
    wooStatusLabel: WOO_STATUS_LABELS[wooStatus],
    wooStatusTone: wooStatusTone(wooStatus),
    lastSync: sync.lastSync,
    lastSyncDetail: sync.lastSyncDetail,
    isSendable: wooStatus === 'SENDABLE',
    sendFields: buildSendFields(publish),
    publish,
  }
}

/**
 * @param {ProductListItemDto[]} products
 */
export function buildWooCommerceConnectorView(products) {
  const publishView = buildCommercePublishingView(products)
  const items = publishView.items.map(mapWooConnectorRow)

  const sendable = items.filter((i) => i.wooStatus === 'SENDABLE').length
  const sent = items.filter((i) => i.wooStatus === 'SENT').length
  const pending = items.filter((i) => i.wooStatus === 'PENDING').length
  const error = items.filter((i) => i.wooStatus === 'ERROR').length

  return {
    today: DEMO_TODAY,
    connection: {
      label: 'EVTREND WooCommerce',
      endpoint: 'https://evtrend.example.com/wp-json/wc/v3',
      mode: 'Mock bağlantı',
      status: 'connected',
    },
    items,
    summaryMetrics: [
      { id: 'total', label: 'Toplam Ürün', value: String(items.length) },
      {
        id: 'sendable',
        label: 'Gönderilebilir',
        value: String(sendable),
        valueTone: sendable > 0 ? /** @type {const} */ ('success') : undefined,
      },
      {
        id: 'sent',
        label: 'Gönderildi',
        value: String(sent),
        valueTone: /** @type {const} */ ('success'),
      },
      {
        id: 'pending',
        label: 'Bekleyen',
        value: String(pending),
        valueTone: pending > 0 ? /** @type {const} */ ('warning') : undefined,
      },
      {
        id: 'error',
        label: 'Hatalı',
        value: String(error),
        valueTone: error > 0 ? /** @type {const} */ ('critical') : undefined,
      },
    ],
  }
}

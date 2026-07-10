import { getApiBaseUrl } from '../config/dataSource.js'
import { createAuthedApiClient } from '../lib/operationActor.js'

function apiBase() {
  return getApiBaseUrl()
}

/**
 * @param {{ q?: string; mimeType?: string; page?: number; pageSize?: number }} [query]
 * @returns {Promise<import('../contracts/v1/mediaAsset.js').MediaAssetListResponseDto>}
 */
export async function listMediaAssets(query = {}) {
  const base = apiBase()
  if (!base) {
    return { assets: [], total: 0 }
  }
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.mimeType) params.set('mimeType', query.mimeType)
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  const qs = params.toString()
  return client.get(qs ? `/v1/media-assets?${qs}` : '/v1/media-assets')
}

/**
 * @param {string} productId
 * @returns {Promise<import('../contracts/v1/mediaAsset.js').ProductMediaBundleDto>}
 */
export async function getProductMediaBundle(productId) {
  const base = apiBase()
  if (!base) {
    return {
      productId,
      hero: null,
      gallery: [],
      video: null,
      pdf: null,
      resolvedMedia: {
        mainImageUrl: null,
        galleryImageUrls: [],
        videoUrl: null,
        catalogPdfUrl: null,
      },
    }
  }
  const client = createAuthedApiClient(base)
  return client.get(`/v1/product-master/${productId}/media`)
}

/**
 * @param {string} productId
 * @param {{
 *   heroAssetId?: string | null
 *   galleryAssetIds?: string[]
 *   videoAssetId?: string | null
 *   pdfAssetId?: string | null
 * }} body
 * @returns {Promise<import('../contracts/v1/mediaAsset.js').ProductMediaBundleDto>}
 */
export async function putProductMediaLinks(productId, body) {
  const base = apiBase()
  if (!base) {
    throw new Error('Medya bağlantısı yalnızca canlı API modunda kullanılabilir')
  }
  const client = createAuthedApiClient(base)
  return client.put(`/v1/product-master/${productId}/media`, body)
}

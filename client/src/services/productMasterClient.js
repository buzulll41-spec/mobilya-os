import { getApiBaseUrl } from '../config/dataSource.js'
import {
  buildProductMasterCenterView,
  mapProductMasterDtoToRowVm,
} from '../mappers/product/productMasterCenterModel.js'
import * as mockProducts from './mockProductsApi.js'
import {
  createProductMasterOnApi,
  createProductVariantOnApi,
  fetchProductMasterDetailFromApi,
  fetchProductMasterFromApi,
  patchProductMasterOnApi,
  patchProductVariantOnApi,
  prepareWooSyncOnApi,
  publishWooDraftOnApi,
} from './realProductMasterApi.js'

function apiBase() {
  return getApiBaseUrl()
}

/**
 * @param {import('../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} vm
 * @returns {import('../contracts/v1/productMaster.js').ProductMasterListItemDto}
 */
function rowVmToListItemDto(vm) {
  return {
    id: vm.id,
    productCode: vm.productCode,
    barcode: vm.barcode,
    name: vm.name,
    brand: vm.brand,
    category: vm.category,
    subCategory: vm.subCategory,
    thumbnailUrl: vm.thumbnailUrl,
    listPrice: vm.listPriceFormatted,
    salePrice: vm.salePriceFormatted,
    discountedPrice: vm.discountedPriceFormatted,
    vatRate: vm.vatRate,
    currency: 'TRY',
    supplierId: vm.supplierId,
    supplierName: vm.supplierName,
    purchaseCost: vm.purchaseCostFormatted,
    profitAmount: vm.profitAmount,
    profitPercent: vm.profitPercent,
    deliveryDays: vm.deliveryDays,
    seoTitle: vm.seoTitle,
    seoDescription: vm.seoDescription,
    shortDescription: vm.shortDescription,
    longDescription: vm.longDescription,
    slug: vm.slug,
    technicalSpecs: vm.technicalSpecs,
    dimensions: vm.dimensions,
    colorOptions: vm.colorOptions,
    fabricOptions: vm.fabricOptions,
    variants: vm.variants,
    publishStatus: vm.publishStatus,
    publishStatusLabel: vm.publishStatusLabel,
    webEnabled: vm.publishStatus !== 'PASSIVE',
    mobileEnabled: vm.publishStatus !== 'PASSIVE',
    marketplaceEnabled: false,
    media: vm.media,
    healthScore: vm.healthScore,
    productHealthScore: vm.healthScore.score,
    missingFields: vm.healthScore.missingLabels,
    isActive: vm.publishStatus !== 'PASSIVE',
  }
}

/**
 * @param {{
 *   q?: string
 *   category?: string
 *   publishStatus?: string
 *   activeOnly?: boolean
 *   page?: number
 *   pageSize?: number
 * }} [query]
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterListResponseDto>}
 */
export async function listProductMaster(query) {
  const base = apiBase()
  if (base) return fetchProductMasterFromApi(base, query)

  const res = await mockProducts.mockListProducts({
    activeOnly: false,
    pageSize: query?.pageSize ?? 100,
    q: query?.q,
    category: query?.category,
    page: query?.page,
  })
  const view = buildProductMasterCenterView(res.items)
  return {
    items: view.items.map(rowVmToListItemDto),
    summaryMetrics: view.summaryMetrics,
    total: res.total,
    page: res.page,
    pageSize: res.pageSize,
  }
}

/**
 * @param {string} productId
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function getProductMaster(productId) {
  const base = apiBase()
  if (base) return fetchProductMasterDetailFromApi(base, productId)

  const list = await listProductMaster({ pageSize: 100 })
  const row = list.items.find((p) => p.id === productId)
  if (!row) throw new Error('Ürün master kaydı bulunamadı')
  return { ...row, updatedAt: new Date().toISOString() }
}

/**
 * Liste yanıtını ekran view modeline çevirir (API ve mock ortak).
 * @param {import('../contracts/v1/productMaster.js').ProductMasterListResponseDto} res
 */
export function toProductMasterCenterView(res) {
  return {
    items: res.items.map(mapProductMasterDtoToRowVm),
    summaryMetrics: res.summaryMetrics,
  }
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function createProductMaster(body) {
  const base = apiBase()
  if (!base) throw new Error('Ürün oluşturma yalnızca canlı API ile kullanılabilir')
  return createProductMasterOnApi(base, body)
}

/**
 * @param {string} productId
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function patchProductMaster(productId, body) {
  const base = apiBase()
  if (!base) throw new Error('Ürün güncelleme yalnızca canlı API ile kullanılabilir')
  return patchProductMasterOnApi(base, productId, body)
}

/**
 * @param {string} productId
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterVariantDto>}
 */
export async function createProductVariant(productId, body) {
  const base = apiBase()
  if (!base) throw new Error('Varyant oluşturma yalnızca canlı API ile kullanılabilir')
  return createProductVariantOnApi(base, productId, body)
}

/**
 * @param {string} productId
 * @param {string} variantId
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterVariantDto>}
 */
export async function patchProductVariant(productId, variantId, body) {
  const base = apiBase()
  if (!base) throw new Error('Varyant güncelleme yalnızca canlı API ile kullanılabilir')
  return patchProductVariantOnApi(base, productId, variantId, body)
}

/**
 * @param {string} productId
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function prepareWooSync(productId) {
  const base = apiBase()
  if (!base) throw new Error('Woo sync hazırlığı yalnızca canlı API ile kullanılabilir')
  return prepareWooSyncOnApi(base, productId)
}

/**
 * @param {string} productId
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function publishWooDraft(productId) {
  const base = apiBase()
  if (!base) throw new Error('Woo taslak gönderimi yalnızca canlı API ile kullanılabilir')
  return publishWooDraftOnApi(base, productId)
}

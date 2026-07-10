import { resolveProductPurchaseCost } from './productPurchaseCost.js'

import { PRODUCT_TYPE } from '../constants/productMasterCore.js'
import { PUBLISH_STATUS, normalizePublishStatus } from '../mappers/product/productMasterCenterModel.js'



/**

 * @returns {import('../features/product/productMasterFormTypes.js').ProductMasterFormState}

 */

export function emptyProductMasterForm() {

  return {

    name: '',

    code: '',

    barcode: '',

    brand: '',

    category: '',

    subCategory: '',

    supplierId: '',

    wholesalePrice: '',

    wholesaleDiscountRate: '',

    costPrice: '',

    listPrice: '',

    salePrice: '',

    vatRate: '20',

    slug: '',

    seoTitle: '',

    seoDescription: '',

    shortDescription: '',

    longDescription: '',

    width: '',

    depth: '',

    height: '',

    material: '',

    warrantyMonths: '',

    deliveryTimeDays: '14',

    mainImageUrl: '',

    galleryImageUrls: '',

    videoUrl: '',

    catalogPdfUrl: '',

    publishStatus: PUBLISH_STATUS.DRAFT,

    productType: PRODUCT_TYPE.SIMPLE,

    collectionCode: '',

    seasonCode: '',

    weightKg: '',

    packageWidthCm: '',

    packageDepthCm: '',

    packageHeightCm: '',

    packageCount: '',

    assemblyType: '',

    coating: '',

    mechanism: '',

    technicalAttributes: '',

    colorOptions: '',

    fabricOptions: '',

    tags: '',

    relatedProductIds: '',

    stockType: 'ORDER',

    salesSourceType: '',

    displayFloor: '',

    physicalLocation: '',

    externalSupplyType: '',

    webEnabled: true,

    mobileEnabled: true,

    marketplaceEnabled: false,

  }

}



/**

 * @param {string | number | null | undefined} value

 */

function parseMoneyInput(value) {

  if (value === '' || value == null) return undefined

  const n = Number(String(value).replace(/[^\d.-]/g, ''))

  return Number.isFinite(n) ? n : undefined

}



/**

 * @param {string | number | null | undefined} value

 */

function parseIntInput(value) {

  if (value === '' || value == null) return undefined

  const n = Number.parseInt(String(value), 10)

  return Number.isFinite(n) ? n : undefined

}



/**

 * @param {string | number | null | undefined} value

 */

function parseCmFromDimensions(value) {

  if (value == null || value === '') return ''

  const m = String(value).match(/([\d.]+)/)

  return m ? m[1] : String(value)

}



/**

 * @param {string} text

 */

function splitLines(text) {

  return text

    .split(/\r?\n/)

    .map((s) => s.trim())

    .filter(Boolean)

}



/**

 * @param {string} text

 */

function splitCommaList(text) {

  return text

    .split(/[,;\n]/)

    .map((s) => s.trim())

    .filter(Boolean)

}



/**

 * @param {{ label: string; value: string }[]} specs

 */

function specsToTextarea(specs) {

  if (!Array.isArray(specs) || specs.length === 0) return ''

  return specs.map((s) => `${s.label}: ${s.value}`).join('\n')

}



/**

 * @param {string} text

 * @returns {{ label: string; value: string }[]}

 */

function parseTechnicalAttributesText(text) {

  return splitLines(text)

    .map((line) => {

      const idx = line.indexOf(':')

      if (idx <= 0) return null

      const label = line.slice(0, idx).trim()

      const value = line.slice(idx + 1).trim()

      return label && value ? { label, value } : null

    })

    .filter((item) => item != null)

}



/**

 * @param {import('../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} product

 * @param {Partial<import('../features/product/productMasterFormTypes.js').ProductMasterFormState>} [draft]

 * @returns {import('../features/product/productMasterFormTypes.js').ProductMasterFormState}

 */

export function productToFormState(product, draft = {}) {

  const vat = String(product.vatRate ?? '').replace('%', '')

  const base = {

    name: product.name ?? '',

    code: product.productCode ?? '',

    barcode: product.barcode ?? '',

    brand: product.brand ?? '',

    category: product.category ?? '',

    subCategory: product.subCategory === '—' ? '' : (product.subCategory ?? ''),

    supplierId: product.supplierId ?? '',

    wholesalePrice: parseMoneyInput(product.wholesalePrice) ?? parseMoneyInput(product.purchaseCost) ?? '',

    wholesaleDiscountRate: parseMoneyInput(product.wholesaleDiscountRate) ?? '',

    costPrice: parseMoneyInput(product.netPurchasePrice ?? product.purchaseCost) ?? '',

    listPrice: parseMoneyInput(product.listPrice) ?? '',

    salePrice: parseMoneyInput(product.discountedPrice) ?? '',

    vatRate: vat || '20',

    slug: product.slug ?? '',

    seoTitle: product.seoTitle ?? '',

    seoDescription: product.seoDescription ?? '',

    shortDescription: product.shortDescription ?? '',

    longDescription: product.longDescription ?? '',

    width: parseCmFromDimensions(product.dimensions?.width),

    depth: parseCmFromDimensions(product.dimensions?.depth),

    height: parseCmFromDimensions(product.dimensions?.height),

    material: product.material ?? product.technicalSpecs?.find((s) => s.label === 'Malzeme')?.value ?? '',

    warrantyMonths: product.warrantyMonths != null ? String(product.warrantyMonths) : '',

    deliveryTimeDays: String(product.deliveryDays ?? 14),

    mainImageUrl: product.media?.mainImageUrl ?? '',

    galleryImageUrls: (product.media?.galleryImageUrls ?? []).join('\n'),

    videoUrl: product.media?.videoUrl ?? '',

    catalogPdfUrl: product.media?.catalogPdfUrl ?? '',

    publishStatus: product.publishStatus
      ? normalizePublishStatus(product.publishStatus, { isActive: product.isActive })
      : PUBLISH_STATUS.DRAFT,

    productType: product.productType ?? PRODUCT_TYPE.SIMPLE,

    collectionCode: product.collectionCode ?? '',

    seasonCode: product.seasonCode ?? '',

    weightKg: product.weightKg != null ? String(product.weightKg) : parseCmFromDimensions(product.dimensions?.weight),

    packageWidthCm: product.packageWidthCm != null ? String(product.packageWidthCm) : '',

    packageDepthCm: product.packageDepthCm != null ? String(product.packageDepthCm) : '',

    packageHeightCm: product.packageHeightCm != null ? String(product.packageHeightCm) : '',

    packageCount: product.packageCount != null ? String(product.packageCount) : '',

    assemblyType: product.assemblyType ?? '',

    coating: product.coating ?? '',

    mechanism: product.mechanism ?? '',

    technicalAttributes: specsToTextarea(product.technicalAttributes ?? product.technicalSpecs ?? []),

    colorOptions: (product.colorOptions ?? []).join(', '),

    fabricOptions: (product.fabricOptions ?? []).join(', '),

    tags: (product.tags ?? []).join(', '),

    relatedProductIds: (product.relatedProductIds ?? []).join(', '),

    stockType: product.stockType ?? 'ORDER',

    salesSourceType: product.salesSourceType ?? '',

    displayFloor: product.displayFloor ?? '',

    physicalLocation: product.physicalLocation ?? '',

    externalSupplyType: product.externalSupplyType ?? '',

    webEnabled: product.webEnabled ?? product.publishStatus !== PUBLISH_STATUS.PASSIVE,

    mobileEnabled: product.mobileEnabled ?? product.publishStatus !== PUBLISH_STATUS.PASSIVE,

    marketplaceEnabled: product.marketplaceEnabled ?? false,

  }

  return { ...base, ...draft }

}



/**

 * @param {import('../features/product/productMasterFormTypes.js').ProductMasterFormState} form

 */

export function buildProductMasterWritePayload(form) {

  const galleryImageUrls = splitLines(form.galleryImageUrls)

  const technicalAttributes = parseTechnicalAttributesText(form.technicalAttributes)

  const colorOptions = splitCommaList(form.colorOptions)

  const fabricOptions = splitCommaList(form.fabricOptions)

  const tags = splitCommaList(form.tags)

  const relatedProductIds = splitCommaList(form.relatedProductIds)



  const purchase = resolveProductPurchaseCost({
    wholesalePrice: parseMoneyInput(form.wholesalePrice),
    wholesaleDiscountRate: parseMoneyInput(form.wholesaleDiscountRate),
    costPrice: parseMoneyInput(form.costPrice),
  })

  return {

    name: form.name.trim(),

    code: form.code.trim(),

    category: form.category.trim(),

    ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),

    ...(form.brand.trim() ? { brand: form.brand.trim() } : {}),

    ...(form.subCategory.trim() ? { subCategory: form.subCategory.trim() } : {}),

    ...(form.supplierId ? { supplierId: form.supplierId } : {}),

    ...(parseMoneyInput(form.wholesalePrice) !== undefined
      ? { wholesalePrice: parseMoneyInput(form.wholesalePrice) }
      : {}),

    ...(parseMoneyInput(form.wholesaleDiscountRate) !== undefined
      ? { wholesaleDiscountRate: parseMoneyInput(form.wholesaleDiscountRate) }
      : {}),

    ...(purchase.netPurchasePrice > 0 ? { costPrice: purchase.netPurchasePrice } : {}),

    ...(parseMoneyInput(form.listPrice) !== undefined ? { listPrice: parseMoneyInput(form.listPrice) } : {}),

    ...(parseMoneyInput(form.salePrice) !== undefined ? { salePrice: parseMoneyInput(form.salePrice) } : {}),

    ...(parseMoneyInput(form.vatRate) !== undefined ? { vatRate: parseMoneyInput(form.vatRate) } : {}),

    ...(form.slug.trim() ? { slug: form.slug.trim() } : {}),

    ...(form.seoTitle.trim() ? { seoTitle: form.seoTitle.trim() } : {}),

    ...(form.seoDescription.trim() ? { seoDescription: form.seoDescription.trim() } : {}),

    ...(form.shortDescription.trim() ? { shortDescription: form.shortDescription.trim() } : {}),

    ...(form.longDescription.trim() ? { longDescription: form.longDescription.trim() } : {}),

    ...(parseMoneyInput(form.width) !== undefined ? { width: parseMoneyInput(form.width) } : {}),

    ...(parseMoneyInput(form.depth) !== undefined ? { depth: parseMoneyInput(form.depth) } : {}),

    ...(parseMoneyInput(form.height) !== undefined ? { height: parseMoneyInput(form.height) } : {}),

    ...(form.material.trim() ? { material: form.material.trim() } : {}),

    ...(parseIntInput(form.warrantyMonths) !== undefined

      ? { warrantyMonths: parseIntInput(form.warrantyMonths) }

      : {}),

    ...(parseIntInput(form.deliveryTimeDays) !== undefined

      ? { deliveryTimeDays: parseIntInput(form.deliveryTimeDays) }

      : {}),

    ...(form.mainImageUrl.trim() ? { mainImageUrl: form.mainImageUrl.trim() } : {}),

    ...(galleryImageUrls.length > 0 ? { galleryImageUrls } : {}),

    ...(form.videoUrl.trim() ? { videoUrl: form.videoUrl.trim() } : {}),

    ...(form.catalogPdfUrl.trim() ? { catalogPdfUrl: form.catalogPdfUrl.trim() } : {}),

    publishStatus: form.publishStatus,

    productType: form.productType,

    ...(form.collectionCode.trim() ? { collectionCode: form.collectionCode.trim() } : {}),

    ...(form.seasonCode.trim() ? { seasonCode: form.seasonCode.trim() } : {}),

    ...(parseMoneyInput(form.weightKg) !== undefined ? { weightKg: parseMoneyInput(form.weightKg) } : {}),

    ...(parseMoneyInput(form.packageWidthCm) !== undefined

      ? { packageWidthCm: parseMoneyInput(form.packageWidthCm) }

      : {}),

    ...(parseMoneyInput(form.packageDepthCm) !== undefined

      ? { packageDepthCm: parseMoneyInput(form.packageDepthCm) }

      : {}),

    ...(parseMoneyInput(form.packageHeightCm) !== undefined

      ? { packageHeightCm: parseMoneyInput(form.packageHeightCm) }

      : {}),

    ...(parseIntInput(form.packageCount) !== undefined

      ? { packageCount: parseIntInput(form.packageCount) }

      : {}),

    ...(form.assemblyType.trim() ? { assemblyType: form.assemblyType.trim() } : {}),

    ...(form.coating.trim() ? { coating: form.coating.trim() } : {}),

    ...(form.mechanism.trim() ? { mechanism: form.mechanism.trim() } : {}),

    ...(technicalAttributes.length > 0 ? { technicalAttributes } : {}),

    ...(colorOptions.length > 0 ? { colorOptions } : {}),

    ...(fabricOptions.length > 0 ? { fabricOptions } : {}),

    ...(tags.length > 0 ? { tags } : {}),

    ...(relatedProductIds.length > 0 ? { relatedProductIds } : {}),

    stockType: form.stockType || 'ORDER',

    ...(form.salesSourceType ? { salesSourceType: form.salesSourceType } : {}),

    ...(form.displayFloor ? { displayFloor: form.displayFloor } : {}),

    ...(form.physicalLocation ? { physicalLocation: form.physicalLocation } : {}),

    ...(form.externalSupplyType ? { externalSupplyType: form.externalSupplyType } : {}),

    webEnabled: form.webEnabled,

    mobileEnabled: form.mobileEnabled,

    marketplaceEnabled: form.marketplaceEnabled,

  }

}


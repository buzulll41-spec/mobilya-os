/**
 * Product Master Center API DTO'ları
 *
 * @typedef {'DRAFT' | 'PUBLISHED' | 'PASSIVE'} PublishStatus
 *
 * @typedef {Object} ProductMasterMediaDto
 * @property {string | null} mainImageUrl
 * @property {string[]} galleryImageUrls
 * @property {string | null} videoUrl
 * @property {string | null} catalogPdfUrl
 *
 * @typedef {Object} ProductMasterTechnicalSpecDto
 * @property {string} label
 * @property {string} value
 *
 * @typedef {Object} ProductMasterDimensionsDto
 * @property {string} productMeasure
 * @property {string} width
 * @property {string} height
 * @property {string} depth
 * @property {string} weight
 * @property {string | null} bedSize
 * @property {string | null} tableSize
 *
 * @typedef {Object} ProductMasterHealthCheckDto
 * @property {boolean} hasImage
 * @property {boolean} hasSeo
 * @property {boolean} hasDescription
 * @property {boolean} hasTechnicalSpecs
 *
 * @typedef {Object} ProductMasterHealthScoreDto
 * @property {number} score
 * @property {'success' | 'warning' | 'critical'} tone
 * @property {ProductMasterHealthCheckDto} checks
 * @property {string[]} missingLabels
 *
 * @typedef {'NOT_READY' | 'READY' | 'SYNC_PENDING' | 'SYNCED' | 'ERROR'} WooProductStatus
 *
 * @typedef {Object} ProductMasterWooDto
 * @property {number | null} productId
 * @property {WooProductStatus} status
 * @property {string} statusLabel
 * @property {'success' | 'warning' | 'critical' | 'info' | 'neutral'} statusTone
 * @property {string | null} lastSyncAt
 * @property {string | null} lastError
 * @property {boolean} syncRequired
 * @property {number | null} categoryId
 * @property {'READY' | 'NOT_READY'} readiness
 * @property {string[]} readinessMissingLabels
 *
 * @typedef {Object} ProductMasterVariantDto
 * @property {string} id
 * @property {string} variantCode
 * @property {string | null} barcode
 * @property {string} name
 * @property {string} label
 * @property {string} code
 * @property {Record<string, string>} attributes
 * @property {number | null} priceDelta
 * @property {number | null} costDelta
 * @property {string | null} salePrice
 * @property {string | null} purchasePrice
 * @property {number | null} stockQuantity
 * @property {'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_ORDER' | 'LOW_STOCK' | null} stockStatus
 * @property {string | null} stockStatusLabel
 * @property {number | null} widthCm
 * @property {number | null} depthCm
 * @property {number | null} heightCm
 * @property {string | null} color
 * @property {string | null} fabric
 * @property {string | null} sizeLabel
 * @property {boolean} isDefault
 * @property {boolean} isActive
 * @property {number | null} [wooVariationId]
 *
 * @typedef {Object} ProductMasterSummaryMetricDto
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {'success' | 'warning' | undefined} [valueTone]
 *
 * @typedef {Object} ProductMasterListItemDto
 * @property {string} id
 * @property {string} productCode
 * @property {string} barcode
 * @property {string} name
 * @property {string} brand
 * @property {string} category
 * @property {string} subCategory
 * @property {string | null} thumbnailUrl
 * @property {string} listPrice
 * @property {string} salePrice
 * @property {string} discountedPrice
 * @property {string} vatRate
 * @property {string} currency
 * @property {string | null} supplierId
 * @property {string | null} supplierName
 * @property {string} purchaseCost
 * @property {number} profitAmount
 * @property {number} profitPercent
 * @property {number} deliveryDays
 * @property {string} seoTitle
 * @property {string} seoDescription
 * @property {string} shortDescription
 * @property {string} longDescription
 * @property {string} slug
 * @property {ProductMasterTechnicalSpecDto[]} technicalSpecs
 * @property {ProductMasterDimensionsDto} dimensions
 * @property {string[]} colorOptions
 * @property {string[]} fabricOptions
 * @property {ProductMasterVariantDto[]} variants
 * @property {PublishStatus} publishStatus
 * @property {string} publishStatusLabel
 * @property {boolean} webEnabled
 * @property {boolean} mobileEnabled
 * @property {boolean} marketplaceEnabled
 * @property {ProductMasterMediaDto} media
 * @property {ProductMasterHealthScoreDto} healthScore
 * @property {number} productHealthScore
 * @property {string[]} missingFields
 * @property {boolean} isActive
 * @property {ProductMasterWooDto} woo
 *
 * @typedef {ProductMasterListItemDto & { updatedAt: string }} ProductMasterDetailDto
 *
 * @typedef {Object} ProductMasterListResponseDto
 * @property {ProductMasterListItemDto[]} items
 * @property {ProductMasterSummaryMetricDto[]} summaryMetrics
 * @property {number} total
 * @property {number} page
 * @property {number} pageSize
 */

export {}

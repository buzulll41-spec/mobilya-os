/**
 * @typedef {Object} MediaAssetDto
 * @property {string} id
 * @property {string} fileName
 * @property {string} mimeType
 * @property {number} fileSize
 * @property {string} fileSizeLabel
 * @property {string} storageProvider
 * @property {string} storageKey
 * @property {string} cdnUrl
 * @property {string | null} thumbnailUrl
 * @property {string | null} uploadedBy
 * @property {string} uploadedAt
 * @property {'IMAGE' | 'VIDEO' | 'PDF' | 'OTHER'} type
 * @property {string} typeLabel
 * @property {number} usageCount
 * @property {string | null} previewUrl
 */

/**
 * @typedef {Object} ProductMediaLinkDto
 * @property {string} id
 * @property {string} productId
 * @property {string} assetId
 * @property {string} role
 * @property {string} roleLabel
 * @property {number} sortOrder
 * @property {string | null} altText
 * @property {MediaAssetDto} asset
 */

/**
 * @typedef {Object} ProductMediaBundleDto
 * @property {string} productId
 * @property {ProductMediaLinkDto | null} hero
 * @property {ProductMediaLinkDto[]} gallery
 * @property {ProductMediaLinkDto | null} video
 * @property {ProductMediaLinkDto | null} pdf
 * @property {import('./productMaster.js').ProductMasterMediaDto} resolvedMedia
 */

/**
 * @typedef {Object} MediaAssetListResponseDto
 * @property {MediaAssetDto[]} assets
 * @property {number} total
 */

export {}

/**
 * Ürün kartı master v1
 *
 * @typedef {'ORDER' | 'STOCK' | 'DISPLAY'} ProductStockType
 *
 * @typedef {Object} ProductListItemDto
 * @property {string} id
 * @property {string} productCode
 * @property {string} productName
 * @property {string} category
 * @property {string | null} suiteType
 * @property {string} defaultSalePrice
 * @property {string} minSalePrice
 * @property {string} purchasePrice
 * @property {string | null} defaultSupplierId
 * @property {string | null} defaultSupplierName
 * @property {number} deliveryDays
 * @property {boolean} isActive
 * @property {ProductStockType} stockType
 * @property {string} stockTypeLabel
 * @property {SalesSourceType | null} salesSourceType
 * @property {string | null} salesSourceTypeLabel
 * @property {DisplayFloor | null} displayFloor
 * @property {string | null} displayFloorLabel
 * @property {ExternalSupplyType | null} externalSupplyType
 * @property {string | null} externalSupplyTypeLabel
 * @property {PhysicalLocation | null} physicalLocation
 * @property {string | null} physicalLocationLabel
 * @property {number} marginRatio
 * @property {boolean} isLowMargin
 * @property {string} createdAt
 *
 * @typedef {import('../../constants/productSource.js').SalesSourceType} SalesSourceType
 * @typedef {import('../../constants/productSource.js').DisplayFloor} DisplayFloor
 * @typedef {import('../../constants/productSource.js').ExternalSupplyType} ExternalSupplyType
 * @typedef {import('../../constants/productSource.js').PhysicalLocation} PhysicalLocation
 *
 * @typedef {ProductListItemDto & { description: string | null, updatedAt: string }} ProductDetailDto
 *
 * @typedef {Object} ProductCatalogKpisDto
 * @property {number} activeCount
 * @property {number} inactiveCount
 * @property {number} lowMarginCount
 * @property {string | null} topCategory
 *
 * @typedef {Object} ProductListResponseDto
 * @property {ProductListItemDto[]} items
 * @property {ProductCatalogKpisDto} kpis
 * @property {number} total
 * @property {number} page
 * @property {number} pageSize
 *
 * @typedef {Object} CreateProductRequest
 * @property {string} productCode
 * @property {string} productName
 * @property {string} category
 * @property {string} [suiteType]
 * @property {number} defaultSalePrice
 * @property {number} minSalePrice
 * @property {number} purchasePrice
 * @property {string} [defaultSupplierId]
 * @property {number} [deliveryDays]
 * @property {boolean} [isActive]
 * @property {ProductStockType} stockType
 * @property {string} [description]
 * @property {SalesSourceType} salesSourceType
 * @property {DisplayFloor} [displayFloor]
 * @property {ExternalSupplyType} [externalSupplyType]
 * @property {PhysicalLocation} [physicalLocation]
 *
 * @typedef {Partial<CreateProductRequest & { isActive: boolean, description: string | null }>} PatchProductRequest
 */

export {}

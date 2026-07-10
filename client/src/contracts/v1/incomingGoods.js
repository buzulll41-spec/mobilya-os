/**
 * @typedef {Object} IncomingGoodsRecordDto
 * @property {string} id
 * @property {string} supplierId
 * @property {string} supplierName
 * @property {string} receivedAt
 * @property {string} productTitle
 * @property {string | null} productGroup
 * @property {string | null} [productId]
 * @property {string} qty
 * @property {string} unitPurchasePrice
 * @property {string} lineTotal
 * @property {string} currency
 * @property {string} purpose
 * @property {string} purposeLabel
 * @property {string | null} orderLineId
 * @property {string | null} salesOrderId
 * @property {string | null} orderNumber
 * @property {string | null} customerName
 * @property {string | null} invoiceNo
 * @property {string | null} documentNo
 * @property {string | null} note
 * @property {string} createdAt
 */

/**
 * @typedef {Object} PendingOrderLineForIncomingDto
 * @property {string} orderLineId
 * @property {string} salesOrderId
 * @property {string} orderNumber
 * @property {string} customerName
 * @property {string} productTitle
 * @property {string} qtyOrdered
 * @property {string} qtyReceived
 * @property {string} qtyPending
 * @property {string | null} dueDate
 * @property {string | null} [productId]
 * @property {string | null} [supplierName]
 * @property {string | null} [supplierId]
 * @property {string | null} [defaultSupplierId]
 */

/**
 * @typedef {'waiting' | 'partial' | 'ready' | 'missing'} ProductReadinessStatus
 * @typedef {'ok' | 'caution' | 'warn' | 'danger'} ProductReadinessTone
 */

/**
 * @typedef {Object} OrderLineReceivingDto
 * @property {string} orderLineId
 * @property {string} title
 * @property {string} qtyOrdered
 * @property {string} qtyReceived
 * @property {string} qtyPending
 * @property {ProductReadinessStatus} readinessStatus
 * @property {string} readinessLabel
 * @property {ProductReadinessTone} readinessTone
 * @property {ProductReadinessStatus} badge
 * @property {string} badgeLabel
 * @property {string | null} [productId]
 * @property {string | null} [defaultSupplierId]
 * @property {string | null} [suggestedPurchasePrice]
 */

/**
 * @typedef {Object} OrderReadinessSummaryDto
 * @property {number} readyCount
 * @property {number} partialCount
 * @property {number} waitingCount
 * @property {number} missingCount
 * @property {number} totalLines
 * @property {boolean} allReady
 * @property {boolean} orderReadyToShip
 * @property {string} headline
 * @property {string[]} detailLines
 * @property {string | null} orderBadgeLabel
 */

/**
 * @typedef {Object} OrderLineReceivingResponse
 * @property {OrderLineReceivingDto[]} lines
 * @property {OrderReadinessSummaryDto} summary
 */

/**
 * @typedef {Object} IncomingGoodsKpisDto
 * @property {number} todayCount
 * @property {number} customerOrderCount
 * @property {number} stockCount
 * @property {number} displayCount
 * @property {string} totalSupplierDebt
 * @property {string} currency
 */

/**
 * @typedef {Object} CreateIncomingGoodsRequest
 * @property {string} supplierId
 * @property {string} receivedAt
 * @property {string} productTitle
 * @property {string} [productId]
 * @property {string} [productGroup]
 * @property {number} qty
 * @property {number} unitPurchasePrice
 * @property {string} purpose
 * @property {string} [orderLineId]
 * @property {string} [invoiceNo]
 * @property {string} [documentNo]
 * @property {string} [note]
 */

export {}

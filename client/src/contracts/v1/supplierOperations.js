/**
 * @typedef {'critical' | 'risky' | 'normal' | 'passive'} SupplierHealthStatus
 */

/**
 * @typedef {Object} SupplierOpsListItemDto
 * @property {string} id
 * @property {string | null} code
 * @property {string} companyName
 * @property {string | null} contactName
 * @property {string | null} phone
 * @property {string} openBalance
 * @property {string} currency
 * @property {string | null} lastMovementAt
 * @property {boolean} isActive
 * @property {string | null} city
 * @property {SupplierHealthStatus} healthStatus
 * @property {string} healthLabel
 * @property {number} openProductCount
 * @property {number} pendingOrderCount
 * @property {string} lastActivityLabel
 */

/**
 * @typedef {Object} SupplierOpenProductDto
 * @property {string} orderLineId
 * @property {string} salesOrderId
 * @property {string} orderNumber
 * @property {string} customerName
 * @property {string} productTitle
 * @property {string} qtyOrdered
 * @property {string} qtyReceived
 * @property {string} qtyMissing
 * @property {string | null} orderDate
 * @property {string | null} dueDate
 * @property {string} estimatedUnitCost
 * @property {boolean} isOverdue
 */

/**
 * @typedef {Object} SupplierPendingOrderDto
 * @property {string} salesOrderId
 * @property {string} orderNumber
 * @property {string} customerName
 * @property {number} openLineCount
 * @property {string} missingQtyTotal
 * @property {string | null} dueDate
 */

/**
 * @typedef {Object} SupplierIncomingHistoryDto
 * @property {string} id
 * @property {string} productTitle
 * @property {string} qty
 * @property {string} unitPurchasePrice
 * @property {string} lineTotal
 * @property {string} receivedAt
 * @property {string | null} orderNumber
 * @property {string | null} customerName
 */

/**
 * @typedef {Object} SupplierCommercialSummaryDto
 * @property {string} totalPurchases
 * @property {string} totalPayments
 * @property {string} openBalance
 * @property {string} openProductCostEstimate
 * @property {string} currency
 */

/**
 * @typedef {Object} SupplierOperationsDetailDto
 * @property {string} supplierId
 * @property {SupplierCommercialSummaryDto} commercial
 * @property {SupplierOpenProductDto[]} openProducts
 * @property {SupplierPendingOrderDto[]} pendingOrders
 * @property {SupplierIncomingHistoryDto[]} incomingHistory
 * @property {SupplierHealthStatus} healthStatus
 * @property {string} healthLabel
 * @property {number} openProductCount
 * @property {number} pendingOrderCount
 * @property {string} lastActivityLabel
 */

/**
 * @typedef {Object} SupplyOperationsKpisDto
 * @property {number} criticalSupplierCount
 * @property {number} openProductCount
 * @property {string} missingProductQty
 * @property {number} todayIncomingCount
 * @property {string} totalOpenDebt
 * @property {string} currency
 */

/**
 * @typedef {Object} SupplyOperationsBoardDto
 * @property {SupplyOperationsKpisDto} kpis
 * @property {SupplierOpsListItemDto[]} suppliers
 */

export {}

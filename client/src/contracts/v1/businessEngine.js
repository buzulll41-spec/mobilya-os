/**
 * Business Engine — ortak iş kararı sözleşmesi (FAZ 22A).
 *
 * @typedef {'NEW_ORDER' | 'DEPOSIT_PENDING' | 'DEPOSIT_RECEIVED' | 'SUPPLY_SENT' | 'PRODUCT_WAITING' | 'PARTIAL_ARRIVED' | 'FULLY_ARRIVED' | 'SHIPMENT_PLANNED' | 'IN_TRANSIT' | 'DELIVERED' | 'BALANCE_PENDING' | 'COMPLETED'} BusinessOrderStage
 * @typedef {'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'} BusinessPriority
 *
 * @typedef {Object} BusinessDomainStatus
 * @property {string} domain
 * @property {string} label
 * @property {'idle' | 'pending' | 'active' | 'done' | 'blocked'} status
 *
 * @typedef {Object} BusinessRiskScores
 * @property {number} collection 0-100 (yüksek = riskli)
 * @property {number} shipment
 * @property {number} supply
 * @property {number} ssh
 * @property {number} operations
 *
 * @typedef {Object} OrderBusinessSnapshot
 * @property {string} orderId
 * @property {BusinessOrderStage} currentStage
 * @property {string} currentStageLabel
 * @property {number} progressPercent 0-100
 * @property {BusinessRiskScores} riskScores
 * @property {BusinessPriority} priority
 * @property {number} healthScore 0-100 (yüksek = sağlıklı)
 * @property {string} nextAction
 * @property {string} kanbanColumnId Kanban geri uyumluluk
 * @property {BusinessDomainStatus[]} domains
 */

export const BUSINESS_ORDER_STAGE = /** @type {const} */ ({
  NEW_ORDER: 'NEW_ORDER',
  DEPOSIT_PENDING: 'DEPOSIT_PENDING',
  DEPOSIT_RECEIVED: 'DEPOSIT_RECEIVED',
  SUPPLY_SENT: 'SUPPLY_SENT',
  PRODUCT_WAITING: 'PRODUCT_WAITING',
  PARTIAL_ARRIVED: 'PARTIAL_ARRIVED',
  FULLY_ARRIVED: 'FULLY_ARRIVED',
  SHIPMENT_PLANNED: 'SHIPMENT_PLANNED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  BALANCE_PENDING: 'BALANCE_PENDING',
  COMPLETED: 'COMPLETED',
})

/** @type {Record<BusinessOrderStage, string>} */
export const BUSINESS_STAGE_LABEL = {
  NEW_ORDER: 'Yeni Sipariş',
  DEPOSIT_PENDING: 'Kapora Bekliyor',
  DEPOSIT_RECEIVED: 'Kapora Alındı',
  SUPPLY_SENT: 'Tedarik Verildi',
  PRODUCT_WAITING: 'Ürün Bekleniyor',
  PARTIAL_ARRIVED: 'Kısmi Geldi',
  FULLY_ARRIVED: 'Tam Geldi',
  SHIPMENT_PLANNED: 'Sevk Planlandı',
  IN_TRANSIT: 'Yola Çıktı',
  DELIVERED: 'Teslim Edildi',
  BALANCE_PENDING: 'Bakiye Bekleniyor',
  COMPLETED: 'Tamamlandı',
}

/** @type {BusinessOrderStage[]} */
export const BUSINESS_STAGE_SEQUENCE = [
  'NEW_ORDER',
  'DEPOSIT_PENDING',
  'DEPOSIT_RECEIVED',
  'SUPPLY_SENT',
  'PRODUCT_WAITING',
  'PARTIAL_ARRIVED',
  'FULLY_ARRIVED',
  'SHIPMENT_PLANNED',
  'IN_TRANSIT',
  'DELIVERED',
  'BALANCE_PENDING',
  'COMPLETED',
]

/** @type {Record<BusinessOrderStage, number>} */
export const BUSINESS_STAGE_PROGRESS = {
  NEW_ORDER: 0,
  DEPOSIT_PENDING: 9,
  DEPOSIT_RECEIVED: 18,
  SUPPLY_SENT: 27,
  PRODUCT_WAITING: 36,
  PARTIAL_ARRIVED: 45,
  FULLY_ARRIVED: 55,
  SHIPMENT_PLANNED: 64,
  IN_TRANSIT: 73,
  DELIVERED: 82,
  BALANCE_PENDING: 91,
  COMPLETED: 100,
}

export const BUSINESS_PRIORITY = /** @type {const} */ ({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
})

export const BUSINESS_DOMAIN = /** @type {const} */ ({
  ORDER: 'order',
  DEPOSIT: 'deposit',
  COLLECTION: 'collection',
  SUPPLY: 'supply',
  WAREHOUSE: 'warehouse',
  SHIPMENT: 'shipment',
  INSTALLATION: 'installation',
  SSH: 'ssh',
  CLOSURE: 'closure',
})

export {}

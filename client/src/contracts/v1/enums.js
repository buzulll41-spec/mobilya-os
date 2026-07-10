/**
 * MOBILYA OS — FINAL DOMAIN CONTRACT v1 (Foundation subset)
 * Wire değerleri string olarak sabitlenir.
 */

/** @typedef {'STORE' | 'PHONE' | 'WEB' | 'B2B' | 'OTHER'} OrderChannel */

/** @typedef {'DRAFT' | 'CONFIRMED' | 'IN_FULFILLMENT' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'DELIVERED' | 'CLOSED' | 'CANCELLED'} SalesOrderLifecycleStatus */

/** @typedef {'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} RiskSeverity */

/** @typedef {'PLANNED' | 'PICKING' | 'READY_TO_DISPATCH' | 'DISPATCHED' | 'CLOSED' | 'ON_HOLD' | 'CANCELLED'} ShipmentStatus */

/** @typedef {'CAPTURE' | 'REFUND' | 'ADJUSTMENT' | 'CHARGEBACK' | 'MAIL_ORDER'} PaymentTransactionKind */

/** @typedef {'PENDING' | 'POSTED' | 'FAILED' | 'CANCELLED'} PaymentTransactionStatus */

/** @typedef {'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'MAIL_ORDER' | 'OTHER'} PaymentMethod */

export const ORDER_CHANNELS = /** @type {const} */ ({
  STORE: 'STORE',
  PHONE: 'PHONE',
  WEB: 'WEB',
  B2B: 'B2B',
  OTHER: 'OTHER',
})

export const SALES_ORDER_LIFECYCLE = /** @type {const} */ ({
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  IN_FULFILLMENT: 'IN_FULFILLMENT',
  PARTIALLY_SHIPPED: 'PARTIALLY_SHIPPED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
})

export const RISK_SEVERITY = /** @type {const} */ ({
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
})

export const SHIPMENT_STATUS = /** @type {const} */ ({
  PLANNED: 'PLANNED',
  PICKING: 'PICKING',
  READY_TO_DISPATCH: 'READY_TO_DISPATCH',
  DISPATCHED: 'DISPATCHED',
  CLOSED: 'CLOSED',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED',
})

export const PAYMENT_TRANSACTION_KIND = /** @type {const} */ ({
  CAPTURE: 'CAPTURE',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
  CHARGEBACK: 'CHARGEBACK',
  MAIL_ORDER: 'MAIL_ORDER',
})

export const PAYMENT_TRANSACTION_STATUS = /** @type {const} */ ({
  PENDING: 'PENDING',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  POSTED: 'POSTED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
})

export const PAYMENT_METHOD = /** @type {const} */ ({
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  CHECK: 'CHECK',
  MAIL_ORDER: 'MAIL_ORDER',
  OTHER: 'OTHER',
})

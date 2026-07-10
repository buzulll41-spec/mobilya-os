/**
 * Projection-only operasyon durum katmanları (Foundation V4-S0).
 * @typedef {typeof COMMERCIAL_STATE[keyof typeof COMMERCIAL_STATE]} CommercialState
 * @typedef {typeof FINANCIAL_STATE[keyof typeof FINANCIAL_STATE]} FinancialState
 * @typedef {typeof PRODUCTION_STATE[keyof typeof PRODUCTION_STATE]} ProductionState
 * @typedef {typeof FULFILLMENT_STATE[keyof typeof FULFILLMENT_STATE]} FulfillmentState
 * @typedef {typeof INSTALLATION_STATE[keyof typeof INSTALLATION_STATE]} InstallationState
 * @typedef {typeof OPERATIONAL_RISK_STATE[keyof typeof OPERATIONAL_RISK_STATE]} OperationalRiskState
 *
 * @typedef {Object} OrderOperationalState
 * @property {CommercialState} commercialState
 * @property {FinancialState} financialState
 * @property {ProductionState} productionState
 * @property {FulfillmentState} fulfillmentState
 * @property {InstallationState} installationState
 * @property {OperationalRiskState} riskState
 */

export const COMMERCIAL_STATE = /** @type {const} */ ({
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED',
})

export const FINANCIAL_STATE = /** @type {const} */ ({
  NOT_DUE: 'NOT_DUE',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
})

export const PRODUCTION_STATE = /** @type {const} */ ({
  NOT_STARTED: 'NOT_STARTED',
  WAITING_FACTORY: 'WAITING_FACTORY',
  IN_PRODUCTION: 'IN_PRODUCTION',
  READY: 'READY',
  ISSUE: 'ISSUE',
})

export const FULFILLMENT_STATE = /** @type {const} */ ({
  NOT_PLANNED: 'NOT_PLANNED',
  PLANNED: 'PLANNED',
  PARTIAL: 'PARTIAL',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
})

export const INSTALLATION_STATE = /** @type {const} */ ({
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  DONE: 'DONE',
  ISSUE: 'ISSUE',
})

/** Liste risk severity ile hizalı; projection-only `riskState` ekseni */
export const OPERATIONAL_RISK_STATE = /** @type {const} */ ({
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
})

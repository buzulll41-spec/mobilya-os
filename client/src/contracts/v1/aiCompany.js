/**
 * FAZ 47 — Autonomous AI Company.
 */

import { AI_COLLECTION_SPECIALIST_WORKER_ID } from './aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from './aiProcurementSpecialist.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from './aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from './aiShipmentSpecialist.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from './aiCompanyManager.js'

/** @typedef {'collection' | 'sales' | 'shipment' | 'procurement' | 'executive'} AiCompanyWorkerKind */

/**
 * @typedef {Object} AiCompanyWorkerDef
 * @property {string} id
 * @property {string} code
 * @property {string} label
 * @property {AiCompanyWorkerKind} kind
 */

/** AI Company çalışanları — Company Brain yönetir. */
export const AI_COMPANY_WORKERS = /** @type {AiCompanyWorkerDef[]} */ ([
  { id: AI_SALES_FOLLOW_UP_WORKER_ID, code: 'AI_SALES', label: 'AI Sales', kind: 'sales' },
  { id: AI_SHIPMENT_SPECIALIST_WORKER_ID, code: 'AI_SHIPMENT', label: 'AI Shipment', kind: 'shipment' },
  { id: AI_COLLECTION_SPECIALIST_WORKER_ID, code: 'AI_COLLECTION', label: 'AI Collection', kind: 'collection' },
  { id: AI_PROCUREMENT_SPECIALIST_WORKER_ID, code: 'AI_PROCUREMENT', label: 'AI Procurement', kind: 'procurement' },
  {
    id: AI_COMPANY_MANAGER_WORKER_ID,
    code: 'AI_COMPANY_BRAIN',
    label: 'Executive AI',
    kind: 'executive',
  },
])

/** @typedef {keyof typeof DEFAULT_COMPANY_GOAL_KEYS} CompanyGoalKey */

export const DEFAULT_COMPANY_GOAL_KEYS = {
  collectionRateTarget: 'collectionRateTarget',
  shipmentDelayMaxPct: 'shipmentDelayMaxPct',
  procurementWaitMaxPct: 'procurementWaitMaxPct',
  riskyReceivableMax: 'riskyReceivableMax',
}

/**
 * @typedef {Object} CompanyGoalsDto
 * @property {number} collectionRateTarget
 * @property {number} shipmentDelayMaxPct
 * @property {number} procurementWaitMaxPct
 * @property {number} riskyReceivableMax
 * @property {string} updatedAt
 * @property {string} [updatedBy]
 */

/**
 * @typedef {Object} CompanyMapEdgeDto
 * @property {string} id
 * @property {string} fromWorkerId
 * @property {string} toWorkerId
 * @property {string} label
 * @property {string} occurredAt
 */

/**
 * @typedef {'COLLECTION_DROP' | 'ORDER_SPIKE' | 'SUPPLY_STOPPED' | 'BALANCED'} CompanyScenarioId
 */

export {}

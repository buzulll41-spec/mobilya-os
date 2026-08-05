/**
 * Client-local copy of AI tool engine shared contracts.
 * Keeps frontend production builds independent from repo-root shared imports.
 */

export const TOOL_EXECUTION_STATUS = /** @type {const} */ ({
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  WAITING_APPROVAL: 'WAITING_APPROVAL',
  DENIED: 'DENIED',
  NOT_FOUND: 'NOT_FOUND',
})

export const TOOL_PERMISSION = /** @type {const} */ ({
  ORDER_READ: 'ORDER_READ',
  ORDER_WRITE: 'ORDER_WRITE',
  COLLECTION_READ: 'COLLECTION_READ',
  COLLECTION_WRITE: 'COLLECTION_WRITE',
  SHIPMENT_READ: 'SHIPMENT_READ',
  SHIPMENT_WRITE: 'SHIPMENT_WRITE',
  PROCUREMENT_READ: 'PROCUREMENT_READ',
  PROCUREMENT_WRITE: 'PROCUREMENT_WRITE',
  EXECUTIVE_READ: 'EXECUTIVE_READ',
  EXECUTIVE_WRITE: 'EXECUTIVE_WRITE',
})

export const TOOL_CATEGORY = /** @type {const} */ ({
  ORDER: 'ORDER',
  COLLECTION: 'COLLECTION',
  SHIPMENT: 'SHIPMENT',
  PROCUREMENT: 'PROCUREMENT',
  CEO: 'CEO',
})

export const AI_TOOL_DOMAIN_EVENT = /** @type {const} */ ({
  REQUESTED: 'ai.tool.requested',
  EXECUTED: 'ai.tool.executed',
  FAILED: 'ai.tool.failed',
  WAITING_APPROVAL: 'ai.tool.waiting_approval',
  APPROVED: 'ai.tool.approved',
  REJECTED: 'ai.tool.rejected',
  DENIED: 'ai.tool.denied',
})

export const WORKER_TOOL_PERMISSIONS = /** @type {Record<string, string[]>} */ ({
  'dw-sales-follow-up': [
    TOOL_PERMISSION.ORDER_READ,
    TOOL_PERMISSION.ORDER_WRITE,
  ],
  'dw-collection': [
    TOOL_PERMISSION.COLLECTION_READ,
    TOOL_PERMISSION.COLLECTION_WRITE,
  ],
  'dw-shipment': [
    TOOL_PERMISSION.SHIPMENT_READ,
    TOOL_PERMISSION.SHIPMENT_WRITE,
  ],
  'dw-procurement': [
    TOOL_PERMISSION.PROCUREMENT_READ,
    TOOL_PERMISSION.PROCUREMENT_WRITE,
  ],
  'dw-ceo-assistant': [
    TOOL_PERMISSION.EXECUTIVE_READ,
    TOOL_PERMISSION.EXECUTIVE_WRITE,
  ],
})

export function isAiToolExecutionLiveEnabled() {
  if (typeof process !== 'undefined' && process.env?.AI_TOOL_EXECUTION_ENABLED === 'true') {
    return true
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_TOOL_EXECUTION_ENABLED === 'true') {
    return true
  }
  return false
}

export {}
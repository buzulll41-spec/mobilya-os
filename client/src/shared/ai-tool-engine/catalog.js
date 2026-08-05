/**
 * Client-local copy of AI tool catalog metadata.
 */

import { TOOL_CATEGORY, TOOL_PERMISSION } from './contracts.js'

/** @type {import('../../../shared/ai-tool-engine/catalog.js').AiToolDefinitionMeta[]} */
export const AI_TOOL_CATALOG = [
  {
    name: 'getOrder',
    description: 'Sipariş özetini okur',
    category: TOOL_CATEGORY.ORDER,
    permission: TOOL_PERMISSION.ORDER_READ,
    approvalRequired: false,
    workerIds: ['dw-sales-follow-up'],
    parameters: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    },
  },
  {
    name: 'updateOrder',
    description: 'Sipariş alanlarını günceller',
    category: TOOL_CATEGORY.ORDER,
    permission: TOOL_PERMISSION.ORDER_WRITE,
    approvalRequired: true,
    workerIds: ['dw-sales-follow-up'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        notes: { type: 'string' },
        statusHint: { type: 'string' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'changeDeliveryDate',
    description: 'Sipariş termin/t teslim tarihini değiştirir',
    category: TOOL_CATEGORY.ORDER,
    permission: TOOL_PERMISSION.ORDER_WRITE,
    approvalRequired: true,
    workerIds: ['dw-sales-follow-up'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        newDate: { type: 'string', description: 'YYYY-MM-DD' },
        reason: { type: 'string' },
      },
      required: ['orderId', 'newDate', 'reason'],
    },
  },
  {
    name: 'changeShipmentPlan',
    description: 'Sevk planını günceller',
    category: TOOL_CATEGORY.ORDER,
    permission: TOOL_PERMISSION.ORDER_WRITE,
    approvalRequired: true,
    workerIds: ['dw-sales-follow-up'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        planNote: { type: 'string' },
      },
      required: ['orderId', 'planNote'],
    },
  },
  {
    name: 'changePriority',
    description: 'Sipariş önceliğini değiştirir',
    category: TOOL_CATEGORY.ORDER,
    permission: TOOL_PERMISSION.ORDER_WRITE,
    approvalRequired: true,
    workerIds: ['dw-sales-follow-up'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] },
      },
      required: ['orderId', 'priority'],
    },
  },
  {
    name: 'getCustomerBalance',
    description: 'Müşteri bakiye/tahsilat özetini okur',
    category: TOOL_CATEGORY.COLLECTION,
    permission: TOOL_PERMISSION.COLLECTION_READ,
    approvalRequired: false,
    workerIds: ['dw-collection'],
    parameters: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    },
  },
  {
    name: 'recordCollectionNote',
    description: 'Tahsilat görüşme/not kaydı oluşturur',
    category: TOOL_CATEGORY.COLLECTION,
    permission: TOOL_PERMISSION.COLLECTION_WRITE,
    approvalRequired: false,
    workerIds: ['dw-collection'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['orderId', 'note'],
    },
  },
  {
    name: 'createReminder',
    description: 'Tahsilat hatırlatması oluşturur',
    category: TOOL_CATEGORY.COLLECTION,
    permission: TOOL_PERMISSION.COLLECTION_WRITE,
    approvalRequired: false,
    workerIds: ['dw-collection'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        amount: { type: 'string' },
        dueNote: { type: 'string' },
      },
      required: ['orderId', 'amount'],
    },
  },
  {
    name: 'closeCollectionTask',
    description: 'Tahsilat görevini kapatır',
    category: TOOL_CATEGORY.COLLECTION,
    permission: TOOL_PERMISSION.COLLECTION_WRITE,
    approvalRequired: true,
    workerIds: ['dw-collection'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        resolution: { type: 'string' },
      },
      required: ['orderId', 'resolution'],
    },
  },
  {
    name: 'planShipment',
    description: 'Sevk planı oluşturur',
    category: TOOL_CATEGORY.SHIPMENT,
    permission: TOOL_PERMISSION.SHIPMENT_WRITE,
    approvalRequired: false,
    workerIds: ['dw-shipment'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        action: { type: 'string', enum: ['plan', 'hold', 'escalate'] },
        note: { type: 'string' },
      },
      required: ['orderId', 'action'],
    },
  },
  {
    name: 'changeShipmentDate',
    description: 'Sevk tarihini değiştirir',
    category: TOOL_CATEGORY.SHIPMENT,
    permission: TOOL_PERMISSION.SHIPMENT_WRITE,
    approvalRequired: true,
    workerIds: ['dw-shipment'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        newDate: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['orderId', 'newDate'],
    },
  },
  {
    name: 'markWarehouseReady',
    description: 'Depo hazır işaretler',
    category: TOOL_CATEGORY.SHIPMENT,
    permission: TOOL_PERMISSION.SHIPMENT_WRITE,
    approvalRequired: false,
    workerIds: ['dw-shipment'],
    parameters: {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    },
  },
  {
    name: 'createShipmentNote',
    description: 'Sevk notu kaydeder',
    category: TOOL_CATEGORY.SHIPMENT,
    permission: TOOL_PERMISSION.SHIPMENT_WRITE,
    approvalRequired: false,
    workerIds: ['dw-shipment'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['orderId', 'note'],
    },
  },
  {
    name: 'getSupplier',
    description: 'Tedarikçi bilgisini okur',
    category: TOOL_CATEGORY.PROCUREMENT,
    permission: TOOL_PERMISSION.PROCUREMENT_READ,
    approvalRequired: false,
    workerIds: ['dw-procurement'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        supplierId: { type: 'string' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'changeSupplierETA',
    description: 'Tedarikçi ETA günceller',
    category: TOOL_CATEGORY.PROCUREMENT,
    permission: TOOL_PERMISSION.PROCUREMENT_WRITE,
    approvalRequired: true,
    workerIds: ['dw-procurement'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        supplierId: { type: 'string' },
        newEta: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['orderId', 'newEta'],
    },
  },
  {
    name: 'createPurchaseReminder',
    description: 'Satın alma hatırlatması oluşturur',
    category: TOOL_CATEGORY.PROCUREMENT,
    permission: TOOL_PERMISSION.PROCUREMENT_WRITE,
    approvalRequired: false,
    workerIds: ['dw-procurement'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        itemDescription: { type: 'string' },
        urgency: { type: 'string', enum: ['normal', 'high', 'critical'] },
      },
      required: ['orderId', 'itemDescription'],
    },
  },
  {
    name: 'recordSupplierNote',
    description: 'Tedarikçi notu kaydeder',
    category: TOOL_CATEGORY.PROCUREMENT,
    permission: TOOL_PERMISSION.PROCUREMENT_WRITE,
    approvalRequired: false,
    workerIds: ['dw-procurement'],
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        supplierId: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['orderId', 'note'],
    },
  },
  {
    name: 'createExecutiveNote',
    description: 'Yönetici notu oluşturur',
    category: TOOL_CATEGORY.CEO,
    permission: TOOL_PERMISSION.EXECUTIVE_WRITE,
    approvalRequired: false,
    workerIds: ['dw-ceo-assistant'],
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        note: { type: 'string' },
        relatedOrderId: { type: 'string' },
      },
      required: ['subject', 'note'],
    },
  },
  {
    name: 'markRiskReviewed',
    description: 'Risk kaydını incelendi olarak işaretler',
    category: TOOL_CATEGORY.CEO,
    permission: TOOL_PERMISSION.EXECUTIVE_WRITE,
    approvalRequired: true,
    workerIds: ['dw-ceo-assistant'],
    parameters: {
      type: 'object',
      properties: {
        riskId: { type: 'string' },
        resolution: { type: 'string' },
      },
      required: ['riskId', 'resolution'],
    },
  },
]

export function listToolsForWorker(workerId) {
  return AI_TOOL_CATALOG.filter((tool) => tool.workerIds.includes(workerId))
}

export function getToolMeta(toolName) {
  return AI_TOOL_CATALOG.find((tool) => tool.name === toolName) ?? null
}

export {}
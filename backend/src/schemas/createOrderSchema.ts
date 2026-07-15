import { ORDER_DISPLAY_STATUSES } from '../constants/orderStatuses.js'
import { SALES_SOURCE_TYPE } from '../constants/salesSourceTypes.js'
import { DISPLAY_FLOOR } from '../constants/displayFloors.js'
import { EXTERNAL_SUPPLY_TYPE } from '../constants/externalSupplyTypes.js'

/** Kırlent / bel kırlenti satırı */
const configurationPillowRowSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['fabric', 'qty'],
  properties: {
    fabric: { type: 'string', minLength: 1, maxLength: 500 },
    qty: { type: 'integer', minimum: 1, maximum: 99 },
  },
} as const

const configurationSchema = {
  type: 'object',
  properties: {
    pillows: {
      type: 'array',
      maxItems: 30,
      items: configurationPillowRowSchema,
    },
    lumbarPillows: {
      type: 'array',
      maxItems: 30,
      items: configurationPillowRowSchema,
    },
  },
  additionalProperties: { type: 'string', maxLength: 500 },
} as const

const createOrderLineSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'quantity', 'unitPrice'],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 500 },
    quantity: { type: 'number', exclusiveMinimum: 0 },
    unitPrice: { type: 'number', minimum: 0 },
    lineTotal: { type: 'number', minimum: 0 },
    supplierId: { type: 'string', maxLength: 64 },
    supplierNameSnapshot: { type: 'string', maxLength: 200 },
    productGroup: { type: 'string', maxLength: 120 },
    sortOrder: { type: 'integer', minimum: 0 },
    productId: { type: 'string', maxLength: 64 },
    configuration: configurationSchema,
    soldSalesSourceType: { type: 'string', enum: [...Object.values(SALES_SOURCE_TYPE)] },
    soldDisplayFloor: { type: 'string', enum: [...Object.values(DISPLAY_FLOOR)] },
    soldExternalSupplyType: { type: 'string', enum: [...Object.values(EXTERNAL_SUPPLY_TYPE)] },
    soldUnitCost: { type: 'number', minimum: 0 },
  },
} as const

export const createOrderBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['customerName', 'paidAmount', 'status'],
  properties: {
    customerName: { type: 'string', minLength: 1, maxLength: 200 },
    phone: { type: 'string', minLength: 1, maxLength: 32 },
    salesPerson: { type: 'string', minLength: 1, maxLength: 120 },
    productTitle: { type: 'string', minLength: 1, maxLength: 500 },
    dueDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    shipmentDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    notes: { type: 'string', maxLength: 5000 },
    cost: { type: 'number', minimum: 0 },
    subtotalAmount: { type: 'number', minimum: 0 },
    discountAmount: { type: 'number', minimum: 0 },
    discountType: { type: 'string', enum: ['NONE', 'PERCENTAGE', 'FIXED', 'COMBINED'] },
    discountPercent: { type: 'number', minimum: 0, maximum: 100 },
    discountFixedAmount: { type: 'number', minimum: 0 },
    discountNote: { type: 'string', maxLength: 500 },
    totalAmount: { type: 'number', exclusiveMinimum: 0 },
    paidAmount: { type: 'number', minimum: 0 },
    status: { type: 'string', enum: [...ORDER_DISPLAY_STATUSES] },
    lines: {
      type: 'array',
      minItems: 1,
      maxItems: 50,
      items: createOrderLineSchema,
    },
    paymentMethod: { type: 'string', enum: ['CASH', 'CARD', 'TRANSFER', 'CHECK', 'MAIL_ORDER', 'OTHER'] },
    paymentNote: { type: 'string', maxLength: 2000 },
    mailOrderCustomerId: { type: 'string', minLength: 1, maxLength: 200 },
    mailOrderSupplierId: { type: 'string', minLength: 1, maxLength: 64 },
    mailOrderCommissionRate: { type: 'number', minimum: 0, maximum: 100 },
    mailOrderAmount: { type: 'number', minimum: 0 },
  },
} as const

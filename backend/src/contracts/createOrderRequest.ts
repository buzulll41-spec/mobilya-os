import type { OrderDisplayStatus } from '../constants/orderStatuses.js'
import type { PaymentMethod } from '../constants/paymentMethods.js'
import type { LineConfiguration } from '../constants/productConfigurationSchema.js'
import type { DiscountType } from '../constants/discountTypes.js'

export type CreateOrderLineInput = {
  title: string
  quantity: number
  unitPrice: number
  lineTotal: number
  productGroup?: string
  sortOrder: number
  productId?: string
  configuration?: LineConfiguration
  supplierId?: string
  supplierNameSnapshot?: string
}

/** POST /v1/orders wire gövdesi */
export type CreateOrderRequest = {
  customerName: string
  productTitle?: string
  /** Yapısal ara toplam (satır toplamları ile uyumlu olmalı) */
  subtotalAmount?: number
  discountAmount?: number
  discountType?: DiscountType
  discountPercent?: number
  discountFixedAmount?: number
  discountNote?: string
  /** subtotalAmount - discountAmount; satır toplamından türetilmez */
  totalAmount?: number
  paidAmount: number
  status: OrderDisplayStatus
  lines?: Array<{
    title: string
    quantity: number
    unitPrice: number
    productGroup?: string
    sortOrder?: number
    productId?: string
    configuration?: LineConfiguration
    supplierId?: string
    supplierNameSnapshot?: string
  }>
  paymentMethod?: PaymentMethod
  paymentNote?: string
  mailOrderCustomerId?: string
  mailOrderSupplierId?: string
  mailOrderCommissionRate?: number
  mailOrderAmount?: number
  phone?: string
}

export type NormalizedCreateOrderRequest = {
  customerName: string
  productTitle: string
  subtotalAmount: number
  discountAmount: number
  discountType: DiscountType
  discountPercent: number | null
  discountFixedAmount: number | null
  discountNote: string | null
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  isFullyPaid: boolean
  status: OrderDisplayStatus
  lines: CreateOrderLineInput[]
  paymentMethod?: PaymentMethod
  paymentNote?: string
  mailOrderCustomerId?: string
  mailOrderSupplierId?: string
  mailOrderCommissionRate?: number
  mailOrderAmount?: number
  phone?: string
}

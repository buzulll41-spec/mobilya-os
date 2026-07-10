import { SALES_CONTRACT_STORE, SALES_CONTRACT_TERMS } from '../../constants/salesContract.js'
import { parseCustomerExtraFromNotes } from '../../features/orders/newOrderWizardModel.js'
import {
  buildCommercialSummary,
  buildDeliverySummary,
  buildPaymentSummary,
} from '../../domain/commerce/commerceSummaries.js'
import { remainingFromTotals } from '../../domain/commerce/commerceFinance.js'
import { formatShortDate } from '../../utils/dates.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../services/salesContractLines.js').SalesContractLineRow} SalesContractLineRow */

/**
 * @typedef {Object} SalesContractModel
 * @property {{ brand: string, name: string, address: string, phone: string, email: string }} store
 * @property {Object} customer
 * @property {Object} order
 * @property {SalesContractLineRow[]} lines
 * @property {Object} finance
 * @property {Object} delivery
 * @property {string[]} terms
 */

/**
 * @typedef {Object} SalesContractBuildOptions
 * @property {string} [paymentMethod]
 * @property {string} [paymentNote]
 */

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {SalesContractLineRow[]} lines
 * @param {SalesContractBuildOptions} [options]
 * @returns {SalesContractModel}
 */
export function buildSalesContractModel(order, dto, lines, options) {
  const extra = parseCustomerExtraFromNotes(order.notes)
  const noteText = order.notes ?? ''

  const totalAmount =
    typeof order.totalAmount === 'number' ? order.totalAmount : (order.amount ?? 0)
  const subtotalAmount =
    typeof order.subtotalAmount === 'number' ? order.subtotalAmount : totalAmount
  const discountAmount = typeof order.discountAmount === 'number' ? order.discountAmount : 0
  const paidAmount = order.paid ? totalAmount : (order.paidAmount ?? 0)
  const remainingAmount =
    typeof order.remainingAmount === 'number'
      ? order.remainingAmount
      : remainingFromTotals(totalAmount, paidAmount, order.paid)

  const commercial = buildCommercialSummary({
    subtotalAmount,
    discountAmount,
    discountType: order.discountType ?? null,
    discountNote: order.discountNote ?? null,
    totalAmount,
    paidAmount,
    remainingAmount,
    notes: noteText,
    paymentMethod: options?.paymentMethod ?? null,
    paymentNote: options?.paymentNote ?? null,
  })

  const delivery = buildDeliverySummary({
    notes: noteText,
    dueDate: order.dueDate,
    plannedShipmentDate: dto?.latestCommittedShipBy ?? dto?.plannedShipmentDate ?? null,
  })

  const payment = buildPaymentSummary(commercial)

  return {
    store: { ...SALES_CONTRACT_STORE },
    customer: {
      name: order.customer?.trim() || '—',
      phone: order.phone?.trim() || undefined,
      phone2: order.phone2?.trim() || extra.phone2,
      nationalId: order.nationalId?.trim() || extra.nationalId,
      taxNumber: order.taxNumber?.trim() || extra.taxNumber,
      taxOffice: order.taxOffice?.trim() || extra.taxOffice,
      address: delivery.address ?? undefined,
    },
    order: {
      orderNo: dto?.orderNumber ?? order.id,
      orderDate: formatShortDate(order.orderDate),
      dueDate: order.dueDate ? formatShortDate(order.dueDate) : undefined,
      salesPerson: order.salesPerson?.trim() || undefined,
    },
    lines,
    finance: {
      subtotal: commercial.subtotalAmount,
      totalDiscount: commercial.discountAmount,
      grandTotal: commercial.totalAmount,
      total: commercial.totalAmount,
      paid: commercial.paidAmount,
      remaining: commercial.remainingAmount,
      paymentMethod: payment.method ?? undefined,
      paymentNote: payment.note ?? undefined,
    },
    delivery,
    terms: [...SALES_CONTRACT_TERMS],
  }
}

/** @deprecated notes parse — yalnızca legacy seed uyumu */
export function extractAddressFromNotes(notes) {
  const m = notes.match(/Adres:\s*([^\n]+)/i)
  return m?.[1]?.trim() || null
}

/** @deprecated */
export function extractPaymentMethodFromNotes(notes) {
  const m = notes.match(/^Ödeme:\s*(.+)$/im)
  return m?.[1]?.trim() || null
}

/** @deprecated */
export function extractPaymentNoteFromNotes(notes) {
  const m = notes.match(/^Ödeme notu:\s*(.+)$/im)
  return m?.[1]?.trim() || null
}

/** @deprecated */
export function parseFinanceDiscountFromNotes() {
  return null
}

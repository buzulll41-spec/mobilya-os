import {
  SALES_CONTRACT_DISTANCE_SALES_CLAUSES,
  SALES_CONTRACT_KVKK_CLAUSES,
  SALES_CONTRACT_STORE,
  SALES_CONTRACT_TERMS,
  SALES_CONTRACT_WARRANTY_CLAUSES,
} from '../../constants/salesContract.js'
import { parseCustomerExtraFromNotes } from '../../features/orders/newOrderWizardModel.js'
import {
  buildCommercialSummary,
  buildDeliverySummary,
  buildPaymentSummary,
} from '../../domain/commerce/commerceSummaries.js'
import { remainingFromTotals } from '../../domain/commerce/commerceFinance.js'
import { formatShortDate } from '../../utils/dates.js'
import { formatTry } from '../../data/index.js'

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
 * @property {Object} paymentSchedule
 * @property {Object} compliance
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
  const financeExtras = options?.financeExtras ?? null
  const totalAmount =
    typeof financeExtras?.grandTotal === 'number'
      ? financeExtras.grandTotal
      : typeof order.totalAmount === 'number'
        ? order.totalAmount
        : (order.amount ?? 0)
  const subtotalAmount =
    typeof financeExtras?.subtotal === 'number'
      ? financeExtras.subtotal
      : typeof order.subtotalAmount === 'number'
        ? order.subtotalAmount
        : totalAmount
  const discountAmount =
    typeof financeExtras?.totalDiscount === 'number'
      ? financeExtras.totalDiscount
      : typeof order.discountAmount === 'number'
        ? order.discountAmount
        : 0
  const paidAmount = order.paid ? totalAmount : (order.paidAmount ?? 0)
  const remainingAmount =
    typeof order.remainingAmount === 'number'
      ? order.remainingAmount
      : remainingFromTotals(totalAmount, paidAmount, order.paid)
  const channel = dto?.channel ?? null
  const isDistanceSale = channel === 'WEB' || channel === 'PHONE'

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
  const paymentRows = []
  if (commercial.paidAmount > 0) {
    paymentRows.push({ label: 'Tahsil edilen', value: formatTry(commercial.paidAmount) })
  }
  if (commercial.remainingAmount > 0) {
    paymentRows.push({ label: 'Kalan bakiye', value: formatTry(commercial.remainingAmount) })
  } else if (commercial.paidAmount > 0) {
    paymentRows.push({ label: 'Toplam tahsilat', value: formatTry(commercial.paidAmount) })
  }
  if (order.dueDate) {
    paymentRows.push({ label: 'Vade', value: formatShortDate(order.dueDate) })
  }
  paymentRows.push({ label: 'Ödeme yöntemi', value: payment.method || '—' })
  if (payment.note) {
    paymentRows.push({ label: 'Ödeme notu', value: payment.note })
  }

  const installmentRows =
    commercial.remainingAmount > 0
      ? [
          {
            label: 'Peşinat / tahsil edilen',
            value: formatTry(commercial.paidAmount),
          },
          {
            label: 'Kalan taksit / bakiye',
            value: formatTry(commercial.remainingAmount),
          },
        ]
      : commercial.paidAmount > 0
        ? [{ label: 'Tek tahsilat', value: formatTry(commercial.paidAmount) }]
        : []

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
      channel,
      contractLabel: isDistanceSale ? 'Mesafeli Satış Sözleşmesi' : 'Satış Sözleşmesi',
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
    paymentSchedule: {
      title: commercial.remainingAmount > 0 ? 'Taksit / ödeme planı' : 'Ödeme planı',
      summary:
        commercial.remainingAmount > 0
          ? `${formatTry(commercial.paidAmount)} tahsil edildi, ${formatTry(commercial.remainingAmount)} bakiye kaldı.`
          : commercial.paidAmount > 0
            ? `${formatTry(commercial.paidAmount)} tek seferde tahsil edildi.`
            : 'Tahsilat bilgisi girilmedi.',
      rows: paymentRows,
      installments: installmentRows,
    },
    compliance: {
      warranty: [...SALES_CONTRACT_WARRANTY_CLAUSES],
      kvkk: [...SALES_CONTRACT_KVKK_CLAUSES],
      distanceSales: isDistanceSale ? [...SALES_CONTRACT_DISTANCE_SALES_CLAUSES] : [],
      distanceSalesEnabled: isDistanceSale,
      approvalText:
        'Müşteri, işbu sözleşmede yer alan bilgiler, kişisel veri işlemleri ve teslimat koşullarını okuyup kabul ettiğini beyan eder.',
    },
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

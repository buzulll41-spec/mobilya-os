import type { LineConfiguration } from '../constants/productConfigurationSchema.js'
import { formatConfigurationLines } from '../constants/productConfigurationSchema.js'
import type { PaymentMethod } from '../constants/paymentMethods.js'

function extractPaymentMethodFromNotes(notes: string): string | null {
  const m = notes.match(/^Ödeme:\s*(.+)$/im)
  return m?.[1]?.trim() || null
}

export type CommercialSummary = {
  subtotalAmount: number
  discountAmount: number
  discountType: string | null
  discountNote: string | null
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  paymentMethod: string | null
  paymentNote: string | null
}

export type DeliverySummary = {
  address: string | null
  plannedDate: string | null
  deliveryNote: string | null
}

export type PaymentSummary = {
  method: string | null
  note: string | null
  paidAmount: number
  remainingAmount: number
}

export type OrderCommercialDocumentInput = {
  customerName: string
  customerPhone?: string | null
  notes?: string | null
  salesPerson?: string | null
  orderNumber: string
  orderDate: string
  dueDate?: string | null
  commercial: CommercialSummary
  delivery: DeliverySummary
  payment: PaymentSummary
}

/** @param {string} notes */
export function extractAddressFromNotes(notes: string): string | null {
  const m = notes.match(/Adres:\s*([^\n]+)/i)
  return m?.[1]?.trim() || null
}

/** @param {string} notes */
export function extractPaymentNoteFromNotes(notes: string): string | null {
  const m = notes.match(/^Ödeme notu:\s*(.+)$/im)
  return m?.[1]?.trim() || null
}

function extractDeliveryNoteFromNotes(notes: string): string | null {
  const lines = notes
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const skipPrefixes = [
    'Adres:',
    'Ödeme:',
    'Ödeme notu:',
    'İskonto:',
    'TC:',
    'Tel 2:',
    'Vergi no:',
    'Vergi dairesi:',
    '---',
  ]
  const freeText = lines.filter((l) => !skipPrefixes.some((p) => l.startsWith(p)))
  return freeText[0] || null
}

export function buildCommercialSummaryFromOrderRow(input: {
  subtotalAmount: number
  discountAmount: number
  discountType?: string | null
  discountNote?: string | null
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  notes?: string | null
  paymentMethod?: PaymentMethod | string | null
  paymentNote?: string | null
}): CommercialSummary {
  const noteText = input.notes ?? ''
  return {
    subtotalAmount: input.subtotalAmount,
    discountAmount: input.discountAmount,
    discountType: input.discountType ?? null,
    discountNote: input.discountNote ?? extractPaymentNoteFromNotes(noteText),
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
    remainingAmount: input.remainingAmount,
    paymentMethod:
      (typeof input.paymentMethod === 'string' ? input.paymentMethod : null) ??
      extractPaymentMethodFromNotes(noteText),
    paymentNote: input.paymentNote ?? extractPaymentNoteFromNotes(noteText),
  }
}

export function buildDeliverySummary(input: {
  notes?: string | null
  dueDate?: string | null
  plannedShipmentDate?: string | null
}): DeliverySummary {
  const noteText = input.notes ?? ''
  return {
    address: extractAddressFromNotes(noteText),
    plannedDate: input.dueDate ?? input.plannedShipmentDate ?? null,
    deliveryNote: extractDeliveryNoteFromNotes(noteText),
  }
}

export function buildPaymentSummary(commercial: CommercialSummary): PaymentSummary {
  return {
    method: commercial.paymentMethod,
    note: commercial.paymentNote,
    paidAmount: commercial.paidAmount,
    remainingAmount: commercial.remainingAmount,
  }
}

export function buildConfigurationSummaryLines(
  ctx: { title: string; productGroup?: string; category?: string; suiteType?: string },
  configuration?: LineConfiguration | null,
  persistedSummary?: string[] | null,
): string[] {
  if (persistedSummary?.length) return [...persistedSummary]
  return formatConfigurationLines(ctx, configuration ?? undefined)
}

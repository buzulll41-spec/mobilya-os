/**
 * Ticari belge özetleri — notes parse minimumda.
 */

/** @param {string} notes */
export function extractAddressFromNotes(notes) {
  const m = notes.match(/Adres:\s*([^\n]+)/i)
  return m?.[1]?.trim() || null
}

/** @param {string} notes */
export function extractPaymentMethodFromNotes(notes) {
  const m = notes.match(/^Ödeme:\s*(.+)$/im)
  return m?.[1]?.trim() || null
}

/** @param {string} notes */
export function extractPaymentNoteFromNotes(notes) {
  const m = notes.match(/^Ödeme notu:\s*(.+)$/im)
  return m?.[1]?.trim() || null
}

/** @param {string} notes */
function extractDeliveryNoteFromNotes(notes) {
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

/**
 * @param {{
 *   subtotalAmount: number
 *   discountAmount: number
 *   discountType?: string | null
 *   discountNote?: string | null
 *   totalAmount: number
 *   paidAmount: number
 *   remainingAmount: number
 *   notes?: string | null
 *   paymentMethod?: string | null
 *   paymentNote?: string | null
 * }} input
 */
export function buildCommercialSummary(input) {
  const noteText = input.notes ?? ''
  return {
    subtotalAmount: input.subtotalAmount,
    discountAmount: input.discountAmount,
    discountType: input.discountType ?? null,
    discountNote: input.discountNote ?? extractPaymentNoteFromNotes(noteText),
    totalAmount: input.totalAmount,
    paidAmount: input.paidAmount,
    remainingAmount: input.remainingAmount,
    paymentMethod: input.paymentMethod ?? extractPaymentMethodFromNotes(noteText),
    paymentNote: input.paymentNote ?? extractPaymentNoteFromNotes(noteText),
  }
}

/**
 * @param {{ notes?: string | null, dueDate?: string | null, plannedShipmentDate?: string | null }} input
 */
export function buildDeliverySummary(input) {
  const noteText = input.notes ?? ''
  return {
    address: extractAddressFromNotes(noteText),
    plannedDate: input.dueDate ?? input.plannedShipmentDate ?? null,
    deliveryNote: extractDeliveryNoteFromNotes(noteText),
  }
}

/**
 * @param {ReturnType<typeof buildCommercialSummary>} commercial
 */
export function buildPaymentSummary(commercial) {
  return {
    method: commercial.paymentMethod,
    note: commercial.paymentNote,
    paidAmount: commercial.paidAmount,
    remainingAmount: commercial.remainingAmount,
  }
}

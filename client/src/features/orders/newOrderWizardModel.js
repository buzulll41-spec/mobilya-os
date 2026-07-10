import { addDays } from '../../data/constants.js'
import { calculateOrderTotals, parseDiscountPercent } from './calculateOrderTotals.js'
import { DISCOUNT_TYPE } from '../../domain/commerce/commerceFinance.js'
import { computeLineTotal } from '../../domain/commerce/commerceFinance.js'
import { PAYMENT_METHOD } from '../../contracts/v1/enums.js'
import { SALES_TEAM } from '../../constants/operations.js'
import { formatProductSummaryFromLines, roundMoney } from '../../domain/order/orderLineCreate.js'
import {
  emptyLineConfiguration,
  sanitizeConfigurationForContext,
  validateLineConfiguration,
} from '../../constants/productConfigurationSchema.js'
import { toE164Phone, parseE164Phone } from '../../lib/phoneInput.js'
import { parseCurrencyInput } from '../../lib/formatCurrencyInput.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/createOrderRequest.js').CreateOrderRequest} CreateOrderRequest */

export const WIZARD_STEPS = [
  { id: 'customer', label: 'Müşteri Bilgileri' },
  { id: 'products', label: 'Ürünler' },
  { id: 'payment', label: 'Ödeme Bilgileri' },
  { id: 'summary', label: 'Özet & Kaydet' },
]

export const CUSTOMER_EXTRA_NOTES_START = '--- Müşteri ek ---'
export const CUSTOMER_EXTRA_NOTES_END = '--- /Müşteri ek ---'

const NATIONAL_ID_MAX_LEN = 11
const TAX_NUMBER_MAX_LEN = 11

export const PRODUCT_GROUPS = [
  'Yatak odası',
  'Oturma grubu',
  'Yemek odası',
  'Mutfak',
  'Gardırop',
  'Diğer',
]

const PAYMENT_LABELS = {
  [PAYMENT_METHOD.CASH]: 'Nakit',
  [PAYMENT_METHOD.CARD]: 'Kart',
  [PAYMENT_METHOD.TRANSFER]: 'Havale / EFT',
  [PAYMENT_METHOD.CHECK]: 'Çek',
  [PAYMENT_METHOD.MAIL_ORDER]: 'Tedarikçiye Çekilen Mail Order',
  [PAYMENT_METHOD.OTHER]: 'Diğer',
}

/** @param {import('../../contracts/v1/enums.js').PaymentMethod} method */
export function isMailOrderPayment(method) {
  return method === PAYMENT_METHOD.MAIL_ORDER
}

/**
 * Mail order kart müşteri kimliği — müşteri adı (wire: mailOrderCustomerId).
 * @param {string} customerName
 */
export function mailOrderCustomerIdFromName(customerName) {
  return customerName.trim()
}

/**
 * @param {string[]} recentCustomers
 * @param {string} orderCustomer
 */
export function buildMailOrderCustomerOptions(recentCustomers, orderCustomer) {
  /** @type {Set<string>} */
  const seen = new Set()
  /** @type {{ id: string, label: string }[]} */
  const out = []
  const add = (/** @type {string} */ name) => {
    const id = mailOrderCustomerIdFromName(name)
    if (!id || seen.has(id)) return
    seen.add(id)
    out.push({ id, label: id })
  }
  add(orderCustomer)
  for (const c of recentCustomers) add(c)
  return out
}

/**
 * @typedef {Object} WizardProductLine
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {string} qty
 * @property {string} unitPrice
 * @property {string} note
 * @property {Record<string, string>} configuration Üretim konfigürasyonu
 * @property {string} [productId] Katalog ürün kartı
 * @property {boolean} [fromCatalog] Katalogdan seçildi (ad override serbest)
 * @property {string} [defaultSupplierId]
 * @property {string} [defaultSupplierName]
 * @property {string} [productCode]
 * @property {string} [suiteType]
 * @property {string} [purchasePrice]
 */

/**
 * @typedef {Object} NewOrderWizardForm
 * @property {string} customer
 * @property {string} phone
 * @property {string} phoneDialCode
 * @property {string} phone2
 * @property {string} nationalId
 * @property {string} taxNumber
 * @property {string} taxOffice
 * @property {string} city
 * @property {string} district
 * @property {string} neighborhood
 * @property {string} address
 * @property {string} customerNote
 * @property {string} selectedCustomerKey
 * @property {string} selectedDeliveryAddressId
 * @property {string} salesPerson
 * @property {WizardProductLine[]} products
 * @property {string} kapora
 * @property {string} discountPercent Yüzdesel iskonto (0–100)
 * @property {string} discountFixed TL iskonto
 * @property {import('../../contracts/v1/enums.js').PaymentMethod} paymentMethod
 * @property {string} paymentNote
 * @property {string} mailOrderAmount Bu çekimde tahsil edilen tutar (boş = kayıtta genel toplam)
 * @property {string} mailOrderCustomerId
 * @property {string} mailOrderSupplierId
 * @property {string} mailOrderCommissionRate
 * @property {string} dueDate
 * @property {import('../../data/constants.js').OrderStatus} status
 */

export function emptyWizardForm() {
  return {
    customer: '',
    phone: '',
    phoneDialCode: '+90',
    phone2: '',
    nationalId: '',
    taxNumber: '',
    taxOffice: '',
    city: '',
    district: '',
    neighborhood: '',
    address: '',
    customerNote: '',
    selectedCustomerKey: '',
    selectedDeliveryAddressId: '',
    salesPerson: SALES_TEAM[0] ?? '',
    products: [],
    kapora: '',
    discountPercent: '',
    discountFixed: '',
    paymentMethod: PAYMENT_METHOD.TRANSFER,
    paymentNote: '',
    mailOrderAmount: '',
    mailOrderCustomerId: '',
    mailOrderSupplierId: '',
    mailOrderCommissionRate: '',
    dueDate: '',
    status: 'Bekleniyor',
  }
}

/**
 * @param {NewOrderWizardForm} form
 * @param {import('../../contracts/v1/enums.js').PaymentMethod} method
 * @returns {NewOrderWizardForm}
 */
export function applyPaymentMethodChange(form, method) {
  /** @type {NewOrderWizardForm} */
  const next = { ...form, paymentMethod: method }
  if (isMailOrderPayment(method)) {
    if (!next.mailOrderCustomerId && form.customer.trim()) {
      next.mailOrderCustomerId = mailOrderCustomerIdFromName(form.customer)
    }
  } else {
    next.mailOrderAmount = ''
    next.mailOrderCustomerId = ''
    next.mailOrderSupplierId = ''
    next.mailOrderCommissionRate = ''
  }
  return next
}

/**
 * @param {WizardProductLine} line
 */
export function isWizardLineFilled(line) {
  return Boolean(line.productId) || Boolean(line.name.trim())
}

/**
 * @param {NewOrderWizardForm} form
 */
export function hasWizardProducts(form) {
  return form.products.some(isWizardLineFilled)
}

export function emptyProductLine() {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    group: PRODUCT_GROUPS[0],
    qty: '1',
    unitPrice: '',
    note: '',
    configuration: emptyLineConfiguration(),
    productId: undefined,
    fromCatalog: false,
  }
}

/**
 * @param {WizardProductLine} line
 */
export function wizardLineConfigContext(line) {
  return {
    title: line.name.trim() || 'Ürün',
    category: line.group,
    productGroup: line.group,
    suiteType: line.suiteType,
  }
}

/**
 * @param {WizardProductLine} line
 * @returns {Record<string, string>}
 */
export function buildWizardLineConfiguration(line) {
  const config = { ...(line.configuration ?? {}) }
  const note = line.note?.trim()
  if (note && !config.note) config.note = note
  return Object.keys(config).length > 0 ? config : emptyLineConfiguration()
}

/**
 * Katalog seçimi → wizard satırı.
 * @param {WizardProductLine} line
 * @param {import('../../contracts/v1/product.js').ProductListItemDto} product
 */
export function applyProductToWizardLine(line, product) {
  const sale = Number.parseFloat(product.defaultSalePrice)
  const next = {
    ...line,
    productId: product.id,
    fromCatalog: true,
    name: product.productName,
    group: product.category,
    unitPrice: Number.isFinite(sale) ? String(Math.round(sale)) : line.unitPrice,
    defaultSupplierId: product.defaultSupplierId ?? undefined,
    defaultSupplierName: product.defaultSupplierName ?? undefined,
    productCode: product.productCode,
    suiteType: product.suiteType ?? undefined,
    purchasePrice: (() => {
      const purchase = Number.parseFloat(product.purchasePrice)
      return Number.isFinite(purchase) ? String(Math.round(purchase)) : undefined
    })(),
  }
  const ctx = wizardLineConfigContext(next)
  return {
    ...next,
    configuration: sanitizeConfigurationForContext(ctx, line.configuration),
  }
}

/**
 * @param {string} raw
 */
export function parseMoneyInput(raw) {
  const n = parseCurrencyInput(raw)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

/**
 * @param {string} raw
 * @param {number} maxLen
 */
export function sanitizeDigitsOnly(raw, maxLen) {
  return String(raw).replace(/\D/g, '').slice(0, maxLen)
}

/** Telefon — yalnızca rakam (ülke bazlı uzunluk sınırı). */
export function sanitizePhoneInput(raw, maxLen = 11) {
  return String(raw).replace(/\D/g, '').slice(0, maxLen)
}

/**
 * @param {Pick<NewOrderWizardForm, 'phone' | 'phoneDialCode'>} form
 */
export function resolveWizardPhoneE164(form) {
  return toE164Phone(form.phoneDialCode ?? '+90', form.phone)
}

/**
 * @param {Pick<NewOrderWizardForm, 'nationalId' | 'phone2' | 'taxNumber' | 'taxOffice'>} form
 */
export function buildCustomerExtraNotesBlock(form) {
  const lines = []
  const tc = form.nationalId?.trim() ?? ''
  const tel2 = form.phone2?.trim() ?? ''
  const vn = form.taxNumber?.trim() ?? ''
  const vd = form.taxOffice?.trim() ?? ''
  if (tc) lines.push(`TC: ${tc}`)
  if (tel2) lines.push(`Tel 2: ${tel2}`)
  if (vn) lines.push(`Vergi no: ${vn}`)
  if (vd) lines.push(`Vergi dairesi: ${vd}`)
  if (!lines.length) return ''
  return [CUSTOMER_EXTRA_NOTES_START, ...lines, CUSTOMER_EXTRA_NOTES_END].join('\n')
}

/**
 * @param {string | undefined | null} notes
 * @returns {{ nationalId?: string, phone2?: string, taxNumber?: string, taxOffice?: string }}
 */
export function parseCustomerExtraFromNotes(notes) {
  const text = notes?.trim() ?? ''
  if (!text) return {}

  const blockMatch = text.match(
    new RegExp(
      `${CUSTOMER_EXTRA_NOTES_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${CUSTOMER_EXTRA_NOTES_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    ),
  )
  const block = blockMatch ? blockMatch[0] : text

  /** @type {{ nationalId?: string, phone2?: string, taxNumber?: string, taxOffice?: string }} */
  const out = {}
  const tc = block.match(/^TC:\s*(.+)$/im)
  if (tc?.[1]?.trim()) out.nationalId = tc[1].trim()
  const tel2 = block.match(/^Tel 2:\s*(.+)$/im)
  if (tel2?.[1]?.trim()) out.phone2 = tel2[1].trim()
  const vn = block.match(/^Vergi no:\s*(.+)$/im)
  if (vn?.[1]?.trim()) out.taxNumber = vn[1].trim()
  const vd = block.match(/^Vergi dairesi:\s*(.+)$/im)
  if (vd?.[1]?.trim()) out.taxOffice = vd[1].trim()
  return out
}

/**
 * @param {Pick<NewOrderWizardForm, 'nationalId' | 'phone2' | 'taxNumber' | 'taxOffice'>} form
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateCustomerExtraFields(form) {
  const tc = form.nationalId?.trim() ?? ''
  if (tc && (tc.length !== NATIONAL_ID_MAX_LEN || !/^\d+$/.test(tc))) {
    return { ok: false, message: 'TC Kimlik No 11 haneli olmalıdır.' }
  }
  const vn = form.taxNumber?.trim() ?? ''
  if (vn && (vn.length > TAX_NUMBER_MAX_LEN || !/^\d+$/.test(vn))) {
    return { ok: false, message: 'Vergi numarası yalnızca rakam olmalıdır.' }
  }
  return { ok: true }
}

/**
 * @param {import('../data/seedOrders.js').Order | { phone?: string, phone2?: string, nationalId?: string, taxNumber?: string, taxOffice?: string, notes?: string }} order
 */
export function formatCustomerIdentityCompact(order) {
  const parsed = parseCustomerExtraFromNotes(order.notes)
  const nationalId = order.nationalId?.trim() || parsed.nationalId
  const taxNumber = order.taxNumber?.trim() || parsed.taxNumber
  const taxOffice = order.taxOffice?.trim() || parsed.taxOffice
  if (taxNumber) {
    return taxOffice ? `VN ${taxNumber} · ${taxOffice}` : `VN ${taxNumber}`
  }
  if (nationalId) return `TC ${nationalId}`
  return null
}

/**
 * @param {import('../data/seedOrders.js').Order | { phone?: string, phone2?: string, notes?: string }} order
 */
export function formatCustomerPhonesCompact(order) {
  const parsed = parseCustomerExtraFromNotes(order.notes)
  const primary = order.phone?.trim()
  const secondary = order.phone2?.trim() || parsed.phone2
  if (primary && secondary) return `${primary} · ${secondary}`
  return primary || secondary || null
}

/**
 * @param {WizardProductLine} line
 */
export function lineTotal(line) {
  const qty = Number.parseFloat(line.qty) || 0
  const unit = parseMoneyInput(line.unitPrice)
  return Math.round(qty * unit)
}

/**
 * @param {NewOrderWizardForm} form
 */
/**
 * Mail order tahsilat — girilen tutar; boşsa kayıtta genel toplam.
 * @param {NewOrderWizardForm} form
 * @param {number} grandTotal
 */
export function resolveMailOrderCollectionAmount(form, grandTotal) {
  const entered = parseMoneyInput(form.mailOrderAmount ?? '')
  if (entered > 0) return Math.min(entered, grandTotal)
  return grandTotal
}

export function computeOrderTotals(form) {
  const breakdown = calculateOrderTotals({
    products: form.products,
    discountPercent: form.discountPercent,
    discountFixed: form.discountFixed,
  })
  const kapora = isMailOrderPayment(form.paymentMethod)
    ? parseMoneyInput(form.mailOrderAmount ?? '')
    : parseMoneyInput(form.kapora)
  const remaining = Math.max(0, breakdown.grandTotal - kapora)
  return {
    ...breakdown,
    /** @deprecated alias — genel toplam (iskonto sonrası) */
    total: breakdown.grandTotal,
    kapora,
    remaining,
  }
}

export { calculateOrderTotals, parseDiscountPercent } from './calculateOrderTotals.js'

/**
 * @param {WizardProductLine[]} products
 */
export function formatProductSummary(products) {
  const valid = products.filter((p) => p.name.trim())
  return formatProductSummaryFromLines(
    valid.map((p) => ({
      title: p.name.trim(),
      quantity: Number.parseFloat(p.qty) || 1,
    })),
  )
}

/**
 * @param {NewOrderWizardForm} form
 * @returns {import('../../contracts/v1/createOrderRequest.js').CreateOrderLineInput[]}
 */
export function mapWizardProductsToLines(form) {
  return form.products
    .filter((p) => p.productId || p.name.trim())
    .map((p, i) => {
      const configuration = buildWizardLineConfiguration(p)
      const hasConfig = Object.keys(configuration).length > 0
      const qty = Number.parseFloat(p.qty) || 1
      const unit = roundMoney(parseMoneyInput(p.unitPrice))
      return {
        title: p.name.trim() || 'Ürün',
        quantity: qty,
        unitPrice: unit,
        lineTotal: computeLineTotal(qty, unit),
        productGroup: p.group,
        sortOrder: i,
        ...(p.productId ? { productId: p.productId } : {}),
        ...(p.defaultSupplierId ? { supplierId: p.defaultSupplierId } : {}),
        ...(p.defaultSupplierName ? { supplierNameSnapshot: p.defaultSupplierName } : {}),
        ...(p.note?.trim() ? { lineNote: p.note.trim() } : {}),
        ...(hasConfig ? { configuration } : {}),
      }
    })
}

/**
 * @param {NewOrderWizardForm} form
 */
function buildNotesSnapshot(form) {
  const parts = []
  const extra = buildCustomerExtraNotesBlock(form)
  if (extra) parts.push(extra)
  const addr = [form.neighborhood, form.address, form.district, form.city].filter(Boolean)
  if (addr.length) parts.push(`Adres: ${addr.join(', ')}`)
  if (form.customerNote.trim()) parts.push(form.customerNote.trim())
  parts.push(`Ödeme: ${PAYMENT_LABELS[form.paymentMethod] ?? form.paymentMethod}`)
  if (form.paymentNote?.trim()) parts.push(`Ödeme notu: ${form.paymentNote.trim()}`)
  if (isMailOrderPayment(form.paymentMethod)) {
    if ((form.mailOrderCustomerId ?? '').trim()) {
      parts.push(`Mail order kart müşteri: ${form.mailOrderCustomerId.trim()}`)
    }
    if ((form.mailOrderSupplierId ?? '').trim()) {
      parts.push(`Mail order tedarikçi: ${form.mailOrderSupplierId.trim()}`)
    }
    const rate = parseMailOrderCommissionRate(form.mailOrderCommissionRate)
    if (rate > 0) parts.push(`Mail order komisyon: %${rate}`)
    const moAmt = parseMoneyInput(form.mailOrderAmount ?? '')
    if (moAmt > 0) parts.push(`Mail order tahsilat: ${moAmt} TL`)
  }
  const fin = calculateOrderTotals({
    products: form.products,
    discountPercent: form.discountPercent,
    discountFixed: form.discountFixed,
  })
  for (const p of form.products) {
    if (!p.name.trim()) continue
    const extras = [p.group, p.note.trim()].filter(Boolean).join(' · ')
    if (extras) parts.push(`${p.name.trim()} — ${extras}`)
  }
  return parts.join('\n') || undefined
}

/**
 * @typedef {{ ok: true } | { ok: false, message: string, fieldErrors?: Record<string, string> }} WizardStepValidation
 */

/**
 * @param {number} step
 * @param {NewOrderWizardForm} form
 * @returns {WizardStepValidation}
 */
export function validateWizardStep(step, form) {
  if (step === 0) {
    if (!form.customer.trim()) {
      return { ok: false, message: 'Müşteri adı zorunludur.' }
    }
    if (!form.salesPerson.trim()) {
      return { ok: false, message: 'Satış danışmanı seçin.' }
    }
    return validateCustomerExtraFields(form)
  }
  if (step === 1) {
    const validLines = form.products.filter((p) => p.productId || p.name.trim())
    if (validLines.length === 0) {
      return { ok: false, message: 'Katalogdan en az bir ürün ekleyin.' }
    }
    for (const p of validLines) {
      if (lineTotal(p) <= 0) {
        const label = p.name.trim() || 'Ürün satırı'
        return { ok: false, message: `"${label}" için geçerli birim fiyat girin.` }
      }
      const ctx = wizardLineConfigContext(p)
      const { errors } = validateLineConfiguration(ctx, buildWizardLineConfiguration(p))
      if (errors.length > 0) {
        const label = p.name.trim() || 'Ürün satırı'
        return { ok: false, message: `"${label}": ${errors[0]}` }
      }
    }
    return { ok: true }
  }
  if (step === 2) {
    /** @type {Record<string, string>} */
    const fieldErrors = {}
    const { grandTotal } = computeOrderTotals(form)
    if (grandTotal <= 0) {
      return { ok: false, message: 'Genel toplam sıfırdan büyük olmalı.' }
    }
    const pctRaw = String(form.discountPercent ?? '').trim().replace(',', '.')
    if (pctRaw) {
      const pct = Number.parseFloat(pctRaw)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        fieldErrors.discountPercent = 'İskonto yüzdesi 0 ile 100 arasında olmalı.'
      }
    }
    const fixedRaw = String(form.discountFixed ?? '').trim()
    if (fixedRaw && parseMoneyInput(form.discountFixed) < 0) {
      fieldErrors.discountFixed = 'TL iskonto negatif olamaz.'
    }
    if (!form.dueDate) {
      fieldErrors.dueDate = 'Tarih zorunlu'
    }
    if (!form.paymentMethod) {
      fieldErrors.paymentMethod = 'Ödeme tipi seçilmedi'
    }
    if (isMailOrderPayment(form.paymentMethod)) {
      if (!(form.mailOrderCustomerId ?? '').trim()) {
        fieldErrors.mailOrderCustomerId = 'Kart çekilen müşteri zorunlu'
      }
      if (!(form.mailOrderSupplierId ?? '').trim()) {
        fieldErrors.mailOrderSupplierId = 'Mail order tedarikçisi zorunlu'
      }
      const rateRaw = String(form.mailOrderCommissionRate ?? '').trim().replace(',', '.')
      if (rateRaw) {
        const rate = Number.parseFloat(rateRaw)
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
          fieldErrors.mailOrderCommissionRate = 'Komisyon 0 ile 100 arasında olmalı.'
        }
      }
      const moAmt = parseMoneyInput(form.mailOrderAmount ?? '')
      if (moAmt > grandTotal) {
        fieldErrors.mailOrderAmount = 'Mail order tutarı genel toplamdan fazla olamaz.'
      }
    } else {
      const kapora = parseMoneyInput(form.kapora)
      if (kapora > grandTotal) {
        fieldErrors.kapora = 'Kapora, genel toplamdan fazla olamaz.'
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false,
        message: Object.values(fieldErrors)[0],
        fieldErrors,
      }
    }
    return { ok: true }
  }
  return { ok: true }
}

/**
 * @param {NewOrderWizardForm} form
 * @returns {Omit<Order, 'id' | 'orderDate'>}
 */
export function mapWizardToLegacyOrder(form) {
  const { total, grandTotal, kapora } = computeOrderTotals(form)
  const collected = isMailOrderPayment(form.paymentMethod)
    ? resolveMailOrderCollectionAmount(form, grandTotal)
    : kapora
  const product = formatProductSummary(form.products)
  const paid = collected >= total && total > 0
  const costSum = form.products.reduce((s, p) => s + parseMoneyInput(p.unitPrice) * 0.6, 0)

  const extra = pickCustomerExtraFields(form)

  return {
    customer: form.customer.trim(),
    phone: resolveWizardPhoneE164(form) || undefined,
    ...extra,
    salesPerson: form.salesPerson || undefined,
    product,
    amount: total,
    cost: costSum > 0 ? Math.round(costSum) : undefined,
    paidAmount: collected > 0 ? collected : undefined,
    paid,
    dueDate: form.dueDate,
    shipmentDate: addDays(form.dueDate, 5),
    status: form.status,
    notes: buildNotesSnapshot(form),
  }
}

/**
 * @param {NewOrderWizardForm} form
 * @returns {CreateOrderRequest}
 */
function pickCustomerExtraFields(form) {
  return {
    phone2: form.phone2?.trim() || undefined,
    nationalId: form.nationalId?.trim() || undefined,
    taxNumber: form.taxNumber?.trim() || undefined,
    taxOffice: form.taxOffice?.trim() || undefined,
  }
}

/**
 * @param {string} [raw]
 */
function parseMailOrderCommissionRate(raw) {
  const s = String(raw ?? '').trim().replace(',', '.')
  if (!s) return 0
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

/**
 * @param {NewOrderWizardForm} form
 */
function pickCommercialPaymentFields(form) {
  const paymentMethod = form.paymentMethod
  const paymentNote = form.paymentNote?.trim() || undefined
  const commission = parseMailOrderCommissionRate(form.mailOrderCommissionRate)
  if (!isMailOrderPayment(paymentMethod)) {
    return {
      paymentMethod,
      ...(paymentNote ? { paymentNote } : {}),
    }
  }
  const entered = parseMoneyInput(form.mailOrderAmount ?? '')
  return {
    paymentMethod,
    ...(paymentNote ? { paymentNote } : {}),
    mailOrderCustomerId: (form.mailOrderCustomerId ?? '').trim(),
    mailOrderSupplierId: (form.mailOrderSupplierId ?? '').trim(),
    ...(commission > 0 ? { mailOrderCommissionRate: commission } : {}),
    ...(entered > 0 ? { mailOrderAmount: entered } : {}),
  }
}

function resolveWizardDiscountType(form, fin) {
  if (fin.totalDiscount <= 0) return DISCOUNT_TYPE.NONE
  const pct = parseDiscountPercent(form.discountPercent)
  if (pct > 0 && fin.fixedDiscountAmount > 0) return DISCOUNT_TYPE.COMBINED
  if (pct > 0) return DISCOUNT_TYPE.PERCENTAGE
  return DISCOUNT_TYPE.FIXED
}

export function mapWizardToCreateOrderRequest(form) {
  const fin = calculateOrderTotals({
    products: form.products,
    discountPercent: form.discountPercent,
    discountFixed: form.discountFixed,
  })
  const kapora = isMailOrderPayment(form.paymentMethod)
    ? parseMoneyInput(form.mailOrderAmount ?? '')
    : parseMoneyInput(form.kapora)
  const paidAmount = isMailOrderPayment(form.paymentMethod)
    ? resolveMailOrderCollectionAmount(form, fin.grandTotal)
    : kapora
  const lines = mapWizardProductsToLines(form)
  const costSum = form.products.reduce((s, p) => s + parseMoneyInput(p.unitPrice) * 0.6, 0)
  const extra = pickCustomerExtraFields(form)
  const pct = parseDiscountPercent(form.discountPercent)
  return {
    customerName: form.customer.trim(),
    productTitle: formatProductSummary(form.products),
    subtotalAmount: fin.subtotal,
    discountAmount: fin.totalDiscount,
    discountType: resolveWizardDiscountType(form, fin),
    ...(pct > 0 ? { discountPercent: pct } : {}),
    ...(fin.fixedDiscountAmount > 0 ? { discountFixedAmount: fin.fixedDiscountAmount } : {}),
    totalAmount: fin.grandTotal,
    paidAmount,
    status: form.status,
    lines,
    phone: resolveWizardPhoneE164(form) || undefined,
    ...extra,
    salesPerson: form.salesPerson || undefined,
    dueDate: form.dueDate,
    shipmentDate: addDays(form.dueDate, 5),
    notes: buildNotesSnapshot(form),
    cost: costSum > 0 ? Math.round(costSum) : undefined,
    ...pickCommercialPaymentFields(form),
  }
}

export { PAYMENT_LABELS }

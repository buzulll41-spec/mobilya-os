import { formatConfigurationLines } from '../constants/productConfigurationSchema.js'
import { lineExtendedTotal, roundMoney } from '../domain/order/orderLineCreate.js'
import {
  buildWizardLineConfiguration,
  mapWizardProductsToLines,
  wizardLineConfigContext,
} from '../features/orders/newOrderWizardModel.js'
import { getOrderLinesForSalesOrder } from './mockOrderLineStore.js'
import { getOrderLines, getShipmentPlanLines } from './ordersClient.js'

/** @typedef {import('../features/orders/newOrderWizardModel.js').NewOrderWizardForm} NewOrderWizardForm */

/**
 * @typedef {Object} ContractLineSource
 * @property {string} orderLineId
 * @property {string} title
 * @property {number} quantity
 * @property {number} [unitPrice]
 * @property {string} [productGroup]
 * @property {string} [lineNote]
 * @property {Record<string, string>} [configuration]
 * @property {string} [supplierName]
 * @property {string[]} [configurationSummary]
 * @property {number} [lineTotal]
 */

/**
 * @typedef {Object} SalesContractLineRow
 * @property {string} title
 * @property {string} [productGroup]
 * @property {number} quantity
 * @property {number | null} unitPrice
 * @property {number | null} lineTotal
 * @property {string} [fabricNote]
 * @property {string[]} [configurationLines]
 * @property {string} [supplierName]
 * @property {string[]} [configurationSummary]
 * @property {number} [lineTotal]
 */

/**
 * Sihirbaz formundan sözleşme satırları (sipariş oluşturma sonrası önizleme).
 * @param {NewOrderWizardForm} form
 * @returns {SalesContractLineRow[]}
 */
export function buildContractLineRowsFromWizardForm(form) {
  const lines = mapWizardProductsToLines(form)
  const products = form.products.filter((p) => p.productId || p.name.trim())
  return lines.map((ln, i) => {
    const product = products[i]
    const qty = ln.quantity > 0 ? ln.quantity : 1
    const unit = typeof ln.unitPrice === 'number' ? roundMoney(ln.unitPrice) : null
    const lineTotal = unit != null ? lineExtendedTotal({ quantity: qty, unitPrice: unit }) : null
    const ctx = product
      ? wizardLineConfigContext(product)
      : {
          title: ln.title,
          productGroup: ln.productGroup,
          category: ln.productGroup,
        }
    const configuration =
      product && buildWizardLineConfiguration(product)
        ? buildWizardLineConfiguration(product)
        : 'configuration' in ln && ln.configuration
          ? ln.configuration
          : undefined
    const configurationLines = formatConfigurationLines(
      { title: ln.title, productGroup: ln.productGroup, category: ln.productGroup },
      configuration && Object.keys(configuration).length ? configuration : undefined,
    )
    return {
      title: ln.title,
      productGroup: ln.productGroup,
      quantity: qty,
      unitPrice: unit,
      lineTotal,
      supplierName: product?.defaultSupplierName?.trim() || undefined,
      configurationLines: configurationLines.length ? configurationLines : undefined,
      fabricNote: configurationLines.length ? configurationLines.join('\n') : undefined,
    }
  })
}

/**
 * @param {string} orderId
 * @param {number} orderTotalAmount
 * @returns {Promise<SalesContractLineRow[]>}
 */
export async function fetchSalesContractLineRows(orderId, orderTotalAmount) {
  const sources = await loadContractLineSources(orderId)
  if (!sources.length) {
    return [
      {
        title: 'Sipariş kalemi',
        quantity: 1,
        unitPrice: orderTotalAmount > 0 ? orderTotalAmount : null,
        lineTotal: orderTotalAmount > 0 ? orderTotalAmount : null,
      },
    ]
  }
  return mapSourcesToContractRows(sources, orderTotalAmount)
}

/**
 * @param {string} orderId
 * @returns {Promise<ContractLineSource[]>}
 */
async function loadContractLineSources(orderId) {
  try {
    const rows = await getOrderLines(orderId)
    if (rows.length > 0) {
      return rows.map((l) => ({
        orderLineId: l.id,
        title: l.productTitleSnapshot?.trim() || l.title?.trim() || 'Ürün',
        quantity: parseQty(l.qtyOrdered),
        unitPrice: typeof l.unitPrice === 'number' ? l.unitPrice : undefined,
        lineTotal: typeof l.lineTotal === 'number' ? l.lineTotal : undefined,
        productGroup: l.productGroupSnapshot ?? l.productGroup ?? undefined,
        configuration:
          l.configuration && typeof l.configuration === 'object' && Object.keys(l.configuration).length
            ? l.configuration
            : undefined,
        configurationSummary: Array.isArray(l.configurationSummary) ? l.configurationSummary : undefined,
        supplierName: l.supplierNameSnapshot ?? undefined,
      }))
    }
  } catch {
    /* API kapalı veya satır yok */
  }

  const seeds = getOrderLinesForSalesOrder(orderId)
  if (seeds.length > 0) {
    return seeds.map((s) => ({
      orderLineId: s.id,
      title: s.productTitleSnapshot?.trim() || s.title?.trim() || 'Ürün',
      quantity: parseQty(s.qtyOrdered),
      unitPrice: typeof s.unitPrice === 'number' ? s.unitPrice : undefined,
      lineTotal: typeof s.lineTotal === 'number' ? s.lineTotal : undefined,
      productGroup: s.productGroupSnapshot ?? s.productGroup,
      lineNote: s.lineNote,
      configuration: s.configuration,
      configurationSummary: s.configurationSummary,
      supplierName: s.supplierNameSnapshot,
    }))
  }

  const plan = await getShipmentPlanLines(orderId)
  return plan.map((p) => ({
    orderLineId: p.orderLineId,
    title: p.title?.trim() || 'Ürün',
    quantity: parseQty(p.qtyOrdered),
  }))
}

/**
 * @param {ContractLineSource[]} sources
 * @param {number} orderTotalAmount
 * @returns {SalesContractLineRow[]}
 */
export function mapSourcesToContractRows(sources, orderTotalAmount) {
  const priced = sources.map((src) => {
    const qty = src.quantity > 0 ? src.quantity : 1
    const unit = typeof src.unitPrice === 'number' ? roundMoney(src.unitPrice) : null
    const ctx = {
      title: src.title,
      productGroup: src.productGroup,
      category: src.productGroup,
    }
    const configurationLines =
      src.configurationSummary?.length > 0
        ? [...src.configurationSummary]
        : formatConfigurationLines(ctx, src.configuration)
    const fabricNote =
      src.lineNote ??
      (configurationLines.length ? configurationLines.join('\n') : undefined)
    const resolvedLineTotal =
      typeof src.lineTotal === 'number'
        ? roundMoney(src.lineTotal)
        : unit != null
          ? lineExtendedTotal({ quantity: qty, unitPrice: unit })
          : null

    return {
      title: src.title,
      productGroup: src.productGroup,
      quantity: qty,
      unitPrice: unit,
      lineTotal: resolvedLineTotal,
      fabricNote,
      configurationLines,
      supplierName: src.supplierName,
    }
  })

  const knownSum = priced.reduce((s, r) => s + (r.lineTotal ?? 0), 0)
  const allPriced = priced.every((r) => r.lineTotal != null)
  if (allPriced && knownSum > 0) return priced

  return allocateOrderTotalAcrossLines(priced, orderTotalAmount)
}

/**
 * @param {SalesContractLineRow[]} rows
 * @param {number} orderTotalAmount
 */
function allocateOrderTotalAcrossLines(rows, orderTotalAmount) {
  const total = orderTotalAmount > 0 ? orderTotalAmount : 0
  const qtySum = rows.reduce((s, r) => s + r.quantity, 0) || 1

  return rows.map((row) => {
    if (row.lineTotal != null && row.unitPrice != null) return row
    const share = total > 0 ? roundMoney((total * row.quantity) / qtySum) : null
    const unit =
      share != null && row.quantity > 0 ? roundMoney(share / row.quantity) : null
    return {
      ...row,
      lineTotal: share,
      unitPrice: unit,
    }
  })
}

/** @param {string} raw */
function parseQty(raw) {
  const n = Number.parseFloat(String(raw ?? ''))
  return Number.isFinite(n) && n > 0 ? n : 1
}

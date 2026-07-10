import { formatTry } from '../../data/dashboardHelpers.js'

import { computeOrderTotals } from './newOrderWizardModel.js'

import {

  formatCurrencyInput,

  parseCurrencyInput,

  normalizeCurrencyStorage,

} from '../../lib/formatCurrencyInput.js'



/** @typedef {import('./newOrderWizardModel.js').WizardProductLine} WizardProductLine */

/** @typedef {import('./newOrderWizardModel.js').NewOrderWizardForm} NewOrderWizardForm */



/**

 * Türkçe para formatı — 35.000,00 ₺

 * @param {number} amount

 */

export function formatWizardMoney(amount) {

  return formatTry(amount)

}



/**

 * Görüntüleme / giriş: 35.000,00 veya 35000 → sayı

 * @param {string} raw

 */

export function parseWizardPriceInput(raw) {

  const n = parseCurrencyInput(raw)

  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0

}



/**

 * @param {WizardProductLine} line

 */

export function wizardLineTotal(line) {

  const qty = Number.parseFloat(line.qty) || 0

  const unit = parseWizardPriceInput(line.unitPrice)

  return Math.round(qty * unit)

}



/**

 * @param {WizardProductLine[]} products

 */

export function countNamedProducts(products) {

  return products.filter((p) => p.name.trim()).length

}



/**

 * @param {NewOrderWizardForm} form

 */

export function computeProductsStepSummary(form) {

  const { subtotal } = computeOrderTotals(form)

  return {

    productCount: countNamedProducts(form.products),

    lineCount: form.products.length,

    total: subtotal,

    totalFormatted: formatWizardMoney(subtotal),

  }

}



/**

 * Depolama için normalize fiyat string

 * @param {string} raw

 */

export function normalizeWizardPriceStorage(raw) {

  return normalizeCurrencyStorage(raw, { integerOnly: true })

}



/**

 * @param {string} raw

 * @param {boolean} focused

 */

export function formatPriceFieldDisplay(raw, focused) {

  if (focused) return raw

  if (!String(raw).trim()) return ''

  return formatCurrencyInput(raw)

}



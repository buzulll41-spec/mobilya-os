import { buildCommercialSummary, buildDeliverySummary } from '../../domain/commerce/commerceSummaries.js'
import { formatTry } from '../../data/index.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { formatShortDate } from '../../utils/dates.js'
import { extractInstallationNoteFromNotes } from './buildDispatchSheetModel.js'
import { formatCrewLabel } from '../../state/shipmentPlanStore.js'

/** @typedef {import('./shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {Object} ShipmentStopDetailModel
 * @property {string} customer
 * @property {string} orderNumber
 * @property {string} orderId
 * @property {string} plannedDateLabel
 * @property {string} plannedTime
 * @property {boolean} hasPlannedTime
 * @property {string} vehicle
 * @property {boolean} hasVehicle
 * @property {string[]} crewMembers
 * @property {string} crewLabel
 * @property {string} phone
 * @property {string | null} phoneDialHref
 * @property {string} address
 * @property {string | null} mapsHref
 * @property {string} region
 * @property {string} product
 * @property {number} remainingPayment
 * @property {string} remainingPaymentLabel
 * @property {boolean} paymentComplete
 * @property {string} installationNote
 * @property {string} shipmentNote
 * @property {string} collectionNote
 * @property {string} riskLabel
 * @property {string} statusLabel
 */

/**
 * @param {string} phone
 * @returns {string | null}
 */
export function buildPhoneDialHref(phone) {
  const raw = String(phone ?? '').trim()
  if (!raw || raw === '—') return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (digits.startsWith('90')) return `tel:+${digits}`
  if (digits.startsWith('0')) return `tel:+90${digits.slice(1)}`
  return `tel:+90${digits}`
}

/**
 * @param {string} address
 * @returns {string | null}
 */
export function buildGoogleMapsHref(address) {
  const raw = String(address ?? '').trim()
  if (!raw || raw === '—') return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}`
}

/**
 * @param {ShipmentPlan | undefined} plan
 * @param {ShipmentAgendaItem} item
 * @returns {string[]}
 */
export function resolveCrewMembers(plan, item) {
  const members = [plan?.crew1, plan?.crew2]
    .map((m) => (typeof m === 'string' ? m.trim() : ''))
    .filter((m) => m && m !== 'Belirlenmedi' && m !== 'Dış ekip')

  if (members.length) return members

  if (item.crewLabel && item.hasCrew) {
    return item.crewLabel
      .split(/[+·,/]/g)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return []
}

/**
 * @param {Order | undefined} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} plan
 */
function resolveContactFields(order, dto, plan) {
  const notes = order?.notes ?? dto?.notesSnapshot ?? ''
  const delivery = buildDeliverySummary({ notes, dueDate: order?.dueDate ?? null })
  const commercial = buildCommercialSummary({
    subtotalAmount: order?.amount ?? 0,
    discountAmount: 0,
    totalAmount: order?.amount ?? 0,
    paidAmount: order?.paidAmount ?? 0,
    remainingAmount: order?.remainingAmount ?? order?.amount ?? 0,
    notes,
  })

  const phone = order?.phone?.trim() || dto?.customerPhone?.trim() || '—'
  const address = delivery.address ?? '—'

  return {
    phone,
    address,
    collectionNote: commercial.paymentNote ?? '—',
    shipmentNote:
      plan?.note?.trim() ||
      notes.match(/^Sevk notu:\s*(.+)$/im)?.[1]?.trim() ||
      '—',
    installationNote:
      extractInstallationNoteFromNotes(notes) || delivery.deliveryNote || '—',
  }
}

/**
 * @param {{
 *   item: ShipmentAgendaItem
 *   order?: Order
 *   listItemDto?: SalesOrderListItemDto
 *   plan?: ShipmentPlan
 * }} input
 * @returns {ShipmentStopDetailModel}
 */
export function buildShipmentStopDetailModel({ item, order, listItemDto, plan }) {
  const contact = resolveContactFields(order, listItemDto, plan)
  const remaining = item.remaining ?? (order ? remainingBalance(order) : 0)
  const crewMembers = resolveCrewMembers(plan, item)
  const vehicle = plan?.vehicle?.trim() || (item.hasVehicle ? item.vehicleLabel : 'Araç atanmadı')
  const crewLabel =
    crewMembers.length > 0
      ? crewMembers.join(' · ')
      : item.hasCrew
        ? item.crewLabel
        : 'Ekip atanmadı'

  return {
    customer: item.customer,
    orderNumber: item.orderNumber,
    orderId: item.orderId,
    plannedDateLabel: formatShortDate(item.dateIso),
    plannedTime: item.hasScheduledTime ? item.timeLabel : '—',
    hasPlannedTime: Boolean(item.hasScheduledTime),
    vehicle,
    hasVehicle: Boolean(plan?.vehicle?.trim() || item.hasVehicle),
    crewMembers,
    crewLabel,
    phone: contact.phone,
    phoneDialHref: buildPhoneDialHref(contact.phone),
    address: contact.address,
    mapsHref: buildGoogleMapsHref(contact.address),
    region: item.region || 'Bölge Belirsiz',
    product: item.product || '—',
    remainingPayment: remaining,
    remainingPaymentLabel: formatTry(remaining),
    paymentComplete: remaining <= 0.009,
    installationNote: contact.installationNote,
    shipmentNote: contact.shipmentNote !== '—' ? contact.shipmentNote : item.planNote || '—',
    collectionNote: contact.collectionNote,
    riskLabel: item.riskLabel || 'Normal',
    statusLabel: item.statusLabel || 'Planlandı',
  }
}

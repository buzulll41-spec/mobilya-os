import { buildCommercialSummary, buildDeliverySummary } from '../../domain/commerce/commerceSummaries.js'
import { formatTry } from '../../data/index.js'
import { getCurrentAuthUser } from '../../lib/operationActor.js'
import { fetchSalesContractLineRows } from '../../services/salesContractLines.js'
import { parseTimeToMinutes } from './shipmentPlanConflict.js'
import { formatShortDate } from '../../utils/dates.js'

/** @typedef {import('./shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {Object} DispatchSheetProductLine
 * @property {string} title
 * @property {number} quantity
 * @property {string[]} configurationLines
 */

/**
 * @typedef {Object} DispatchSheetStop
 * @property {number} sequence
 * @property {string} plannedTime
 * @property {string} customer
 * @property {string} phone
 * @property {string} address
 * @property {string} region
 * @property {string} orderNumber
 * @property {string} orderId
 * @property {DispatchSheetProductLine[]} products
 * @property {number} remainingPayment
 * @property {string} remainingPaymentLabel
 * @property {string} collectionNote
 * @property {string} shipmentNote
 * @property {string} installationNote
 * @property {string} riskLabel
 */

/**
 * @typedef {Object} DispatchSheetModel
 * @property {{ brand: string, title: string, date: string, vehicle: string, crew: string, route: string, totalCustomers: number, totalProducts: number, totalCollectionDue: number, totalCollectionDueLabel: string, preparedBy: string, createdAt: string, createdAtLabel: string }} header
 * @property {DispatchSheetStop[]} stops
 * @property {string[]} checklist
 * @property {string[]} orderIds
 */

export const DISPATCH_SHEET_CHECKLIST = [
  'Ürünler araca yüklendi',
  'Kırlent / aksesuar kontrol edildi',
  'Eksik ürün kontrol edildi',
  'Tahsilat notu kontrol edildi',
  'Montaj ekipmanları alındı',
  'Müşteri arandı',
  'Araç çıkış saati yazıldı',
]

/** @param {string | undefined | null} notes */
export function extractInstallationNoteFromNotes(notes) {
  const m = String(notes ?? '').match(/^Montaj notu:\s*(.+)$/im)
  return m?.[1]?.trim() || ''
}

/**
 * @param {ShipmentAgendaItem[]} agendaItems
 * @param {string} vehicle
 * @param {string} plannedDate
 */
export function filterAgendaItemsForVehicle(agendaItems, vehicle, plannedDate) {
  return agendaItems
    .filter(
      (item) =>
        item.dateIso === plannedDate && item.hasVehicle && item.vehicleLabel === vehicle,
    )
    .slice()
    .sort((a, b) => {
      const ta = parseTimeToMinutes(a.hasScheduledTime ? a.timeLabel : '')
      const tb = parseTimeToMinutes(b.hasScheduledTime ? b.timeLabel : '')
      if (ta != null && tb != null && ta !== tb) return ta - tb
      if (ta != null && tb == null) return -1
      if (ta == null && tb != null) return 1
      return a.customer.localeCompare(b.customer, 'tr')
    })
}

/**
 * @param {Order | undefined} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} plan
 */
function resolveStopContactFields(order, dto, plan) {
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

  const phone =
    order?.phone?.trim() ||
    dto?.customerPhone?.trim() ||
    '—'

  return {
    phone,
    address: delivery.address ?? '—',
    collectionNote: commercial.paymentNote ?? '—',
    shipmentNote: plan?.note?.trim() || order?.notes?.match(/^Sevk notu:\s*(.+)$/im)?.[1]?.trim() || '—',
    installationNote:
      extractInstallationNoteFromNotes(notes) ||
      delivery.deliveryNote ||
      '—',
  }
}

/**
 * @param {{
 *   vehicle: string
 *   plannedDate: string
 *   agendaItems: ShipmentAgendaItem[]
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   plansByOrderId: Map<string, ShipmentPlan>
 *   preparedBy?: string
 * }} input
 * @returns {Promise<DispatchSheetModel>}
 */
export async function buildDispatchSheetModel(input) {
  const {
    vehicle,
    plannedDate,
    agendaItems,
    orders,
    listItemDtos,
    plansByOrderId,
    preparedBy,
  } = input

  const orderById = new Map(orders.map((o) => [o.id, o]))
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const filtered = filterAgendaItemsForVehicle(agendaItems, vehicle, plannedDate)

  const now = new Date()
  const authUser = getCurrentAuthUser()

  /** @type {DispatchSheetStop[]} */
  const stops = []
  let totalProducts = 0
  let totalCollectionDue = 0

  for (let i = 0; i < filtered.length; i += 1) {
    const item = filtered[i]
    const order = orderById.get(item.orderId)
    const dto = dtoById.get(item.orderId)
    const plan = plansByOrderId.get(item.orderId)
    const contact = resolveStopContactFields(order, dto, plan)

    const lineRows = await fetchSalesContractLineRows(item.orderId, item.amount ?? order?.amount ?? 0)
    const products = lineRows.map((line) => ({
      title: line.title,
      quantity: line.quantity,
      configurationLines: line.configurationLines ?? (line.fabricNote ? line.fabricNote.split('\n') : []),
    }))

    for (const product of products) {
      totalProducts += product.quantity > 0 ? product.quantity : 1
    }

    const remaining = item.remaining ?? 0
    totalCollectionDue += remaining

    stops.push({
      sequence: i + 1,
      plannedTime: item.hasScheduledTime ? item.timeLabel : '—',
      customer: item.customer,
      phone: contact.phone,
      address: contact.address,
      region: item.region || 'Bölge Belirsiz',
      orderNumber: item.orderNumber,
      orderId: item.orderId,
      products,
      remainingPayment: remaining,
      remainingPaymentLabel: formatTry(remaining),
      collectionNote: contact.collectionNote,
      shipmentNote: contact.shipmentNote !== '—' ? contact.shipmentNote : item.planNote || '—',
      installationNote: contact.installationNote,
      riskLabel: item.riskLabel || 'Normal',
    })
  }

  const regions = [...new Set(stops.map((s) => s.region).filter(Boolean))]
  const crew =
    filtered.find((item) => item.hasCrew)?.crewLabel ||
    '—'

  return {
    header: {
      brand: 'Evtrend',
      title: 'ARAÇ ÇIKIŞ FİŞİ',
      date: formatShortDate(plannedDate),
      vehicle,
      crew,
      route: regions.length ? regions.join(' → ') : '—',
      totalCustomers: stops.length,
      totalProducts,
      totalCollectionDue,
      totalCollectionDueLabel: formatTry(totalCollectionDue),
      preparedBy: preparedBy ?? authUser?.fullName ?? '—',
      createdAt: now.toISOString(),
      createdAtLabel: `${formatShortDate(plannedDate)} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`,
    },
    stops,
    checklist: [...DISPATCH_SHEET_CHECKLIST],
    orderIds: stops.map((s) => s.orderId),
  }
}

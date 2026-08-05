import { addDays, DEMO_TOMORROW } from '../../data/constants.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { isTerminOverdue } from '../../utils/orderFinance.js'
import { shipmentQueueCardStatusLabel } from '../shipment/shipmentOperationUx.js'
import {
  resolveShipmentCalendarTone,
  shipmentCalendarToneLabel,
} from './shipmentCalendarRisk.js'
import {
  buildRegionInsightsForDay,
  buildSmartCalendarHints,
  sortEntriesInDays,
} from './shipmentCalendarGrouping.js'
import { buildOperationalAlarms } from '../../utils/operationalAlarms.js'
import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('./shipmentCalendarRisk.js').ShipmentCalendarTone} ShipmentCalendarTone */

/**
 * @typedef {{
 *   id: string
 *   orderId: string
 *   dateIso: string
 *   timeLabel: string
 *   customer: string
 *   region: string
 *   deliveryType: string
 *   crew: string
 *   paymentLabel: string
 *   statusLabel: string
 *   tone: ShipmentCalendarTone
 *   toneLabel: string
 *   hasSsh: boolean
 *   sshDetail: string | null
 *   openMissingCount: number
 *   terminUrgent: boolean
 *   orderNumber: string
 *   shipmentId?: string
 * }} ShipmentCalendarEntry
 *
 * @typedef {{
 *   id: string
 *   label: string
 *   value: string
 *   hint?: string
 *   tone: 'ok' | 'warn' | 'critical' | 'neutral'
 * }} CalendarSummaryKpi
 *
 * @typedef {{
 *   iso: string
 *   weekdayLabel: string
 *   dayNum: number
 *   isToday: boolean
 *   entries: ShipmentCalendarEntry[]
 * }} CalendarDayColumn
 *
 * @typedef {{
 *   id: string
 *   label: string
 *   critical?: boolean
 *   done?: boolean
 * }} CalendarTodayTask
 */

const WEEKDAY_TR = ['Pzt', 'Sal', 'Çrş', 'Per', 'Cum', 'Cts', 'Paz']

/**
 * @param {string} iso
 */
export function mondayOfWeekContaining(iso) {
  const d = new Date(`${iso}T12:00:00`)
  const dow = d.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @param {string} weekStartIso
 * @param {number} count
 */
export function buildWeekDayIsos(weekStartIso, count = 6) {
  /** @type {string[]} */
  const days = []
  for (let i = 0; i < count; i++) {
    days.push(addDays(weekStartIso, i))
  }
  return days
}

/**
 * @param {string} notes
 */
function extractRegion(notes) {
  if (!notes?.trim()) return '—'
  const m = notes.match(/Adres:\s*([^,\n]+)/i)
  if (m) return m[1].trim()
  if (notes.includes('İzmir')) return 'İzmir'
  if (notes.includes('İstanbul')) return 'İstanbul'
  if (notes.includes('Ankara')) return 'Ankara'
  if (notes.includes('İzmit')) return 'İzmit'
  if (notes.includes('Karşıyaka')) return 'Karşıyaka'
  return 'Bölge —'
}

/**
 * @param {string} orderId
 * @param {string} dateIso
 * @param {number} index
 */
function defaultTimeLabel(orderId, dateIso, index) {
  const seed = (orderId.charCodeAt(orderId.length - 1) + index * 17 + dateIso.length) % 6
  const hour = 9 + seed
  return `${String(hour).padStart(2, '0')}:00`
}

/**
 * @param {{
 *   shipmentRows: ShipmentRowVM[]
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   todayIso: string
 *   weekStartIso?: string
 * }} input
 */
export function buildShipmentCalendarEntries({
  shipmentRows,
  orders,
  listItemDtos,
  todayIso,
  weekStartIso,
}) {
  const start = weekStartIso ?? mondayOfWeekContaining(todayIso)
  const weekDays = buildWeekDayIsos(start, 6)
  const weekSet = new Set(weekDays)
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const orderById = new Map(orders.map((o) => [o.id, o]))

  /** @type {Map<string, ShipmentCalendarEntry>} */
  const byOrder = new Map()

  /** @param {ShipmentRowVM | Order} row @param {string} dateIso @param {number} idx */
  function upsertFromRow(row, dateIso, idx) {
    if (!weekSet.has(dateIso)) return
    const dto = dtoById.get(row.id)
    const order = orderById.get(row.id)
    const openMissing =
      dto?.openMissingItemsCount ??
      ('openMissingItemsCount' in row ? row.openMissingItemsCount : 0) ??
      0
    const notes = row.notes ?? order?.notes
    const amount = row.amount ?? order?.amount ?? 0
    const rem = remainingBalance({
      amount,
      paid: row.paid ?? order?.paid,
      paidAmount: row.paidAmount ?? order?.paidAmount,
    })
    const dueDate = row.dueDate ?? order?.dueDate
    const inTransit = (row.inTransitShipmentCount ?? 0) > 0
    const shipmentStatus = 'shipmentStatus' in row ? row.shipmentStatus : undefined

    const tone = resolveShipmentCalendarTone({
      inTransit,
      hasShipmentIssue: row.hasShipmentIssue,
      installationPending: row.installationPending,
      openMissingCount: openMissing,
      riskSeverity: row.riskSeverity ?? dto?.currentRiskSeverity,
      dueDate,
      todayIso,
      amount,
      paid: row.paid,
      paidAmount: row.paidAmount,
      shipmentStatus,
    })

    let paymentLabel = 'Ödendi'
    if (rem > 0.009) {
      paymentLabel = rem / Math.max(amount, 1) >= 0.45 ? 'Yüksek bakiye' : 'Kısmi ödeme'
    }

    const deliveryType =
      row.status === 'Teslim Edildi'
        ? 'Teslim edildi'
        : row.installationPending
          ? 'Montajlı teslim'
          : 'Sevk ile teslim'

    const entry = /** @type {ShipmentCalendarEntry} */ ({
      id: `${row.id}-${dateIso}`,
      orderId: row.id,
      dateIso,
      timeLabel: defaultTimeLabel(row.id, dateIso, idx),
      customer: row.customer ?? '—',
      region: extractRegion(notes ?? ''),
      deliveryType,
      crew: row.salesPerson?.trim() ? `Ekip: ${row.salesPerson}` : 'Ekip atanacak',
      paymentLabel,
      statusLabel: shipmentQueueCardStatusLabel(shipmentStatus, {
        installationPending: row.installationPending,
        hasShipmentIssue: row.hasShipmentIssue,
      }),
      tone,
      toneLabel: shipmentCalendarToneLabel(tone),
      hasSsh: openMissing > 0,
      sshDetail: openMissing > 0 ? `${openMissing} eksik parça bekleniyor` : null,
      openMissingCount: openMissing,
      terminUrgent: Boolean(dueDate && (isTerminOverdue({ dueDate }, todayIso) || dueDate <= DEMO_TOMORROW)),
      orderNumber: row.orderNumber ?? row.id,
      shipmentId: 'shipmentId' in row && row.shipmentId ? row.shipmentId : undefined,
    })

    byOrder.set(row.id, entry)
  }

  let idx = 0
  for (const row of shipmentRows) {
    const dateIso = row.plannedShipDate ?? row.shipmentDate
    if (!dateIso) continue
    upsertFromRow(row, dateIso, idx++)
  }

  for (const order of orders) {
    if (byOrder.has(order.id)) continue
    const dateIso = order.shipmentDate ?? order.dueDate
    if (!dateIso || !weekSet.has(dateIso)) continue
    if (order.status === 'Teslim Edildi' && !order.shipmentDate) continue
    upsertFromRow(order, dateIso, idx++)
  }

  return [...byOrder.values()].sort((a, b) =>
    `${a.dateIso}${a.timeLabel}`.localeCompare(`${b.dateIso}${b.timeLabel}`),
  )
}

/**
 * @param {ShipmentCalendarEntry[]} entries
 * @param {string} weekStartIso
 * @param {string} todayIso
 */
export function buildCalendarDayColumns(entries, weekStartIso, todayIso) {
  const weekDays = buildWeekDayIsos(weekStartIso, 6)
  /** @type {Record<string, ShipmentCalendarEntry[]>} */
  const byDay = {}
  for (const d of weekDays) {
    byDay[d] = []
  }
  for (const e of entries) {
    if (byDay[e.dateIso]) byDay[e.dateIso].push(e)
  }
  const sorted = sortEntriesInDays(byDay)

  return weekDays.map((iso) => {
    const d = new Date(`${iso}T12:00:00`)
    const dow = d.getDay()
    const weekdayIdx = dow === 0 ? 6 : dow - 1
    return /** @type {CalendarDayColumn} */ ({
      iso,
      weekdayLabel: WEEKDAY_TR[weekdayIdx] ?? '—',
      dayNum: d.getDate(),
      isToday: iso === todayIso,
      entries: sorted[iso] ?? [],
    })
  })
}

/**
 * @param {ShipmentCalendarEntry[]} entries
 * @param {string} todayIso
 */
export function buildCalendarSummaryKpis(entries, todayIso) {
  const tomorrow = DEMO_TOMORROW
  const today = entries.filter((e) => e.dateIso === todayIso)
  const tomorrowEntries = entries.filter((e) => e.dateIso === tomorrow)

  /** @type {CalendarSummaryKpi[]} */
  return [
    {
      id: 'today',
      label: 'Bugünkü sevk',
      value: String(today.length),
      hint: today.length ? 'Planlı yükleme' : 'Boş gün',
      tone: today.length > 4 ? 'warn' : 'ok',
    },
    {
      id: 'tomorrow',
      label: 'Yarınki sevk',
      value: String(tomorrowEntries.length),
      tone: 'neutral',
    },
    {
      id: 'critical',
      label: 'Kritik riskli sevk',
      value: String(entries.filter((e) => e.tone === 'critical').length),
      tone: entries.some((e) => e.tone === 'critical') ? 'critical' : 'ok',
    },
    {
      id: 'ssh',
      label: 'Eksik ürünlü sevk',
      value: String(entries.filter((e) => e.hasSsh).length),
      tone: entries.some((e) => e.hasSsh) ? 'warn' : 'ok',
    },
    {
      id: 'install',
      label: 'Montaj bekleyen',
      value: String(entries.filter((e) => e.statusLabel.toLowerCase().includes('montaj')).length),
      tone: 'neutral',
    },
  ]
}

/**
 * @param {{
 *   entries: ShipmentCalendarEntry[]
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   domainEvents: DomainEventDto[]
 *   todayIso: string
 * }} input
 */
export function buildCalendarTodayTasks({ entries, orders, listItemDtos, domainEvents, todayIso }) {
  const todayEntries = entries.filter((e) => e.dateIso === todayIso)
  const alarms = buildOperationalAlarms(orders, listItemDtos, todayIso)
  /** @type {CalendarTodayTask[]} */
  const tasks = []

  for (const e of todayEntries.filter((x) => x.hasSsh)) {
    tasks.push({
      id: `ssh-${e.orderId}`,
      label: `${e.customer} — eksik ürün kontrolü`,
      critical: true,
    })
  }

  for (const e of todayEntries.filter((x) => x.paymentLabel === 'Yüksek bakiye')) {
    tasks.push({
      id: `pay-${e.orderId}`,
      label: `${e.customer} — tahsilat alınacak`,
      critical: true,
    })
  }

  for (const e of todayEntries.filter((x) => x.statusLabel.toLowerCase().includes('montaj'))) {
    tasks.push({
      id: `install-${e.orderId}`,
      label: `${e.customer} — montaj ekibi atanacak`,
    })
  }

  for (const e of todayEntries.slice(0, 3)) {
    tasks.push({
      id: `confirm-${e.orderId}`,
      label: `${e.customer} — sevk teyidi alınacak`,
    })
  }

  const riskCalls = alarms.filter((a) => a.level === 'critical').slice(0, 2)
  for (const a of riskCalls) {
    tasks.push({
      id: `call-${a.orderId}`,
      label: `${a.customer} — müşteri aranacak`,
      critical: true,
    })
  }

  const recentEvents = domainEvents
    .filter((ev) => ev.occurredAt.slice(0, 10) === todayIso)
    .slice(0, 2)
  for (const ev of recentEvents) {
    if (ev.type === DOMAIN_EVENT_TYPE.PAYMENT_PENDING) {
      tasks.push({ id: `ev-${ev.id}`, label: 'Ödeme hatırlatması gönderilecek' })
    }
  }

  if (tasks.length === 0) {
    tasks.push({ id: 'clear', label: 'Bugün için acil operasyon yok', done: true })
  }

  return tasks.slice(0, 8)
}

/**
 * @param {{
 *   shipmentRows: ShipmentRowVM[]
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   domainEvents: DomainEventDto[]
 *   todayIso: string
 *   weekOffset?: number
 * }} input
 */
export function buildShipmentCalendarViewModel(input) {
  const weekStartIso = addDays(
    mondayOfWeekContaining(input.todayIso),
    (input.weekOffset ?? 0) * 7,
  )
  const entries = buildShipmentCalendarEntries({
    shipmentRows: input.shipmentRows,
    orders: input.orders,
    listItemDtos: input.listItemDtos,
    todayIso: input.todayIso,
    weekStartIso,
  })
  const columns = buildCalendarDayColumns(entries, weekStartIso, input.todayIso)
  const summary = buildCalendarSummaryKpis(entries, input.todayIso)
  const hints = buildSmartCalendarHints(entries, input.todayIso)
  const todayTasks = buildCalendarTodayTasks({
    entries,
    orders: input.orders,
    listItemDtos: input.listItemDtos,
    domainEvents: input.domainEvents,
    todayIso: input.todayIso,
  })
  const regionInsights = buildRegionInsightsForDay(entries, input.todayIso)

  return {
    weekStartIso,
    entries,
    columns,
    summary,
    hints,
    todayTasks,
    regionInsights,
  }
}

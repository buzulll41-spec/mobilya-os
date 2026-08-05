import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { formatShortDate } from '../../utils/dates.js'
import { domainEventTypeLabelTr } from '../timeline/domainEventTypeLabelTr.js'
import { parseCustomerExtraFromNotes } from '../../features/orders/newOrderWizardModel.js'
import { buildGoogleMapsHref } from '../shipment-ops/buildShipmentStopDetailModel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

const NOTES_STORAGE_PREFIX = 'mobilya-os:customer-notes:'

/**
 * @param {string | null | undefined} notes
 */
export function parseContactExtras(notes) {
  if (!notes?.trim()) {
    return { email: null, city: null, district: null, opsNote: '—' }
  }
  const email = notes.match(/E-?posta:\s*([^\n]+)/i)?.[1]?.trim() ?? null
  const city = notes.match(/İl:\s*([^\n,]+)/i)?.[1]?.trim() ?? null
  const district = notes.match(/İlçe:\s*([^\n,]+)/i)?.[1]?.trim() ?? null
  const opsNote =
    notes
      .split('\n')
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !/^Adres:/i.test(l) &&
          !/^E-?posta:/i.test(l) &&
          !/^İl:/i.test(l) &&
          !/^İlçe:/i.test(l) &&
          !/^--- Müşteri ek ---/i.test(l) &&
          !/^--- Müşteri ek son ---/i.test(l) &&
          !/^TC:/i.test(l) &&
          !/^Tel 2:/i.test(l) &&
          !/^Vergi /i.test(l),
      )
      .join('\n')
      .trim() || '—'
  return { email, city, district, opsNote }
}

/**
 * @param {string} customerName
 * @param {string | null | undefined} notes
 */
export function inferCustomerTypeLabel(customerName, notes) {
  const extra = parseCustomerExtraFromNotes(notes)
  if (extra.taxNumber?.trim()) return 'Kurumsal'
  const name = customerName.trim()
  if (/\b(A\.?Ş\.?|LTD|ŞTİ|Şirketi|Mobilya|Sanayi|Ticaret)\b/i.test(name)) return 'Kurumsal'
  return 'Perakende'
}

/**
 * @param {string} customerName
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 */
export function buildCustomerDrawerStats(customerName, orders, dtos) {
  const norm = customerName.trim()
  const customerOrders = orders.filter((o) => o.customer?.trim() === norm)
  const idSet = new Set(customerOrders.map((o) => o.id))
  const customerDtos = dtos.filter((d) => idSet.has(d.id))

  let totalSales = 0
  let totalPaid = 0
  let openBalance = 0

  for (const o of customerOrders) {
    totalSales += o.amount ?? 0
    openBalance += remainingBalance(o)
    totalPaid += o.paid ? (o.amount ?? 0) : (o.paidAmount ?? 0)
  }

  const lastOrderDate = customerOrders
    .map((o) => o.orderDate)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0]

  const totalOrders = customerOrders.length
  const deliveredOrders = customerOrders.filter((o) => o.status === 'Teslim Edildi').length

  return {
    totalOrders,
    activeOrders: customerOrders.filter((o) => o.status !== 'Teslim Edildi').length,
    deliveredOrders,
    pendingShipment: customerDtos.filter(
      (d) => (d.shipmentSummaryOpenCount ?? 0) > 0 || (d.inTransitShipmentCount ?? 0) > 0,
    ).length,
    totalSales,
    totalPaid,
    openBalance,
    avgOrder: totalOrders > 0 ? totalSales / totalOrders : 0,
    lastOrderDate: lastOrderDate ? formatShortDate(lastOrderDate) : '—',
    orderIds: idSet,
    customerOrders,
  }
}

/** @param {string | null | undefined} notes */
function extractAddressFromNotes(notes) {
  const hit = String(notes ?? '').match(/Adres:\s*([^\n]+)/i)?.[1]?.trim() ?? ''
  return hit || null
}

/** @param {string | null | undefined} phone */
function buildTelHref(phone) {
  const raw = String(phone ?? '').trim()
  if (!raw) return null
  return `tel:${raw.replace(/[^\d+]/g, '')}`
}

/** @param {string | null | undefined} phone */
function buildWhatsAppHref(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits.replace(/^0/, '90')}`
}

/** @param {string | null | undefined} dateIso @param {string | null | undefined} todayIso */
function diffDays(dateIso, todayIso) {
  if (!dateIso || !todayIso) return null
  const left = new Date(`${dateIso}T12:00:00`)
  const right = new Date(`${todayIso}T12:00:00`)
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return null
  return Math.round((left.getTime() - right.getTime()) / 86400000)
}

/** @param {string | null | undefined} dateIso @param {string | null | undefined} todayIso */
function formatRelativeDaysLabel(dateIso, todayIso) {
  const diff = diffDays(dateIso, todayIso)
  if (diff == null) return '—'
  if (diff === 0) return 'Bugün'
  if (diff === 1) return 'Yarın'
  if (diff === -1) return 'Dün'
  if (diff > 1) return `${diff} gün içinde`
  return `${Math.abs(diff)} gün önce`
}

/** @param {string} type */
function customerContactKindLabel(type) {
  switch (type) {
    case DOMAIN_EVENT_TYPE.AI_SALES_CALL_LOGGED:
      return 'Arandı'
    case DOMAIN_EVENT_TYPE.PAYMENT_POSTED:
      return 'Tahsilat'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED:
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED:
    case DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED:
    case DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED:
      return 'Teslimat'
    case DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED:
      return 'Belge'
    case DOMAIN_EVENT_TYPE.TASK_CREATED:
    case DOMAIN_EVENT_TYPE.TASK_COMPLETED:
      return 'Not'
    default:
      return 'Hareket'
  }
}

/** @param {string} type */
function customerContactDetailLabel(type) {
  switch (type) {
    case DOMAIN_EVENT_TYPE.AI_SALES_CALL_LOGGED:
      return 'Satış takibi'
    case DOMAIN_EVENT_TYPE.PAYMENT_POSTED:
      return 'Ödeme kaydı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED:
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED:
      return 'Sevk planı'
    case DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED:
      return 'Teslimat tamamlandı'
    case DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED:
      return 'Sözleşme işlendi'
    case DOMAIN_EVENT_TYPE.TASK_CREATED:
      return 'Görev açıldı'
    case DOMAIN_EVENT_TYPE.TASK_COMPLETED:
      return 'Görev kapandı'
    default:
      return domainEventTypeLabelTr(type)
  }
}

/** @param {Set<string>} orderIds @param {DomainEventDto[]} domainEvents */
function buildCustomerContactHistory(orderIds, domainEvents) {
  return domainEvents
    .filter((e) => orderIds.has(e.aggregateId))
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      kind: customerContactKindLabel(event.type),
      detail: customerContactDetailLabel(event.type),
      dateLabel: formatShortDate(event.occurredAt.slice(0, 10)),
      at: event.occurredAt,
    }))
}

/** @param {Set<string>} orderIds @param {DomainEventDto[]} domainEvents @param {string | null | undefined} todayIso */
function findLastCustomerTouch(orderIds, domainEvents, todayIso) {
  const preferred = [
    DOMAIN_EVENT_TYPE.AI_SALES_CALL_LOGGED,
    DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
    DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED,
    DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED,
    DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED,
    DOMAIN_EVENT_TYPE.ORDER_PLACED,
    DOMAIN_EVENT_TYPE.TASK_CREATED,
    DOMAIN_EVENT_TYPE.TASK_COMPLETED,
  ]

  const events = domainEvents
    .filter((e) => orderIds.has(e.aggregateId))
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
  const preferredHit = preferred.map((type) => events.find((event) => event.type === type)).find(Boolean)
  const hit = preferredHit ?? events[0] ?? null
  if (!hit) return { label: '—', detail: 'Kayıt yok', at: null }
  return {
    label: customerContactKindLabel(hit.type),
    detail: `${customerContactDetailLabel(hit.type)} · ${formatRelativeDaysLabel(hit.occurredAt.slice(0, 10), todayIso)}`,
    at: hit.occurredAt,
  }
}

/** @param {Order[]} customerOrders @param {SalesOrderListItemDto[]} dtos @param {string | null | undefined} todayIso */
function buildActiveOrderCards(customerOrders, dtos, todayIso) {
  const dtoById = new Map(dtos.map((dto) => [dto.id, dto]))
  return [...customerOrders]
    .filter((order) => order.status !== 'Teslim Edildi' && order.status !== 'İptal')
    .sort((a, b) => String(b.orderDate ?? '').localeCompare(String(a.orderDate ?? '')))
    .slice(0, 3)
    .map((order) => {
      const dto = dtoById.get(order.id)
      const dueDiff = diffDays(order.dueDate ?? order.shipmentDate ?? null, todayIso)
      const remaining = remainingBalance(order)
      return {
        id: order.id,
        orderNo: order.orderNumber ?? order.id,
        status: order.status,
        totalLabel: formatTry(order.amount ?? 0),
        deliveryDateLabel: order.dueDate
          ? formatShortDate(order.dueDate)
          : order.shipmentDate
            ? formatShortDate(order.shipmentDate)
            : 'Plan yok',
        deliveryRelativeLabel: formatRelativeDaysLabel(order.dueDate ?? order.shipmentDate ?? null, todayIso),
        remainingLabel: formatTry(remaining),
        tone:
          dto?.hasOverdueBalance || (dueDiff != null && dueDiff < 0)
            ? 'warning'
            : order.status === 'Üretimde'
              ? 'neutral'
              : 'success',
        overdue: dueDiff != null && dueDiff < 0,
      }
    })
}

/** @param {Order[]} customerOrders @param {string | null | undefined} todayIso */
function buildFinanceSnapshot(customerOrders, todayIso) {
  let totalDebt = 0
  let collected = 0
  let overdue = 0
  let overdueOrders = 0

  for (const order of customerOrders) {
    const remaining = remainingBalance(order)
    totalDebt += remaining
    collected += Math.max((order.amount ?? 0) - remaining, 0)
    const dueDiff = diffDays(order.dueDate ?? order.shipmentDate ?? null, todayIso)
    if (remaining > 0.009 && dueDiff != null && dueDiff < 0) {
      overdue += remaining
      overdueOrders += 1
    }
  }

  return {
    totalDebt,
    collected,
    remaining: totalDebt,
    overdue,
    overdueOrders,
    tone: overdue > 0 ? 'critical' : totalDebt > 0 ? 'warning' : 'success',
  }
}

/** @param {Order[]} customerOrders @param {string | null | undefined} todayIso */
function buildAddressCards(customerOrders, todayIso) {
  const seen = new Set()
  return customerOrders
    .map((order) => ({
      id: order.id,
      address: extractAddressFromNotes(order.notes),
      orderNumber: order.orderNumber ?? order.id,
      dueLabel: formatRelativeDaysLabel(order.dueDate ?? order.shipmentDate ?? null, todayIso),
    }))
    .filter((item) => item.address)
    .filter((item) => {
      if (seen.has(item.address)) return false
      seen.add(item.address)
      return true
    })
    .slice(0, 3)
    .map((item) => ({
      ...item,
      mapsHref: buildGoogleMapsHref(item.address),
    }))
}

/** @param {Order} primaryOrder @param {Order[]} customerOrders */
function buildDocumentCards(primaryOrder, customerOrders) {
  const identity = parseCustomerExtraFromNotes(primaryOrder.notes)
  return [
    {
      id: 'contract',
      label: 'Sözleşme',
      detail: primaryOrder.orderNumber ? `Sipariş #${primaryOrder.orderNumber}` : 'Sipariş kaydı',
      tone: 'neutral',
    },
    {
      id: 'identity',
      label: 'Kimlik',
      detail: identity.nationalId?.trim()
        ? 'Kimlik bilgisi mevcut'
        : identity.taxNumber?.trim()
          ? 'Vergi bilgisi mevcut'
          : 'Eksik',
      tone: 'warning',
    },
    {
      id: 'measurements',
      label: 'Ölçüler',
      detail: customerOrders.length > 1 ? `${customerOrders.length} kayıt` : 'Sipariş notu',
      tone: 'success',
    },
    {
      id: 'photos',
      label: 'Fotoğraflar',
      detail: primaryOrder.product ?? 'Saha kanıtı',
      tone: 'neutral',
    },
  ]
}

/** @param {{ customerName: string, orders: Order[], dtos: SalesOrderListItemDto[], domainEvents: DomainEventDto[], todayIso: string }} input */
export function buildCustomerCommandCenterModel(input) {
  const { customerName, orders, dtos, domainEvents, todayIso } = input
  const stats = buildCustomerDrawerStats(customerName, orders, dtos)
  const primaryOrder = stats.customerOrders[0] ?? /** @type {Order} */ ({ orderNumber: '', product: '', notes: '' })
  const identityExtra = parseCustomerExtraFromNotes(primaryOrder.notes)
  const contactPhone = primaryOrder.phone?.trim() || primaryOrder.phone2?.trim() || null
  const telHref = buildTelHref(contactPhone)
  const whatsappHref = buildWhatsAppHref(contactPhone)
  const customerType = inferCustomerTypeLabel(customerName, primaryOrder.notes ?? '')
  const lastContact = findLastCustomerTouch(stats.orderIds, domainEvents, todayIso)
  const activeOrders = buildActiveOrderCards(stats.customerOrders, dtos, todayIso)
  const finance = buildFinanceSnapshot(stats.customerOrders, todayIso)
  const history = buildCustomerContactHistory(stats.orderIds, domainEvents)
  const addresses = buildAddressCards(stats.customerOrders, todayIso)
  const documents = buildDocumentCards(primaryOrder, stats.customerOrders)

  const dueSoon = activeOrders.find((order) => order.overdue || order.deliveryRelativeLabel === 'Yarın')
  const lastContactDays = lastContact.at ? Math.abs(diffDays(todayIso, lastContact.at.slice(0, 10)) ?? 0) : null

  let aiSignal = {
    label: 'Bugün yapılacak net iş yok.',
    detail: 'Müşteri akışı sakin. Son hareketleri ve notları takip et.',
    action: 'Not',
    target: 'cust-sec-notes',
    tone: 'neutral',
  }

  if (finance.overdue > 0.009) {
    aiSignal = {
      label: 'Ödemesi gecikti.',
      detail: `${finance.overdueOrders} vadesi geçmiş siparişte ${formatTry(finance.overdue)} açık bakiye var.`,
      action: 'Tahsilat Al',
      target: 'cust-sec-finance',
      tone: 'warning',
    }
  } else if (dueSoon) {
    aiSignal = {
      label: 'Müşterinin teslimatı yarın.',
      detail: `${dueSoon.orderNo} için ${dueSoon.deliveryDateLabel} planlı teslimat görünüyor.`,
      action: 'Teslimatı Kontrol Et',
      target: 'cust-sec-active-orders',
      tone: 'primary',
    }
  } else if (lastContactDays != null && lastContactDays >= 18) {
    aiSignal = {
      label: `Bu müşteri ${lastContactDays} gündür aranmadı.`,
      detail: 'Satış takibi için bugün bir arama bırakın.',
      action: 'Ara',
      href: telHref ?? undefined,
      tone: 'critical',
    }
  } else if (activeOrders.length > 0) {
    aiSignal = {
      label: 'Aktif siparişler yönetimde.',
      detail: `${activeOrders.length} açık sipariş bu müşteri için takipte.`,
      action: 'Siparişleri Aç',
      target: 'cust-sec-active-orders',
      tone: 'primary',
    }
  }

  return {
    stats,
    customerType,
    identityExtra,
    contactPhone,
    telHref,
    whatsappHref,
    lastContact,
    activeOrders,
    finance,
    history,
    addresses,
    documents,
    aiSignal,
    riskLabel: finance.overdue > 0.009 ? 'Yüksek' : stats.openBalance > 0.009 ? 'Orta' : 'Sakin',
  }
}

/** @param {string} type */
function timelineLabelForEventType(type) {
  switch (type) {
    case DOMAIN_EVENT_TYPE.ORDER_PLACED:
    case 'order.placed':
      return 'Sipariş oluşturuldu'
    case DOMAIN_EVENT_TYPE.PAYMENT_POSTED:
      return 'Ödeme alındı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED:
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED:
    case 'shipment.plan.created':
      return 'Sevk planlandı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED:
    case DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED:
      return 'Teslim edildi'
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED:
      return 'SSH açıldı'
    default:
      return domainEventTypeLabelTr(type)
  }
}

/**
 * @param {Set<string>} orderIds
 * @param {DomainEventDto[]} domainEvents
 * @param {Order[]} customerOrders
 */
export function buildCustomerDrawerTimeline(orderIds, domainEvents, customerOrders) {
  const events = domainEvents
    .filter((e) => orderIds.has(e.aggregateId))
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))

  /** @type {{ id: string, label: string, at: string, dateLabel: string }[]} */
  const items = events.slice(0, 12).map((e) => ({
    id: e.id,
    label: timelineLabelForEventType(e.type),
    at: e.occurredAt,
    dateLabel: formatShortDate(e.occurredAt.slice(0, 10)),
  }))

  if (items.length === 0 && customerOrders.length > 0) {
    const latest = [...customerOrders].sort((a, b) =>
      String(b.orderDate ?? '').localeCompare(String(a.orderDate ?? '')),
    )[0]
    if (latest?.orderDate) {
      items.push({
        id: `placed-${latest.id}`,
        label: 'Sipariş oluşturuldu',
        at: `${latest.orderDate}T10:00:00.000Z`,
        dateLabel: formatShortDate(latest.orderDate),
      })
    }
  }

  return items
}

/**
 * @param {Set<string>} orderIds
 * @param {DomainEventDto[]} domainEvents
 */
export function findLastPaymentLabel(orderIds, domainEvents) {
  const hit = domainEvents
    .filter(
      (e) => orderIds.has(e.aggregateId) && e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
    )
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))[0]
  return hit ? formatShortDate(hit.occurredAt.slice(0, 10)) : '—'
}

/**
 * @param {string} customerName
 */
export function loadCustomerDrawerNotes(customerName) {
  try {
    const raw = localStorage.getItem(`${NOTES_STORAGE_PREFIX}${customerName.trim()}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : []
  } catch {
    return []
  }
}

/**
 * @param {string} customerName
 * @param {string[]} notes
 */
export function saveCustomerDrawerNotes(customerName, notes) {
  try {
    localStorage.setItem(`${NOTES_STORAGE_PREFIX}${customerName.trim()}`, JSON.stringify(notes))
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {number} value
 */
export function formatAvgOrder(value) {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return formatTry(value)
}

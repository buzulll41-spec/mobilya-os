import { DEMO_TODAY } from '../../data/constants.js'
import { buildStoreOperationChecklist } from '../operations/buildStoreOperationChecklist.js'
import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { formatShortDate } from '../../utils/dates.js'
import { isTerminOverdue } from '../../utils/orderFinance.js'
import { paymentStatusLabelTr } from './orderOperationPanelModel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../risk/riskDrawerUi.js').RiskDrawerModel} RiskDrawerModel */

/**
 * @typedef {'done' | 'current' | 'pending' | 'warning'} FlowVisualState
 * @typedef {{
 *   id: string
 *   label: string
 *   state: FlowVisualState
 *   detail?: string
 *   timestamp?: string
 * }} LifecycleFlowStep
 *
 * @typedef {'wait' | 'ready' | 'done' | 'critical'} CommandKpiBadgeTone
 * @typedef {{
 *   id: string
 *   icon: string
 *   label: string
 *   value: string
 *   sub?: string
 *   tone: 'default' | 'money' | 'date' | 'ops' | 'risk' | 'warn'
 *   emphasis?: boolean
 *   showAsBadge?: boolean
 *   badgeTone?: CommandKpiBadgeTone
 * }} CommandKpiCard
 *
 * @typedef {{
 *   title: string
 *   description: string
 *   suggestion?: string
 *   ctaLabel: string
 *   tone: 'primary' | 'warning' | 'critical'
 *   action: 'payment' | 'shipment' | 'status' | 'call' | 'tab' | 'ssh'
 *   tabTarget?: string
 * }} NextActionModel
 *
 * @typedef {{
 *   id: string
 *   label: string
 *   done: boolean
 *   critical: boolean
 * }} ChecklistItem
 */

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {number} remaining
 * @param {string} todayIso
 * @returns {CommandKpiCard[]}
 */
export function buildCommandKpis(order, dto, remaining, todayIso) {
  const overdue = isTerminOverdue(order, todayIso)
  const payLabel = paymentStatusLabelTr(order, remaining)
  const severity = dto?.currentRiskSeverity ?? RISK_SEVERITY.NONE
  const riskLabel =
    severity === RISK_SEVERITY.CRITICAL
      ? 'Kritik'
      : severity === RISK_SEVERITY.HIGH
        ? 'Yüksek'
        : severity === RISK_SEVERITY.MEDIUM
          ? 'Orta'
          : severity === RISK_SEVERITY.LOW
            ? 'Düşük'
            : 'Sakin'

  const opsLabel = operationalStatusLabel(order, dto)

  return [
    {
      id: 'due',
      icon: '📅',
      label: 'Teslimat',
      value: order.dueDate ? formatShortDate(order.dueDate) : 'Plan yok',
      sub: overdue ? 'Termin geçti' : order.dueDate ? 'Hedef tarih' : undefined,
      tone: overdue ? 'warn' : 'date',
      emphasis: overdue,
    },
    {
      id: 'balance',
      icon: '💰',
      label: 'Kalan bakiye',
      value: formatTry(remaining),
      sub: payLabel,
      tone: 'money',
      emphasis: remaining > 50_000,
    },
    {
      id: 'ops',
      icon: '🚚',
      label: 'Operasyon',
      value: opsLabel,
      sub: order.status,
      tone: 'ops',
    },
    {
      id: 'risk',
      icon: '⚠️',
      label: 'Risk',
      value: riskLabel,
      sub: dto?.hasShipmentIssue ? 'Sevk sorunu' : undefined,
      tone: severity === RISK_SEVERITY.CRITICAL || severity === RISK_SEVERITY.HIGH ? 'risk' : 'default',
      emphasis: severity === RISK_SEVERITY.CRITICAL || severity === RISK_SEVERITY.HIGH,
    },
  ]
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function buildOperationalPhaseLabel(order, dto) {
  if (dto?.hasShipmentIssue) return 'Sevk / montaj sorunu'
  if (dto?.installationPending) return 'Montaj bekliyor'
  if ((dto?.inTransitShipmentCount ?? 0) > 0) return 'Sevk yolda'
  if ((dto?.shipmentSummaryOpenCount ?? 0) > 0) return 'Sevk planlandı'
  if (order.status === 'Teslim Edildi') return 'Tamamlandı'
  if (order.status === 'Hazır') return 'Sevke hazır'
  if (order.status === 'Üretimde') return 'Üretimde'
  if (order.status === 'Eksik Var') return 'Eksik parça takibi'
  return 'Operasyon bekliyor'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
function operationalStatusLabel(order, dto) {
  return buildOperationalPhaseLabel(order, dto)
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {number} remaining
 * @param {RiskDrawerModel} riskModel
 */
export function buildNextAction(order, dto, remaining, riskModel) {
  const openMissing = (dto?.openMissingItemsCount ?? 0) > 0

  if (openMissing) {
    return {
      title: 'Eksik parçaları kontrol et',
      description: `${dto?.openMissingItemsCount ?? 1} açık SSH kaydı — sevk planından önce parça takibini kapatın.`,
      suggestion: 'Sevk öncesi açık SSH kayıtlarını kapatın.',
      ctaLabel: 'SSH takibini aç',
      tone: 'critical',
      action: 'tab',
      tabTarget: 'ssh',
    }
  }

  if (dto?.hasShipmentIssue) {
    return {
      title: 'Sevk / montaj sorunu',
      description: 'Operasyon ekibi müdahale etmeli. Detayları sevk ekranından yönetin.',
      suggestion: 'Sevk ekranından sorunu netleştirip müdahale planlayın.',
      ctaLabel: 'Sevk operasyonunu aç',
      tone: 'critical',
      action: 'shipment',
    }
  }

  if (remaining > 0 && remaining / Math.max(order.amount, 1) > 0.4) {
    return {
      title: 'Tahsilat tamamlanmalı',
      description: 'Müşteri ile ödeme planını netleştirin.',
      suggestion: 'Müşteri ile ödeme planını netleştir.',
      ctaLabel: 'Ödeme kaydet',
      tone: 'warning',
      action: 'payment',
      tabTarget: 'payments',
    }
  }

  if (dto?.installationPending) {
    return {
      title: 'Montaj planlanacak',
      description: 'Teslim sonrası montaj ekibi ve randevu atanmalı.',
      suggestion: 'Montaj ekibi ve randevu atamasını tamamlayın.',
      ctaLabel: 'Montaj operasyonu',
      tone: 'primary',
      action: 'shipment',
    }
  }

  if (
    (dto?.shipmentSummaryOpenCount ?? 0) === 0 &&
    (dto?.inTransitShipmentCount ?? 0) === 0 &&
    order.status !== 'Teslim Edildi' &&
    !order.shipmentDate
  ) {
    return {
      title: 'Sevk planı yapılacak',
      description: 'Termin yaklaşıyor — yükleme ve ekip planı oluşturun.',
      suggestion: 'Yükleme ve ekip planını oluşturun.',
      ctaLabel: 'Sevk planla',
      tone: 'primary',
      action: 'shipment',
    }
  }

  if (order.status === 'Bekleniyor' || order.status === 'Geldi') {
    return {
      title: 'Üretime gönder',
      description: 'Sipariş üretim hattına aktarılmayı bekliyor.',
      suggestion: 'Siparişi üretim hattına aktarın.',
      ctaLabel: 'Durumu güncelle',
      tone: 'primary',
      action: 'status',
    }
  }

  if (order.status === 'Üretimde') {
    return {
      title: 'Üretim takibi',
      description: 'Fabrika çıkışı ve kumaş onayı kontrol edilmeli.',
      suggestion: 'Fabrika çıkışı ve kumaş onayını kontrol edin.',
      ctaLabel: 'Operasyon geçmişi',
      tone: 'primary',
      action: 'tab',
      tabTarget: 'history',
    }
  }

  if (riskModel.elevated) {
    return {
      title: 'Müşteri aranmalı',
      description: riskModel.summary ?? 'Risk sinyali — müşteri ile iletişim kurun.',
      suggestion: riskModel.summary ?? 'Müşteri ile iletişim kurun.',
      ctaLabel: 'Not ekle',
      tone: 'warning',
      action: 'tab',
      tabTarget: 'notes',
    }
  }

  return {
    title: 'Sipariş akışı normal',
    description: 'Acil operasyon adımı görünmüyor. İlerlemeyi zaman çizelgesinden izleyin.',
    suggestion: 'İlerlemeyi zaman çizelgesinden izleyin.',
    ctaLabel: 'Sevk / montaj',
    tone: 'primary',
    action: 'shipment',
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {number} remaining
 * @param {RiskDrawerModel} riskModel
 * @param {{ title: string }[]} orderTasks
 * @param {import('../contracts/v1/domainEvent.js').DomainEventDto[]} [domainEvents]
 * @returns {ChecklistItem[]}
 */
export function buildTodayChecklist(order, dto, remaining, riskModel, orderTasks, domainEvents) {
  const storeItems = buildStoreOperationChecklist(order, dto, domainEvents)
  /** @type {ChecklistItem[]} */
  const items = storeItems.map((s) => ({
    id: s.id,
    label: s.label,
    done: s.done,
    critical: s.critical,
  }))

  if ((dto?.openMissingItemsCount ?? 0) > 0) {
    items.push({
      id: 'missing',
      label: 'SSH eksik parça takibi',
      done: false,
      critical: true,
    })
  }

  if (riskModel.elevated) {
    items.push({
      id: 'call',
      label: 'Müşteri aranacak',
      done: false,
      critical: riskModel.severity === RISK_SEVERITY.CRITICAL,
    })
  }

  for (const t of orderTasks.slice(0, 2)) {
    if (items.some((i) => i.label === t.title)) continue
    items.push({
      id: `task-${t.id}`,
      label: t.title,
      done: false,
      critical: t.severity === 'critical',
    })
  }

  if (items.length === 0) {
    items.push({
      id: 'clear',
      label: 'Bugün için acil iş yok',
      done: true,
      critical: false,
    })
  }

  return items.slice(0, 6)
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} [notes]
 */
export function buildOrderRichSummary(order, dto, notes) {
  const product = order.product ?? ''
  const noteText = notes ?? ''

  const fabric = extractNoteField(noteText, /kumaş|fabric/i) ?? inferFabric(product)
  const color = extractNoteField(noteText, /renk|antrasit|bej|gri/i) ?? '—'
  const teamType = inferTeamType(product)
  const qty =
    dto?.qtyOrderedTotal != null
      ? `${dto.qtyOrderedTotal} adet`
      : dto?.remainingQty != null
        ? `Kalan ${dto.remainingQty}`
        : '—'
  const region = extractAddressRegion(noteText) ?? '—'
  const segment = order.amount >= 150_000 ? 'VIP' : order.amount >= 60_000 ? 'Kurumsal' : 'Standart'
  const deliveryType =
    order.status === 'Teslim Edildi'
      ? 'Teslim edildi'
      : order.shipmentDate
        ? 'Sevk ile teslim'
        : 'Mağaza / randevu'

  return [
    { label: 'Ürün', value: product || '—' },
    { label: 'Kumaş', value: fabric },
    { label: 'Renk', value: color },
    { label: 'Takım tipi', value: teamType },
    { label: 'Adet / miktar', value: qty },
    { label: 'Teslim bölgesi', value: region },
    { label: 'Satış danışmanı', value: order.salesPerson?.trim() || '—' },
    { label: 'Müşteri segmenti', value: segment },
    { label: 'Teslim tipi', value: deliveryType },
  ]
}

/**
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {Order} order
 * @param {number} remaining
 */
export function buildLifecycleFlowSteps(dto, order, remaining) {
  const paid =
    Boolean(order.paid) ||
    remaining <= 0.009 ||
    (order.paidAmount ?? 0) > 0.009
  const productionSent = ['Üretimde', 'Hazır', 'Teslim Edildi', 'Eksik Var'].includes(order.status)
  const openMissing = (dto?.openMissingItemsCount ?? 0) > 0
  const sshClear = !openMissing
  const readyForShip = productionSent && sshClear
  const shipPlanned =
    (dto?.shipmentSummaryOpenCount ?? 0) > 0 ||
    Boolean(order.shipmentDate) ||
    (dto?.inTransitShipmentCount ?? 0) > 0
  const installPending = Boolean(dto?.installationPending)
  const installDone = order.status === 'Teslim Edildi' && !installPending

  /** @param {boolean} done @param {boolean} active */
  const st = (done, active) => {
    if (active) return /** @type {const} */ ('current')
    if (done) return /** @type {const} */ ('done')
    return /** @type {const} */ ('pending')
  }

  return /** @type {LifecycleFlowStep[]} */ ([
    {
      id: 'created',
      label: 'Sipariş oluşturuldu',
      state: 'done',
      detail: 'Kayıt açıldı',
      timestamp: order.orderDate ? formatShortDate(order.orderDate) : undefined,
    },
    {
      id: 'deposit',
      label: paid ? 'Kapora alındı' : 'Kapora bekleniyor',
      state: st(paid, !paid),
      detail: paid ? formatTry(order.paidAmount ?? order.amount) : `Kalan ${formatTry(remaining)}`,
      timestamp: paid ? 'Tahsilat kaydı' : undefined,
    },
    {
      id: 'production',
      label: productionSent ? 'Üretime gönderildi' : 'Üretime gönderilecek',
      state: st(productionSent, paid && !productionSent),
      detail: order.status === 'Üretimde' ? 'Fabrika hattında' : undefined,
    },
    {
      id: 'ssh',
      label: openMissing ? 'SSH / eksik parça takibi' : 'Eksik parça yok',
      state: openMissing ? 'warning' : st(sshClear, productionSent && openMissing),
      detail: openMissing
        ? `${dto?.openMissingItemsCount ?? 1} kayıt açık`
        : 'Sevk öncesi kontrol tamam',
    },
    {
      id: 'ready',
      label: readyForShip ? 'Sevke hazır' : 'Sevke hazır olacak',
      state: st(readyForShip && (shipPlanned || order.status === 'Teslim Edildi'), productionSent && !readyForShip),
      detail: openMissing ? 'Önce SSH kapatılmalı' : undefined,
    },
    {
      id: 'shipment',
      label: shipPlanned ? 'Sevk planlanıyor' : 'Sevk planı bekleniyor',
      state: st(shipPlanned && order.status === 'Teslim Edildi', readyForShip && !shipPlanned),
      detail: order.shipmentDate ? formatShortDate(order.shipmentDate) : dto?.plannedShipmentDate ? formatShortDate(dto.plannedShipmentDate) : undefined,
      timestamp: order.shipmentDate ?? dto?.plannedShipmentDate ?? undefined,
    },
    {
      id: 'install',
      label: installDone ? 'Montaj tamamlandı' : 'Montaj bekleniyor',
      state: st(installDone, installPending),
      detail: installPending ? 'Ekip atanacak' : undefined,
    },
  ])
}

/** @param {string} text @param {RegExp} pattern */
function extractNoteField(text, pattern) {
  if (!text.trim()) return null
  const line = text.split('\n').find((l) => pattern.test(l))
  if (!line) return null
  const cleaned = line.replace(/^[^:]*:\s*/, '').trim()
  return cleaned || line.trim()
}

/** @param {string} product */
function inferFabric(product) {
  const p = product.toLowerCase()
  if (/kumaş|döşeme|koltuk/.test(p)) return 'Döşemeli kumaş'
  if (/lake|baza/.test(p)) return 'Tekstil'
  if (/mermer|cam/.test(p)) return '—'
  return 'Standart'
}

/** @param {string} product */
function inferTeamType(product) {
  const p = product.toLowerCase()
  if (/köşe|koltuk/.test(p)) return 'Oturma grubu'
  if (/yatak|baza/.test(p)) return 'Yatak odası'
  if (/gardrop|dolap/.test(p)) return 'Gardırop'
  if (/masa|sandalye/.test(p)) return 'Yemek odası'
  return 'Mobilya takımı'
}

/** @param {string} notes */
function extractAddressRegion(notes) {
  if (!notes) return null
  const m = notes.match(/Adres:\s*([^,\n]+)/i)
  if (m) return m[1].trim()
  if (notes.includes('İzmir')) return 'İzmir'
  if (notes.includes('İstanbul')) return 'İstanbul'
  return null
}

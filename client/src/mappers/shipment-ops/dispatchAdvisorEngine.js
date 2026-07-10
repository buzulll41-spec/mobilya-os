import { addDays } from '../../data/constants.js'
import { formatTry } from '../../data/index.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'
import { formatRegionDisplayLabel } from './shipmentRegionNormalize.js'
import {
  daysBetweenIso,
  estimateRegionalSavings,
  groupShipmentOpportunities,
  toOpportunityCandidate,
} from './shipmentOpportunityEngine.js'
import { detectPlanConflicts } from './shipmentPlanConflict.js'
import {
  buildAutoGroupPlans,
  computeVehicleOccupancyPercent,
  pickLeastLoadedVehicle,
} from './shipmentVehiclePlanModel.js'
import { LOW_OCCUPANCY_THRESHOLD, TRIP_SAVINGS_TRY } from './shipmentPlanConstants.js'

/** @typedef {import('./shipmentOpportunityEngine.js').ShipmentOpportunityGroup} ShipmentOpportunityGroup */
/** @typedef {import('./shipmentOpportunityEngine.js').ShipmentOpportunityCandidate} ShipmentOpportunityCandidate */
/** @typedef {import('./shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('./shipmentVehiclePlanModel.js').VehiclePlanColumn} VehiclePlanColumn */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {'savings' | 'wait' | 'risk' | 'occupancy'} DispatchAdviceKind
 * @typedef {'green' | 'yellow' | 'red'} DispatchAdviceTone
 */

/**
 * @typedef {Object} DispatchAdviceItem
 * @property {string} id
 * @property {DispatchAdviceKind} kind
 * @property {DispatchAdviceTone} tone
 * @property {string} title
 * @property {string[]} lines
 * @property {string} [recommendation]
 * @property {string} [orderId]
 * @property {string} [riskType]
 * @property {ShipmentOpportunityGroup} [group]
 * @property {boolean} [canAutoPlan]
 */

/**
 * @typedef {Object} OperationHealthScore
 * @property {number} score
 * @property {string} label
 * @property {string[]} penalties
 * @property {string[]} bonuses
 */

/**
 * @typedef {Object} DispatchAdvisorView
 * @property {DispatchAdviceItem[]} savings
 * @property {DispatchAdviceItem[]} wait
 * @property {DispatchAdviceItem[]} risks
 * @property {OperationHealthScore} health
 * @property {string[]} affectedOrderIds
 */

const DEFAULT_CREW = { crew1: 'Muhammet', crew2: 'Cihan' }

/**
 * @param {ShipmentOpportunityGroup} group
 * @param {string} selectedDate
 * @param {ShipmentPlan[]} allPlans
 */
export function suggestGroupAssignment(group, selectedDate, allPlans) {
  const autoPlans = buildAutoGroupPlans(group, selectedDate, allPlans)
  const first = autoPlans[0]
  return {
    vehicle: first?.vehicle ?? pickLeastLoadedVehicle(allPlans, selectedDate),
    crew1: first?.crew1 ?? DEFAULT_CREW.crew1,
    crew2: first?.crew2 ?? DEFAULT_CREW.crew2,
    crewLabel: `${first?.crew1 ?? DEFAULT_CREW.crew1} + ${first?.crew2 ?? DEFAULT_CREW.crew2}`,
    plans: autoPlans,
  }
}

/**
 * @param {ShipmentOpportunityGroup[]} opportunities
 * @param {string} selectedDate
 * @param {ShipmentPlan[]} allPlans
 * @returns {DispatchAdviceItem[]}
 */
export function buildSavingsAdvice(opportunities, selectedDate, allPlans) {
  return opportunities.slice(0, 5).map((group) => {
    const assignment = suggestGroupAssignment(group, selectedDate, allPlans)
    const readyCount = group.orders.filter((o) => o.status === 'Hazır').length

    return {
      id: `savings-${group.id}`,
      kind: 'savings',
      tone: 'green',
      title: formatRegionDisplayLabel(group.region).toUpperCase(),
      lines: [
        `${readyCount || group.orderCount} sipariş hazır`,
        `Tahmini tasarruf: ${formatTry(group.estimatedSavings)}`,
        `Önerilen araç: ${assignment.vehicle}`,
        `Önerilen ekip: ${assignment.crewLabel}`,
      ],
      recommendation: `${group.orderCount} sevki birleştirerek maliyet düşürülebilir.`,
      group,
      canAutoPlan: true,
    }
  })
}

/**
 * @param {Iterable<ShipmentRowVM>} rows
 * @param {string} selectedDate
 * @param {Map<string, ShipmentPlan>} plansByOrderId
 */
function collectCandidatesForExactDate(rows, exactDate, plansByOrderId) {
  /** @type {ShipmentOpportunityCandidate[]} */
  const out = []
  for (const row of rows) {
    const plan = plansByOrderId.get(row.id)
    const shipDate =
      plan?.plannedDate ||
      row.plannedShipDate ||
      row.shipmentDate ||
      row.dueDate ||
      null
    if (shipDate !== exactDate) continue
    const c = toOpportunityCandidate(row, exactDate, plan)
    if (c) out.push(c)
  }
  return out
}

/**
 * @param {Iterable<ShipmentRowVM>} rows
 * @param {string} selectedDate
 * @param {Map<string, ShipmentPlan>} plansByOrderId
 * @returns {DispatchAdviceItem[]}
 */
export function buildWaitAdvice(rows, selectedDate, plansByOrderId) {
  const tomorrow = addDays(selectedDate, 1)
  const todayCandidates = collectCandidatesForExactDate(rows, selectedDate, plansByOrderId)
  const tomorrowCandidates = collectCandidatesForExactDate(rows, tomorrow, plansByOrderId)

  /** @type {Map<string, ShipmentOpportunityCandidate[]>} */
  const todayByRegion = new Map()
  /** @type {Map<string, ShipmentOpportunityCandidate[]>} */
  const tomorrowByRegion = new Map()

  for (const c of todayCandidates) {
    if (!c.shippable) continue
    const list = todayByRegion.get(c.region) ?? []
    list.push(c)
    todayByRegion.set(c.region, list)
  }
  for (const c of tomorrowCandidates) {
    if (!c.shippable) continue
    const list = tomorrowByRegion.get(c.region) ?? []
    list.push(c)
    tomorrowByRegion.set(c.region, list)
  }

  /** @type {DispatchAdviceItem[]} */
  const advice = []

  for (const [region, todayOrders] of todayByRegion.entries()) {
    if (todayOrders.length !== 1) continue
    const tomorrowOrders = tomorrowByRegion.get(region) ?? []
    if (tomorrowOrders.length < 2) continue

    const totalIfWait = 1 + tomorrowOrders.length
    const savingsIfWait = estimateRegionalSavings(totalIfWait)
    if (savingsIfWait <= TRIP_SAVINGS_TRY) continue

    advice.push({
      id: `wait-${region}-${selectedDate}`,
      kind: 'wait',
      tone: 'yellow',
      title: formatRegionDisplayLabel(region).toUpperCase(),
      lines: [
        `Bugün: 1 sipariş`,
        `Yarın: ${tomorrowOrders.length} sipariş daha`,
        `24 saat beklersen toplam: ${totalIfWait} sipariş`,
        `Tahmini tasarruf: ${formatTry(savingsIfWait)}`,
      ],
      recommendation: 'Tek araç çıkarmak yerine yarın birleşik sevk daha avantajlı.',
      orderId: todayOrders[0].orderId,
    })
  }

  return advice.sort((a, b) => b.lines.length - a.lines.length)
}

/**
 * @param {ShipmentRowVM} row
 * @param {string} todayIso
 */
function isShipmentDateOverdue(row, todayIso) {
  if (row.status === 'Teslim Edildi') return false
  const shipDate = row.plannedShipDate ?? row.shipmentDate ?? row.dueDate
  if (!shipDate) return false
  return shipDate < todayIso
}

/**
 * @param {ShipmentRowVM} row
 */
function hasHighRemainingPayment(row) {
  const total = row.amount ?? 0
  if (total <= 0) return false
  return remainingBalance(row) / total >= 0.45
}

/**
 * @param {Iterable<ShipmentRowVM>} rows
 * @param {ShipmentPlan[]} allPlans
 * @param {string} selectedDate
 * @param {string} todayIso
 * @returns {DispatchAdviceItem[]}
 */
export function buildRiskAdvice(rows, allPlans, selectedDate, todayIso) {
  /** @type {DispatchAdviceItem[]} */
  const risks = []
  const plansForDate = allPlans.filter((p) => p.plannedDate === selectedDate)

  for (const row of rows) {
    if (row.status === 'Teslim Edildi') continue
    const customer = row.customer ?? '—'
    const orderId = row.id

    if (isTerminOverdue(row, todayIso)) {
      const days = row.dueDate ? daysBetweenIso(row.dueDate, todayIso) : 0
      risks.push({
        id: `risk-${orderId}-termin`,
        kind: 'risk',
        tone: 'red',
        title: customer.toUpperCase(),
        lines: ['Termin geçti', days > 0 ? `${days} gün gecikmiş` : 'Gecikme var'],
        recommendation: 'Termin revize edilmeli, müşteri bilgilendirilmeli.',
        orderId,
        riskType: 'termin_overdue',
      })
    }

    if (isShipmentDateOverdue(row, todayIso)) {
      const shipDate = row.plannedShipDate ?? row.shipmentDate ?? row.dueDate
      const days = shipDate ? daysBetweenIso(shipDate, todayIso) : 0
      risks.push({
        id: `risk-${orderId}-ship-date`,
        kind: 'risk',
        tone: 'red',
        title: customer.toUpperCase(),
        lines: ['Sevk tarihi geçti', days > 0 ? `${days} gün gecikmiş` : 'Plan güncellenmeli'],
        recommendation: 'Müşteri aranmalı, yeni sevk tarihi planlanmalı.',
        orderId,
        riskType: 'shipment_overdue',
      })
    }

    if ((row.openMissingItemsCount ?? 0) > 0) {
      risks.push({
        id: `risk-${orderId}-missing`,
        kind: 'risk',
        tone: 'red',
        title: customer.toUpperCase(),
        lines: [`Eksik ürün: ${row.openMissingItemsCount} açık kayıt`],
        recommendation: 'Eksik parça takibi yapılmalı, sevk ertelenmeli.',
        orderId,
        riskType: 'missing_item',
      })
    }

    if (row.hasShipmentIssue) {
      risks.push({
        id: `risk-${orderId}-ssh`,
        kind: 'risk',
        tone: 'red',
        title: customer.toUpperCase(),
        lines: ['Açık SSH / sevk sorunu'],
        recommendation: 'Operasyon sorumlusu devreye girmeli.',
        orderId,
        riskType: 'open_ssh',
      })
    }

    if (hasHighRemainingPayment(row)) {
      risks.push({
        id: `risk-${orderId}-balance`,
        kind: 'risk',
        tone: 'red',
        title: customer.toUpperCase(),
        lines: ['Kalan ödeme yüksek', `Tahsilat: ${formatTry(remainingBalance(row))}`],
        recommendation: 'Teslim öncesi tahsilat planı netleştirilmeli.',
        orderId,
        riskType: 'high_balance',
      })
    }
  }

  for (const plan of plansForDate) {
    const { vehicleWarnings, crewWarnings } = detectPlanConflicts(plan, allPlans)
    const row = [...rows].find((r) => r.id === plan.orderId)
    const customer = row?.customer ?? plan.orderId

    for (const warning of vehicleWarnings) {
      risks.push({
        id: `risk-${plan.orderId}-veh-${plan.plannedTime}`,
        kind: 'risk',
        tone: 'red',
        title: customer.toUpperCase(),
        lines: [warning.replace(/^⚠️\s*/, '')],
        recommendation: 'Araç planı yeniden düzenlenmeli.',
        orderId: plan.orderId,
        riskType: 'vehicle_conflict',
      })
    }
    for (const warning of crewWarnings) {
      risks.push({
        id: `risk-${plan.orderId}-crew-${plan.plannedTime}`,
        kind: 'risk',
        tone: 'red',
        title: customer.toUpperCase(),
        lines: [warning.replace(/^⚠️\s*/, '')],
        recommendation: 'Ekip ataması çakışmadan kurtarılmalı.',
        orderId: plan.orderId,
        riskType: 'crew_conflict',
      })
    }
  }

  return risks.slice(0, 12)
}

/**
 * @param {VehiclePlanColumn[]} vehiclePlan
 * @param {ShipmentOpportunityGroup[]} opportunities
 * @returns {DispatchAdviceItem[]}
 */
export function buildOccupancyAdvice(vehiclePlan, opportunities) {
  /** @type {DispatchAdviceItem[]} */
  const advice = []

  for (const column of vehiclePlan) {
    if (column.stopCount === 0) continue
    if (column.occupancyPercent >= LOW_OCCUPANCY_THRESHOLD) continue

    const match = opportunities.find((o) => o.orderCount >= 2)
    const regionHint = match ? formatRegionDisplayLabel(match.region) : 'yakın bölge'

    advice.push({
      id: `occ-${column.vehicle}`,
      kind: 'occupancy',
      tone: 'green',
      title: column.vehicle,
      lines: [`%${column.occupancyPercent} dolu`, `Öneri: ${regionHint} grubuna eklenebilir.`],
      recommendation: column.occupancyHint ?? 'Kapasite birleştirme ile doldurulabilir.',
    })
  }

  return advice
}

/**
 * @param {{
 *   rows: Iterable<ShipmentRowVM>
 *   opportunities: ShipmentOpportunityGroup[]
 *   vehiclePlan: VehiclePlanColumn[]
 *   allPlans: ShipmentPlan[]
 *   risks: DispatchAdviceItem[]
 *   todayIso: string
 * }} input
 * @returns {OperationHealthScore}
 */
export function computeOperationHealthScore(input) {
  const { rows, opportunities, vehiclePlan, allPlans, risks, todayIso } = input
  let score = 100
  /** @type {string[]} */
  const penalties = []
  /** @type {string[]} */
  const bonuses = []

  let overdueShip = 0
  let missing = 0
  let groupedPlans = 0

  for (const row of rows) {
    if (isShipmentDateOverdue(row, todayIso)) overdueShip += 1
    if ((row.openMissingItemsCount ?? 0) > 0) missing += 1
  }

  if (overdueShip > 0) {
    const p = Math.min(24, overdueShip * 4)
    score -= p
    penalties.push(`Geciken sevk (−${p})`)
  }
  if (missing > 0) {
    const p = Math.min(20, missing * 5)
    score -= p
    penalties.push(`Eksik ürün (−${p})`)
  }

  const conflictRisks = risks.filter((r) =>
    ['vehicle_conflict', 'crew_conflict'].includes(r.riskType ?? ''),
  )
  if (conflictRisks.length > 0) {
    const p = Math.min(16, conflictRisks.length * 4)
    score -= p
    penalties.push(`Plan çakışması (−${p})`)
  }

  const lowOcc = vehiclePlan.filter(
    (v) => v.stopCount > 0 && v.occupancyPercent < LOW_OCCUPANCY_THRESHOLD,
  )
  if (lowOcc.length > 0) {
    const p = Math.min(12, lowOcc.length * 3)
    score -= p
    penalties.push(`Boş araç kapasitesi (−${p})`)
  }

  for (const plan of allPlans) {
    if (plan.groupId) groupedPlans += 1
  }
  if (groupedPlans > 0) {
    const b = Math.min(10, groupedPlans * 2)
    score += b
    bonuses.push(`Gruplanmış sevk (+${b})`)
  }

  const fullVehicles = vehiclePlan.filter((v) => v.occupancyPercent >= 80).length
  if (fullVehicles > 0) {
    const b = Math.min(9, fullVehicles * 3)
    score += b
    bonuses.push(`Dolu araç (+${b})`)
  }

  if (opportunities.length > 0 && overdueShip === 0) {
    score += 4
    bonuses.push('Zamanında sevk fırsatı (+4)')
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    score,
    label: `${score} / 100`,
    penalties,
    bonuses,
  }
}

/**
 * @param {{
 *   rows: Iterable<ShipmentRowVM>
 *   opportunities: ShipmentOpportunityGroup[]
 *   vehiclePlan: VehiclePlanColumn[]
 *   allPlans: ShipmentPlan[]
 *   plansByOrderId: Map<string, ShipmentPlan>
 *   selectedDate: string
 *   todayIso: string
 * }} input
 * @returns {DispatchAdvisorView}
 */
export function buildDispatchAdvisorView(input) {
  const { rows, opportunities, vehiclePlan, allPlans, plansByOrderId, selectedDate, todayIso } =
    input

  const savings = buildSavingsAdvice(opportunities, selectedDate, allPlans)
  const occupancy = buildOccupancyAdvice(vehiclePlan, opportunities)
  const wait = buildWaitAdvice(rows, selectedDate, plansByOrderId)
  const risks = buildRiskAdvice(rows, allPlans, selectedDate, todayIso)
  const health = computeOperationHealthScore({
    rows,
    opportunities,
    vehiclePlan,
    allPlans,
    risks,
    todayIso,
  })

  const affectedOrderIds = [
    ...new Set([
      ...risks.map((r) => r.orderId).filter(Boolean),
      ...wait.map((w) => w.orderId).filter(Boolean),
      ...savings.flatMap((s) => s.group?.orders.map((o) => o.orderId) ?? []),
    ]),
  ]

  return {
    savings: [...savings, ...occupancy],
    wait,
    risks,
    health,
    affectedOrderIds,
  }
}

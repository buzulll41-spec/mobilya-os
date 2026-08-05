import { DEMO_TODAY } from '../../data/constants.js'
import { buildOperationCaseWarRoomView } from '../operationCase/operationCaseWarRoomModel.js'

/** @typedef {import('../../contracts/v1/managerCockpit.js').ManagerCockpitResponseDto} ManagerCockpitResponseDto */
/** @typedef {import('../../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto} ProfitabilityResponseDto */
/** @typedef {import('../../contracts/v1/actionCenter.js').ActionDto} ActionDto */
/** @typedef {import('../../contracts/v1/operationCase.js').OperationCasesResponseDto} OperationCasesResponseDto */
/** @typedef {import('../../contracts/v1/operationsAgent.js').OperationsAgentsResponseDto} OperationsAgentsResponseDto */
/** @typedef {import('../../contracts/v1/dataQuality.js').DataQualityResponseDto} DataQualityResponseDto */
/** @typedef {import('../../contracts/v1/supplierOperations.js').SupplyOperationsBoardDto} SupplyOperationsBoardDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }
const MONTH_FROM = '2026-05-01'
const MONTH_TO = '2026-05-31'

const CATEGORY_LABEL = {
  COLLECTION: 'Tahsilat',
  SHIPMENT: 'Sevk',
  DATA_QUALITY: 'Veri Kalitesi',
  SALES: 'Satış',
  SUPPLIER: 'Tedarikçi',
  OPERATIONS: 'Operasyon',
  RISK: 'Risk',
}

const TL = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

const num = (v) => {
  const n = Number.parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

const fmtTL = (v) => TL.format(num(v))
const fmtPct = (v) => `%${Math.round(v * 10) / 10}`

/**
 * @param {string} text
 */
function parseMoneyLabel(text) {
  if (!text) return null
  const open = text.match(/açık bakiye\s+(\d{1,3}(?:\.\d{3})+|\d+)\s*₺/i)
  if (open) return fmtTL(open[1].replace(/\./g, ''))
  const amount = text.match(/(\d{1,3}(?:\.\d{3})+|\d+)\s*₺/)
  if (amount) return fmtTL(amount[1].replace(/\./g, ''))
  const evidence = text.match(/₺\s*(\d{1,3}(?:\.\d{3})+|\d+)/)
  if (evidence) return fmtTL(evidence[1].replace(/\./g, ''))
  return null
}

/**
 * @param {ActionDto} action
 */
function actionImpactLabel(action) {
  const fromReason = parseMoneyLabel(action.reason)
  if (fromReason) return fromReason
  const remaining = action.evidence?.remaining ?? action.evidence?.openBalance
  if (remaining != null) return fmtTL(remaining)
  if (action.category === 'SHIPMENT') return 'Sevk açılacak'
  if (action.category === 'DATA_QUALITY') return 'Veri düzeltmesi'
  return action.riskLabel ?? 'Operasyon etkisi'
}

/**
 * @param {number} score
 * @returns {'Kritik'|'Düşük'|'Orta'|'İyi'|'Mükemmel'}
 */
function healthScoreLabel(score) {
  if (score >= 90) return 'Mükemmel'
  if (score >= 75) return 'İyi'
  if (score >= 60) return 'Orta'
  if (score >= 40) return 'Düşük'
  return 'Kritik'
}

/**
 * @param {number} score
 * @returns {'success'|'warning'|'critical'|undefined}
 */
function healthScoreTone(score) {
  if (score >= 75) return 'success'
  if (score >= 60) return 'warning'
  return 'critical'
}

/**
 * @param {string} id
 * @param {number} count
 * @param {number} openBalance
 */
function buildFocusImpact(id, count, openBalance) {
  if (id === 'termin') return `${count} müşteri riski`
  if (id === 'collection') return `${fmtTL(openBalance)} açık bakiye`
  if (id === 'ssh') return 'Sevk gecikebilir'
  if (id === 'shipment') return `${count} sevk kilidi`
  return ''
}

/**
 * @param {ActionDto} action
 */
function actionPriorityImpact(action) {
  const fromReason = parseMoneyLabel(action.reason)
  if (fromReason) return fromReason
  const remaining = action.evidence?.remaining ?? action.evidence?.openBalance
  if (remaining != null) return fmtTL(remaining)
  if (action.category === 'SHIPMENT') return '1 sevk'
  if (action.category === 'DATA_QUALITY') return '1 kayıt'
  if (action.category === 'SUPPLIER') return '1 tedarikçi'
  return '1 müşteri'
}

/**
 * @param {number} rate
 */
function collectionRateTone(rate) {
  if (rate >= 80) return 'success'
  if (rate >= 60) return 'warning'
  return 'critical'
}

/**
 * @param {number} count
 * @param {number} warnAt
 * @param {number} critAt
 * @returns {'green'|'orange'|'red'}
 */
function heatStatus(count, warnAt = 1, critAt = 5) {
  if (count >= critAt) return 'red'
  if (count >= warnAt) return 'orange'
  return 'green'
}

/**
 * @param {{
 *   cockpit: ManagerCockpitResponseDto
 *   profitability: ProfitabilityResponseDto
 *   staffProfitability: ProfitabilityResponseDto
 *   actions: ActionDto[]
 *   casesResponse: OperationCasesResponseDto
 *   agents: OperationsAgentsResponseDto
 *   dataQuality: DataQualityResponseDto
 *   supplyBoard: SupplyOperationsBoardDto
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 * }} input
 */
export function buildExecutiveWarRoomView(input) {
  const {
    cockpit,
    profitability,
    staffProfitability,
    actions,
    casesResponse,
    agents,
    dataQuality,
    supplyBoard,
    orders,
    listItemDtos,
  } = input

  const summary = cockpit.summary ?? {}
  const totals = profitability.totals ?? {}
  const today = cockpit.today ?? casesResponse.today ?? DEMO_TODAY

  const collected = num(totals.collected)
  const openBalance = num(totals.openBalance)
  const collectionRate = collected + openBalance > 0 ? (collected / (collected + openBalance)) * 100 : 0

  const caseView = buildOperationCaseWarRoomView({
    casesResponse,
    actions,
    orders,
    listItemDtos,
  })

  const openActions = actions.filter((a) => a.status === 'OPEN' || a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS')
  const p1Actions = openActions.filter((a) => a.priority === 'P1').length
  const p2Actions = openActions.filter((a) => a.priority === 'P2').length

  const opsHealthScore = Math.round(
    num(summary.dataQualityScore) * 0.35 +
      collectionRate * 0.35 +
      Math.max(0, 100 - p1Actions * 7 - p2Actions * 2) * 0.3,
  )

  /** @type {import('../../components/erp-ops/ErpOpsSummaryStrip.jsx').ErpSummaryMetric[]} */
  const kpiMetrics = [
    { id: 'daily-revenue', label: 'Günlük Ciro', value: fmtTL(summary.todaySales), itemTone: 'success' },
    { id: 'monthly-revenue', label: 'Aylık Ciro', value: fmtTL(summary.monthRevenue), itemTone: 'success' },
    {
      id: 'collection-rate',
      label: 'Tahsilat Oranı',
      value: fmtPct(collectionRate),
      valueTone: collectionRateTone(collectionRate),
      itemTone: collectionRateTone(collectionRate),
    },
    {
      id: 'open-balance',
      label: 'Açık Bakiye',
      value: fmtTL(totals.openBalance ?? summary.monthRevenue),
      valueTone: openBalance > 500_000 ? 'warning' : undefined,
      itemTone: openBalance > 500_000 ? 'warning' : undefined,
    },
    {
      id: 'risky-receivable',
      label: 'Riskli Alacak',
      value: fmtTL(summary.riskyReceivable ?? totals.riskyReceivable),
      valueTone: num(summary.riskyReceivable) > 0 ? 'critical' : 'success',
      itemTone: num(summary.riskyReceivable) > 0 ? 'critical' : 'success',
    },
    {
      id: 'ops-health',
      label: 'Operasyon Sağlık Skoru',
      value: `${opsHealthScore} / 100`,
      valueTone: healthScoreTone(opsHealthScore),
      itemTone: healthScoreTone(opsHealthScore),
    },
  ]

  const focusMap = {
    termin: 'termin geçti',
    collection: 'tahsilat riski',
    ssh: 'SSH bekliyor',
    shipment: 'sevk kilidi',
  }

  /** @type {{ id: string, label: string, count: number, impact: string }[]} */
  const todayFocusItems = caseView.todayFocusItems
    .filter((item) => ['termin', 'collection', 'ssh', 'shipment'].includes(item.id))
    .map((item) => ({
      ...item,
      label: focusMap[item.id] ?? item.label,
      impact: buildFocusImpact(item.id, item.count, openBalance),
    }))
    .filter((item) => item.count > 0)

  const topActions = [...openActions]
    .sort((a, b) => {
      const pr = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
      if (pr !== 0) return pr
      return (a.createdAt < b.createdAt ? 1 : -1)
    })
    .slice(0, 10)
    .map((action) => ({
      id: action.id,
      priority: action.priority,
      customer: action.relatedCustomer ?? action.relatedOrder ?? '—',
      topic: CATEGORY_LABEL[action.category] ?? action.category,
      impact: actionImpactLabel(action),
      priorityImpact: actionPriorityImpact(action),
      recommendedAction: action.recommendedAction,
    }))

  const moneyBoxes = [
    { id: 'incoming', label: 'Kasaya Girecek', value: fmtTL(totals.openBalance), tone: 'operation' },
    {
      id: 'risky',
      label: 'Riskli Alacak',
      value: fmtTL(summary.riskyReceivable ?? totals.riskyReceivable),
      tone: num(summary.riskyReceivable) > 0 ? 'critical' : 'success',
    },
    { id: 'pending-profit', label: 'Bekleyen Kâr', value: fmtTL(summary.pendingProfit ?? totals.pendingProfit), tone: 'warning' },
    { id: 'realized-profit', label: 'Gerçekleşen Kâr', value: fmtTL(summary.realizedProfit ?? totals.realizedProfit), tone: 'success' },
  ]

  const salesP1 = openActions.filter((a) => a.category === 'SALES' && a.priority === 'P1').length
  const collectionP1 = openActions.filter((a) => a.category === 'COLLECTION' && a.priority === 'P1').length
  const shipmentP1 = openActions.filter((a) => a.category === 'SHIPMENT' && a.priority === 'P1').length
  const delayedShipments = cockpit.todayOperations?.delayedShipments ?? 0
  const sshCount = todayFocusItems.find((i) => i.id === 'ssh')?.count ?? 0
  const dqScore = num(summary.dataQualityScore ?? dataQuality.totals?.averageQualityScore)

  /** @type {{ id: string, label: string, status: 'green'|'orange'|'red', detail: string }[]} */
  const departmentHeatmap = [
    {
      id: 'sales',
      label: 'Satış',
      status: heatStatus(salesP1, 1, 3),
      detail: salesP1 > 0 ? `${salesP1} P1 satış konusu` : 'Hedef takibi normal',
    },
    {
      id: 'collection',
      label: 'Tahsilat',
      status: heatStatus(collectionP1 + (todayFocusItems.find((i) => i.id === 'collection')?.count ?? 0), 3, 15),
      detail: `${collectionP1} P1 tahsilat aksiyonu`,
    },
    {
      id: 'shipment',
      label: 'Sevk',
      status: heatStatus(shipmentP1 + delayedShipments, 1, 4),
      detail: delayedShipments > 0 ? `${delayedShipments} geciken sevk` : 'Sevk akışı normal',
    },
    {
      id: 'assembly',
      label: 'Montaj',
      status: shipmentP1 > 0 ? 'orange' : delayedShipments > 2 ? 'orange' : 'green',
      detail:
        (cockpit.todayOperations?.readyToShipToday ?? 0) > 0
          ? `${cockpit.todayOperations.readyToShipToday} montaj/sevk hazır`
          : 'Montaj planı normal',
    },
    {
      id: 'ssh',
      label: 'SSH',
      status: heatStatus(sshCount, 1, 2),
      detail: sshCount > 0 ? `${sshCount} SSH bekliyor` : 'SSH kuyruğu sakin',
    },
    {
      id: 'data-quality',
      label: 'Veri Kalitesi',
      status: dqScore < 70 ? 'red' : dqScore < 85 ? 'orange' : 'green',
      detail: `Skor ${Math.round(dqScore)}`,
    },
  ]

  const supplierRows = [...(supplyBoard.suppliers ?? [])]
    .sort((a, b) => {
      const rank = { critical: 1, risky: 2, normal: 3, passive: 4 }
      const ar = rank[a.healthStatus] ?? 5
      const br = rank[b.healthStatus] ?? 5
      if (ar !== br) return ar - br
      return num(b.openBalance) - num(a.openBalance)
    })
    .slice(0, 10)
    .map((s) => ({
      id: s.id,
      supplier: s.companyName,
      ssh: s.openProductCount,
      delay: s.healthStatus === 'critical' || s.healthStatus === 'risky' ? 'Gecikmiş' : 'Normal',
      risk: s.healthLabel,
      riskTone: s.healthStatus === 'critical' ? 'critical' : s.healthStatus === 'risky' ? 'warning' : 'success',
    }))

  const staffRows = [...(staffProfitability.rows ?? [])]
    .sort((a, b) => num(b.revenue) - num(a.revenue))
    .slice(0, 10)
    .map((row) => ({
      id: row.key,
      staff: row.label,
      sales: fmtTL(row.revenue),
      collection: fmtTL(row.collected),
      profit: fmtTL(row.grossProfit),
      avgOrder: row.orderCount > 0 ? fmtTL(num(row.revenue) / row.orderCount) : '—',
    }))

  const briefingBullets = buildAiBriefing(agents, cockpit, caseView.todayFocusItems, collectionRate)

  const criticalCases = caseView.rows
    .filter((r) => !r.isClosed)
    .sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
      return b.ageDays - a.ageDays
    })
    .slice(0, 10)

  return {
    today,
    kpiMetrics,
    opsHealth: {
      score: opsHealthScore,
      label: healthScoreLabel(opsHealthScore),
      tone: healthScoreTone(opsHealthScore),
    },
    todayFocusItems,
    topActions,
    moneyBoxes,
    departmentHeatmap,
    supplierRows,
    staffRows,
    briefingBullets,
    criticalCases,
  }
}

/**
 * @param {OperationsAgentsResponseDto} agents
 * @param {ManagerCockpitResponseDto} cockpit
 * @param {{ id: string, label: string, count: number }[]} focusItems
 * @param {number} collectionRate
 */
function buildAiBriefing(agents, cockpit, focusItems, collectionRate) {
  const bullets = []
  const briefing = agents.briefing ?? {}
  const paragraphs = briefing.paragraphs ?? []
  const priorities = agents.priorities ?? []

  const collectionFocus = focusItems.find((i) => i.id === 'collection')?.count ?? 0
  if (collectionFocus > 0) {
    bullets.push(`Tahsilat riski ${collectionFocus} vakada aktif; tahsilat oranı %${Math.round(collectionRate)}.`)
  } else if (collectionRate < 70) {
    bullets.push('Tahsilat oranı hedefin altında; nakit akışı izlenmeli.')
  } else {
    bullets.push('Tahsilat performansı stabil görünüyor.')
  }

  const sshCount = focusItems.find((i) => i.id === 'ssh')?.count ?? 0
  if (sshCount > 0) bullets.push(`${sshCount} SSH kaydı bekliyor; servis kuyruğu takip edilmeli.`)
  else bullets.push('SSH sayısı düşük; servis kuyruğu kontrol altında.')

  const delayed = cockpit.todayOperations?.delayedShipments ?? 0
  if (delayed > 0) bullets.push(`${delayed} geciken sevk var; sevk operasyonu yoğun.`)
  else bullets.push('Sevk operasyonu normal seviyede.')

  const risky = num(cockpit.summary?.riskyReceivable)
  if (risky > 0) bullets.push(`Riskli alacak ${fmtTL(risky)} seviyesinde.`)
  else bullets.push('Riskli alacak seviyesi düşük.')

  if (paragraphs[0] && bullets.length < 6) {
    const short = paragraphs[0].length > 120 ? `${paragraphs[0].slice(0, 117)}…` : paragraphs[0]
    if (!bullets.some((b) => b.includes(short.slice(0, 20)))) bullets.push(short)
  }

  if (priorities[0] && bullets.length < 6) {
    bullets.push(`Öncelik: ${priorities[0].title}`)
  }

  return bullets.slice(0, 6)
}

export { MONTH_FROM, MONTH_TO }

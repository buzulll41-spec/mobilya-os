import { DEMO_TODAY } from '../../data/constants.js'
import { formatShortDate } from '../../utils/dates.js'
import {
  isCollectionCritical,
  isCollectionOverdue,
  isPreShipmentCollection,
  pickPriorityCallRows,
  sortCollectionByRisk,
} from '../collection/collectionCommandCenterModel.js'
import { applyOpsDateFilter } from '../../features/collection/ops-center/collectionOpsCenterUi.js'
import { buildCollectionSuggestedAction } from '../../features/collection/collectionSuggestedActionUi.js'
import { MONTH_FROM, MONTH_TO } from '../executive/executiveWarRoomModel.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'

/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../contracts/v1/managerCockpit.js').ManagerCockpitResponseDto} ManagerCockpitResponseDto */
/** @typedef {import('../../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto} ProfitabilityResponseDto */

const num = (v) => {
  const n = Number.parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

const fmtTL = (v) => formatTry(num(v))

/**
 * @param {string} fromIso
 * @param {string} toIso
 */
function daysBetween(fromIso, toIso) {
  return Math.floor(
    (Date.parse(`${toIso.slice(0, 10)}T12:00:00`) - Date.parse(`${fromIso.slice(0, 10)}T12:00:00`)) /
      86_400_000,
  )
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
function isCollectibleToday(row, todayIso) {
  if (remainingBalance(row) <= 0.009) return false
  if (row.dueDate === todayIso || row.shipmentDate === todayIso) return true
  if (isCollectionOverdue(row, todayIso)) return true
  if (isPreShipmentCollection(row, todayIso)) {
    const ship = row.shipmentDate ?? row.dueDate
    if (ship) {
      const days = daysBetween(todayIso, ship)
      return days >= 0 && days <= 1
    }
  }
  return false
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
function isCollectibleThisWeek(row, todayIso) {
  if (remainingBalance(row) <= 0.009) return false
  const weekRows = applyOpsDateFilter([row], 'due-week', todayIso)
  if (weekRows.length > 0) return true
  return isPreShipmentCollection(row, todayIso)
}

/**
 * @param {CollectionRowVM} row
 */
function isCollectibleThisMonth(row) {
  if (remainingBalance(row) <= 0.009) return false
  if (!row.dueDate) return isPreShipmentCollection(row, DEMO_TODAY)
  return row.dueDate >= MONTH_FROM && row.dueDate <= MONTH_TO
}

/**
 * Kârlılık / kokpit ile uyumlu riskli alacak satırı (ay içi + yüksek risk).
 * @param {CollectionRowVM} row
 */
function isRiskyReceivableRow(row) {
  if (remainingBalance(row) <= 0.009) return false
  if (row.orderDate < MONTH_FROM || row.orderDate > MONTH_TO) return false
  const sev = row.riskSeverity
  return sev === RISK_SEVERITY.HIGH || sev === RISK_SEVERITY.CRITICAL
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
function riskyAgingDays(row, todayIso) {
  if (row.dueDate && row.dueDate < todayIso) return daysBetween(row.dueDate, todayIso)
  return 0
}

/**
 * @param {import('../collection/collectionCommandCenterModel.js').CollectionCardModel} card
 * @param {string} todayIso
 * @returns {'P1'|'P2'|'P3'}
 */
function collectionPriorityTier(card, todayIso) {
  if (card.stripeTone === 'critical' || isCollectionCritical(card.row, todayIso)) return 'P1'
  if (card.stripeTone === 'warning') return 'P2'
  return 'P3'
}

/**
 * @param {import('../collection/collectionCommandCenterModel.js').CollectionCardModel} card
 * @param {string} todayIso
 */
function suggestionLabel(card, todayIso) {
  return buildCollectionSuggestedAction(card, todayIso).title
}

/**
 * @param {{
 *   collectionRows: CollectionRowVM[]
 *   cockpit: ManagerCockpitResponseDto
 *   profitability: ProfitabilityResponseDto
 *   todayIso?: string
 * }} input
 */
export function buildCashRadarView(input) {
  const { collectionRows, cockpit, profitability, todayIso = DEMO_TODAY } = input
  const openRows = collectionRows.filter((row) => remainingBalance(row) > 0.009)
  const cards = sortCollectionByRisk(openRows, todayIso)

  const todaySum = openRows
    .filter((row) => isCollectibleToday(row, todayIso))
    .reduce((s, row) => s + remainingBalance(row), 0)

  const weekSum = openRows
    .filter((row) => isCollectibleThisWeek(row, todayIso))
    .reduce((s, row) => s + remainingBalance(row), 0)

  const monthSum = openRows
    .filter((row) => isCollectibleThisMonth(row))
    .reduce((s, row) => s + remainingBalance(row), 0)

  const riskyFromRows = openRows
    .filter((row) => isRiskyReceivableRow(row))
    .reduce((s, row) => s + remainingBalance(row), 0)

  const riskyTotal =
    num(cockpit.summary?.riskyReceivable) ||
    num(profitability.totals?.riskyReceivable) ||
    riskyFromRows

  /** @type {import('../../components/erp-ops/ErpOpsSummaryStrip.jsx').ErpSummaryMetric[]} */
  const kpiMetrics = [
    {
      id: 'today',
      label: 'Bugün Tahsil Edilebilir',
      value: fmtTL(todaySum),
      itemTone: 'success',
    },
    {
      id: 'week',
      label: 'Bu Hafta Tahsil Edilebilir',
      value: fmtTL(weekSum),
      itemTone: 'operation',
    },
    {
      id: 'month',
      label: 'Bu Ay Tahsil Edilebilir',
      value: fmtTL(monthSum),
      itemTone: 'operation',
    },
    {
      id: 'risky',
      label: 'Riskli Alacak',
      value: fmtTL(riskyTotal),
      valueTone: riskyTotal > 0 ? 'critical' : 'success',
      itemTone: riskyTotal > 0 ? 'critical' : 'success',
    },
  ]

  /** @type {Map<string, { customer: string, balance: number, lastPayment: string | null, worstCard: ReturnType<typeof buildCollectionCardModel> }>} */
  const debtorMap = new Map()
  for (const card of cards) {
    const key = card.row.customer?.trim() || card.orderNo
    const prev = debtorMap.get(key) ?? {
      customer: key,
      balance: 0,
      lastPayment: null,
      worstCard: card,
    }
    prev.balance += card.remaining
    if (
      card.row.lastPaymentAt &&
      (!prev.lastPayment || card.row.lastPaymentAt > prev.lastPayment)
    ) {
      prev.lastPayment = card.row.lastPaymentAt
    }
    if (card.riskScore > prev.worstCard.riskScore) prev.worstCard = card
    debtorMap.set(key, prev)
  }

  const topDebtors = [...debtorMap.values()]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10)
    .map((d) => ({
      id: d.customer,
      customer: d.customer,
      openBalance: fmtTL(d.balance),
      lastPayment: d.lastPayment ? formatShortDate(d.lastPayment.slice(0, 10)) : '—',
      risk: d.worstCard.riskLabel,
      suggestion: suggestionLabel(d.worstCard, todayIso),
      riskTone:
        d.worstCard.stripeTone === 'critical'
          ? 'critical'
          : d.worstCard.stripeTone === 'warning'
            ? 'warning'
            : 'success',
    }))

  const priorityBuckets = { P1: [], P2: [], P3: [] }
  for (const card of cards) {
    const tier = collectionPriorityTier(card, todayIso)
    if (priorityBuckets[tier].length >= 8) continue
    priorityBuckets[tier].push({
      id: card.row.id,
      customer: card.row.customer,
      orderNo: card.orderNo,
      remaining: fmtTL(card.remaining),
      risk: card.riskLabel,
      action: suggestionLabel(card, todayIso),
    })
  }

  const agingBuckets = [
    { id: '0-30', label: '0-30 gün', min: 0, max: 30 },
    { id: '30-60', label: '30-60 gün', min: 31, max: 60 },
    { id: '60-90', label: '60-90 gün', min: 61, max: 90 },
    { id: '90+', label: '90+ gün', min: 91, max: 9999 },
  ].map((bucket) => {
    const amount = openRows
      .filter((row) => isRiskyReceivableRow(row))
      .filter((row) => {
        const days = riskyAgingDays(row, todayIso)
        return days >= bucket.min && days <= bucket.max
      })
      .reduce((s, row) => s + remainingBalance(row), 0)
    return { ...bucket, amount: fmtTL(amount), amountRaw: amount }
  })

  const callToday = pickPriorityCallRows(openRows, todayIso, 20).map((card) => ({
    id: card.row.id,
    customer: card.row.customer,
    orderNo: card.orderNo,
    remaining: fmtTL(card.remaining),
    risk: card.riskLabel,
    phones: formatPhones(card.row),
    action: suggestionLabel(card, todayIso),
  }))

  return {
    today: todayIso,
    kpiMetrics,
    topDebtors,
    priorityBuckets,
    agingBuckets,
    callToday,
  }
}

/**
 * @param {CollectionRowVM} row
 */
function formatPhones(row) {
  const parts = [row.phone, row.phone2].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

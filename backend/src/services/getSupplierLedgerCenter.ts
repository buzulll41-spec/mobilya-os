import type { PrismaClient } from '@prisma/client'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../constants/supplierLedgerEntryTypes.js'
import { isSupplierLedgerBalanceStatus } from '../constants/supplierLedgerStatuses.js'
import {
  formatCenterMoney,
  type SupplierLedgerCenterDto,
  type SupplierLedgerCenterRowDto,
  type SupplierLedgerReportRowDto,
  type MailOrderDistributionRowDto,
} from '../contracts/supplierLedgerCenterDto.js'
import { decimalToNumber } from '../lib/money.js'
import { parseIsoDateOnly, toIsoDateString } from '../lib/isoDate.js'
import { loadBalancesForSuppliers } from './supplierBalance.js'
import {
  buildSupplierLinkage,
  computeSupplierOpsMetrics,
  estimateOpenProductCost,
  filterOpenProductsForSupplier,
  loadIncomingLinksBySupplier,
  loadLastPaymentDates,
  loadPendingLinesCore,
} from './buildSupplierOperationsContext.js'

export type SupplierLedgerCenterQuery = {
  q?: string
  activeOnly?: boolean
  sort?: 'balance_desc' | 'balance_asc' | 'name' | 'overdue_desc' | 'risk_desc'
}

function monthStartIso(todayIso: string): string {
  return `${todayIso.slice(0, 7)}-01`
}

function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDateOnly(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return toIsoDateString(d)
}

function computeOverdueDebt(
  openBalance: number,
  hasOverdueDelivery: boolean,
  daysSinceLastPayment: number | null,
): number {
  if (openBalance <= 0.009) return 0
  if (hasOverdueDelivery) return openBalance
  if (daysSinceLastPayment != null && daysSinceLastPayment > 45) return openBalance
  return 0
}

function ledgerEntryTypeLabel(entryType: string): string {
  switch (entryType) {
    case SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT:
      return 'Ürün Alımı'
    case SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT:
      return 'Ödeme'
    case SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER:
      return 'Mail Order'
    case SUPPLIER_LEDGER_ENTRY_TYPE.ADJUSTMENT:
      return 'Düzeltme'
    default:
      return 'Hareket'
  }
}

function statusLabelForRow(
  isActive: boolean,
  healthLabel: string,
  openBalance: number,
): string {
  if (!isActive) return 'Pasif'
  if (openBalance <= 0.009) return 'Kapalı'
  return healthLabel
}

export async function getSupplierLedgerCenter(
  prisma: PrismaClient,
  query: SupplierLedgerCenterQuery = {},
): Promise<SupplierLedgerCenterDto> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const monthStart = parseIsoDateOnly(monthStartIso(todayIso))
  const todayDate = parseIsoDateOnly(todayIso)
  const q = query.q?.trim()
  const activeOnly = query.activeOnly !== false

  const rows = await prisma.supplier.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { companyName: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ companyName: 'asc' }],
  })

  const supplierIds = rows.map((r) => r.id)
  const nameById = new Map(rows.map((r) => [r.id, r.companyName]))

  const [balances, incomingBySupplier, pendingLines, lastPayments, ledgerRows, dueEntries, recentEntries] =
    await Promise.all([
    loadBalancesForSuppliers(prisma, supplierIds),
    loadIncomingLinksBySupplier(prisma),
    loadPendingLinesCore(prisma),
    loadLastPaymentDates(prisma, supplierIds),
    prisma.supplierLedgerEntry.findMany({
      where: {
        supplierId: { in: supplierIds },
        occurredAt: { gte: monthStart, lte: todayDate },
      },
      select: {
        supplierId: true,
        entryType: true,
        debitAmount: true,
        creditAmount: true,
        status: true,
      },
    }),
    prisma.supplierLedgerEntry.findMany({
      where: {
        supplierId: { in: supplierIds },
        dueAt: { not: null },
        creditAmount: { gt: 0 },
      },
      select: {
        supplierId: true,
        dueAt: true,
        creditAmount: true,
        status: true,
      },
    }),
    prisma.supplierLedgerEntry.findMany({
      where: { supplierId: { in: supplierIds } },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      select: { supplierId: true, entryType: true },
    }),
  ])

  /** @type {Map<string, string>} */
  const lastEntryTypeBySupplier = new Map()
  for (const entry of recentEntries) {
    if (!lastEntryTypeBySupplier.has(entry.supplierId)) {
      lastEntryTypeBySupplier.set(entry.supplierId, entry.entryType)
    }
  }

  let monthPaymentsTotal = 0
  /** @type {Map<string, number>} */
  const monthPaidBySupplier = new Map()
  /** @type {Map<string, { total: number, count: number }>} */
  const mailOrderBySupplier = new Map()

  for (const entry of ledgerRows) {
    if (!isSupplierLedgerBalanceStatus(entry.status)) continue
    const debit = decimalToNumber(entry.debitAmount)
    const credit = decimalToNumber(entry.creditAmount)

    if (entry.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT && debit > 0) {
      monthPaymentsTotal += debit
      monthPaidBySupplier.set(
        entry.supplierId,
        (monthPaidBySupplier.get(entry.supplierId) ?? 0) + debit,
      )
    }

    if (entry.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER && credit > 0) {
      const bucket = mailOrderBySupplier.get(entry.supplierId) ?? { total: 0, count: 0 }
      bucket.total += credit
      bucket.count += 1
      mailOrderBySupplier.set(entry.supplierId, bucket)
    }
  }

  /** @type {Map<string, string | null>} */
  const upcomingDueBySupplier = new Map()
  let upcoming7 = 0
  let upcoming15 = 0
  let upcoming30 = 0
  const horizon7 = addDaysIso(todayIso, 7)
  const horizon15 = addDaysIso(todayIso, 15)
  const horizon30 = addDaysIso(todayIso, 30)

  for (const entry of dueEntries) {
    if (!isSupplierLedgerBalanceStatus(entry.status)) continue
    if (!entry.dueAt) continue
    const dueIso = toIsoDateString(entry.dueAt)
    if (dueIso < todayIso) continue
    const credit = decimalToNumber(entry.creditAmount)
    if (credit <= 0.009) continue

    const prev = upcomingDueBySupplier.get(entry.supplierId)
    if (!prev || dueIso < prev) upcomingDueBySupplier.set(entry.supplierId, dueIso)

    if (dueIso <= horizon7) upcoming7 += credit
    if (dueIso <= horizon15) upcoming15 += credit
    if (dueIso <= horizon30) upcoming30 += credit
  }

  /** @type {SupplierLedgerCenterRowDto[]} */
  const suppliers: SupplierLedgerCenterRowDto[] = []
  let totalDebt = 0
  let totalOverdue = 0
  let totalPendingOrderDebt = 0
  let totalPendingProductCount = 0

  for (const row of rows) {
    const snap = balances.get(row.id) ?? { openBalance: 0, lastMovementAt: null }
    const links = incomingBySupplier.get(row.id) ?? []
    const ops = filterOpenProductsForSupplier(pendingLines, buildSupplierLinkage(links), todayIso, row.id)
    const pendingOrderDebt = await estimateOpenProductCost(prisma, row.id, ops.openProducts)
    const metrics = computeSupplierOpsMetrics(
      pendingLines,
      links,
      todayIso,
      snap,
      row.isActive,
      lastPayments.get(row.id) ?? null,
      row.id,
    )
    const overdueDebt = computeOverdueDebt(
      snap.openBalance,
      metrics.hasOverdueDelivery,
      metrics.daysSinceLastPayment,
    )

    totalDebt += snap.openBalance
    totalOverdue += overdueDebt
    totalPendingOrderDebt += pendingOrderDebt
    totalPendingProductCount += ops.openProductCount

    const lastEntryType = lastEntryTypeBySupplier.get(row.id)
    suppliers.push({
      id: row.id,
      companyName: row.companyName,
      totalDebt: formatCenterMoney(snap.openBalance),
      overdueDebt: formatCenterMoney(overdueDebt),
      monthPayment: formatCenterMoney(monthPaidBySupplier.get(row.id) ?? 0),
      pendingOrderDebt: formatCenterMoney(pendingOrderDebt),
      pendingProductCount: ops.openProductCount,
      totalRisk: formatCenterMoney(snap.openBalance + pendingOrderDebt),
      lastMovementAt: snap.lastMovementAt ? toIsoDateString(snap.lastMovementAt) : null,
      lastMovementLabel: lastEntryType ? ledgerEntryTypeLabel(lastEntryType) : null,
      lastPaymentAt: lastPayments.get(row.id) ?? null,
      upcomingDueAt: upcomingDueBySupplier.get(row.id) ?? null,
      statusLabel: statusLabelForRow(row.isActive, metrics.healthLabel, snap.openBalance),
      healthStatus: metrics.healthStatus,
      isActive: row.isActive,
    })
  }

  const sort = query.sort ?? 'balance_desc'
  suppliers.sort((a, b) => {
    if (sort === 'name') return a.companyName.localeCompare(b.companyName, 'tr')
    if (sort === 'overdue_desc') {
      const oa = Number.parseFloat(a.overdueDebt)
      const ob = Number.parseFloat(b.overdueDebt)
      return ob - oa
    }
    if (sort === 'risk_desc') {
      return Number.parseFloat(b.totalRisk) - Number.parseFloat(a.totalRisk)
    }
    const ba = Number.parseFloat(a.totalDebt)
    const bb = Number.parseFloat(b.totalDebt)
    return sort === 'balance_asc' ? ba - bb : bb - ba
  })

  const topDebtSuppliers: SupplierLedgerReportRowDto[] = [...suppliers]
    .filter((s) => Number.parseFloat(s.totalRisk) > 0.009)
    .sort((a, b) => Number.parseFloat(b.totalRisk) - Number.parseFloat(a.totalRisk))
    .slice(0, 10)
    .map((s) => ({
      supplierId: s.id,
      companyName: s.companyName,
      amount: s.totalRisk,
      currency: 'TRY',
    }))

  const overdueDebts: SupplierLedgerReportRowDto[] = suppliers
    .filter((s) => Number.parseFloat(s.overdueDebt) > 0.009)
    .sort((a, b) => Number.parseFloat(b.overdueDebt) - Number.parseFloat(a.overdueDebt))
    .map((s) => ({
      supplierId: s.id,
      companyName: s.companyName,
      amount: s.overdueDebt,
      currency: 'TRY',
    }))

  const monthPaidSuppliers: SupplierLedgerReportRowDto[] = [...monthPaidBySupplier.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([supplierId, amount]) => ({
      supplierId,
      companyName: nameById.get(supplierId) ?? supplierId,
      amount: formatCenterMoney(amount),
      currency: 'TRY',
    }))

  const mailOrderDistribution: MailOrderDistributionRowDto[] = [...mailOrderBySupplier.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([supplierId, bucket]) => ({
      supplierId,
      companyName: nameById.get(supplierId) ?? supplierId,
      mailOrderTotal: formatCenterMoney(bucket.total),
      transactionCount: bucket.count,
      currency: 'TRY',
    }))

  return {
    kpis: {
      totalSuppliers: suppliers.filter((s) => s.isActive).length,
      totalDebt: formatCenterMoney(totalDebt),
      overdueDebt: formatCenterMoney(totalOverdue),
      monthPayments: formatCenterMoney(monthPaymentsTotal),
      pendingOrderDebt: formatCenterMoney(totalPendingOrderDebt),
      pendingProductCount: totalPendingProductCount,
      totalSupplierRisk: formatCenterMoney(totalDebt + totalPendingOrderDebt),
      upcomingPayments7: formatCenterMoney(upcoming7),
      upcomingPayments15: formatCenterMoney(upcoming15),
      upcomingPayments30: formatCenterMoney(upcoming30),
      currency: 'TRY',
    },
    suppliers,
    reports: {
      topDebtSuppliers,
      monthPaidSuppliers,
      overdueDebts,
      mailOrderDistribution,
    },
  }
}

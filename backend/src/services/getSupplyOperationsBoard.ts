import type { PrismaClient } from '@prisma/client'
import type { SupplyOperationsBoardDto, SupplierOpsListItemDto } from '../contracts/supplierOperationsDto.js'
import { formatQtyAmount } from '../contracts/supplierOperationsDto.js'
import { mapSupplierListItemDto } from '../contracts/supplierDto.js'
import { extractSupplierCity } from '../lib/supplierOperationsCore.js'
import { SUPPLIER_HEALTH_STATUS } from '../lib/supplierHealth.js'
import { getIncomingGoodsKpis } from './getIncomingGoodsKpis.js'
import { loadBalancesForSuppliers } from './supplierBalance.js'
import {
  computeSupplierOpsMetrics,
  loadIncomingLinksBySupplier,
  loadLastPaymentDates,
  loadPendingLinesCore,
} from './buildSupplierOperationsContext.js'

export type SupplyBoardQuery = {
  q?: string
  activeOnly?: boolean
  city?: string
  health?: string
  sort?: 'balance_desc' | 'balance_asc' | 'name'
}

export async function getSupplyOperationsBoard(
  prisma: PrismaClient,
  query: SupplyBoardQuery = {},
): Promise<SupplyOperationsBoardDto> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const q = query.q?.trim()
  const activeOnly = query.activeOnly !== false
  const cityFilter = query.city?.trim().toLowerCase()
  const healthFilter = query.health?.trim().toLowerCase()

  const rows = await prisma.supplier.findMany({
    where: {
      ...(activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { companyName: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { address: { contains: q, mode: 'insensitive' } },
              { taxNumber: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ companyName: 'asc' }],
  })

  const supplierIds = rows.map((r) => r.id)
  const [balances, incomingBySupplier, pendingLines, lastPayments, incomingKpis] = await Promise.all([
    loadBalancesForSuppliers(prisma, supplierIds),
    loadIncomingLinksBySupplier(prisma),
    loadPendingLinesCore(prisma),
    loadLastPaymentDates(prisma, supplierIds),
    getIncomingGoodsKpis(prisma),
  ])

  let globalOpenProducts = 0
  let globalMissingQty = 0
  let criticalCount = 0

  /** @type {SupplierOpsListItemDto[]} */
  const suppliers: SupplierOpsListItemDto[] = []

  for (const row of rows) {
    const city = extractSupplierCity(row.address)
    if (cityFilter && !(city ?? '').toLowerCase().includes(cityFilter)) continue

    const snap = balances.get(row.id) ?? { openBalance: 0, lastMovementAt: null }
    const links = incomingBySupplier.get(row.id) ?? []
    const metrics = computeSupplierOpsMetrics(
      pendingLines,
      links,
      todayIso,
      snap,
      row.isActive,
      lastPayments.get(row.id) ?? null,
      row.id,
    )

    if (healthFilter && metrics.healthStatus !== healthFilter) continue

    globalOpenProducts += metrics.openProductCount
    globalMissingQty += metrics.missingQtyTotal
    if (metrics.healthStatus === SUPPLIER_HEALTH_STATUS.CRITICAL) criticalCount += 1

    const base = mapSupplierListItemDto(row, snap.openBalance, snap.lastMovementAt)
    suppliers.push({
      ...base,
      city,
      healthStatus: metrics.healthStatus,
      healthLabel: metrics.healthLabel,
      openProductCount: metrics.openProductCount,
      pendingOrderCount: metrics.pendingOrderCount,
      lastActivityLabel: metrics.lastActivityLabel,
    })
  }

  const sort = query.sort ?? 'balance_desc'
  suppliers.sort((a, b) => {
    if (sort === 'name') return a.companyName.localeCompare(b.companyName, 'tr')
    const ba = Number.parseFloat(a.openBalance)
    const bb = Number.parseFloat(b.openBalance)
    return sort === 'balance_asc' ? ba - bb : bb - ba
  })

  return {
    kpis: {
      criticalSupplierCount: criticalCount,
      openProductCount: globalOpenProducts,
      missingProductQty: formatQtyAmount(globalMissingQty),
      todayIncomingCount: incomingKpis.todayCount,
      totalOpenDebt: incomingKpis.totalSupplierDebt,
      currency: 'TRY',
    },
    suppliers,
  }
}

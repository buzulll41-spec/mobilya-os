import type { Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient
import { sumSupplierLedgerBalance } from '../lib/supplierLedger.js'

export type SupplierBalanceSnapshot = {
  openBalance: number
  lastMovementAt: Date | null
}

export async function loadSupplierBalanceSnapshot(
  prisma: DbClient,
  supplierId: string,
): Promise<SupplierBalanceSnapshot> {
  const entries = await prisma.supplierLedgerEntry.findMany({
    where: { supplierId },
    select: { debitAmount: true, creditAmount: true, occurredAt: true, status: true },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
  })
  const openBalance = sumSupplierLedgerBalance(entries)
  const lastMovementAt = entries[0]?.occurredAt ?? null
  return { openBalance, lastMovementAt }
}

export async function loadBalancesForSuppliers(
  prisma: PrismaClient,
  supplierIds: string[],
): Promise<Map<string, SupplierBalanceSnapshot>> {
  const map = new Map<string, SupplierBalanceSnapshot>()
  if (!supplierIds.length) return map

  const rows = await prisma.supplierLedgerEntry.findMany({
    where: { supplierId: { in: supplierIds } },
    select: {
      supplierId: true,
      debitAmount: true,
      creditAmount: true,
      occurredAt: true,
      createdAt: true,
      status: true,
    },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
  })

  /** @type {Map<string, { entries: { debitAmount: import('@prisma/client').Prisma.Decimal, creditAmount: import('@prisma/client').Prisma.Decimal, status: string }[], lastAt: Date | null }>} */
  const agg = new Map()

  for (const row of rows) {
    let bucket = agg.get(row.supplierId)
    if (!bucket) {
      bucket = { entries: [], lastAt: null }
      agg.set(row.supplierId, bucket)
    }
    bucket.entries.push(row)
    if (!bucket.lastAt) bucket.lastAt = row.occurredAt
  }

  for (const id of supplierIds) {
    const bucket = agg.get(id)
    if (!bucket) {
      map.set(id, { openBalance: 0, lastMovementAt: null })
      continue
    }
    map.set(id, {
      openBalance: sumSupplierLedgerBalance(bucket.entries),
      lastMovementAt: bucket.lastAt,
    })
  }

  return map
}

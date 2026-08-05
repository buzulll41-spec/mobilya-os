import type { PrismaClient } from '@prisma/client'
import { mapSupplierListItemDto, type SupplierListItemDto } from '../contracts/supplierDto.js'
import { loadBalancesForSuppliers } from './supplierBalance.js'

export type ListSuppliersQuery = {
  q?: string
  activeOnly?: boolean
}

export async function listSuppliers(
  prisma: PrismaClient,
  query: ListSuppliersQuery = {},
): Promise<SupplierListItemDto[]> {
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
              { phone: { contains: q, mode: 'insensitive' } },
              { taxNumber: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ companyName: 'asc' }],
  })

  const balances = await loadBalancesForSuppliers(
    prisma,
    rows.map((r) => r.id),
  )

  return rows.map((row) => {
    const snap = balances.get(row.id) ?? { openBalance: 0, lastMovementAt: null }
    return mapSupplierListItemDto(row, snap.openBalance, snap.lastMovementAt)
  })
}

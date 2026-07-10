import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { mapSupplierDetailDto, type SupplierDetailDto } from '../contracts/supplierDto.js'
import { loadSupplierBalanceSnapshot } from './supplierBalance.js'

export async function getSupplier(prisma: PrismaClient, supplierId: string): Promise<SupplierDetailDto> {
  const row = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!row) {
    throw new AppHttpError(404, 'Tedarikçi bulunamadı', 'Not Found')
  }
  const snap = await loadSupplierBalanceSnapshot(prisma, supplierId)
  return mapSupplierDetailDto(row, snap.openBalance, snap.lastMovementAt)
}

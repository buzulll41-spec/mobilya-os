import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  mapSupplierLedgerEntryDto,
  type SupplierLedgerEntryDto,
} from '../contracts/supplierDto.js'

export async function listSupplierLedger(
  prisma: PrismaClient,
  supplierId: string,
): Promise<SupplierLedgerEntryDto[]> {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) {
    throw new AppHttpError(404, 'Tedarikçi bulunamadı', 'Not Found')
  }

  const rows = await prisma.supplierLedgerEntry.findMany({
    where: { supplierId },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
  })

  return rows.map(mapSupplierLedgerEntryDto)
}

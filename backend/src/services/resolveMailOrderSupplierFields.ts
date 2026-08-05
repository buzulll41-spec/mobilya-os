import type { Prisma, PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'

type DbClient = PrismaClient | Prisma.TransactionClient

export type MailOrderSupplierFields = {
  mailOrderSupplierId: string
  mailOrderSupplierNameSnapshot: string
}

export async function resolveMailOrderSupplierFields(
  db: DbClient,
  supplierId: string,
): Promise<MailOrderSupplierFields> {
  const supplier = await db.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true, companyName: true },
  })
  if (!supplier) {
    throw new AppHttpError(400, 'Mail order tedarikçisi bulunamadı', 'Bad Request', {
      mailOrderSupplierId: 'Supplier not found',
    })
  }
  return {
    mailOrderSupplierId: supplier.id,
    mailOrderSupplierNameSnapshot: supplier.companyName,
  }
}

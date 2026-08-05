/**
 * Enterprise 2.2 S2 — Field Operation repository yardımcıları (paylaşılan erişim).
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'

export type FieldOperationRow = Prisma.FieldOperationGetPayload<{}>

/** Silinmemiş operasyonu yükler; yoksa/soft-delete ise 404. */
export async function loadActiveFieldOperation(
  prisma: PrismaClient,
  id: string,
): Promise<FieldOperationRow> {
  const op = await prisma.fieldOperation.findUnique({ where: { id } })
  if (!op || op.deletedAt) {
    throw new AppHttpError(404, 'Saha operasyonu bulunamadı', 'Not Found', { id })
  }
  return op
}

import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import { isMaskedSecretInput } from '../../lib/maskSecret.js'
import {
  assertValidUpsertWooConnectionRequest,
  mapWooConnectionDto,
  type UpsertWooConnectionRequest,
  type WooConnectionDto,
} from '../../contracts/wooConnectionDto.js'

export async function getActiveWooConnection(
  prisma: PrismaClient,
): Promise<WooConnectionDto | null> {
  const row = await prisma.wooConnection.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (!row) {
    const anyRow = await prisma.wooConnection.findFirst({ orderBy: { updatedAt: 'desc' } })
    return anyRow ? mapWooConnectionDto(anyRow) : null
  }
  return mapWooConnectionDto(row)
}

export async function upsertWooConnection(
  prisma: PrismaClient,
  body: UpsertWooConnectionRequest,
): Promise<WooConnectionDto> {
  const payload = assertValidUpsertWooConnectionRequest(body)
  const existing = await prisma.wooConnection.findFirst({ orderBy: { createdAt: 'asc' } })

  const consumerSecret =
    payload.consumerSecret && !isMaskedSecretInput(payload.consumerSecret)
      ? payload.consumerSecret
      : existing?.consumerSecret

  if (!consumerSecret) {
    throw new AppHttpError(400, 'Consumer Secret zorunludur', 'Bad Request')
  }

  if (existing) {
    const updated = await prisma.wooConnection.update({
      where: { id: existing.id },
      data: {
        storeName: payload.storeName,
        storeUrl: payload.storeUrl,
        consumerKey: payload.consumerKey,
        consumerSecret,
        isActive: payload.isActive ?? true,
      },
    })
    return mapWooConnectionDto(updated)
  }

  const created = await prisma.wooConnection.create({
    data: {
      storeName: payload.storeName,
      storeUrl: payload.storeUrl,
      consumerKey: payload.consumerKey,
      consumerSecret,
      isActive: payload.isActive ?? true,
    },
  })
  return mapWooConnectionDto(created)
}

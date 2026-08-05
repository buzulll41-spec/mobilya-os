import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import {
  mapWooConnectionDto,
  type WooConnectionTestResponseDto,
  wooConnectionStatusLabel,
} from '../../contracts/wooConnectionDto.js'
import { WooConnectionService } from './wooConnectionService.js'

export async function testWooConnectionLive(
  prisma: PrismaClient,
): Promise<WooConnectionTestResponseDto> {
  const row = await prisma.wooConnection.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (!row) {
    throw new AppHttpError(404, 'WooCommerce bağlantısı tanımlı değil', 'Not Found')
  }

  const service = new WooConnectionService({
    storeUrl: row.storeUrl,
    consumerKey: row.consumerKey,
    consumerSecret: row.consumerSecret,
  })

  const result = await service.testConnection()
  const status = result.ok ? 'CONNECTED' : 'ERROR'

  const updated = await prisma.wooConnection.update({
    where: { id: row.id },
    data: {
      lastConnectionCheck: new Date(),
      lastConnectionStatus: status,
      lastError: result.error,
    },
  })

  return {
    connection: mapWooConnectionDto(updated),
    test: {
      ok: result.ok,
      status,
      statusLabel: wooConnectionStatusLabel(status),
      error: result.error,
      storeInfo: result.storeInfo
        ? {
            storeUrl: result.storeInfo.storeUrl,
            wcVersion: result.storeInfo.wcVersion,
          }
        : null,
      categoryCount: result.categoryCount,
      categoriesSample: result.categoriesSample,
      productCount: result.productCount,
      productsSample: result.productsSample,
    },
  }
}

export async function getWooConnectionHealth(
  prisma: PrismaClient,
): Promise<import('../../contracts/wooConnectionDto.js').WooConnectionHealthDto | null> {
  const row = await prisma.wooConnection.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  })
  if (!row) return null

  const status =
    (row.lastConnectionStatus as 'CONNECTED' | 'ERROR' | 'UNCHECKED' | null) ?? 'UNCHECKED'

  let categoryCount: number | null = null
  let productCount: number | null = null
  let wcVersion: string | null = null

  if (status === 'CONNECTED') {
    try {
      const service = new WooConnectionService({
        storeUrl: row.storeUrl,
        consumerKey: row.consumerKey,
        consumerSecret: row.consumerSecret,
      })
      const [categories, products, storeInfo] = await Promise.all([
        service.getCategories(),
        service.getProducts(1),
        service.getStoreInfo(),
      ])
      categoryCount = categories.total
      productCount = products.total
      wcVersion = storeInfo.wcVersion
    } catch {
      // Health panel falls back to last known DB status
    }
  }

  return {
    status,
    statusLabel: wooConnectionStatusLabel(status),
    lastConnectionCheck: row.lastConnectionCheck?.toISOString() ?? null,
    lastError: row.lastError,
    storeName: row.storeName,
    storeUrl: row.storeUrl,
    categoryCount,
    productCount,
    wcVersion,
  }
}

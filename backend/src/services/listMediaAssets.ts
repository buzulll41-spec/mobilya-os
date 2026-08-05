import type { PrismaClient } from '@prisma/client'
import {
  mapMediaAssetDto,
  type MediaAssetDto,
  type MediaCenterListResponseDto,
} from '../contracts/mediaAssetDto.js'

export type ListMediaAssetsQuery = {
  q?: string
  mimeType?: string
  page?: number
  pageSize?: number
}

function parsePage(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export async function listMediaAssets(
  prisma: PrismaClient,
  query: ListMediaAssetsQuery = {},
): Promise<MediaCenterListResponseDto> {
  const q = query.q?.trim()
  const page = parsePage(query.page, 1)
  const pageSize = Math.min(200, Math.max(10, parsePage(query.pageSize, 100)))

  const where = {
    ...(query.mimeType ? { mimeType: { startsWith: query.mimeType } } : {}),
    ...(q
      ? {
          OR: [
            { fileName: { contains: q, mode: 'insensitive' as const } },
            { storageKey: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [total, rows, usageGroups] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({
      where,
      orderBy: [{ uploadedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productMediaLink.groupBy({
      by: ['assetId'],
      _count: { assetId: true },
    }),
  ])

  const usageByAssetId = new Map(
    usageGroups.map((g) => [g.assetId, g._count.assetId]),
  )

  const assets: MediaAssetDto[] = rows.map((row) =>
    mapMediaAssetDto(row, usageByAssetId.get(row.id) ?? 0),
  )

  return { assets, total }
}

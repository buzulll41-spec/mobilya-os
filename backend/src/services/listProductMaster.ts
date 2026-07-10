import type { PrismaClient } from '@prisma/client'
import {
  buildProductMasterSummaryMetrics,
  mapProductMasterDto,
  type ProductMasterListResponseDto,
} from '../contracts/productMasterDto.js'

export type ListProductMasterQuery = {
  q?: string
  category?: string
  publishStatus?: string
  activeOnly?: boolean
  page?: number
  pageSize?: number
}

function parsePage(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export async function listProductMaster(
  prisma: PrismaClient,
  query: ListProductMasterQuery = {},
): Promise<ProductMasterListResponseDto> {
  const q = query.q?.trim()
  const category = query.category?.trim()
  const publishStatus = query.publishStatus?.trim()
  const activeOnly = query.activeOnly === true
  const page = parsePage(query.page, 1)
  const pageSize = Math.min(100, Math.max(10, parsePage(query.pageSize, 100)))

  const where = {
    ...(activeOnly ? { isActive: true } : {}),
    ...(category ? { category } : {}),
    ...(publishStatus ? { publishStatus } : {}),
    ...(q
      ? {
          OR: [
            { productName: { contains: q, mode: 'insensitive' as const } },
            { productCode: { contains: q, mode: 'insensitive' as const } },
            { barcode: { contains: q, mode: 'insensitive' as const } },
            { brand: { contains: q, mode: 'insensitive' as const } },
            { category: { contains: q, mode: 'insensitive' as const } },
            { defaultSupplier: { companyName: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        defaultSupplier: { select: { id: true, companyName: true } },
        variants: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        },
        mediaLinks: {
          include: { asset: true },
          orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
        },
      },
      orderBy: [{ productName: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const items = rows.map((r) => mapProductMasterDto(r))

  return {
    items,
    summaryMetrics: buildProductMasterSummaryMetrics(items),
    total,
    page,
    pageSize,
  }
}

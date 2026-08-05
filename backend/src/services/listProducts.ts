import type { PrismaClient } from '@prisma/client'
import {
  computeMarginRatio,
  mapProductListItemDto,
  type ProductCatalogKpisDto,
  type ProductListResponseDto,
} from '../contracts/productDto.js'
import { LOW_MARGIN_RATIO_THRESHOLD } from '../constants/productCatalog.js'

export type ListProductsQuery = {
  q?: string
  category?: string
  supplierId?: string
  suiteType?: string
  stockType?: string
  minPrice?: number
  maxPrice?: number
  activeOnly?: boolean
  page?: number
  pageSize?: number
}

function parseOptionalMoney(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

function parsePage(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}

export async function listProducts(
  prisma: PrismaClient,
  query: ListProductsQuery = {},
): Promise<ProductListResponseDto> {
  const q = query.q?.trim()
  const category = query.category?.trim()
  const supplierId = query.supplierId?.trim()
  const suiteType = query.suiteType?.trim()
  const stockType = query.stockType?.trim()
  const minPrice = parseOptionalMoney(query.minPrice)
  const maxPrice = parseOptionalMoney(query.maxPrice)
  const activeOnly = query.activeOnly !== false
  const page = parsePage(query.page, 1)
  const pageSize = Math.min(100, Math.max(10, parsePage(query.pageSize, 40)))

  const where = {
    ...(activeOnly ? { isActive: true } : {}),
    ...(category ? { category } : {}),
    ...(supplierId ? { defaultSupplierId: supplierId } : {}),
    ...(suiteType ? { suiteType } : {}),
    ...(stockType ? { stockType } : {}),
    ...(minPrice != null || maxPrice != null
      ? {
          defaultSalePrice: {
            ...(minPrice != null ? { gte: minPrice } : {}),
            ...(maxPrice != null ? { lte: maxPrice } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { productName: { contains: q, mode: 'insensitive' as const } },
            { productCode: { contains: q, mode: 'insensitive' as const } },
            { category: { contains: q, mode: 'insensitive' as const } },
            { defaultSupplier: { companyName: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [total, rows, allForKpis] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { defaultSupplier: { select: { id: true, companyName: true } } },
      orderBy: [{ productName: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.findMany({
      select: {
        isActive: true,
        category: true,
        defaultSalePrice: true,
        purchasePrice: true,
      },
    }),
  ])

  const kpis = buildCatalogKpis(allForKpis)

  return {
    items: rows.map((r) => mapProductListItemDto(r, LOW_MARGIN_RATIO_THRESHOLD)),
    kpis,
    total,
    page,
    pageSize,
  }
}

/**
 * @param {{ isActive: boolean; category: string; defaultSalePrice: import('@prisma/client').Prisma.Decimal; purchasePrice: import('@prisma/client').Prisma.Decimal }[]} rows
 */
function buildCatalogKpis(rows: {
  isActive: boolean
  category: string
  defaultSalePrice: { toString(): string }
  purchasePrice: { toString(): string }
}[]): ProductCatalogKpisDto {
  let activeCount = 0
  let inactiveCount = 0
  let lowMarginCount = 0
  /** @type {Map<string, number>} */
  const catCounts = new Map()

  for (const r of rows) {
    if (r.isActive) activeCount++
    else inactiveCount++
    const sale = Number(r.defaultSalePrice)
    const purchase = Number(r.purchasePrice)
    if (computeMarginRatio(sale, purchase) < LOW_MARGIN_RATIO_THRESHOLD) {
      lowMarginCount++
    }
    if (r.isActive) {
      catCounts.set(r.category, (catCounts.get(r.category) ?? 0) + 1)
    }
  }

  let topCategory: string | null = null
  let topN = 0
  for (const [cat, n] of catCounts) {
    if (n > topN) {
      topN = n
      topCategory = cat
    }
  }

  return { activeCount, inactiveCount, lowMarginCount, topCategory }
}

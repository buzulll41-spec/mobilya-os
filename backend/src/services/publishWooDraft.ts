import type { Prisma, PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { WOO_PRODUCT_STATUS } from '../constants/wooProductStatus.js'
import { calculateWooReadiness } from '../lib/calculateWooReadiness.js'
import { resolveProductMedia } from '../lib/resolveProductMedia.js'
import { resolveWooEnvCredentials } from '../lib/resolveWooEnvCredentials.js'
import {
  mapProductMasterDetailDto,
  type ProductMasterDetailDto,
} from '../contracts/productMasterDto.js'
import { WooConnectionService } from './wooConnection/wooConnectionService.js'

const productInclude = {
  defaultSupplier: { select: { id: true, companyName: true } },
  variants: {
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' as const }, { name: 'asc' as const }],
  },
  mediaLinks: {
    include: { asset: true },
    orderBy: [{ role: 'asc' as const }, { sortOrder: 'asc' as const }],
  },
} satisfies Prisma.ProductInclude

function formatWooPrice(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00'
}

function buildSlug(row: {
  slug: string | null
  productCode: string
  productName: string
}): string {
  const fromRow = row.slug?.trim()
  if (fromRow) return fromRow.toLowerCase()
  const fromCode = row.productCode.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
  if (fromCode) return fromCode.replace(/^-+|-+$/g, '')
  return row.productName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function publishWooDraft(
  prisma: PrismaClient,
  productId: string,
): Promise<ProductMasterDetailDto> {
  const creds = resolveWooEnvCredentials()
  const row = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  })
  if (!row) {
    throw new AppHttpError(404, 'Ürün master kaydı bulunamadı', 'Not Found')
  }

  const media = resolveProductMedia(row, row.mediaLinks)
  const readiness = calculateWooReadiness({
    category: row.category,
    mainImageUrl: media.mainImageUrl,
    seoTitle: row.seoTitle,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription ?? row.description,
    salePrice: Number(row.defaultSalePrice),
    productType: row.productType,
    activeVariantCount: row.variants.length,
  })

  if (row.wooStatus !== WOO_PRODUCT_STATUS.SYNC_PENDING) {
    throw new AppHttpError(
      400,
      'Woo taslak gönderimi yalnızca sync bekleyen ürünlerde kullanılabilir',
      'Bad Request',
    )
  }

  if (readiness.status !== 'READY') {
    throw new AppHttpError(
      400,
      `Woo taslak gönderimi için ürün hazır değil: ${readiness.missingLabels.join(', ')}`,
      'Bad Request',
      { missingLabels: readiness.missingLabels },
    )
  }

  const service = new WooConnectionService(creds)

  try {
    await service.getProducts(1)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'WooCommerce bağlantı testi başarısız'
    const failed = await prisma.product.update({
      where: { id: productId },
      data: {
        wooStatus: WOO_PRODUCT_STATUS.ERROR,
        wooLastError: message,
        wooSyncRequired: true,
      },
      include: productInclude,
    })
    throw new AppHttpError(502, message, 'Bad Gateway', {
      product: mapProductMasterDetailDto(failed),
    })
  }

  try {
    const draft = await service.createProductDraft({
      name: row.productName,
      slug: buildSlug(row),
      shortDescription: row.shortDescription ?? '',
      longDescription: row.longDescription ?? row.description ?? '',
      regularPrice: formatWooPrice(Number(row.defaultSalePrice)),
      categoryName: row.category,
      mainImageUrl: media.mainImageUrl,
    })

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        wooProductId: draft.id,
        wooStatus: WOO_PRODUCT_STATUS.SYNCED,
        wooSyncRequired: false,
        wooLastSyncAt: new Date(),
        wooLastError: null,
        wooCategoryId: draft.categoryId ?? row.wooCategoryId,
      },
      include: productInclude,
    })

    return mapProductMasterDetailDto(updated)
  } catch (e) {
    const message =
      e instanceof AppHttpError
        ? e.message
        : e instanceof Error
          ? e.message
          : 'WooCommerce taslak gönderimi başarısız'

    const failed = await prisma.product.update({
      where: { id: productId },
      data: {
        wooStatus: WOO_PRODUCT_STATUS.ERROR,
        wooLastError: message,
        wooSyncRequired: true,
      },
      include: productInclude,
    })

    throw new AppHttpError(502, message, 'Bad Gateway', {
      product: mapProductMasterDetailDto(failed),
    })
  }
}

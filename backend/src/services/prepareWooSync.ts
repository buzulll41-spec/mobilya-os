import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { WOO_PRODUCT_STATUS } from '../constants/wooProductStatus.js'
import { calculateWooReadiness } from '../lib/calculateWooReadiness.js'
import { resolveProductMedia } from '../lib/resolveProductMedia.js'
import {
  mapProductMasterDetailDto,
  type ProductMasterDetailDto,
} from '../contracts/productMasterDto.js'

export async function prepareWooSync(
  prisma: PrismaClient,
  productId: string,
): Promise<ProductMasterDetailDto> {
  const row = await prisma.product.findUnique({
    where: { id: productId },
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

  if (readiness.status !== 'READY') {
    throw new AppHttpError(
      400,
      `Woo sync için ürün hazır değil: ${readiness.missingLabels.join(', ')}`,
      'Bad Request',
      { missingLabels: readiness.missingLabels },
    )
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      wooSyncRequired: true,
      wooStatus: WOO_PRODUCT_STATUS.SYNC_PENDING,
      wooLastError: null,
    },
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
  })

  return mapProductMasterDetailDto(updated)
}

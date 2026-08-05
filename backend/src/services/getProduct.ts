import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { mapProductDetailDto, type ProductDetailDto } from '../contracts/productDto.js'
import { LOW_MARGIN_RATIO_THRESHOLD } from '../constants/productCatalog.js'

export async function getProduct(prisma: PrismaClient, productId: string): Promise<ProductDetailDto> {
  const row = await prisma.product.findUnique({
    where: { id: productId },
    include: { defaultSupplier: { select: { id: true, companyName: true } } },
  })
  if (!row) {
    throw new AppHttpError(404, 'Ürün kartı bulunamadı', 'Not Found')
  }
  return mapProductDetailDto(row, LOW_MARGIN_RATIO_THRESHOLD)
}

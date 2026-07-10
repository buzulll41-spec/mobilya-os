import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { mapProductDetailDto, type ProductDetailDto } from '../contracts/productDto.js'
import { LOW_MARGIN_RATIO_THRESHOLD } from '../constants/productCatalog.js'

export async function duplicateProduct(
  prisma: PrismaClient,
  productId: string,
): Promise<ProductDetailDto> {
  const source = await prisma.product.findUnique({
    where: { id: productId },
    include: { defaultSupplier: { select: { id: true, companyName: true } } },
  })
  if (!source) {
    throw new AppHttpError(404, 'Ürün kartı bulunamadı', 'Not Found')
  }

  let suffix = 1
  let code = `${source.productCode}-K${suffix}`
  while (await prisma.product.findUnique({ where: { productCode: code } })) {
    suffix += 1
    code = `${source.productCode}-K${suffix}`
  }

  const row = await prisma.product.create({
    data: {
      productCode: code,
      productName: `${source.productName} (kopya)`,
      category: source.category,
      suiteType: source.suiteType,
      defaultSalePrice: source.defaultSalePrice,
      minSalePrice: source.minSalePrice,
      purchasePrice: source.purchasePrice,
      defaultSupplierId: source.defaultSupplierId,
      deliveryDays: source.deliveryDays,
      isActive: false,
      stockType: source.stockType,
      description: source.description,
    },
    include: { defaultSupplier: { select: { id: true, companyName: true } } },
  })

  return mapProductDetailDto(row, LOW_MARGIN_RATIO_THRESHOLD)
}

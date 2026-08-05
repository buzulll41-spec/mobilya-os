import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  mapProductMasterDetailDto,
  type ProductMasterDetailDto,
} from '../contracts/productMasterDto.js'

export async function getProductMaster(
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
  return mapProductMasterDetailDto(row)
}

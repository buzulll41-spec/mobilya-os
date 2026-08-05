import type { PrismaClient } from '@prisma/client'
import { DEMO_PRODUCTS, DEMO_SUPPLIERS } from './demoProducts.js'
import { buildProductMasterSeedFields } from './productMasterSeedData.js'

export type SeedDemoCatalogResult = {
  suppliersUpserted: number
  productsCreated: number
  productsSkipped: number
  productCount: number
}

/**
 * Demo tedarikçi + ürün kartları — productCode ile idempotent.
 * Mevcut sipariş verisini silmez; yalnızca eksik kartları ekler.
 */
export async function seedDemoCatalog(prisma: PrismaClient): Promise<SeedDemoCatalogResult> {
  let suppliersUpserted = 0
  for (const sup of DEMO_SUPPLIERS) {
    await prisma.supplier.upsert({
      where: { id: sup.id },
      create: {
        id: sup.id,
        code: sup.code,
        companyName: sup.companyName,
        contactName: sup.contactName ?? null,
        phone: sup.phone ?? null,
        isActive: true,
      },
      update: {
        code: sup.code,
        companyName: sup.companyName,
        contactName: sup.contactName ?? null,
        phone: sup.phone ?? null,
        isActive: true,
      },
    })
    suppliersUpserted += 1
  }

  let productsCreated = 0
  let productsSkipped = 0

  const productData = (row: (typeof DEMO_PRODUCTS)[number]) => {
    const master = buildProductMasterSeedFields(row)
    return {
      productName: row.productName,
      category: row.category,
      suiteType: row.suiteType,
      defaultSalePrice: row.defaultSalePrice,
      minSalePrice: row.minSalePrice,
      purchasePrice: row.purchasePrice,
      defaultSupplierId: row.supplierId,
      deliveryDays: row.deliveryDays,
      isActive: row.isActive,
      stockType: row.stockType,
      description: row.description ?? master.longDescription,
      barcode: master.barcode,
      brand: master.brand,
      vatRate: master.vatRate,
      currency: master.currency,
      publishStatus: master.publishStatus,
      webEnabled: master.webEnabled,
      mobileEnabled: master.mobileEnabled,
      marketplaceEnabled: master.marketplaceEnabled,
      slug: master.slug,
      seoTitle: master.seoTitle,
      seoDescription: master.seoDescription,
      shortDescription: master.shortDescription,
      longDescription: master.longDescription,
      widthCm: master.widthCm,
      depthCm: master.depthCm,
      heightCm: master.heightCm,
      bedSize: master.bedSize,
      tableSize: master.tableSize,
      material: master.material,
      warrantyMonths: master.warrantyMonths,
      mainImageUrl: master.mainImageUrl,
      galleryImageUrls: master.galleryImageUrls,
      videoUrl: master.videoUrl,
      catalogPdfUrl: master.catalogPdfUrl,
      productHealthScore: master.productHealthScore,
      missingFields: master.missingFields,
      productType: master.productType,
      collectionCode: master.collectionCode,
      seasonCode: master.seasonCode,
      weightKg: master.weightKg,
      packageWidthCm: master.packageWidthCm,
      packageDepthCm: master.packageDepthCm,
      packageHeightCm: master.packageHeightCm,
      packageCount: master.packageCount,
      assemblyType: master.assemblyType,
      coating: master.coating,
      mechanism: master.mechanism,
      technicalAttributes: master.technicalAttributes,
      colorOptions: master.colorOptions,
      fabricOptions: master.fabricOptions,
      tags: master.tags,
      relatedProductIds: master.relatedProductIds,
    }
  }

  for (const row of DEMO_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { productCode: row.productCode },
      select: { id: true },
    })

    if (existing) {
      await prisma.product.update({
        where: { productCode: row.productCode },
        data: productData(row),
      })
      productsSkipped += 1
      continue
    }

    await prisma.product.create({
      data: {
        productCode: row.productCode,
        ...productData(row),
      },
    })
    productsCreated += 1
  }

  const productCount = await prisma.product.count()

  return {
    suppliersUpserted,
    productsCreated,
    productsSkipped,
    productCount,
  }
}

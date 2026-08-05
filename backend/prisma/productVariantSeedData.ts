import type { PrismaClient } from '@prisma/client'
import { VARIANT_STOCK_STATUS } from '../src/constants/variantStockStatus.js'

export type ProductVariantSeedInput = {
  productCode: string
  variantCode: string
  barcode: string | null
  name: string
  attributes: Record<string, string>
  priceDelta: number
  costDelta: number
  salePrice: number | null
  purchasePrice: number | null
  stockQuantity: number
  stockStatus: string
  widthCm: number | null
  depthCm: number | null
  heightCm: number | null
  color: string | null
  fabric: string | null
  sizeLabel: string | null
  isDefault: boolean
}

const DEMO_VARIANTS: ProductVariantSeedInput[] = [
  // ATLAS YEMEK MASASI
  {
    productCode: 'PRD-ATLAS-001',
    variantCode: 'PRD-ATLAS-001-STD',
    barcode: '86900001001',
    name: 'Standart',
    attributes: { size: '160x90 cm' },
    priceDelta: 0,
    costDelta: 0,
    salePrice: 32_000,
    purchasePrice: 18_500,
    stockQuantity: 4,
    stockStatus: VARIANT_STOCK_STATUS.IN_STOCK,
    widthCm: 160,
    depthCm: 90,
    heightCm: 76,
    color: null,
    fabric: null,
    sizeLabel: '160×90 cm',
    isDefault: true,
  },
  {
    productCode: 'PRD-ATLAS-001',
    variantCode: 'PRD-ATLAS-001-LRG',
    barcode: '86900001002',
    name: 'Büyük boy',
    attributes: { size: '200x100 cm' },
    priceDelta: 4500,
    costDelta: 2200,
    salePrice: 36_500,
    purchasePrice: 20_700,
    stockQuantity: 2,
    stockStatus: VARIANT_STOCK_STATUS.IN_STOCK,
    widthCm: 200,
    depthCm: 100,
    heightCm: 76,
    color: null,
    fabric: null,
    sizeLabel: '200×100 cm',
    isDefault: false,
  },
  // DEFNE YATAK ODASI
  {
    productCode: 'PRD-DEFNE-001',
    variantCode: 'PRD-DEFNE-001-160',
    barcode: '86900002001',
    name: '160×200',
    attributes: { bedSize: '160x200' },
    priceDelta: 0,
    costDelta: 0,
    salePrice: 145_000,
    purchasePrice: 88_000,
    stockQuantity: 1,
    stockStatus: VARIANT_STOCK_STATUS.ON_ORDER,
    widthCm: 160,
    depthCm: 200,
    heightCm: null,
    color: 'Ceviz',
    fabric: null,
    sizeLabel: '160×200 cm',
    isDefault: true,
  },
  {
    productCode: 'PRD-DEFNE-001',
    variantCode: 'PRD-DEFNE-001-180',
    barcode: '86900002002',
    name: '180×200',
    attributes: { bedSize: '180x200' },
    priceDelta: 8500,
    costDelta: 5200,
    salePrice: 153_500,
    purchasePrice: 93_200,
    stockQuantity: 0,
    stockStatus: VARIANT_STOCK_STATUS.ON_ORDER,
    widthCm: 180,
    depthCm: 200,
    heightCm: null,
    color: 'Ceviz',
    fabric: null,
    sizeLabel: '180×200 cm',
    isDefault: false,
  },
  // Koltuk ürünleri — kumaş varyantları
  {
    productCode: 'PRD-ROMA-001',
    variantCode: 'PRD-ROMA-001-GRI',
    barcode: '86900003001',
    name: 'Gri kumaş',
    attributes: { fabric: 'Gri kumaş' },
    priceDelta: 0,
    costDelta: 0,
    salePrice: 72_000,
    purchasePrice: 41_000,
    stockQuantity: 3,
    stockStatus: VARIANT_STOCK_STATUS.IN_STOCK,
    widthCm: null,
    depthCm: null,
    heightCm: null,
    color: 'Gri',
    fabric: 'Gri kumaş',
    sizeLabel: null,
    isDefault: true,
  },
  {
    productCode: 'PRD-ROMA-001',
    variantCode: 'PRD-ROMA-001-BEJ',
    barcode: '86900003002',
    name: 'Bej kumaş',
    attributes: { fabric: 'Bej kumaş' },
    priceDelta: 0,
    costDelta: 0,
    salePrice: 72_000,
    purchasePrice: 41_000,
    stockQuantity: 2,
    stockStatus: VARIANT_STOCK_STATUS.IN_STOCK,
    widthCm: null,
    depthCm: null,
    heightCm: null,
    color: 'Bej',
    fabric: 'Bej kumaş',
    sizeLabel: null,
    isDefault: false,
  },
  {
    productCode: 'PRD-ROMA-001',
    variantCode: 'PRD-ROMA-001-YSL',
    barcode: '86900003003',
    name: 'Yeşil kumaş',
    attributes: { fabric: 'Yeşil kumaş' },
    priceDelta: 1200,
    costDelta: 700,
    salePrice: 73_200,
    purchasePrice: 41_700,
    stockQuantity: 1,
    stockStatus: VARIANT_STOCK_STATUS.LOW_STOCK,
    widthCm: null,
    depthCm: null,
    heightCm: null,
    color: 'Yeşil',
    fabric: 'Yeşil kumaş',
    sizeLabel: null,
    isDefault: false,
  },
  {
    productCode: 'PRD-ZEN-001',
    variantCode: 'PRD-ZEN-001-GRI',
    barcode: '86900004001',
    name: 'Gri kumaş',
    attributes: { fabric: 'Gri kumaş' },
    priceDelta: 0,
    costDelta: 0,
    salePrice: 54_000,
    purchasePrice: 32_000,
    stockQuantity: 2,
    stockStatus: VARIANT_STOCK_STATUS.IN_STOCK,
    widthCm: null,
    depthCm: null,
    heightCm: null,
    color: 'Gri',
    fabric: 'Gri kumaş',
    sizeLabel: null,
    isDefault: true,
  },
  {
    productCode: 'PRD-ZEN-001',
    variantCode: 'PRD-ZEN-001-BEJ',
    barcode: '86900004002',
    name: 'Bej kumaş',
    attributes: { fabric: 'Bej kumaş' },
    priceDelta: 0,
    costDelta: 0,
    salePrice: 54_000,
    purchasePrice: 32_000,
    stockQuantity: 1,
    stockStatus: VARIANT_STOCK_STATUS.IN_STOCK,
    widthCm: null,
    depthCm: null,
    heightCm: null,
    color: 'Bej',
    fabric: 'Bej kumaş',
    sizeLabel: null,
    isDefault: false,
  },
  {
    productCode: 'PRD-ZEN-001',
    variantCode: 'PRD-ZEN-001-YSL',
    barcode: '86900004003',
    name: 'Yeşil kumaş',
    attributes: { fabric: 'Yeşil kumaş' },
    priceDelta: 900,
    costDelta: 500,
    salePrice: 54_900,
    purchasePrice: 32_500,
    stockQuantity: 0,
    stockStatus: VARIANT_STOCK_STATUS.OUT_OF_STOCK,
    widthCm: null,
    depthCm: null,
    heightCm: null,
    color: 'Yeşil',
    fabric: 'Yeşil kumaş',
    sizeLabel: null,
    isDefault: false,
  },
]

export type SeedProductVariantsResult = {
  variantsUpserted: number
  variantCount: number
}

export async function seedProductVariants(prisma: PrismaClient): Promise<SeedProductVariantsResult> {
  let variantsUpserted = 0

  for (const v of DEMO_VARIANTS) {
    const product = await prisma.product.findUnique({
      where: { productCode: v.productCode },
      select: { id: true },
    })
    if (!product) continue

    await prisma.productVariant.upsert({
      where: { variantCode: v.variantCode },
      create: {
        productId: product.id,
        variantCode: v.variantCode,
        barcode: v.barcode,
        name: v.name,
        attributes: v.attributes,
        priceDelta: v.priceDelta,
        costDelta: v.costDelta,
        salePrice: v.salePrice,
        purchasePrice: v.purchasePrice,
        stockQuantity: v.stockQuantity,
        stockStatus: v.stockStatus,
        widthCm: v.widthCm,
        depthCm: v.depthCm,
        heightCm: v.heightCm,
        color: v.color,
        fabric: v.fabric,
        sizeLabel: v.sizeLabel,
        isDefault: v.isDefault,
        isActive: true,
      },
      update: {
        productId: product.id,
        barcode: v.barcode,
        name: v.name,
        attributes: v.attributes,
        priceDelta: v.priceDelta,
        costDelta: v.costDelta,
        salePrice: v.salePrice,
        purchasePrice: v.purchasePrice,
        stockQuantity: v.stockQuantity,
        stockStatus: v.stockStatus,
        widthCm: v.widthCm,
        depthCm: v.depthCm,
        heightCm: v.heightCm,
        color: v.color,
        fabric: v.fabric,
        sizeLabel: v.sizeLabel,
        isDefault: v.isDefault,
        isActive: true,
      },
    })
    variantsUpserted += 1
  }

  const variantCount = await prisma.productVariant.count()
  return { variantsUpserted, variantCount }
}

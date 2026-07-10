import type { Product, Supplier } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { decimalToNumber } from '../lib/money.js'
import { productStockTypeLabelTr, type ProductStockType } from '../constants/productStockTypes.js'
import {
  isSalesSourceType,
  salesSourceTypeLabelTr,
  type SalesSourceType,
} from '../constants/salesSourceTypes.js'
import {
  isDisplayFloor,
  displayFloorLabelTr,
  type DisplayFloor,
} from '../constants/displayFloors.js'
import {
  isPhysicalLocation,
  physicalLocationLabelTr,
  type PhysicalLocation,
} from '../constants/physicalLocations.js'
import {
  isExternalSupplyType,
  externalSupplyTypeLabelTr,
  type ExternalSupplyType,
} from '../constants/externalSupplyTypes.js'

export type ProductListItemDto = {
  id: string
  productCode: string
  productName: string
  category: string
  suiteType: string | null
  defaultSalePrice: string
  minSalePrice: string
  purchasePrice: string
  defaultSupplierId: string | null
  defaultSupplierName: string | null
  deliveryDays: number
  isActive: boolean
  stockType: ProductStockType
  stockTypeLabel: string
  salesSourceType: SalesSourceType | null
  salesSourceTypeLabel: string | null
  displayFloor: DisplayFloor | null
  displayFloorLabel: string | null
  externalSupplyType: ExternalSupplyType | null
  externalSupplyTypeLabel: string | null
  physicalLocation: PhysicalLocation | null
  physicalLocationLabel: string | null
  marginRatio: number
  isLowMargin: boolean
  createdAt: string
}

export type ProductDetailDto = ProductListItemDto & {
  description: string | null
  updatedAt: string
}

export type ProductCatalogKpisDto = {
  activeCount: number
  inactiveCount: number
  lowMarginCount: number
  topCategory: string | null
}

export type ProductListResponseDto = {
  items: ProductListItemDto[]
  kpis: ProductCatalogKpisDto
  total: number
  page: number
  pageSize: number
}

type ProductRow = Product & { defaultSupplier?: Pick<Supplier, 'id' | 'companyName'> | null }

export function computeMarginRatio(sale: number, purchase: number): number {
  if (!Number.isFinite(sale) || sale <= 0) return 0
  return (sale - purchase) / sale
}

export function mapProductListItemDto(
  row: ProductRow,
  lowMarginThreshold = 0.15,
): ProductListItemDto {
  const sale = Number(row.defaultSalePrice)
  const purchase = Number(row.purchasePrice)
  const marginRatio = computeMarginRatio(sale, purchase)
  const stockType = row.stockType as ProductStockType

  const salesSourceType =
    typeof row.salesSourceType === 'string' && isSalesSourceType(row.salesSourceType)
      ? row.salesSourceType
      : null
  const displayFloor =
    typeof row.displayFloor === 'string' && isDisplayFloor(row.displayFloor)
      ? row.displayFloor
      : null
  const externalSupplyType =
    typeof row.externalSupplyType === 'string' && isExternalSupplyType(row.externalSupplyType)
      ? row.externalSupplyType
      : null
  const physicalLocation =
    typeof row.physicalLocation === 'string' && isPhysicalLocation(row.physicalLocation)
      ? row.physicalLocation
      : null

  return {
    id: row.id,
    productCode: row.productCode,
    productName: row.productName,
    category: row.category,
    suiteType: row.suiteType,
    defaultSalePrice: formatMoneyAmount(decimalToNumber(row.defaultSalePrice)),
    minSalePrice: formatMoneyAmount(decimalToNumber(row.minSalePrice)),
    purchasePrice: formatMoneyAmount(decimalToNumber(row.purchasePrice)),
    defaultSupplierId: row.defaultSupplierId,
    defaultSupplierName: row.defaultSupplier?.companyName ?? null,
    deliveryDays: row.deliveryDays,
    isActive: row.isActive,
    stockType,
    stockTypeLabel: productStockTypeLabelTr(stockType),
    salesSourceType,
    salesSourceTypeLabel: salesSourceType ? salesSourceTypeLabelTr(salesSourceType) : null,
    displayFloor,
    displayFloorLabel: displayFloor ? displayFloorLabelTr(displayFloor) : null,
    externalSupplyType,
    externalSupplyTypeLabel: externalSupplyType
      ? externalSupplyTypeLabelTr(externalSupplyType)
      : null,
    physicalLocation,
    physicalLocationLabel: physicalLocation ? physicalLocationLabelTr(physicalLocation) : null,
    marginRatio,
    isLowMargin: marginRatio < lowMarginThreshold,
    createdAt: row.createdAt.toISOString(),
  }
}

export function mapProductDetailDto(row: ProductRow, lowMarginThreshold = 0.15): ProductDetailDto {
  return {
    ...mapProductListItemDto(row, lowMarginThreshold),
    description: row.description,
    updatedAt: row.updatedAt.toISOString(),
  }
}

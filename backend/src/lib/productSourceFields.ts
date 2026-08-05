import { AppHttpError } from '../errors/apiError.js'
import {
  SALES_SOURCE_TYPE,
  isCreatableSalesSourceType,
  type SalesSourceType,
} from '../constants/salesSourceTypes.js'
import { isDisplayFloor, type DisplayFloor } from '../constants/displayFloors.js'
import { isExternalSupplyType, type ExternalSupplyType } from '../constants/externalSupplyTypes.js'
import { isPhysicalLocation, type PhysicalLocation } from '../constants/physicalLocations.js'

export type ProductSourceFieldsInput = {
  salesSourceType?: unknown
  displayFloor?: unknown
  externalSupplyType?: unknown
  physicalLocation?: unknown
}

export type ProductSourceFields = {
  salesSourceType: SalesSourceType
  displayFloor: DisplayFloor | null
  externalSupplyType: ExternalSupplyType | null
  physicalLocation: PhysicalLocation | null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Koşullu satış kaynağı doğrulaması (satış analitiği ekseni):
 *  - IN_STORE_DISPLAY → displayFloor zorunlu (Bodrum/Giriş/1. Kat)
 *  - EXTERNAL_SUPPLY  → externalSupplyType zorunlu
 *  - STOCK_ITEM       → alt alan yok
 * Depo/stok ekseni `physicalLocation` bağımsız ve opsiyoneldir; satış kaynağı DEĞİLDİR.
 * İlgisiz satış alt alanları null'a normalize edilir; geçersiz değerlerde 400 atar.
 */
export function parseProductSourceFields(input: ProductSourceFieldsInput): ProductSourceFields {
  const sourceRaw = str(input.salesSourceType)
  if (!isCreatableSalesSourceType(sourceRaw)) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { salesSourceType: 'Required' })
  }
  const salesSourceType: SalesSourceType = sourceRaw

  // Fiziksel lokasyon — satış kaynağından bağımsız, opsiyonel.
  const physicalRaw = str(input.physicalLocation)
  if (physicalRaw && !isPhysicalLocation(physicalRaw)) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { physicalLocation: 'Invalid' })
  }
  const physicalLocation: PhysicalLocation | null = physicalRaw
    ? (physicalRaw as PhysicalLocation)
    : null

  if (salesSourceType === SALES_SOURCE_TYPE.IN_STORE_DISPLAY) {
    const floor = str(input.displayFloor)
    if (!isDisplayFloor(floor)) {
      throw new AppHttpError(400, 'Validation failed', 'Bad Request', { displayFloor: 'Required' })
    }
    return { salesSourceType, displayFloor: floor, externalSupplyType: null, physicalLocation }
  }

  if (salesSourceType === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY) {
    const ext = str(input.externalSupplyType)
    if (!isExternalSupplyType(ext)) {
      throw new AppHttpError(400, 'Validation failed', 'Bad Request', {
        externalSupplyType: 'Required',
      })
    }
    return { salesSourceType, displayFloor: null, externalSupplyType: ext, physicalLocation }
  }

  // STOCK_ITEM — satış alt alanı yok
  return { salesSourceType, displayFloor: null, externalSupplyType: null, physicalLocation }
}

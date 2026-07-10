import { decimalToNumber } from '../lib/money.js'
import { roundMoney } from '../lib/orderLineCreate.js'
import { SALES_SOURCE_TYPE, type SalesSourceType } from '../constants/salesSourceTypes.js'
import { isDisplayFloor, type DisplayFloor } from '../constants/displayFloors.js'
import { isExternalSupplyType, type ExternalSupplyType } from '../constants/externalSupplyTypes.js'

/**
 * Sipariş kalemi satış kaynağı snapshot'ı için merkezi iş kuralları.
 *
 * KRİTİK: Bu fonksiyon `physicalLocation` (ör. Depo Katı) alanını HİÇ parametre
 * olarak almaz. Satış kaynağı belirlemede fiziksel lokasyon asla kullanılmaz.
 * Depo / WAREHOUSE gibi eski veya yanlış kaynaklar UNKNOWN'a düşürülür; bu sayede
 * Depo Katı'nın satış kaynağı olarak rapora sızması yapısal olarak imkânsızdır.
 *
 * Kurallar:
 *  - IN_STORE_DISPLAY yalnızca GEÇERLİ bir displayFloor ile anlamlıdır.
 *  - EXTERNAL_SUPPLY yalnızca GEÇERLİ bir externalSupplyType ile anlamlıdır.
 *  - STOCK_ITEM bağımsızdır (alt alan gerektirmez).
 *  - Diğer her şey (WAREHOUSE, null, geçersiz, eksik alt alan) → UNKNOWN.
 *  - soldUnitCost: explicit maliyet > ürün alış maliyeti > 0.
 */

export type SalesSnapshotInput = {
  /** Ürünün (veya explicit kalemin) satış kaynağı tipi */
  salesSourceType?: string | null
  /** Sergi katı (yalnızca IN_STORE_DISPLAY için anlamlı) */
  displayFloor?: string | null
  /** Dış tedarik tipi (yalnızca EXTERNAL_SUPPLY için anlamlı) */
  externalSupplyType?: string | null
  /** Ürünün o andaki alış maliyeti (Decimal | number | string | null) */
  purchasePrice?: unknown
  /** Kalem düzeyinde explicit maliyet override'ı (varsa önceliklidir) */
  unitCostOverride?: number | null
}

export type OrderItemSalesSnapshot = {
  soldSalesSourceType: SalesSourceType
  soldDisplayFloor: DisplayFloor | null
  soldExternalSupplyType: ExternalSupplyType | null
  soldUnitCost: number
}

function resolveUnitCost(input: SalesSnapshotInput): number {
  if (
    typeof input.unitCostOverride === 'number' &&
    Number.isFinite(input.unitCostOverride) &&
    input.unitCostOverride >= 0
  ) {
    return roundMoney(input.unitCostOverride)
  }
  const fromProduct = decimalToNumber(input.purchasePrice)
  return Number.isFinite(fromProduct) && fromProduct > 0 ? roundMoney(fromProduct) : 0
}

export function buildOrderItemSalesSnapshot(input: SalesSnapshotInput): OrderItemSalesSnapshot {
  const soldUnitCost = resolveUnitCost(input)

  const source = typeof input.salesSourceType === 'string' ? input.salesSourceType.trim() : ''
  const floor = typeof input.displayFloor === 'string' ? input.displayFloor.trim() : ''
  const ext = typeof input.externalSupplyType === 'string' ? input.externalSupplyType.trim() : ''

  if (source === SALES_SOURCE_TYPE.IN_STORE_DISPLAY && isDisplayFloor(floor)) {
    return {
      soldSalesSourceType: SALES_SOURCE_TYPE.IN_STORE_DISPLAY,
      soldDisplayFloor: floor,
      soldExternalSupplyType: null,
      soldUnitCost,
    }
  }

  if (source === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY && isExternalSupplyType(ext)) {
    return {
      soldSalesSourceType: SALES_SOURCE_TYPE.EXTERNAL_SUPPLY,
      soldDisplayFloor: null,
      soldExternalSupplyType: ext,
      soldUnitCost,
    }
  }

  if (source === SALES_SOURCE_TYPE.STOCK_ITEM) {
    return {
      soldSalesSourceType: SALES_SOURCE_TYPE.STOCK_ITEM,
      soldDisplayFloor: null,
      soldExternalSupplyType: null,
      soldUnitCost,
    }
  }

  // WAREHOUSE / Depo / null / geçersiz / eksik alt alan → UNKNOWN
  return {
    soldSalesSourceType: SALES_SOURCE_TYPE.UNKNOWN,
    soldDisplayFloor: null,
    soldExternalSupplyType: null,
    soldUnitCost,
  }
}

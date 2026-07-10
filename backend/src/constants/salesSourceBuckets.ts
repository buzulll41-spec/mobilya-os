import { SALES_SOURCE_TYPE } from './salesSourceTypes.js'
import { DISPLAY_FLOOR, isDisplayFloor } from './displayFloors.js'
import { EXTERNAL_SUPPLY_TYPE, isExternalSupplyType } from './externalSupplyTypes.js'

/**
 * Satış Kaynağı Analitiği kırılım ("bucket") tanımları.
 *
 * KRİTİK: Bucket YALNIZCA satış kaynağı snapshot alanlarından türetilir
 * (soldSalesSourceType / soldDisplayFloor / soldExternalSupplyType).
 * `physicalLocation` (ör. Depo Katı) buraya HİÇBİR zaman girmez — depo bir
 * satış kaynağı değil, fiziksel/stok lokasyonudur. Bu fonksiyon physical
 * alanlara erişmediği için Depo Katı'nın satış raporuna sızması yapısal
 * olarak imkânsızdır.
 */

export type SalesSourceBucketGroup = 'IN_STORE' | 'EXTERNAL' | 'STOCK' | 'UNKNOWN'

export type SalesSourceBucket = {
  key: string
  label: string
  group: SalesSourceBucketGroup
  sortIndex: number
}

export const UNKNOWN_BUCKET: SalesSourceBucket = {
  key: 'UNKNOWN',
  label: 'Bilinmeyen',
  group: 'UNKNOWN',
  sortIndex: 9,
}

/** Sabit kanonik kırılım listesi (rapor satır sırası). */
export const SALES_SOURCE_BUCKETS: SalesSourceBucket[] = [
  { key: `${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.BASEMENT}`, label: 'Bodrum Kat', group: 'IN_STORE', sortIndex: 0 },
  { key: `${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.GROUND_FLOOR}`, label: 'Giriş Kat', group: 'IN_STORE', sortIndex: 1 },
  { key: `${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.FIRST_FLOOR}`, label: '1. Kat', group: 'IN_STORE', sortIndex: 2 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.CATALOG}`, label: 'Dış Tedarik / Katalog', group: 'EXTERNAL', sortIndex: 3 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.WEBSITE}`, label: 'Dış Tedarik / Web Sitesi', group: 'EXTERNAL', sortIndex: 4 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.SUPPLIER_SPECIAL_ORDER}`, label: 'Dış Tedarik / Tedarikçi Özel Sipariş', group: 'EXTERNAL', sortIndex: 5 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.OTHER_STORE}`, label: 'Dış Tedarik / Başka Mağaza', group: 'EXTERNAL', sortIndex: 6 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.OTHER}`, label: 'Dış Tedarik / Diğer', group: 'EXTERNAL', sortIndex: 7 },
  { key: SALES_SOURCE_TYPE.STOCK_ITEM, label: 'Stok Ürünü', group: 'STOCK', sortIndex: 8 },
  UNKNOWN_BUCKET,
]

const BUCKET_BY_KEY = new Map(SALES_SOURCE_BUCKETS.map((b) => [b.key, b]))

export function bucketByKey(key: string): SalesSourceBucket {
  return BUCKET_BY_KEY.get(key) ?? UNKNOWN_BUCKET
}

export type SalesSourceSnapshot = {
  soldSalesSourceType?: string | null
  soldDisplayFloor?: string | null
  soldExternalSupplyType?: string | null
}

/**
 * Satış kalemi snapshot'ından kırılım bucket'ı çözer.
 * Tanımsız / geçersiz / eski (WAREHOUSE) değerler → Bilinmeyen.
 */
export function resolveSalesSourceBucket(snap: SalesSourceSnapshot): SalesSourceBucket {
  const source = typeof snap.soldSalesSourceType === 'string' ? snap.soldSalesSourceType : ''

  if (source === SALES_SOURCE_TYPE.IN_STORE_DISPLAY) {
    const floor = typeof snap.soldDisplayFloor === 'string' ? snap.soldDisplayFloor : ''
    if (isDisplayFloor(floor)) {
      return bucketByKey(`${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${floor}`)
    }
    return UNKNOWN_BUCKET
  }

  if (source === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY) {
    const ext = typeof snap.soldExternalSupplyType === 'string' ? snap.soldExternalSupplyType : ''
    if (isExternalSupplyType(ext)) {
      return bucketByKey(`${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${ext}`)
    }
    return UNKNOWN_BUCKET
  }

  if (source === SALES_SOURCE_TYPE.STOCK_ITEM) {
    return bucketByKey(SALES_SOURCE_TYPE.STOCK_ITEM)
  }

  return UNKNOWN_BUCKET
}

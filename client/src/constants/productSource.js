/**
 * Satış Kaynağı ↔ Fiziksel/Stok Lokasyon sınıflandırması.
 *
 * İki bağımsız eksen:
 *  - Satış Kaynağı (salesSourceType): satış analitiğinde "nereden satıldı?".
 *  - Fiziksel Lokasyon (physicalLocation): stok/depo takibinde "ürün şu an nerede?".
 * Depo Katı bir satış kaynağı DEĞİL, yalnızca fiziksel lokasyondur.
 *
 * Backend `constants/salesSourceTypes|displayFloors|physicalLocations|externalSupplyTypes|stockStatuses` ile eş.
 */

/* ── Satış Kaynağı ─────────────────────────────────────────── */

export const SALES_SOURCE_TYPE = /** @type {const} */ ({
  IN_STORE_DISPLAY: 'IN_STORE_DISPLAY',
  EXTERNAL_SUPPLY: 'EXTERNAL_SUPPLY',
  STOCK_ITEM: 'STOCK_ITEM',
  UNKNOWN: 'UNKNOWN',
})

/** @typedef {'IN_STORE_DISPLAY' | 'EXTERNAL_SUPPLY' | 'STOCK_ITEM' | 'UNKNOWN'} SalesSourceType */

export const SALES_SOURCE_TYPE_LABELS = {
  IN_STORE_DISPLAY: 'Mağaza Sergi Ürünü',
  EXTERNAL_SUPPLY: 'Dış Tedarik Ürünü',
  STOCK_ITEM: 'Stok Ürünü',
  UNKNOWN: 'Bilinmeyen',
}

/** Sınıflandırılmamış / eski kayıt etiketi (raporlarda) */
export const UNKNOWN_SOURCE_LABEL = SALES_SOURCE_TYPE_LABELS.UNKNOWN

/* ── Sergi Katı (yalnızca IN_STORE_DISPLAY için) ───────────── */

export const DISPLAY_FLOOR = /** @type {const} */ ({
  BASEMENT: 'BASEMENT',
  GROUND_FLOOR: 'GROUND_FLOOR',
  FIRST_FLOOR: 'FIRST_FLOOR',
})

/** @typedef {'BASEMENT' | 'GROUND_FLOOR' | 'FIRST_FLOOR'} DisplayFloor */

export const DISPLAY_FLOOR_LABELS = {
  BASEMENT: 'Bodrum Kat',
  GROUND_FLOOR: 'Giriş Kat',
  FIRST_FLOOR: '1. Kat',
}

/* ── Dış Tedarik Kaynağı (yalnızca EXTERNAL_SUPPLY için) ───── */

export const EXTERNAL_SUPPLY_TYPE = /** @type {const} */ ({
  CATALOG: 'CATALOG',
  WEBSITE: 'WEBSITE',
  SUPPLIER_SPECIAL_ORDER: 'SUPPLIER_SPECIAL_ORDER',
  OTHER_STORE: 'OTHER_STORE',
  OTHER: 'OTHER',
})

/** @typedef {'CATALOG' | 'WEBSITE' | 'SUPPLIER_SPECIAL_ORDER' | 'OTHER_STORE' | 'OTHER'} ExternalSupplyType */

export const EXTERNAL_SUPPLY_TYPE_LABELS = {
  CATALOG: 'Katalog',
  WEBSITE: 'Web Sitesi',
  SUPPLIER_SPECIAL_ORDER: 'Tedarikçi Özel Sipariş',
  OTHER_STORE: 'Başka Mağaza',
  OTHER: 'Diğer',
}

/* ── Fiziksel Lokasyon (stok/depo ekseni — satış kaynağı DEĞİL) */

export const PHYSICAL_LOCATION = /** @type {const} */ ({
  BASEMENT: 'BASEMENT',
  GROUND_FLOOR: 'GROUND_FLOOR',
  FIRST_FLOOR: 'FIRST_FLOOR',
  WAREHOUSE_FLOOR: 'WAREHOUSE_FLOOR',
  CUSTOMER_HOLD_AREA: 'CUSTOMER_HOLD_AREA',
  READY_TO_SHIP_AREA: 'READY_TO_SHIP_AREA',
})

/** @typedef {'BASEMENT' | 'GROUND_FLOOR' | 'FIRST_FLOOR' | 'WAREHOUSE_FLOOR' | 'CUSTOMER_HOLD_AREA' | 'READY_TO_SHIP_AREA'} PhysicalLocation */

export const PHYSICAL_LOCATION_LABELS = {
  BASEMENT: 'Bodrum Kat',
  GROUND_FLOOR: 'Giriş Kat',
  FIRST_FLOOR: '1. Kat',
  WAREHOUSE_FLOOR: 'Depo Katı',
  CUSTOMER_HOLD_AREA: 'Müşteri İçin Beklemede',
  READY_TO_SHIP_AREA: 'Sevke Hazır Alanı',
}

/* ── Stok Durumu (Depo Girişi / stok takibi için — sonraki faz) */

export const STOCK_STATUS = /** @type {const} */ ({
  IN_STOCK: 'IN_STOCK',
  RESERVED: 'RESERVED',
  CUSTOMER_HOLD: 'CUSTOMER_HOLD',
  READY_TO_SHIP: 'READY_TO_SHIP',
  MISSING_PART: 'MISSING_PART',
  SHIPPED: 'SHIPPED',
})

/** @typedef {'IN_STOCK' | 'RESERVED' | 'CUSTOMER_HOLD' | 'READY_TO_SHIP' | 'MISSING_PART' | 'SHIPPED'} StockStatus */

export const STOCK_STATUS_LABELS = {
  IN_STOCK: 'Stokta',
  RESERVED: 'Rezerve Edildi',
  CUSTOMER_HOLD: 'Müşteri Ürünü Bekliyor',
  READY_TO_SHIP: 'Sevke Hazır',
  MISSING_PART: 'Eksik / Parça Bekliyor',
  SHIPPED: 'Sevk Edildi',
}

/* ── Form `<select>` option dizileri ───────────────────────── */

/** Üründe seçilebilir somut satış kaynakları (UNKNOWN hariç). */
export const SALES_SOURCE_TYPE_OPTIONS = [
  SALES_SOURCE_TYPE.IN_STORE_DISPLAY,
  SALES_SOURCE_TYPE.EXTERNAL_SUPPLY,
  SALES_SOURCE_TYPE.STOCK_ITEM,
].map((value) => ({ value, label: SALES_SOURCE_TYPE_LABELS[value] }))

export const DISPLAY_FLOOR_OPTIONS = Object.entries(DISPLAY_FLOOR_LABELS).map(([value, label]) => ({
  value,
  label,
}))
export const EXTERNAL_SUPPLY_TYPE_OPTIONS = Object.entries(EXTERNAL_SUPPLY_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
)
export const PHYSICAL_LOCATION_OPTIONS = Object.entries(PHYSICAL_LOCATION_LABELS).map(
  ([value, label]) => ({ value, label }),
)
export const STOCK_STATUS_OPTIONS = Object.entries(STOCK_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

/* ── Yardımcılar ───────────────────────────────────────────── */

/**
 * Satış analitiği kırılım etiketi (satış kaleminden okunur).
 * Depo Katı asla satış kaynağı olarak görünmez.
 * @param {{ salesSourceType?: string | null, displayFloor?: string | null, externalSupplyType?: string | null }} v
 * @returns {string}
 */
export function describeSalesSource(v) {
  if (!v || !v.salesSourceType || v.salesSourceType === SALES_SOURCE_TYPE.UNKNOWN) {
    return UNKNOWN_SOURCE_LABEL
  }
  if (v.salesSourceType === SALES_SOURCE_TYPE.IN_STORE_DISPLAY) {
    return v.displayFloor
      ? (DISPLAY_FLOOR_LABELS[v.displayFloor] ?? UNKNOWN_SOURCE_LABEL)
      : SALES_SOURCE_TYPE_LABELS.IN_STORE_DISPLAY
  }
  if (v.salesSourceType === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY) {
    const ext = v.externalSupplyType ? EXTERNAL_SUPPLY_TYPE_LABELS[v.externalSupplyType] : undefined
    return ext ? `Dış Tedarik · ${ext}` : SALES_SOURCE_TYPE_LABELS.EXTERNAL_SUPPLY
  }
  if (v.salesSourceType === SALES_SOURCE_TYPE.STOCK_ITEM) {
    return SALES_SOURCE_TYPE_LABELS.STOCK_ITEM
  }
  return UNKNOWN_SOURCE_LABEL
}

/**
 * Fiziksel lokasyon etiketi.
 * @param {string | null | undefined} code
 * @returns {string | null}
 */
export function physicalLocationLabel(code) {
  if (!code) return null
  return PHYSICAL_LOCATION_LABELS[code] ?? null
}

/**
 * Form gönderiminden önce koşullu zorunluluk kontrolü (backend ile eş kurallar).
 * Satış kaynağı zorunlu; alt alanlar kaynağa göre koşullu.
 * physicalLocation bağımsız/opsiyoneldir; sadece geçerlilik kontrolü yapılır.
 * @param {{ salesSourceType?: string, displayFloor?: string, externalSupplyType?: string, physicalLocation?: string }} v
 * @returns {{ valid: boolean, field?: 'salesSourceType' | 'displayFloor' | 'externalSupplyType' | 'physicalLocation' }}
 */
export function validateProductSourceSelection(v) {
  const source = v?.salesSourceType
  if (
    !source ||
    source === SALES_SOURCE_TYPE.UNKNOWN ||
    !(source in SALES_SOURCE_TYPE_LABELS)
  ) {
    return { valid: false, field: 'salesSourceType' }
  }
  if (source === SALES_SOURCE_TYPE.IN_STORE_DISPLAY) {
    if (!v.displayFloor || !(v.displayFloor in DISPLAY_FLOOR_LABELS)) {
      return { valid: false, field: 'displayFloor' }
    }
  }
  if (source === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY) {
    if (!v.externalSupplyType || !(v.externalSupplyType in EXTERNAL_SUPPLY_TYPE_LABELS)) {
      return { valid: false, field: 'externalSupplyType' }
    }
  }
  if (v.physicalLocation && !(v.physicalLocation in PHYSICAL_LOCATION_LABELS)) {
    return { valid: false, field: 'physicalLocation' }
  }
  return { valid: true }
}

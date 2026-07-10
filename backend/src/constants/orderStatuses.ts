/** Client `ORDER_STATUSES` ile uyumlu operasyon durumları */
export const ORDER_DISPLAY_STATUSES = [
  'Bekleniyor',
  'Kısmi Geldi',
  'Üretimde',
  'Geldi',
  'Eksik Var',
  'Hazır',
  'Sevke Hazır',
  'Teslim Edildi',
] as const

export type OrderDisplayStatus = (typeof ORDER_DISPLAY_STATUSES)[number]

export function isOrderDisplayStatus(value: string): value is OrderDisplayStatus {
  return (ORDER_DISPLAY_STATUSES as readonly string[]).includes(value)
}

export const PHYSICAL_LOCATION = {
  BASEMENT: 'BASEMENT',
  GROUND_FLOOR: 'GROUND_FLOOR',
  FIRST_FLOOR: 'FIRST_FLOOR',
  WAREHOUSE_FLOOR: 'WAREHOUSE_FLOOR',
  CUSTOMER_HOLD_AREA: 'CUSTOMER_HOLD_AREA',
  READY_TO_SHIP_AREA: 'READY_TO_SHIP_AREA',
} as const

export type PhysicalLocation = (typeof PHYSICAL_LOCATION)[keyof typeof PHYSICAL_LOCATION]

const PHYSICAL_LOCATIONS = new Set<string>(Object.values(PHYSICAL_LOCATION))

export function isPhysicalLocation(v: string): v is PhysicalLocation {
  return PHYSICAL_LOCATIONS.has(v)
}

export function physicalLocationLabelTr(loc: PhysicalLocation): string {
  switch (loc) {
    case PHYSICAL_LOCATION.BASEMENT:
      return 'Bodrum Kat'
    case PHYSICAL_LOCATION.GROUND_FLOOR:
      return 'Giriş Kat'
    case PHYSICAL_LOCATION.FIRST_FLOOR:
      return '1. Kat'
    case PHYSICAL_LOCATION.WAREHOUSE_FLOOR:
      return 'Depo Katı'
    case PHYSICAL_LOCATION.CUSTOMER_HOLD_AREA:
      return 'Müşteri İçin Beklemede'
    case PHYSICAL_LOCATION.READY_TO_SHIP_AREA:
      return 'Sevke Hazır Alanı'
    default:
      return loc
  }
}

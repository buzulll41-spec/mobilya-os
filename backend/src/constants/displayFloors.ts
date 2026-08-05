export const DISPLAY_FLOOR = {
  BASEMENT: 'BASEMENT',
  GROUND_FLOOR: 'GROUND_FLOOR',
  FIRST_FLOOR: 'FIRST_FLOOR',
} as const

export type DisplayFloor = (typeof DISPLAY_FLOOR)[keyof typeof DISPLAY_FLOOR]

const DISPLAY_FLOORS = new Set<string>(Object.values(DISPLAY_FLOOR))

export function isDisplayFloor(v: string): v is DisplayFloor {
  return DISPLAY_FLOORS.has(v)
}

export function displayFloorLabelTr(floor: DisplayFloor): string {
  switch (floor) {
    case DISPLAY_FLOOR.BASEMENT:
      return 'Bodrum Kat'
    case DISPLAY_FLOOR.GROUND_FLOOR:
      return 'Giriş Kat'
    case DISPLAY_FLOOR.FIRST_FLOOR:
      return '1. Kat'
    default:
      return floor
  }
}

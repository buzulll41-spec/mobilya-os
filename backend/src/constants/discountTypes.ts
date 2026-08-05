export const DISCOUNT_TYPE = {
  NONE: 'NONE',
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
  COMBINED: 'COMBINED',
} as const

export type DiscountType = (typeof DISCOUNT_TYPE)[keyof typeof DISCOUNT_TYPE]

export function isDiscountType(value: string): value is DiscountType {
  return (Object.values(DISCOUNT_TYPE) as string[]).includes(value)
}

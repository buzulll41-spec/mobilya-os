export const PRODUCT_PUBLISH_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  PASSIVE: 'PASSIVE',
} as const

export type ProductPublishStatus =
  (typeof PRODUCT_PUBLISH_STATUS)[keyof typeof PRODUCT_PUBLISH_STATUS]

export function isProductPublishStatus(v: string): v is ProductPublishStatus {
  return v === PRODUCT_PUBLISH_STATUS.DRAFT ||
    v === PRODUCT_PUBLISH_STATUS.PUBLISHED ||
    v === PRODUCT_PUBLISH_STATUS.PASSIVE
}

export function productPublishStatusLabelTr(status: ProductPublishStatus): string {
  switch (status) {
    case PRODUCT_PUBLISH_STATUS.DRAFT:
      return 'Taslak'
    case PRODUCT_PUBLISH_STATUS.PUBLISHED:
      return 'Yayında'
    case PRODUCT_PUBLISH_STATUS.PASSIVE:
      return 'Pasif'
    default:
      return status
  }
}

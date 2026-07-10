export const MEDIA_STORAGE_PROVIDER = {
  LOCAL: 'LOCAL',
  R2: 'R2',
  S3: 'S3',
} as const

export type MediaStorageProvider =
  (typeof MEDIA_STORAGE_PROVIDER)[keyof typeof MEDIA_STORAGE_PROVIDER]

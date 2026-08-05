export const MEDIA_ASSET_ROLE = {
  HERO: 'HERO',
  GALLERY: 'GALLERY',
  DETAIL: 'DETAIL',
  DIMENSION: 'DIMENSION',
  LIFESTYLE: 'LIFESTYLE',
  VIDEO: 'VIDEO',
  PDF: 'PDF',
} as const

export type MediaAssetRole = (typeof MEDIA_ASSET_ROLE)[keyof typeof MEDIA_ASSET_ROLE]

const ROLE_SET = new Set<string>(Object.values(MEDIA_ASSET_ROLE))

export function isMediaAssetRole(v: string): v is MediaAssetRole {
  return ROLE_SET.has(v)
}

export function mediaAssetRoleLabelTr(role: MediaAssetRole): string {
  switch (role) {
    case MEDIA_ASSET_ROLE.HERO:
      return 'Ana görsel'
    case MEDIA_ASSET_ROLE.GALLERY:
      return 'Galeri'
    case MEDIA_ASSET_ROLE.DETAIL:
      return 'Detay'
    case MEDIA_ASSET_ROLE.DIMENSION:
      return 'Ölçü'
    case MEDIA_ASSET_ROLE.LIFESTYLE:
      return 'Lifestyle'
    case MEDIA_ASSET_ROLE.VIDEO:
      return 'Video'
    case MEDIA_ASSET_ROLE.PDF:
      return 'PDF'
    default:
      return role
  }
}

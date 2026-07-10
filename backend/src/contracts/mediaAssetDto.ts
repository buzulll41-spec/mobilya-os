import type { MediaAsset, ProductMediaLink } from '@prisma/client'
import { mediaAssetRoleLabelTr, type MediaAssetRole } from '../constants/mediaAssetRoles.js'

export type MediaAssetDto = {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  fileSizeLabel: string
  storageProvider: string
  storageKey: string
  cdnUrl: string
  thumbnailUrl: string | null
  uploadedBy: string | null
  uploadedAt: string
  type: 'IMAGE' | 'VIDEO' | 'PDF' | 'OTHER'
  typeLabel: string
  usageCount: number
  previewUrl: string | null
}

export type ProductMediaLinkDto = {
  id: string
  productId: string
  assetId: string
  role: MediaAssetRole
  roleLabel: string
  sortOrder: number
  altText: string | null
  asset: MediaAssetDto
}

export type ProductMediaBundleDto = {
  productId: string
  hero: ProductMediaLinkDto | null
  gallery: ProductMediaLinkDto[]
  video: ProductMediaLinkDto | null
  pdf: ProductMediaLinkDto | null
  resolvedMedia: {
    mainImageUrl: string | null
    galleryImageUrls: string[]
    videoUrl: string | null
    catalogPdfUrl: string | null
  }
}

export type MediaCenterListResponseDto = {
  assets: MediaAssetDto[]
  total: number
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function resolveAssetType(mimeType: string): MediaAssetDto['type'] {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType === 'application/pdf') return 'PDF'
  return 'OTHER'
}

const TYPE_LABELS: Record<MediaAssetDto['type'], string> = {
  IMAGE: 'Görsel',
  VIDEO: 'Video',
  PDF: 'PDF',
  OTHER: 'Dosya',
}

export function mapMediaAssetDto(
  row: MediaAsset,
  usageCount = 0,
): MediaAssetDto {
  const type = resolveAssetType(row.mimeType)
  return {
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    fileSizeLabel: formatFileSize(row.fileSize),
    storageProvider: row.storageProvider,
    storageKey: row.storageKey,
    cdnUrl: row.cdnUrl,
    thumbnailUrl: row.thumbnailUrl,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt.toISOString(),
    type,
    typeLabel: TYPE_LABELS[type],
    usageCount,
    previewUrl: row.thumbnailUrl ?? (type === 'IMAGE' ? row.cdnUrl : null),
  }
}

export function mapProductMediaLinkDto(
  link: ProductMediaLink & { asset: MediaAsset },
  usageCount = 0,
): ProductMediaLinkDto {
  const role = link.role as MediaAssetRole
  return {
    id: link.id,
    productId: link.productId,
    assetId: link.assetId,
    role,
    roleLabel: mediaAssetRoleLabelTr(role),
    sortOrder: link.sortOrder,
    altText: link.altText,
    asset: mapMediaAssetDto(link.asset, usageCount),
  }
}

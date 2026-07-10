import type { MediaAsset, Product } from '@prisma/client'
import { MEDIA_ASSET_ROLE } from '../constants/mediaAssetRoles.js'
import type { ProductMasterMediaDto } from '../contracts/productMasterDto.js'

export type ProductMediaLinkWithAsset = {
  role: string
  sortOrder: number
  asset: Pick<MediaAsset, 'cdnUrl' | 'mimeType' | 'thumbnailUrl' | 'fileName'>
}

function parseGalleryUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
}

function linksByRole(links: ProductMediaLinkWithAsset[], role: string) {
  return links.filter((l) => l.role === role).sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Asset bağlantıları öncelikli; yoksa legacy URL cache alanları.
 */
export function resolveProductMedia(
  product: Pick<Product, 'mainImageUrl' | 'galleryImageUrls' | 'videoUrl' | 'catalogPdfUrl'>,
  links: ProductMediaLinkWithAsset[] = [],
): ProductMasterMediaDto {
  const legacyGallery = parseGalleryUrls(product.galleryImageUrls)

  if (links.length === 0) {
    return {
      mainImageUrl: product.mainImageUrl ?? null,
      galleryImageUrls: legacyGallery,
      videoUrl: product.videoUrl ?? null,
      catalogPdfUrl: product.catalogPdfUrl ?? null,
    }
  }

  const heroLinks = linksByRole(links, MEDIA_ASSET_ROLE.HERO)
  const galleryLinks = linksByRole(links, MEDIA_ASSET_ROLE.GALLERY)
  const videoLinks = linksByRole(links, MEDIA_ASSET_ROLE.VIDEO)
  const pdfLinks = linksByRole(links, MEDIA_ASSET_ROLE.PDF)

  const mainImageUrl = heroLinks[0]?.asset.cdnUrl ?? product.mainImageUrl ?? null
  const galleryFromLinks = galleryLinks.map((l) => l.asset.cdnUrl)
  const galleryImageUrls =
    galleryFromLinks.length > 0 ? galleryFromLinks : legacyGallery
  const videoUrl = videoLinks[0]?.asset.cdnUrl ?? product.videoUrl ?? null
  const catalogPdfUrl = pdfLinks[0]?.asset.cdnUrl ?? product.catalogPdfUrl ?? null

  return {
    mainImageUrl,
    galleryImageUrls,
    videoUrl,
    catalogPdfUrl,
  }
}

/**
 * Legacy cache alanlarını asset bağlantılarından senkronize eder.
 */
export function productMediaCacheFromResolved(media: ProductMasterMediaDto) {
  return {
    mainImageUrl: media.mainImageUrl,
    galleryImageUrls: media.galleryImageUrls,
    videoUrl: media.videoUrl,
    catalogPdfUrl: media.catalogPdfUrl,
  }
}

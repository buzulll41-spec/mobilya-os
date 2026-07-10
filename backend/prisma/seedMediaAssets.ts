import type { PrismaClient } from '@prisma/client'
import { MEDIA_ASSET_ROLE } from '../src/constants/mediaAssetRoles.js'
import { MEDIA_STORAGE_PROVIDER } from '../src/constants/mediaStorageProviders.js'

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function guessMimeType(url: string): string {
  const lower = url.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.mp4') || lower.includes('video')) return 'video/mp4'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.png')) return 'image/png'
  return 'image/jpeg'
}

function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(url).pathname
    const base = path.split('/').pop()
    if (base && base.includes('.')) return base
  } catch {
    /* relative url */
  }
  return fallback
}

type AssetSeedInput = {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  storageKey: string
  cdnUrl: string
  thumbnailUrl?: string | null
}

const MOCK_POOL: AssetSeedInput[] = [
  {
    id: 'asset-mock-hero-01',
    fileName: 'hero-modern-yatak.jpg',
    mimeType: 'image/jpeg',
    fileSize: 245_000,
    storageKey: 'mock/hero-modern-yatak.jpg',
    cdnUrl: 'https://placehold.co/800x600/eceff3/5c6678?text=Hero+Modern',
    thumbnailUrl: 'https://placehold.co/200x150/eceff3/5c6678?text=Hero',
  },
  {
    id: 'asset-mock-hero-02',
    fileName: 'hero-genc-oda.jpg',
    mimeType: 'image/jpeg',
    fileSize: 312_000,
    storageKey: 'mock/hero-genc-oda.jpg',
    cdnUrl: 'https://placehold.co/800x600/dbeafe/1e40af?text=Genc+Oda',
    thumbnailUrl: 'https://placehold.co/200x150/dbeafe/1e40af?text=Genc',
  },
  {
    id: 'asset-mock-gallery-01',
    fileName: 'galeri-detay-01.jpg',
    mimeType: 'image/jpeg',
    fileSize: 198_000,
    storageKey: 'mock/galeri-detay-01.jpg',
    cdnUrl: 'https://placehold.co/640x480/f1f5f9/64748b?text=Galeri+1',
    thumbnailUrl: 'https://placehold.co/160x120/f1f5f9/64748b?text=G1',
  },
  {
    id: 'asset-mock-gallery-02',
    fileName: 'galeri-detay-02.jpg',
    mimeType: 'image/jpeg',
    fileSize: 205_000,
    storageKey: 'mock/galeri-detay-02.jpg',
    cdnUrl: 'https://placehold.co/640x480/f1f5f9/64748b?text=Galeri+2',
    thumbnailUrl: 'https://placehold.co/160x120/f1f5f9/64748b?text=G2',
  },
  {
    id: 'asset-mock-gallery-03',
    fileName: 'galeri-detay-03.jpg',
    mimeType: 'image/jpeg',
    fileSize: 188_000,
    storageKey: 'mock/galeri-detay-03.jpg',
    cdnUrl: 'https://placehold.co/640x480/f1f5f9/64748b?text=Galeri+3',
    thumbnailUrl: 'https://placehold.co/160x120/f1f5f9/64748b?text=G3',
  },
  {
    id: 'asset-mock-video-01',
    fileName: 'urun-tanitim.mp4',
    mimeType: 'video/mp4',
    fileSize: 4_500_000,
    storageKey: 'mock/urun-tanitim.mp4',
    cdnUrl: 'https://example.com/mock/urun-tanitim.mp4',
    thumbnailUrl: 'https://placehold.co/320x180/0f172a/94a3b8?text=Video',
  },
  {
    id: 'asset-mock-pdf-01',
    fileName: 'katalog-genel.pdf',
    mimeType: 'application/pdf',
    fileSize: 1_850_000,
    storageKey: 'mock/katalog-genel.pdf',
    cdnUrl: 'https://example.com/mock/katalog-genel.pdf',
    thumbnailUrl: null,
  },
  {
    id: 'asset-mock-pdf-02',
    fileName: 'teknik-olcu.pdf',
    mimeType: 'application/pdf',
    fileSize: 920_000,
    storageKey: 'mock/teknik-olcu.pdf',
    cdnUrl: 'https://example.com/mock/teknik-olcu.pdf',
    thumbnailUrl: null,
  },
]

async function upsertAsset(prisma: PrismaClient, input: AssetSeedInput) {
  await prisma.mediaAsset.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      storageProvider: MEDIA_STORAGE_PROVIDER.LOCAL,
      storageKey: input.storageKey,
      cdnUrl: input.cdnUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
      uploadedBy: 'seed@media.local',
    },
    update: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      storageKey: input.storageKey,
      cdnUrl: input.cdnUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
    },
  })
}

export type SeedMediaAssetsResult = {
  assetsUpserted: number
  linksCreated: number
  assetCount: number
}

/**
 * Ürün URL alanlarından asset + link oluşturur; mock havuz ekler.
 */
export async function seedMediaAssets(prisma: PrismaClient): Promise<SeedMediaAssetsResult> {
  let assetsUpserted = 0
  let linksCreated = 0

  for (const mock of MOCK_POOL) {
    await upsertAsset(prisma, mock)
    assetsUpserted += 1
  }

  const products = await prisma.product.findMany({
    select: {
      id: true,
      productCode: true,
      productName: true,
      mainImageUrl: true,
      galleryImageUrls: true,
      videoUrl: true,
      catalogPdfUrl: true,
    },
  })

  for (const product of products) {
    const gallery = Array.isArray(product.galleryImageUrls)
      ? product.galleryImageUrls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
      : []

    /** @type {{ url: string; role: string; sortOrder: number; assetId: string }[]} */
    const linkPlan = []

    if (product.mainImageUrl) {
      const assetId = `asset-prod-${product.id}-hero`
      await upsertAsset(prisma, {
        id: assetId,
        fileName: fileNameFromUrl(product.mainImageUrl, `${product.productCode}-hero.jpg`),
        mimeType: guessMimeType(product.mainImageUrl),
        fileSize: 180_000 + (hashSeed(assetId) % 120_000),
        storageKey: `products/${product.productCode}/hero`,
        cdnUrl: product.mainImageUrl,
        thumbnailUrl: product.mainImageUrl,
      })
      assetsUpserted += 1
      linkPlan.push({ url: product.mainImageUrl, role: MEDIA_ASSET_ROLE.HERO, sortOrder: 0, assetId })
    }

    gallery.forEach((url, idx) => {
      const assetId = `asset-prod-${product.id}-gal-${idx}`
      linkPlan.push({ url, role: MEDIA_ASSET_ROLE.GALLERY, sortOrder: idx, assetId })
    })

    for (const item of linkPlan.filter((l) => l.role === MEDIA_ASSET_ROLE.GALLERY)) {
      await upsertAsset(prisma, {
        id: item.assetId,
        fileName: fileNameFromUrl(item.url, `${product.productCode}-gal-${item.sortOrder}.jpg`),
        mimeType: guessMimeType(item.url),
        fileSize: 150_000 + (hashSeed(item.assetId) % 100_000),
        storageKey: `products/${product.productCode}/gallery/${item.sortOrder}`,
        cdnUrl: item.url,
        thumbnailUrl: item.url,
      })
      assetsUpserted += 1
    }

    if (product.videoUrl) {
      const assetId = `asset-prod-${product.id}-video`
      await upsertAsset(prisma, {
        id: assetId,
        fileName: fileNameFromUrl(product.videoUrl, `${product.productCode}.mp4`),
        mimeType: 'video/mp4',
        fileSize: 3_000_000 + (hashSeed(assetId) % 2_000_000),
        storageKey: `products/${product.productCode}/video`,
        cdnUrl: product.videoUrl,
        thumbnailUrl: null,
      })
      assetsUpserted += 1
      linkPlan.push({ url: product.videoUrl, role: MEDIA_ASSET_ROLE.VIDEO, sortOrder: 0, assetId })
    }

    if (product.catalogPdfUrl) {
      const assetId = `asset-prod-${product.id}-pdf`
      await upsertAsset(prisma, {
        id: assetId,
        fileName: fileNameFromUrl(product.catalogPdfUrl, `${product.productCode}.pdf`),
        mimeType: 'application/pdf',
        fileSize: 800_000 + (hashSeed(assetId) % 1_200_000),
        storageKey: `products/${product.productCode}/catalog`,
        cdnUrl: product.catalogPdfUrl,
        thumbnailUrl: null,
      })
      assetsUpserted += 1
      linkPlan.push({ url: product.catalogPdfUrl, role: MEDIA_ASSET_ROLE.PDF, sortOrder: 0, assetId })
    }

    const existingLinks = await prisma.productMediaLink.count({ where: { productId: product.id } })
    if (existingLinks === 0 && linkPlan.length > 0) {
      await prisma.productMediaLink.createMany({
        data: linkPlan.map((l) => ({
          productId: product.id,
          assetId: l.assetId,
          role: l.role,
          sortOrder: l.sortOrder,
        })),
        skipDuplicates: true,
      })
      linksCreated += linkPlan.length
    }
  }

  const assetCount = await prisma.mediaAsset.count()
  return { assetsUpserted, linksCreated, assetCount }
}

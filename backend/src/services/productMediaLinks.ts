import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  mapProductMediaLinkDto,
  type ProductMediaBundleDto,
} from '../contracts/mediaAssetDto.js'
import { MEDIA_ASSET_ROLE } from '../constants/mediaAssetRoles.js'
import {
  productMediaCacheFromResolved,
  resolveProductMedia,
} from '../lib/resolveProductMedia.js'

export async function getProductMediaBundle(
  prisma: PrismaClient,
  productId: string,
): Promise<ProductMediaBundleDto> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      mainImageUrl: true,
      galleryImageUrls: true,
      videoUrl: true,
      catalogPdfUrl: true,
    },
  })
  if (!product) {
    throw new AppHttpError(404, 'Ürün master kaydı bulunamadı', 'Not Found')
  }

  const links = await prisma.productMediaLink.findMany({
    where: { productId },
    include: { asset: true },
    orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
  })

  const usageGroups = await prisma.productMediaLink.groupBy({
    by: ['assetId'],
    _count: { assetId: true },
  })
  const usageByAssetId = new Map(
    usageGroups.map((g) => [g.assetId, g._count.assetId]),
  )

  const linkDtos = links.map((l) =>
    mapProductMediaLinkDto(l, usageByAssetId.get(l.assetId) ?? 0),
  )

  const resolvedMedia = resolveProductMedia(product, links)

  return {
    productId,
    hero: linkDtos.find((l) => l.role === MEDIA_ASSET_ROLE.HERO) ?? null,
    gallery: linkDtos.filter((l) => l.role === MEDIA_ASSET_ROLE.GALLERY),
    video: linkDtos.find((l) => l.role === MEDIA_ASSET_ROLE.VIDEO) ?? null,
    pdf: linkDtos.find((l) => l.role === MEDIA_ASSET_ROLE.PDF) ?? null,
    resolvedMedia,
  }
}

export type PutProductMediaRequest = {
  heroAssetId?: string | null
  galleryAssetIds?: string[]
  videoAssetId?: string | null
  pdfAssetId?: string | null
}

export function assertValidPutProductMediaRequest(body: unknown): PutProductMediaRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Geçersiz medya isteği', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const result: PutProductMediaRequest = {}

  if ('heroAssetId' in o) {
    if (o.heroAssetId !== null && typeof o.heroAssetId !== 'string') {
      throw new AppHttpError(400, 'heroAssetId geçersiz', 'Bad Request')
    }
    result.heroAssetId = o.heroAssetId as string | null
  }
  if ('videoAssetId' in o) {
    if (o.videoAssetId !== null && typeof o.videoAssetId !== 'string') {
      throw new AppHttpError(400, 'videoAssetId geçersiz', 'Bad Request')
    }
    result.videoAssetId = o.videoAssetId as string | null
  }
  if ('pdfAssetId' in o) {
    if (o.pdfAssetId !== null && typeof o.pdfAssetId !== 'string') {
      throw new AppHttpError(400, 'pdfAssetId geçersiz', 'Bad Request')
    }
    result.pdfAssetId = o.pdfAssetId as string | null
  }
  if ('galleryAssetIds' in o) {
    if (!Array.isArray(o.galleryAssetIds)) {
      throw new AppHttpError(400, 'galleryAssetIds geçersiz', 'Bad Request')
    }
    result.galleryAssetIds = o.galleryAssetIds.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0,
    )
  }

  return result
}

export async function putProductMediaLinks(
  prisma: PrismaClient,
  productId: string,
  body: PutProductMediaRequest,
): Promise<ProductMediaBundleDto> {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) {
    throw new AppHttpError(404, 'Ürün master kaydı bulunamadı', 'Not Found')
  }

  const assetIds = [
    body.heroAssetId,
    body.videoAssetId,
    body.pdfAssetId,
    ...(body.galleryAssetIds ?? []),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0)

  if (assetIds.length > 0) {
    const found = await prisma.mediaAsset.count({
      where: { id: { in: [...new Set(assetIds)] } },
    })
    if (found !== new Set(assetIds).size) {
      throw new AppHttpError(400, 'Seçilen medya varlığı bulunamadı', 'Bad Request')
    }
  }

  await prisma.$transaction(async (tx) => {
    const rolesToReplace: string[] = []
    if ('heroAssetId' in body) rolesToReplace.push(MEDIA_ASSET_ROLE.HERO)
    if ('galleryAssetIds' in body) rolesToReplace.push(MEDIA_ASSET_ROLE.GALLERY)
    if ('videoAssetId' in body) rolesToReplace.push(MEDIA_ASSET_ROLE.VIDEO)
    if ('pdfAssetId' in body) rolesToReplace.push(MEDIA_ASSET_ROLE.PDF)

    if (rolesToReplace.length > 0) {
      await tx.productMediaLink.deleteMany({
        where: { productId, role: { in: rolesToReplace } },
      })
    }

    /** @type {{ productId: string; assetId: string; role: string; sortOrder: number }[]} */
    const creates = []

    if ('heroAssetId' in body && body.heroAssetId) {
      creates.push({
        productId,
        assetId: body.heroAssetId,
        role: MEDIA_ASSET_ROLE.HERO,
        sortOrder: 0,
      })
    }
    if ('galleryAssetIds' in body && body.galleryAssetIds) {
      body.galleryAssetIds.forEach((assetId, idx) => {
        creates.push({
          productId,
          assetId,
          role: MEDIA_ASSET_ROLE.GALLERY,
          sortOrder: idx,
        })
      })
    }
    if ('videoAssetId' in body && body.videoAssetId) {
      creates.push({
        productId,
        assetId: body.videoAssetId,
        role: MEDIA_ASSET_ROLE.VIDEO,
        sortOrder: 0,
      })
    }
    if ('pdfAssetId' in body && body.pdfAssetId) {
      creates.push({
        productId,
        assetId: body.pdfAssetId,
        role: MEDIA_ASSET_ROLE.PDF,
        sortOrder: 0,
      })
    }

    if (creates.length > 0) {
      await tx.productMediaLink.createMany({ data: creates })
    }

    const links = await tx.productMediaLink.findMany({
      where: { productId },
      include: { asset: true },
      orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
    })

    const resolvedMedia = resolveProductMedia(product, links)
    const cache = productMediaCacheFromResolved(resolvedMedia)

    await tx.product.update({
      where: { id: productId },
      data: {
        mainImageUrl: cache.mainImageUrl,
        galleryImageUrls: cache.galleryImageUrls,
        videoUrl: cache.videoUrl,
        catalogPdfUrl: cache.catalogPdfUrl,
        productHealthScore: null,
        missingFields: [],
      },
    })
  })

  return getProductMediaBundle(prisma, productId)
}

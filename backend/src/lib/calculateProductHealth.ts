export type ProductHealthInput = {
  mainImageUrl?: string | null
  thumbnailUrl?: string | null
  galleryImageUrls?: string[]
  catalogPdfUrl?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  shortDescription?: string | null
  longDescription?: string | null
  technicalAttributes?: { label: string; value: string }[]
  technicalSpecs?: { label: string; value: string }[]
  activeVariantCount?: number
}

export type ProductHealthGroup = 'Medya' | 'İçerik' | 'Teknik' | 'Varyant'

export type ProductHealthCheckItem = {
  id: string
  label: string
  group: ProductHealthGroup
  points: number
  earned: boolean
  missingLabel: string
  missingSeverity: 'critical' | 'warning'
}

export type ProductHealthChecks = {
  hasHeroImage: boolean
  hasGallery: boolean
  hasPdf: boolean
  hasSeoTitle: boolean
  hasSeoDescription: boolean
  hasShortDescription: boolean
  hasLongDescription: boolean
  hasTechnicalAttributes: boolean
  hasActiveVariant: boolean
}

export type ProductHealthResult = {
  score: number
  tone: 'success' | 'warning' | 'critical'
  checks: ProductHealthChecks
  items: ProductHealthCheckItem[]
  missingLabels: string[]
  completedLabels: string[]
}

const HEALTH_RULES: Array<{
  id: keyof ProductHealthChecks
  label: string
  group: ProductHealthGroup
  points: number
  missingLabel: string
  missingSeverity: 'critical' | 'warning'
  test: (input: ProductHealthInput) => boolean
}> = [
  {
    id: 'hasHeroImage',
    label: 'Hero görsel',
    group: 'Medya',
    points: 15,
    missingLabel: 'Hero görsel yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.mainImageUrl?.trim() || input.thumbnailUrl?.trim()),
  },
  {
    id: 'hasGallery',
    label: 'Galeri görseli',
    group: 'Medya',
    points: 15,
    missingLabel: 'Galeri görseli yok',
    missingSeverity: 'critical',
    test: (input) => (input.galleryImageUrls?.length ?? 0) > 0,
  },
  {
    id: 'hasPdf',
    label: 'PDF katalog',
    group: 'Medya',
    points: 10,
    missingLabel: 'PDF katalog yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.catalogPdfUrl?.trim()),
  },
  {
    id: 'hasSeoTitle',
    label: 'SEO başlık',
    group: 'İçerik',
    points: 10,
    missingLabel: 'SEO başlık yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.seoTitle?.trim()),
  },
  {
    id: 'hasSeoDescription',
    label: 'SEO açıklama',
    group: 'İçerik',
    points: 10,
    missingLabel: 'SEO açıklama yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.seoDescription?.trim()),
  },
  {
    id: 'hasShortDescription',
    label: 'Kısa açıklama',
    group: 'İçerik',
    points: 10,
    missingLabel: 'Kısa açıklama yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.shortDescription?.trim()),
  },
  {
    id: 'hasLongDescription',
    label: 'Uzun açıklama',
    group: 'İçerik',
    points: 10,
    missingLabel: 'Uzun açıklama yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.longDescription?.trim()),
  },
  {
    id: 'hasTechnicalAttributes',
    label: 'Teknik özellik',
    group: 'Teknik',
    points: 10,
    missingLabel: 'Teknik özellik yok',
    missingSeverity: 'critical',
    test: (input) => {
      const attrs = input.technicalAttributes?.length
        ? input.technicalAttributes
        : input.technicalSpecs
      return (attrs?.length ?? 0) > 0
    },
  },
  {
    id: 'hasActiveVariant',
    label: 'Aktif varyant',
    group: 'Varyant',
    points: 10,
    missingLabel: 'Aktif varyant yok',
    missingSeverity: 'warning',
    test: (input) => (input.activeVariantCount ?? 0) > 0,
  },
]

export function calculateProductHealth(input: ProductHealthInput): ProductHealthResult {
  const items: ProductHealthCheckItem[] = HEALTH_RULES.map((rule) => {
    const earned = rule.test(input)
    return {
      id: rule.id,
      label: rule.label,
      group: rule.group,
      points: rule.points,
      earned,
      missingLabel: rule.missingLabel,
      missingSeverity: rule.missingSeverity,
    }
  })

  const score = items.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0)
  const missingLabels = items.filter((item) => !item.earned).map((item) => item.missingLabel)
  const completedLabels = items.filter((item) => item.earned).map((item) => item.label)

  const checks = Object.fromEntries(
    items.map((item) => [item.id, item.earned]),
  ) as ProductHealthChecks

  const tone = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'critical'

  return { score, tone, checks, items, missingLabels, completedLabels }
}

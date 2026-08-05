/**
 * FAZ 4D doğrulama — yayın hazırlık sayıları (canlı API).
 * node scripts/verify-publish-readiness.mjs
 */

function calculatePublishReadiness(input) {
  const hasHeroImage = Boolean(input.mainImageUrl?.trim() || input.thumbnailUrl?.trim())
  const hasGallery = (input.galleryImageUrls?.length ?? 0) > 0
  const hasDescription = Boolean(input.shortDescription?.trim() || input.longDescription?.trim())
  const hasSeoTitle = Boolean(input.seoTitle?.trim())
  const hasSeoDescription = Boolean(input.seoDescription?.trim())
  const hasCategory = Boolean(input.category?.trim())
  const hasPrice = input.salePrice != null && Number(input.salePrice) > 0
  const needsVariants = input.productType === 'VARIABLE'
  const hasActiveVariant = needsVariants ? (input.activeVariantCount ?? 0) > 0 : true

  let score = 0
  if (hasHeroImage) score += 20
  if (hasGallery) score += 15
  if (hasDescription) score += 15
  if (hasSeoTitle) score += 10
  if (hasSeoDescription) score += 10
  if (hasCategory) score += 10
  if (hasPrice) score += 10
  if (hasActiveVariant) score += 10

  return {
    score,
    isReady: score >= 80,
    wooReady: input.wooReadiness === 'READY',
    missingImage: !hasHeroImage || !hasGallery,
    missingSeo: !hasSeoTitle || !hasSeoDescription,
    missingVariant: !hasActiveVariant,
  }
}

function productToInput(p) {
  return {
    mainImageUrl: p.media?.mainImageUrl ?? null,
    thumbnailUrl: p.thumbnailUrl ?? null,
    galleryImageUrls: p.media?.galleryImageUrls ?? [],
    shortDescription: p.shortDescription ?? null,
    longDescription: p.longDescription ?? null,
    seoTitle: p.seoTitle ?? null,
    seoDescription: p.seoDescription ?? null,
    category: p.category ?? null,
    salePrice: p.salePrice ?? null,
    productType: p.productType ?? null,
    activeVariantCount: p.variants?.length ?? 0,
    wooReadiness: p.woo?.readiness ?? 'NOT_READY',
  }
}

const loginRes = await fetch('http://localhost:4000/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@mobilya.local', password: 'admin123' }),
})
if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`)
const { token } = await loginRes.json()

const listRes = await fetch('http://localhost:4000/v1/product-master?pageSize=200', {
  headers: { Authorization: `Bearer ${token}` },
})
if (!listRes.ok) throw new Error(`List failed: ${listRes.status}`)
const data = await listRes.json()

const results = data.items.map((p) => calculatePublishReadiness(productToInput(p)))
const ready = results.filter((r) => r.isReady).length
const notReady = results.length - ready
const wooReady = results.filter((r) => r.wooReady).length
const missingImage = results.filter((r) => r.missingImage).length
const missingSeo = results.filter((r) => r.missingSeo).length
const missingVariant = results.filter((r) => r.missingVariant).length

console.log(JSON.stringify({
  total: data.total,
  items: data.items.length,
  ready,
  notReady,
  wooReady,
  missingImage,
  missingSeo,
  missingVariant,
}, null, 2))

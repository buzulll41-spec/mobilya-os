import { wooFetch, wooPost, type WooCredentials } from '../../lib/wooApiClient.js'

export type WooConnectionStatus = 'CONNECTED' | 'ERROR' | 'UNCHECKED'

export type WooStoreInfo = {
  storeUrl: string
  wcVersion: string | null
  environment: Record<string, unknown> | null
}

export type WooCategorySummary = {
  id: number
  name: string
  slug: string
  count: number
}

export type WooProductSummary = {
  id: number
  name: string
  sku: string
  status: string
  price: string
}

export type WooConnectionTestResult = {
  ok: boolean
  status: WooConnectionStatus
  error: string | null
  storeInfo: WooStoreInfo | null
  categoryCount: number
  categoriesSample: WooCategorySummary[]
  productCount: number
  productsSample: WooProductSummary[]
}

type WooSystemStatusResponse = {
  environment?: {
    home_url?: string
    version?: string
    wp_version?: string
  }
}

type WooCategoryRow = {
  id: number
  name: string
  slug: string
  count: number
}

type WooProductRow = {
  id: number
  name: string
  sku: string
  status: string
  price: string
  categories?: { id: number; name: string }[]
}

export type WooDraftProductInput = {
  name: string
  slug: string
  shortDescription: string
  longDescription: string
  regularPrice: string
  categoryName: string
  mainImageUrl?: string | null
}

export type WooDraftProductResult = {
  id: number
  status: string
  permalink: string | null
  categoryId: number | null
}

export class WooConnectionService {
  constructor(private readonly creds: WooCredentials) {}

  async testConnection(): Promise<WooConnectionTestResult> {
    try {
      const products = await this.getProducts(10)
      const categories = await this.getCategories()
      let storeInfo: WooStoreInfo | null = null
      try {
        storeInfo = await this.getStoreInfo()
      } catch {
        storeInfo = { storeUrl: this.creds.storeUrl, wcVersion: null, environment: null }
      }
      return {
        ok: true,
        status: 'CONNECTED',
        error: null,
        storeInfo,
        categoryCount: categories.total,
        categoriesSample: categories.items.slice(0, 5),
        productCount: products.total,
        productsSample: products.items,
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Bağlantı testi başarısız'
      return {
        ok: false,
        status: 'ERROR',
        error: message,
        storeInfo: null,
        categoryCount: 0,
        categoriesSample: [],
        productCount: 0,
        productsSample: [],
      }
    }
  }

  async getStoreInfo(): Promise<WooStoreInfo> {
    const res = await wooFetch<WooSystemStatusResponse>(this.creds, '/system_status')
    const env = res.data.environment ?? null
    return {
      storeUrl: env?.home_url ?? this.creds.storeUrl,
      wcVersion: env?.version ?? null,
      environment: env ? { ...env } : null,
    }
  }

  async getCategories(): Promise<{ items: WooCategorySummary[]; total: number }> {
    const res = await wooFetch<WooCategoryRow[]>(this.creds, '/products/categories', {
      per_page: 100,
      page: 1,
    })
    const items = (Array.isArray(res.data) ? res.data : []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      count: row.count ?? 0,
    }))
    return {
      items,
      total: res.total ?? items.length,
    }
  }

  async createProductDraft(input: WooDraftProductInput): Promise<WooDraftProductResult> {
    /** @type {Record<string, unknown>} */
    const payload: Record<string, unknown> = {
      name: input.name,
      slug: input.slug,
      type: 'simple',
      status: 'draft',
      short_description: input.shortDescription,
      description: input.longDescription,
      regular_price: input.regularPrice,
      categories: [{ name: input.categoryName }],
    }

    if (input.mainImageUrl?.trim()) {
      payload.images = [{ src: input.mainImageUrl.trim() }]
    }

    const created = await wooPost<WooProductRow>(this.creds, '/products', payload)
    const categoryId = created.categories?.[0]?.id ?? null

    return {
      id: created.id,
      status: created.status,
      permalink: null,
      categoryId,
    }
  }

  async getProducts(limit: number): Promise<{ items: WooProductSummary[]; total: number }> {
    const perPage = Math.min(Math.max(limit, 1), 100)
    const res = await wooFetch<WooProductRow[]>(this.creds, '/products', {
      per_page: perPage,
      page: 1,
    })
    const items = (Array.isArray(res.data) ? res.data : []).map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku ?? '',
      status: row.status,
      price: row.price ?? '',
    }))
    return {
      items,
      total: res.total ?? items.length,
    }
  }
}

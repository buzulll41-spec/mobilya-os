import { AppHttpError } from '../errors/apiError.js'

export type WooCredentials = {
  storeUrl: string
  consumerKey: string
  consumerSecret: string
}

export type WooFetchResult<T> = {
  data: T
  total: number | null
  totalPages: number | null
}

function normalizeStoreUrl(storeUrl: string): string {
  const trimmed = storeUrl.trim().replace(/\/+$/, '')
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`
  }
  return trimmed
}

function buildAuthHeader(creds: WooCredentials): string {
  const token = Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString('base64')
  return `Basic ${token}`
}

function apiBase(creds: WooCredentials): string {
  return `${normalizeStoreUrl(creds.storeUrl)}/wp-json/wc/v3`
}

function parseTotalHeader(value: string | null): number | null {
  if (!value) return null
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

export async function wooFetch<T>(
  creds: WooCredentials,
  path: string,
  query: Record<string, string | number | undefined> = {},
): Promise<WooFetchResult<T>> {
  const params = new URLSearchParams()
  for (const [key, val] of Object.entries(query)) {
    if (val !== undefined && val !== '') params.set(key, String(val))
  }
  const qs = params.toString()
  const url = `${apiBase(creds)}${path.startsWith('/') ? path : `/${path}`}${qs ? `?${qs}` : ''}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: buildAuthHeader(creds),
      },
      signal: AbortSignal.timeout(20_000),
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'WooCommerce bağlantı hatası'
    throw new AppHttpError(502, message, 'Bad Gateway')
  }

  const rawBody = await res.text()
  let data: unknown = null
  if (rawBody.trim()) {
    try {
      data = JSON.parse(rawBody)
    } catch {
      throw new AppHttpError(502, 'WooCommerce geçersiz JSON yanıtı', 'Bad Gateway')
    }
  }

  if (!res.ok) {
    const wooMessage =
      data &&
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : res.statusText || 'WooCommerce API hatası'
    throw new AppHttpError(
      res.status === 401 || res.status === 403 ? 401 : 502,
      wooMessage,
      res.status === 401 || res.status === 403 ? 'Unauthorized' : 'Bad Gateway',
    )
  }

  return {
    data: data as T,
    total: parseTotalHeader(res.headers.get('X-WP-Total')),
    totalPages: parseTotalHeader(res.headers.get('X-WP-TotalPages')),
  }
}

export async function wooPost<T>(
  creds: WooCredentials,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${apiBase(creds)}${path.startsWith('/') ? path : `/${path}`}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: buildAuthHeader(creds),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'WooCommerce bağlantı hatası'
    throw new AppHttpError(502, message, 'Bad Gateway')
  }

  const rawBody = await res.text()
  let data: unknown = null
  if (rawBody.trim()) {
    try {
      data = JSON.parse(rawBody)
    } catch {
      throw new AppHttpError(502, 'WooCommerce geçersiz JSON yanıtı', 'Bad Gateway')
    }
  }

  if (!res.ok) {
    const wooMessage =
      data &&
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : res.statusText || 'WooCommerce API hatası'
    throw new AppHttpError(
      res.status === 401 || res.status === 403 ? 401 : 502,
      wooMessage,
      res.status === 401 || res.status === 403 ? 'Unauthorized' : 'Bad Gateway',
    )
  }

  return data as T
}

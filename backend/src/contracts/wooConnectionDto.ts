import type { WooConnection } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { maskSecret } from '../lib/maskSecret.js'

export type WooConnectionStatusDto = 'CONNECTED' | 'ERROR' | 'UNCHECKED'

export type WooConnectionDto = {
  id: string
  storeName: string
  storeUrl: string
  consumerKeyMasked: string
  consumerSecretMasked: string
  isActive: boolean
  lastConnectionCheck: string | null
  lastConnectionStatus: WooConnectionStatusDto | null
  lastConnectionStatusLabel: string
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export type WooConnectionHealthDto = {
  status: WooConnectionStatusDto
  statusLabel: string
  lastConnectionCheck: string | null
  lastError: string | null
  storeName: string
  storeUrl: string
  categoryCount: number | null
  productCount: number | null
  wcVersion: string | null
}

export type WooConnectionTestResponseDto = {
  connection: WooConnectionDto
  test: {
    ok: boolean
    status: WooConnectionStatusDto
    statusLabel: string
    error: string | null
    storeInfo: {
      storeUrl: string
      wcVersion: string | null
    } | null
    categoryCount: number
    categoriesSample: { id: number; name: string; slug: string; count: number }[]
    productCount: number
    productsSample: { id: number; name: string; sku: string; status: string; price: string }[]
  }
}

export type UpsertWooConnectionRequest = {
  storeName: string
  storeUrl: string
  consumerKey: string
  consumerSecret?: string
  isActive?: boolean
}

const STATUS_LABELS: Record<WooConnectionStatusDto, string> = {
  CONNECTED: 'Bağlı',
  ERROR: 'Hatalı',
  UNCHECKED: 'Kontrol edilmedi',
}

export function wooConnectionStatusLabel(status: WooConnectionStatusDto | string | null): string {
  if (status === 'CONNECTED') return STATUS_LABELS.CONNECTED
  if (status === 'ERROR') return STATUS_LABELS.ERROR
  return STATUS_LABELS.UNCHECKED
}

export function mapWooConnectionDto(row: WooConnection): WooConnectionDto {
  const status = (row.lastConnectionStatus as WooConnectionStatusDto | null) ?? null
  return {
    id: row.id,
    storeName: row.storeName,
    storeUrl: row.storeUrl,
    consumerKeyMasked: maskSecret(row.consumerKey),
    consumerSecretMasked: maskSecret(row.consumerSecret),
    isActive: row.isActive,
    lastConnectionCheck: row.lastConnectionCheck?.toISOString() ?? null,
    lastConnectionStatus: status,
    lastConnectionStatusLabel: wooConnectionStatusLabel(status),
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function mapWooConnectionHealthDto(row: WooConnection): WooConnectionHealthDto {
  const status = (row.lastConnectionStatus as WooConnectionStatusDto | null) ?? 'UNCHECKED'
  return {
    status,
    statusLabel: wooConnectionStatusLabel(status),
    lastConnectionCheck: row.lastConnectionCheck?.toISOString() ?? null,
    lastError: row.lastError,
    storeName: row.storeName,
    storeUrl: row.storeUrl,
    categoryCount: null,
    productCount: null,
    wcVersion: null,
  }
}

export function assertValidUpsertWooConnectionRequest(body: unknown): UpsertWooConnectionRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Geçersiz istek gövdesi', 'Bad Request')
  }
  const b = body as Record<string, unknown>
  const storeName = typeof b.storeName === 'string' ? b.storeName.trim() : ''
  const storeUrl = typeof b.storeUrl === 'string' ? b.storeUrl.trim() : ''
  const consumerKey = typeof b.consumerKey === 'string' ? b.consumerKey.trim() : ''
  const consumerSecret = typeof b.consumerSecret === 'string' ? b.consumerSecret.trim() : undefined
  const isActive = typeof b.isActive === 'boolean' ? b.isActive : true

  if (!storeName) throw new AppHttpError(400, 'Mağaza adı zorunludur', 'Bad Request')
  if (!storeUrl) throw new AppHttpError(400, 'Mağaza URL zorunludur', 'Bad Request')
  if (!consumerKey) throw new AppHttpError(400, 'Consumer Key zorunludur', 'Bad Request')

  return { storeName, storeUrl, consumerKey, consumerSecret, isActive }
}

import { Prisma } from '@prisma/client'
import { AppHttpError } from './apiError.js'

export const DATABASE_UNAVAILABLE_MESSAGE =
  'Veritabanına bağlanılamıyor. Backend klasöründe: docker compose up -d'

const DB_PRISMA_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017'])

/** Prisma / altyapı hatalarını anlamlı HTTP hatalarına çevirir; eşleşmezse null. */
export function mapServiceError(err: unknown): AppHttpError | null {
  if (err instanceof AppHttpError) {
    return err
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new AppHttpError(503, DATABASE_UNAVAILABLE_MESSAGE, 'Service Unavailable', {
      code: 'DATABASE_UNAVAILABLE',
    })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (DB_PRISMA_CODES.has(err.code)) {
      return new AppHttpError(503, DATABASE_UNAVAILABLE_MESSAGE, 'Service Unavailable', {
        code: 'DATABASE_UNAVAILABLE',
        prismaCode: err.code,
      })
    }
    if (err.code === 'P2025') {
      return new AppHttpError(404, 'Kayıt bulunamadı', 'Not Found', { prismaCode: err.code })
    }
  }

  if (
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    return new AppHttpError(503, 'Veritabanı isteği başarısız', 'Service Unavailable', {
      code: 'DATABASE_ERROR',
    })
  }

  return null
}

/** @throws {AppHttpError} bilinen servis hatalarında */
export function assertServiceErrorMapped(err: unknown): void {
  const mapped = mapServiceError(err)
  if (mapped) {
    throw mapped
  }
}

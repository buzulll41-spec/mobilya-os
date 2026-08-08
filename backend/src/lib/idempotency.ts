import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'

const SAFE_KEY_RE = /[^a-zA-Z0-9._:-]/g

export function normalizeIdempotencyKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const normalized = trimmed.replace(SAFE_KEY_RE, '_').slice(0, 120)
  return normalized || undefined
}

export function buildDeterministicTransactionId(
  prefix: string,
  scope: string,
  idempotencyKey: string,
): string {
  const digest = createHash('sha256').update(`${scope}::${idempotencyKey}`).digest('hex').slice(0, 24)
  return `${prefix}-${digest}`
}

export function isPrismaUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

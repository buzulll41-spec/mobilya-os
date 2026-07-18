/**
 * Production Config Guard — backend başlangıcında (server.ts) zorunlu production
 * yapılandırmasını doğrular. Fail-open KULLANILMAZ: güvensiz yapılandırmada süreç
 * başlamaz (server.ts process.exit(1)).
 *
 * Guard yalnızca NODE_ENV=production iken zorlanır. Development/test davranışı
 * DEĞİŞMEZ. Secret DEĞERLERİ loglanmaz — yalnızca değişken adı + hata türü.
 */

export type ProductionConfigIssueType =
  | 'missing'
  | 'placeholder'
  | 'too_short'
  | 'invalid'
  | 'unsafe_enabled'

export interface ProductionConfigIssue {
  variable: string
  type: ProductionConfigIssueType
}

function resolveSecret(env: NodeJS.ProcessEnv): { value: string | undefined; variable: string } {
  const jwtSecret = env.JWT_SECRET?.trim()
  if (jwtSecret) return { value: jwtSecret, variable: 'JWT_SECRET' }

  const authJwtSecret = env.AUTH_JWT_SECRET?.trim()
  if (authJwtSecret) return { value: authJwtSecret, variable: 'AUTH_JWT_SECRET' }

  return { value: undefined, variable: 'JWT_SECRET' }
}

function resolveCorsOrigins(env: NodeJS.ProcessEnv): { value: string | undefined; variable: string } {
  const allowedOrigins = env.CORS_ALLOWED_ORIGINS?.trim()
  if (allowedOrigins) return { value: allowedOrigins, variable: 'CORS_ALLOWED_ORIGINS' }

  const legacyOrigins = env.CORS_ORIGIN?.trim()
  if (legacyOrigins) return { value: legacyOrigins, variable: 'CORS_ORIGIN' }

  return { value: undefined, variable: 'CORS_ALLOWED_ORIGINS' }
}

function isLoopbackOrigin(origin: string): boolean {
  const value = origin.trim().toLowerCase()
  if (!value) return false
  try {
    const host = new URL(value).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1'
  } catch {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(value)
  }
}

export class ProductionConfigError extends Error {
  readonly issues: ProductionConfigIssue[]
  constructor(issues: ProductionConfigIssue[]) {
    super(`Production yapılandırması geçersiz: ${issues.map((i) => i.variable).join(', ')}`)
    this.name = 'ProductionConfigError'
    this.issues = issues
  }
}

const PLACEHOLDER_SECRETS = new Set([
  'change-me-in-production',
  'change-me',
  'changeme',
  'secret',
  'test-jwt-secret-mobilya-os',
])

const MIN_SECRET_LENGTH = 16

/**
 * Sorunları toplar (throw etmez) — test edilebilir saf fonksiyon.
 * NODE_ENV !== 'production' ise boş liste döner (guard pasif).
 */
export function collectProductionConfigIssues(
  env: NodeJS.ProcessEnv = process.env,
): ProductionConfigIssue[] {
  const issues: ProductionConfigIssue[] = []
  if (env.NODE_ENV !== 'production') return issues

  const { value: secret, variable: secretVariable } = resolveSecret(env)
  if (!secret) {
    issues.push({ variable: secretVariable, type: 'missing' })
  } else if (PLACEHOLDER_SECRETS.has(secret.toLowerCase())) {
    issues.push({ variable: secretVariable, type: 'placeholder' })
  } else if (secret.length < MIN_SECRET_LENGTH) {
    issues.push({ variable: secretVariable, type: 'too_short' })
  }

  if (env.AUTH_DISABLED === 'true') {
    issues.push({ variable: 'AUTH_DISABLED', type: 'unsafe_enabled' })
  }

  const db = env.DATABASE_URL?.trim()
  if (!db) {
    issues.push({ variable: 'DATABASE_URL', type: 'missing' })
  } else if (!/^postgres(ql)?:\/\//i.test(db)) {
    issues.push({ variable: 'DATABASE_URL', type: 'invalid' })
  }

  const { value: cors, variable: corsVariable } = resolveCorsOrigins(env)
  if (!cors) {
    issues.push({ variable: corsVariable, type: 'missing' })
  } else {
    const origins = cors
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (origins.some((origin) => isLoopbackOrigin(origin))) {
      issues.push({ variable: corsVariable, type: 'invalid' })
    }
  }

  return issues
}

/**
 * Production'da güvensiz yapılandırma varsa hata fırlatır. Yalnızca değişken adı +
 * hata türü loglanır (secret değeri ASLA loglanmaz).
 */
export function validateProductionConfig(env: NodeJS.ProcessEnv = process.env): void {
  const issues = collectProductionConfigIssues(env)
  if (issues.length === 0) return

  for (const issue of issues) {
    // eslint-disable-next-line no-console
    console.error(`[production-config] ${issue.variable}: ${issue.type}`)
  }
  throw new ProductionConfigError(issues)
}

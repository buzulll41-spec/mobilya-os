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

  const secret = env.AUTH_JWT_SECRET?.trim()
  if (!secret) {
    issues.push({ variable: 'AUTH_JWT_SECRET', type: 'missing' })
  } else if (PLACEHOLDER_SECRETS.has(secret.toLowerCase())) {
    issues.push({ variable: 'AUTH_JWT_SECRET', type: 'placeholder' })
  } else if (secret.length < MIN_SECRET_LENGTH) {
    issues.push({ variable: 'AUTH_JWT_SECRET', type: 'too_short' })
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

  const cors = env.CORS_ORIGIN?.trim()
  if (!cors) {
    issues.push({ variable: 'CORS_ORIGIN', type: 'missing' })
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

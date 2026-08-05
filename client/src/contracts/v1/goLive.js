/** FAZ 101 — Go Live readiness contracts. */

export const GO_LIVE_CHECK = {
  API: 'api',
  DATABASE: 'database',
  MIGRATION: 'migration',
  AUTH: 'auth',
  AI_WORKERS: 'ai_workers',
  COMPANY_BRAIN: 'company_brain',
  MEMORY: 'memory',
  TOOL_ENGINE: 'tool_engine',
  QUEUE: 'queue',
  BACKUP: 'backup',
  ENVIRONMENT: 'environment',
  BUILD: 'build',
}

export const CRITICAL_AUDIT_ACTION = {
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  ORDER: 'order.mutation',
  COLLECTION: 'collection.mutation',
  SHIPMENT: 'shipment.mutation',
  AI_DECISION: 'ai.decision',
  AI_TOOL: 'ai.tool',
  MEMORY: 'memory.mutation',
}

export const APP_RUNTIME_MODE = {
  DEMO: 'demo',
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
}

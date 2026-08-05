import 'dotenv/config'
import { buildApp } from './app.js'
import { validateProductionConfig } from './config/validateProductionConfig.js'
import { logOps } from './lib/opsLogger.js'

const port = Number.parseInt(process.env.PORT ?? '4000', 10)

const start = async () => {
  try {
    // Production guard: güvensiz yapılandırmada süreç başlamaz (fail-closed).
    validateProductionConfig()
    const app = await buildApp()
    await app.listen({ port, host: '0.0.0.0' })
    logOps('system', 'server_started', 'Backend server started', {
      port,
      nodeEnv: process.env.NODE_ENV ?? 'development',
    })
  } catch (err) {
    logOps('system', 'server_start_failed', 'Backend server failed to start', {
      error: err instanceof Error ? err.message : String(err),
    }, 'error')
    process.exit(1)
  }
}

start()

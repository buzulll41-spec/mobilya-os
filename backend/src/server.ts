import 'dotenv/config'
import { buildApp } from './app.js'
import { validateProductionConfig } from './config/validateProductionConfig.js'

const port = Number.parseInt(process.env.PORT ?? '4000', 10)

const start = async () => {
  try {
    // Production guard: güvensiz yapılandırmada süreç başlamaz (fail-closed).
    validateProductionConfig()
    const app = await buildApp()
    await app.listen({ port, host: '0.0.0.0' })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start()

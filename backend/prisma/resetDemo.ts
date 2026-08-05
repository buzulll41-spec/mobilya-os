/**
 * Demo sipariş/event verisini sıfırlayıp seed çalıştırır.
 * Pilot canlı veriyi korumak için günlük `npm run db:seed` yerine bunu kullanın.
 */
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
process.env.SEED_RESET = '1'
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(npx, ['tsx', 'prisma/seed.ts'], {
  stdio: 'inherit',
  cwd: backendRoot,
  env: process.env,
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)

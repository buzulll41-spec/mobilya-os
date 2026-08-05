import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const baseUrl = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:5173'
const runTag = process.env.CAPTURE_RUN_TAG ?? 'after'
const pathPrefix = process.env.CAPTURE_PATH_PREFIX ?? '/desktop'
const outDir = join(process.cwd(), 'screenshots', 'evtrend-ds-refactor-desktop', runTag)

const screens = [
  { id: 'ssh-service', hash: '#/ssh-service', waitSelector: '.mos-erp-ops--ssh' },
  { id: 'operation-center', hash: '#/operation-center', waitSelector: '.mos-operation-center' },
]

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })

await page.addInitScript(() => {
  const session = {
    token: 'demo-token',
    user: {
      id: 'user-admin',
      fullName: 'Admin User',
      email: 'admin@mobilya.local',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }
  localStorage.setItem('mobilya-os.auth.v1', JSON.stringify(session))
})

async function ensureLoggedIn() {
  await page.goto(`${baseUrl}${pathPrefix}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  const hasLoginForm = await page.locator('input[type="email"]').isVisible().catch(() => false)

  if (hasLoginForm) {
    await page.fill('input[type="email"]', 'admin@mobilya.local')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button:has-text("Giriş yap"), button.login-submit, button.auth-login__submit, button[type="submit"]')
    await page.waitForSelector('.mos-sidebar, .mos-main', { timeout: 30000 })
    await page.waitForTimeout(1500)
  }
}

try {
  await ensureLoggedIn()
  for (const screen of screens) {
    await page.goto(`${baseUrl}${pathPrefix}${screen.hash}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForSelector(screen.waitSelector, { timeout: 20000 })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: join(outDir, `${screen.id}.png`), fullPage: true })
  }
  console.log('CAPTURE_OK', outDir)
} catch (error) {
  await page.screenshot({ path: join(outDir, 'error.png'), fullPage: true })
  console.error('CAPTURE_FAIL', error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  await browser.close()
}

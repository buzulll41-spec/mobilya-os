import { chromium, devices } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const baseUrl = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:5173'
const runTag = process.env.CAPTURE_RUN_TAG ?? 'before'
const outDir = join(process.cwd(), 'screenshots', 'evtrend-ds-refactor', runTag)

const screens = [
  { id: 'home', hash: '#/mobile/home' },
  { id: 'orders', hash: '#/mobile/orders' },
  { id: 'collection', hash: '#/mobile/collections' },
  { id: 'shipment', hash: '#/mobile/shipments' },
  { id: 'service', hash: '#/mobile/service' },
  { id: 'customers', hash: '#/mobile/customers' },
]

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  ...devices['iPhone 14 Pro'],
  locale: 'tr-TR',
  timezoneId: 'Europe/Istanbul',
})

const page = await context.newPage()

for (const screen of screens) {
  const url = `${baseUrl}/${screen.hash}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: join(outDir, `${screen.id}.png`), fullPage: true })
}

await context.close()
await browser.close()

console.log('CAPTURE_OK', outDir)

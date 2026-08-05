import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const baseUrl = 'http://127.0.0.1:5173/mobile#/mobile/home'
const outDir = join(process.cwd(), 'screenshots')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

const consoleErrors = []
const pageErrors = []

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text())
  }
})
page.on('pageerror', (err) => {
  pageErrors.push(String(err?.message || err))
})

async function checkViewport(width, height, fileName) {
  await page.setViewportSize({ width, height })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForSelector('.evtrend-native-home', { timeout: 10000 })

  const metrics = await page.evaluate(() => {
    const html = document.documentElement
    const body = document.body
    const root = document.querySelector('.evtrend-native-home')
    const firstPressable = document.querySelector('.evtrend-native-home__pressable')
    const moduleCard = document.querySelector('.evtrend-native-home__module-card')

    const hasOldRoleHome = Boolean(document.querySelector('.mos-role-home'))
    const hasOldMobileStoreHome = Boolean(document.querySelector('.mos-mobile-store-home'))
    const hasOldNativeHomeRoot = Boolean(document.querySelector('.mos-native-home'))
    const hasDesktopChrome = Boolean(document.querySelector('.mos-app-chrome--compact-mobile'))

    const noHorizontalOverflow = html.scrollWidth <= window.innerWidth + 1 && body.scrollWidth <= window.innerWidth + 1
    const transition = firstPressable ? window.getComputedStyle(firstPressable).transitionDuration : ''
    const moduleRadius = moduleCard ? window.getComputedStyle(moduleCard).borderTopLeftRadius : ''

    return {
      noHorizontalOverflow,
      hasOldRoleHome,
      hasOldMobileStoreHome,
      hasOldNativeHomeRoot,
      hasDesktopChrome,
      transition,
      moduleRadius,
      rootExists: Boolean(root),
      hash: window.location.hash,
    }
  })

  await page.screenshot({ path: join(outDir, fileName), fullPage: true })
  return metrics
}

const metrics390 = await checkViewport(390, 844, 'mobile-home-390x844.png')
const metrics430 = await checkViewport(430, 932, 'mobile-home-430x932.png')

// Route transition smoke from module cards.
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(baseUrl, { waitUntil: 'networkidle' })
await page.waitForSelector('.evtrend-native-home__module-card', { timeout: 10000 })

const routeChecks = []
const cardRoutes = [
  { name: 'Tahsilat', route: '#/mobile/collection' },
  { name: 'Sevkiyat', route: '#/mobile/shipment' },
  { name: 'Servis', route: '#/mobile/service' },
  { name: 'Sipariş', route: '#/mobile/orders' },
  { name: 'Müşteriler', route: '#/mobile/customers' },
  { name: 'Raporlar', route: '#/mobile/reports' },
]

for (let i = 0; i < cardRoutes.length; i += 1) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const cards = page.locator('.evtrend-native-home__module-card')
  await cards.nth(i).click()
  await page.waitForTimeout(120)
  const hash = await page.evaluate(() => window.location.hash)
  routeChecks.push({
    name: cardRoutes[i].name,
    expected: cardRoutes[i].route,
    actual: hash,
    ok: hash.startsWith(cardRoutes[i].route),
  })
}

const report = {
  baseUrl,
  screenshots: [
    join('screenshots', 'mobile-home-390x844.png'),
    join('screenshots', 'mobile-home-430x932.png'),
  ],
  metrics390,
  metrics430,
  routeChecks,
  consoleErrorCount: consoleErrors.length,
  pageErrorCount: pageErrors.length,
  consoleErrors,
  pageErrors,
}

writeFileSync(join(outDir, 'mobile-home-smoke-report.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))

await browser.close()

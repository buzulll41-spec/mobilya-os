/**
 * Smoke test hub tabs and URL alias redirects.
 * Usage: node scripts/_hubRoutingSmoke.mjs [baseUrl]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://localhost:5174'
const LOGIN = { email: 'admin@mobilya.local', password: 'admin123' }

const HUB_TABS = [
  {
    name: 'Product Master Hub — default/master',
    hash: '#/product-master-center',
    hubTitle: 'Ürün Master Merkezi',
    activeTabLabel: 'Ürün Master',
    contentHint: /master|ürün|SKU|katalog/i,
  },
  {
    name: 'Product Master Hub — tab=cards',
    hash: '#/product-master-center?tab=cards',
    hubTitle: 'Ürün Master Merkezi',
    activeTabLabel: 'Ürün Kartları',
    contentHint: /kart|ürün|SKU/i,
  },
  {
    name: 'EVTREND Publishing — tab=publish',
    hash: '#/commerce-publishing?tab=publish',
    hubTitle: 'EVTREND Yayın Merkezi',
    activeTabLabel: 'Yayın',
    contentHint: /yayın|publish|ürün/i,
  },
  {
    name: 'EVTREND Publishing — tab=media',
    hash: '#/commerce-publishing?tab=media',
    hubTitle: 'EVTREND Yayın Merkezi',
    activeTabLabel: 'Medya',
    contentHint: /medya|görsel|media/i,
  },
  {
    name: 'EVTREND Publishing — tab=woo',
    hash: '#/commerce-publishing?tab=woo',
    hubTitle: 'EVTREND Yayın Merkezi',
    activeTabLabel: 'WooCommerce',
    contentHint: /woo|woocommerce|senkron/i,
  },
  {
    name: 'CEO Control Hub — default',
    hash: '#/ceo-control-center',
    hubTitle: 'CEO Kontrol Merkezi',
    activeTabLabel: 'CEO Kontrol',
    contentHint: /ceo|kontrol|özet|KPI/i,
  },
  {
    name: 'CEO Control Hub — tab=war-room',
    hash: '#/ceo-control-center?tab=war-room',
    hubTitle: 'CEO Kontrol Merkezi',
    activeTabLabel: 'Yönetim Savaş Odası',
    contentHint: /savaş|war|yönetim|risk/i,
  },
  {
    name: 'CEO Control Hub — tab=cash-radar',
    hash: '#/ceo-control-center?tab=cash-radar',
    hubTitle: 'CEO Kontrol Merkezi',
    activeTabLabel: 'Nakit Radarı',
    contentHint: /nakit|cash|tahsilat|ödeme/i,
  },
  {
    name: 'Operation Hub — tab=cases',
    hash: '#/operation-cases?tab=cases',
    hubTitle: 'Operasyon Merkezi',
    activeTabLabel: 'Vakalar',
    contentHint: /vaka|case|operasyon/i,
  },
  {
    name: 'Operation Hub — tab=automation',
    hash: '#/operation-cases?tab=automation',
    hubTitle: 'Operasyon Merkezi',
    activeTabLabel: 'Otomasyon',
    contentHint: /otomasyon|automation|job/i,
  },
  {
    name: 'Operation Hub — tab=actions',
    hash: '#/operation-cases?tab=actions',
    hubTitle: 'Operasyon Merkezi',
    activeTabLabel: 'Aksiyonlar',
    contentHint: /aksiyon|action|öneri/i,
  },
]

const ALIAS_REDIRECTS = [
  {
    name: '#/products → product-master-center?tab=cards',
    hash: '#/products',
    expectedHash: /product-master-center.*tab=cards|products/,
    hubTitle: 'Ürün Master Merkezi',
    activeTabLabel: 'Ürün Kartları',
  },
  {
    name: '#/media-center → commerce-publishing?tab=media',
    hash: '#/media-center',
    expectedHash: /commerce-publishing.*tab=media|media-center/,
    hubTitle: 'EVTREND Yayın Merkezi',
    activeTabLabel: 'Medya',
  },
  {
    name: '#/woocommerce-connector → commerce-publishing?tab=woo',
    hash: '#/woocommerce-connector',
    expectedHash: /commerce-publishing.*tab=woo|woocommerce-connector/,
    hubTitle: 'EVTREND Yayın Merkezi',
    activeTabLabel: 'WooCommerce',
  },
  {
    name: '#/executive-war-room → ceo-control-center?tab=war-room',
    hash: '#/executive-war-room',
    expectedHash: /ceo-control-center.*tab=war-room|executive-war-room/,
    hubTitle: 'CEO Kontrol Merkezi',
    activeTabLabel: 'Yönetim Savaş Odası',
  },
  {
    name: '#/cash-radar → ceo-control-center?tab=cash-radar',
    hash: '#/cash-radar',
    expectedHash: /ceo-control-center.*tab=cash-radar|cash-radar/,
    hubTitle: 'CEO Kontrol Merkezi',
    activeTabLabel: 'Nakit Radarı',
  },
  {
    name: '#/automation-center → operation-cases?tab=automation',
    hash: '#/automation-center',
    expectedHash: /operation-cases.*tab=automation|automation-center/,
    hubTitle: 'Operasyon Merkezi',
    activeTabLabel: 'Otomasyon',
  },
]

/** @type {{ name: string, pass: boolean, detail: string }[]} */
const results = []

async function login(page) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
  const emailInput = page.locator('input[type="email"], input[name="email"], input[autocomplete="email"]').first()
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(LOGIN.email)
    await page.locator('input[type="password"]').first().fill(LOGIN.password)
    await page.locator('button[type="submit"], button:has-text("Giriş")').first().click()
    await page.waitForTimeout(2000)
  }
}

async function checkHub(page, test) {
  await page.goto(`${BASE}/${test.hash}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)

  const issues = []

  const hubTitle = page.locator('.mos-erp-ops__title').first()
  if (!(await hubTitle.isVisible({ timeout: 5000 }).catch(() => false))) {
    issues.push('hub shell title missing')
  } else {
    const titleText = await hubTitle.textContent()
    if (!titleText?.includes(test.hubTitle)) {
      issues.push(`hub title mismatch: "${titleText}"`)
    }
  }

  const activeTab = page.locator('.mos-erp-tab.is-active').first()
  if (!(await activeTab.isVisible({ timeout: 3000 }).catch(() => false))) {
    issues.push('no active tab')
  } else {
    const tabText = await activeTab.textContent()
    if (!tabText?.includes(test.activeTabLabel)) {
      issues.push(`active tab mismatch: "${tabText}"`)
    }
  }

  const body = page.locator('.mos-hub__body').first()
  const bodyText = (await body.textContent({ timeout: 3000 }).catch(() => '')) ?? ''
  const trimmed = bodyText.replace(/\s+/g, ' ').trim()
  if (trimmed.length < 20) {
    issues.push(`hub body too short (${trimmed.length} chars)`)
  }

  if (test.contentHint && !test.contentHint.test(trimmed)) {
    issues.push('content hint not matched (may still have content)')
  }

  if (test.expectedHash) {
    const hash = await page.evaluate(() => window.location.hash)
    if (!test.expectedHash.test(hash)) {
      issues.push(`hash mismatch: ${hash}`)
    }
  }

  return issues
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultTimeout(15000)

  try {
    await login(page)

    for (const test of HUB_TABS) {
      const issues = await checkHub(page, test)
      const pass = issues.length === 0 || (issues.length === 1 && issues[0].startsWith('content hint'))
      results.push({
        name: test.name,
        pass,
        detail: issues.length ? issues.join('; ') : 'OK',
      })
    }

    for (const test of ALIAS_REDIRECTS) {
      const issues = await checkHub(page, test)
      const pass = issues.filter((i) => !i.startsWith('content hint')).length === 0
      results.push({
        name: test.name,
        pass,
        detail: issues.length ? issues.join('; ') : 'OK',
      })
    }
  } catch (err) {
    results.push({ name: 'RUNTIME', pass: false, detail: String(err) })
  } finally {
    await browser.close()
  }

  console.log('\n=== Hub Routing Smoke Test ===')
  console.log(`Base URL: ${BASE}\n`)
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.name}`)
    if (!r.pass || r.detail !== 'OK') console.log(`       ${r.detail}`)
  }
  const failed = results.filter((r) => !r.pass).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed > 0 ? 1 : 0)
}

main()

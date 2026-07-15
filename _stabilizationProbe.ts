import { createRequire } from 'node:module'

const require = createRequire(new URL('./client/package.json', import.meta.url))
const { chromium } = require('playwright') as typeof import('playwright')

const BASE_URL = process.env.STAB_BASE_URL ?? 'http://127.0.0.1:5180'
const API_BASE_URL = process.env.STAB_API_BASE_URL ?? 'http://localhost:4000'
const AUTH_STORAGE_KEY = 'mobilya-os.auth.v1'
const LOGIN = {
  email: 'admin@mobilya.local',
  password: 'admin123',
}

function fail(message: string): never {
  throw new Error(message)
}

async function login(page: import('playwright').Page): Promise<void> {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })

  const loginButton = page.locator('button.login-submit, button[type="submit"]').first()
  const needsLogin = await loginButton.isVisible({ timeout: 3_000 }).catch(() => false)

  if (needsLogin) {
    await page.locator('input[type="email"], input[name="email"]').first().fill(LOGIN.email)
    await page.locator('input[type="password"], input[name="password"]').first().fill(LOGIN.password)
    await loginButton.click()
  }

  await page.waitForFunction(
    ({ storageKey }) => {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return false
      try {
        const session = JSON.parse(raw)
        return Boolean(session?.token)
      } catch {
        return false
      }
    },
    { storageKey: AUTH_STORAGE_KEY },
    { timeout: 20_000 },
  )

  const authCheck = await page.evaluate(
    async ({ apiBaseUrl, storageKey }) => {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return { ok: false, reason: 'auth session missing in localStorage' }

      let token = ''
      try {
        token = JSON.parse(raw)?.token ?? ''
      } catch {
        return { ok: false, reason: 'auth session JSON parse failed' }
      }

      if (!token) return { ok: false, reason: 'token missing in auth session' }

      const res = await window.fetch(`${apiBaseUrl}/v1/auth/me`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      return { ok: res.ok, status: res.status }
    },
    { apiBaseUrl: API_BASE_URL, storageKey: AUTH_STORAGE_KEY },
  )

  if (!authCheck.ok) {
    fail(`Login doğrulanamadı: ${authCheck.reason ?? `auth/me ${authCheck.status}`}`)
  }
}

async function create100Orders(page: import('playwright').Page): Promise<{
  count: number
  firstId: string | null
}> {
  const prefix = `STAB-${Date.now()}`

  const result = await page.evaluate(
    async ({ apiBaseUrl, storageKey, orderCount, orderPrefix }) => {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return { ok: false, error: 'auth session missing before create100Orders' }

      let token = ''
      try {
        token = JSON.parse(raw)?.token ?? ''
      } catch {
        return { ok: false, error: 'auth session parse failed before create100Orders' }
      }

      if (!token) return { ok: false, error: 'token missing before create100Orders' }

      const created: Array<{ id: string | null }> = []

      for (let i = 1; i <= orderCount; i += 1) {
        const payload = {
          customerName: `${orderPrefix}-${String(i).padStart(3, '0')}`,
          paidAmount: 0,
          status: 'Bekleniyor',
          lines: [
            {
              title: `STAB Ürün ${i}`,
              quantity: 1,
              unitPrice: 10000,
              sortOrder: 0,
              productGroup: 'Test',
            },
          ],
        }

        const res = await window.fetch(`${apiBaseUrl}/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })

        const text = await res.text()
        if (res.status !== 201) {
          return {
            ok: false,
            error: `${i}. sipariş oluşturma ${res.status} döndü: ${text.slice(0, 200)}`,
          }
        }

        let body: { id?: string } | null = null
        try {
          body = JSON.parse(text) as { id?: string }
        } catch {
          return {
            ok: false,
            error: `${i}. sipariş 201 döndü ama response JSON parse edilemedi`,
          }
        }

        created.push({ id: body?.id ?? null })
      }

      return {
        ok: true,
        count: created.length,
        firstId: created[0]?.id ?? null,
      }
    },
    {
      apiBaseUrl: API_BASE_URL,
      storageKey: AUTH_STORAGE_KEY,
      orderCount: 100,
      orderPrefix: prefix,
    },
  )

  if (!result.ok) {
    fail(result.error ?? '100 sipariş oluşturma başarısız oldu')
  }

  return {
    count: result.count,
    firstId: result.firstId,
  }
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await login(page)
    console.log('✓ Login')

    const created = await create100Orders(page)
    if (created.count !== 100) {
      fail(`100 sipariş yerine ${created.count} sipariş oluşturuldu`)
    }
    console.log('✓ 100 sipariş oluşturuldu')

    if (!created.firstId) {
      fail('İlk sipariş id dönmedi')
    }
    console.log('✓ İlk sipariş başarıyla oluştu')
  } finally {
    await page.close().catch(() => undefined)
    await context.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
  }
}

main().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
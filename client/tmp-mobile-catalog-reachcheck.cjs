const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const base = 'http://192.168.1.5:5173';

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
  }

  await page.goto(base + '/#/orders', { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: /Sipariş Oluştur|Yeni Sipariş|➕Yeni Sipariş/i }).first().click();
  const wizard = page.locator('.now-dialog');
  await wizard.waitFor({ state: 'visible', timeout: 10000 });
  await wizard.locator('input').first().fill('Mobil Test Müşteri');
  await wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first().click();

  const picker = page.locator('.catalog-picker-dialog');
  await picker.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);

  const cards = page.locator('.catalog-picker-mobile-card');
  const n = await cards.count();
  let reachable = 0;
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(60);
    if (await card.isVisible()) reachable++;
  }

  console.log(JSON.stringify({ domCount: n, reachableCountByScrollIntoView: reachable }, null, 2));
  await browser.close();
})();

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

  const tumu = page.locator('.catalog-picker-categories__item', {
    has: page.locator('.catalog-picker-categories__label', { hasText: /^Tümü$/ }),
  }).first();
  await tumu.click();
  await page.waitForTimeout(800);

  const page1Names = (await page.locator('.catalog-picker-mobile-card__title').allTextContents()).map((s) => s.trim()).filter(Boolean);
  const pagerRange = ((await page.locator('.catalog-picker-list-pager__range').first().textContent().catch(() => '')) || '').trim();

  const page2Btn = page.locator('.catalog-picker-list-pager__num', { hasText: /^2$/ }).first();
  await page2Btn.click();
  await page.waitForTimeout(800);

  const page2Names = (await page.locator('.catalog-picker-mobile-card__title').allTextContents()).map((s) => s.trim()).filter(Boolean);
  const firstMissing = page2Names.find((n) => !page1Names.includes(n)) || page2Names[0] || null;

  console.log(JSON.stringify({
    page1Count: page1Names.length,
    page2Count: page2Names.length,
    pagerRange,
    firstMissing,
    page2First: page2Names[0] || null,
  }, null, 2));

  await browser.close();
})();

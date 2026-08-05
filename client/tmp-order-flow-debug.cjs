const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://192.168.1.5:5173', { waitUntil: 'domcontentloaded' });

  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
  }

  await page.goto('http://192.168.1.5:5173/#/orders', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const start = page.locator('button', { hasText: /Sipariş Oluştur|Yeni Sipariş|➕Yeni Sipariş/i }).first();
  await start.click();
  await page.waitForTimeout(1200);

  const buttons = await page.locator('button').allTextContents();
  const tabs = await page.locator('[role="tab"], .tab, .tabs button').allTextContents().catch(() => []);
  const headings = await page.locator('h1,h2,h3').allTextContents();
  const body = await page.locator('body').innerText();

  console.log('HEADINGS=', JSON.stringify(headings.slice(0, 40), null, 2));
  console.log('BUTTONS=', JSON.stringify(buttons.filter(Boolean).slice(0, 200), null, 2));
  console.log('TABS=', JSON.stringify(tabs.filter(Boolean).slice(0, 80), null, 2));
  console.log('HAS_URUN_EKLE=', /ürün ekle/i.test(body));
  console.log('HAS_KATALOG=', /katalog/i.test(body));
  console.log('HAS_URUNLER=', /ürünler/i.test(body));

  await browser.close();
})();

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
  await page.waitForTimeout(1200);

  const allButtons = await page.locator('button').allTextContents();
  const hits = allButtons.filter((t) => /katalog|ürün ekle|yeni sipariş|sipariş oluştur/i.test((t || '').trim()));
  console.log('BUTTON_HITS=', JSON.stringify(hits.slice(0, 60), null, 2));

  const newOrderBtn = page.locator('button', { hasText: /yeni sipariş|sipariş oluştur/i }).first();
  if (await newOrderBtn.count()) {
    await newOrderBtn.click();
    await page.waitForTimeout(1200);
  }

  const body = await page.locator('body').innerText();
  console.log('HAS_KATALOG=', body.includes('Katalogdan Ürün Seç') || body.includes('Katalogdan seç'));

  const katalogBtn = page.locator('button', { hasText: /Katalogdan/i }).first();
  console.log('KATALOG_BTN_COUNT=', await katalogBtn.count());
  if (await katalogBtn.count()) {
    await katalogBtn.click();
    await page.waitForTimeout(1500);
  }

  const cards = page.locator('.catalog-picker-mobile-card');
  const cardCount = await cards.count();
  const scroller = await page.evaluate(() => {
    const el = document.querySelector('.catalog-picker-mobile-cards');
    if (!el) return null;
    return {
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      overflowY: getComputedStyle(el).overflowY,
    };
  });

  console.log('CARD_COUNT=', cardCount);
  console.log('SCROLLER=', JSON.stringify(scroller));
  await browser.close();
})();

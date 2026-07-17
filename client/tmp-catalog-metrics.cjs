const { chromium } = require('playwright');

(async () => {
  const base = 'http://192.168.1.5:5173';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const requests = [];
  page.on('response', async (res) => {
    const u = res.url();
    if (!u.includes('/v1/products')) return;
    try {
      const body = await res.json();
      requests.push({
        url: u,
        status: res.status(),
        total: body?.total ?? null,
        page: body?.page ?? null,
        pageSize: body?.pageSize ?? null,
        count: Array.isArray(body?.items) ? body.items.length : null,
      });
    } catch {}
  });

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', process.env.MOBILYA_TEST_USER || 'admin@mobilya.local');
    await page.fill('input[type="password"]', process.env.MOBILYA_TEST_PASS || 'admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
  }

  await page.goto(base + '/#/supply-incoming?tab=operasyon', { waitUntil: 'networkidle' });

  const incomingBtn = page.getByRole('button', { name: 'Gelen ürün kaydı' }).first();
  await incomingBtn.waitFor({ state: 'visible', timeout: 20000 });
  await incomingBtn.click();

  const modal = page.locator('.mos-modal[role="dialog"]:has-text("Gelen ürün kaydı")').last();
  await modal.waitFor({ state: 'visible', timeout: 10000 });

  const pickBtn = modal.getByRole('button', { name: /Katalogdan seç/i }).first();
  await pickBtn.waitFor({ state: 'visible', timeout: 10000 });
  await pickBtn.click();

  const picker = page.locator('.catalog-picker-modal');
  await picker.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1200);

  async function measure(label) {
    const activeTab = page.locator('.catalog-picker-category-tab.active').first();
    const tabText = (await activeTab.textContent())?.trim() || '';
    const tabCount = Number((tabText.match(/\((\d+)\)/) || [null, '0'])[1]);

    const cards = page.locator('.catalog-picker-mobile-card');
    const cardCount = await cards.count();

    const listMetrics = await page.evaluate(() => {
      const list = document.querySelector('.catalog-picker-mobile-list');
      if (!list) return null;
      return {
        clientHeight: list.clientHeight,
        scrollHeight: list.scrollHeight,
        scrollTop: list.scrollTop,
      };
    });

    let visibleLast = null;
    if (cardCount > 0) {
      const last = cards.nth(cardCount - 1);
      try {
        await last.scrollIntoViewIfNeeded({ timeout: 3000 });
        visibleLast = await last.isVisible();
      } catch {
        visibleLast = false;
      }
    }

    return {
      label,
      tabText,
      tabCount,
      cardCount,
      listMetrics,
      visibleLast,
    };
  }

  const categories = [
    'Tümü',
    'Oturma Grubu',
    'Yatak Odası',
    'Yemek Odası',
    'TV Üniteleri',
  ];

  const results = [];
  for (const cat of categories) {
    const btn = page.locator('.catalog-picker-category-tab', { hasText: cat }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(700);
      results.push(await measure(cat));
    } else {
      results.push({ label: cat, missing: true });
    }
  }

  console.log(JSON.stringify({ viewport: await page.viewportSize(), results, requests }, null, 2));
  await browser.close();
})();

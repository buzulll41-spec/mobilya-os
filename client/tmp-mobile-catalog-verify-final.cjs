const { chromium } = require('playwright');

(async () => {
  const base = 'http://192.168.1.5:5173';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

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

  async function clickCategory(name) {
    const label = page.locator('.catalog-picker-categories__label', { hasText: new RegExp('^' + name + '$') }).first();
    await label.waitFor({ state: 'visible', timeout: 10000 });
    await label.click();
    await page.waitForTimeout(800);
  }

  async function getDisplayedCount(name) {
    const item = page.locator('.catalog-picker-categories__item', {
      has: page.locator('.catalog-picker-categories__label', { hasText: new RegExp('^' + name + '$') }),
    }).first();
    const raw = ((await item.locator('.catalog-picker-categories__count').first().textContent()) || '').trim();
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async function measureCategory(name) {
    await clickCategory(name);
    const displayedCount = await getDisplayedCount(name);

    const scroller = page.locator('.catalog-picker-mobile-cards').first();
    await scroller.waitFor({ state: 'visible', timeout: 10000 });

    await page.evaluate(() => {
      const c = document.querySelector('.catalog-picker-mobile-cards');
      if (c) c.scrollTop = 0;
    });
    await page.waitForTimeout(120);

    const domNames = (await page.locator('.catalog-picker-mobile-card__title').allTextContents()).map((s) => s.trim()).filter(Boolean);
    const domCount = domNames.length;

    const firstProduct = domNames[0] || null;
    const lastProduct = domNames[domNames.length - 1] || null;

    const reachable = new Set();
    for (let i = 0; i < 150; i++) {
      const visible = await page.evaluate(() => {
        const c = document.querySelector('.catalog-picker-mobile-cards');
        if (!c) return [];
        const cr = c.getBoundingClientRect();
        return Array.from(c.querySelectorAll('.catalog-picker-mobile-card'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top) > 10;
          })
          .map((el) => el.querySelector('.catalog-picker-mobile-card__title')?.textContent?.trim() || '')
          .filter(Boolean);
      });
      visible.forEach((n) => reachable.add(n));

      const moved = await page.evaluate(() => {
        const c = document.querySelector('.catalog-picker-mobile-cards');
        if (!c) return false;
        const before = c.scrollTop;
        c.scrollTop = Math.min(c.scrollTop + Math.max(160, Math.floor(c.clientHeight * 0.85)), c.scrollHeight);
        return c.scrollTop > before;
      });
      if (!moved) break;
      await page.waitForTimeout(90);
    }

    const metrics = await page.evaluate(() => {
      const c = document.querySelector('.catalog-picker-mobile-cards');
      const footer = document.querySelector('.catalog-picker-footer');
      if (!c) return null;
      const cards = Array.from(c.querySelectorAll('.catalog-picker-mobile-card'));
      const last = cards[cards.length - 1];
      const cRect = c.getBoundingClientRect();
      const lRect = last?.getBoundingClientRect() || null;
      const fRect = footer?.getBoundingClientRect() || null;
      const atBottom = Math.abs(c.scrollHeight - c.clientHeight - c.scrollTop) <= 2;
      const lastFullyVisible = !!lRect && lRect.bottom <= cRect.bottom + 1;
      const footerCoversLast = !!(lRect && fRect && lRect.bottom > fRect.top);
      return {
        atBottom,
        lastFullyVisible,
        footerCoversLast,
        clientHeight: c.clientHeight,
        scrollHeight: c.scrollHeight,
        scrollTop: c.scrollTop,
      };
    });

    const reachableCount = reachable.size;
    const countMatch = displayedCount === domCount && domCount === reachableCount ? 'PASS' : 'FAIL';
    const firstHiddenOrMissing = countMatch === 'FAIL' ? (domNames.find((n) => !reachable.has(n)) || null) : null;

    return {
      category: name,
      displayedCount,
      domCount,
      reachableCount,
      firstProduct,
      lastProduct,
      countMatch,
      firstHiddenOrMissing,
      scrollMetrics: metrics,
    };
  }

  async function readFooter() {
    const countRaw = ((await page.locator('.catalog-picker-footer__count').first().textContent()) || '').trim();
    const selectedCount = Number((countRaw.match(/\((\d+)\)/) || [null, '0'])[1]);
    const totalText = ((await page.locator('.catalog-picker-footer__total-value').first().textContent()) || '').trim();
    const confirmBtn = page.locator('.catalog-picker-footer__confirm').first();
    return {
      selectedCount,
      totalText,
      confirmEnabled: await confirmBtn.isEnabled(),
      confirmLabel: ((await confirmBtn.textContent()) || '').trim(),
    };
  }

  const categories = ['Tümü', 'Oturma Grubu', 'Yatak Odası', 'Yemek Odası', 'TV Üniteleri'];
  const categoryResults = [];
  let firstFail = null;
  for (const c of categories) {
    const r = await measureCategory(c);
    categoryResults.push(r);
    if (r.countMatch === 'FAIL') {
      firstFail = r;
      break;
    }
  }

  let selection = null;
  if (!firstFail) {
    await clickCategory('Tümü');
    const initial = await readFooter();
    const cards = page.locator('.catalog-picker-mobile-card');
    if (await cards.count() >= 2) {
      const p1 = ((await cards.nth(0).locator('.catalog-picker-mobile-card__title').textContent()) || '').trim();
      const p2 = ((await cards.nth(1).locator('.catalog-picker-mobile-card__title').textContent()) || '').trim();

      await cards.nth(0).click();
      await page.waitForTimeout(220);
      const afterFirst = await readFooter();

      await cards.nth(1).click();
      await page.waitForTimeout(220);
      const afterSecond = await readFooter();

      const confirmBtn = page.locator('.catalog-picker-footer__confirm').first();
      let confirmClicked = false;
      if (await confirmBtn.isEnabled()) {
        await confirmBtn.click();
        confirmClicked = true;
        await page.waitForTimeout(700);
      }

      const pickerVisible = await page.locator('.catalog-picker-dialog').first().isVisible().catch(() => false);
      selection = {
        selectedProducts: [p1, p2],
        initial,
        afterFirst,
        afterSecond,
        selectionWorks: afterSecond.selectedCount >= 2,
        selectedCountUpdates: afterSecond.selectedCount > initial.selectedCount,
        totalPriceUpdates: afterSecond.totalText !== initial.totalText,
        addToOrderWorks: confirmClicked && !pickerVisible,
      };
    }
  }

  console.log(JSON.stringify({
    viewport: await page.viewportSize(),
    flow: 'Sipariş oluştur -> Katalogdan Ürün Seç',
    categoryResults,
    firstFail,
    selection,
  }, null, 2));

  await browser.close();
})();

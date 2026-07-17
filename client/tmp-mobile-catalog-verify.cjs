const { chromium } = require('playwright');

function esc(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

(async () => {
  const base = 'http://192.168.1.5:5173';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
    await page.waitForTimeout(600);
  }

  await page.goto(base + '/#/orders', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const startBtn = page.locator('button', { hasText: /Sipariş Oluştur|Yeni Sipariş|➕Yeni Sipariş/i }).first();
  await startBtn.waitFor({ state: 'visible', timeout: 15000 });
  await startBtn.click();

  const wizard = page.locator('.now-dialog');
  await wizard.waitFor({ state: 'visible', timeout: 10000 });

  const customerInput = wizard.locator('input').first();
  await customerInput.fill('Mobil Test Müşteri');

  const continueBtn = wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first();
  await continueBtn.click();

  const picker = page.locator('.catalog-picker-dialog');
  await picker.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(900);

  async function readFooter() {
    const footer = page.locator('.catalog-picker-footer').first();
    const heading = ((await page.locator('.catalog-picker-footer__count').first().textContent().catch(() => '')) || '').trim();
    const selectedCount = Number((heading.match(/\((\d+)\)/) || [null, '0'])[1]);
    const totalText = ((await page.locator('.catalog-picker-footer__total-value').first().textContent().catch(() => '')) || '').trim();
    const confirmBtn = page.locator('.catalog-picker-footer__confirm').first();
    const confirmVisible = await confirmBtn.count() ? await confirmBtn.isVisible() : false;
    const confirmEnabled = await confirmBtn.count() ? await confirmBtn.isEnabled() : false;
    const confirmLabel = await confirmBtn.count() ? (((await confirmBtn.textContent()) || '').trim()) : null;
    return { selectedCount, totalText, confirmVisible, confirmEnabled, confirmLabel, footerVisible: await footer.isVisible().catch(() => false) };
  }

  async function clickCategory(name) {
    const tab = page.locator('.catalog-picker-categories__item', { hasText: new RegExp('^\\s*' + esc(name) + '\\s') }).first();
    await tab.waitFor({ state: 'visible', timeout: 10000 });
    await tab.click();
    await page.waitForTimeout(800);
    return tab;
  }

  async function measureCategory(categoryName) {
    const tab = await clickCategory(categoryName);
    const tabText = ((await tab.textContent()) || '').replace(/\s+/g, ' ').trim();
    const displayedCount = Number((tabText.match(/(\d+)\s*$/) || [null, '0'])[1]);

    const scroller = page.locator('.catalog-picker-mobile-cards').first();
    await scroller.waitFor({ state: 'visible', timeout: 10000 });

    // Reset to top first.
    await page.evaluate(() => {
      const c = document.querySelector('.catalog-picker-mobile-cards');
      if (c) c.scrollTop = 0;
    });
    await page.waitForTimeout(120);

    const domNames = await page.locator('.catalog-picker-mobile-card__title').allTextContents();
    const domCount = domNames.length;
    const firstProduct = domNames[0] || null;
    const lastProduct = domNames[domNames.length - 1] || null;

    const reachableNames = new Set();
    for (let i = 0; i < 120; i++) {
      const visible = await page.evaluate(() => {
        const c = document.querySelector('.catalog-picker-mobile-cards');
        if (!c) return [];
        const cr = c.getBoundingClientRect();
        return Array.from(c.querySelectorAll('.catalog-picker-mobile-card')).filter((el) => {
          const r = el.getBoundingClientRect();
          return Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top) > 10;
        }).map((el) => el.querySelector('.catalog-picker-mobile-card__title')?.textContent?.trim() || '').filter(Boolean);
      });
      visible.forEach((n) => reachableNames.add(n));

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

    const layout = await page.evaluate(() => {
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
        clientHeight: c.clientHeight,
        scrollHeight: c.scrollHeight,
        scrollTop: c.scrollTop,
        atBottom,
        lastFullyVisible,
        footerCoversLast,
      };
    });

    const reachableCount = reachableNames.size;
    const pass = displayedCount === domCount && domCount === reachableCount;
    const firstHiddenOrMissing = !pass ? (domNames.find((n) => !reachableNames.has(n)) || null) : null;

    return {
      category: categoryName,
      displayedCount,
      domCount,
      reachableCount,
      firstProduct,
      lastProduct,
      countMatch: pass ? 'PASS' : 'FAIL',
      firstHiddenOrMissing,
      scrollMetrics: layout,
    };
  }

  const categoryOrder = ['Tümü', 'Oturma Grubu', 'Yatak Odası', 'Yemek Odası', 'TV Üniteleri'];
  const categoryResults = [];
  let firstFail = null;

  for (const cat of categoryOrder) {
    const res = await measureCategory(cat);
    categoryResults.push(res);
    if (res.countMatch === 'FAIL') {
      firstFail = res;
      break;
    }
  }

  let selection = null;
  if (!firstFail) {
    await clickCategory('Tümü');
    const cards = page.locator('.catalog-picker-mobile-card');
    const initialFooter = await readFooter();

    if (await cards.count() >= 2) {
      const firstName = ((await cards.nth(0).locator('.catalog-picker-mobile-card__title').textContent()) || '').trim();
      const secondName = ((await cards.nth(1).locator('.catalog-picker-mobile-card__title').textContent()) || '').trim();

      await cards.nth(0).click();
      await page.waitForTimeout(260);
      const afterFirst = await readFooter();

      await cards.nth(1).click();
      await page.waitForTimeout(260);
      const afterSecond = await readFooter();

      const confirmBtn = page.locator('.catalog-picker-footer__confirm').first();
      let confirmClicked = false;
      if (await confirmBtn.count() && await confirmBtn.isEnabled()) {
        await confirmBtn.click();
        confirmClicked = true;
        await page.waitForTimeout(700);
      }

      const pickerClosed = !(await page.locator('.catalog-picker-dialog').first().isVisible().catch(() => false));

      selection = {
        selectedProducts: [firstName, secondName],
        initialFooter,
        afterFirst,
        afterSecond,
        selectionWorks: afterSecond.selectedCount >= 2,
        selectedCountUpdates: afterSecond.selectedCount > initialFooter.selectedCount,
        totalPriceUpdates: afterSecond.totalText !== initialFooter.totalText,
        confirmButtonLabel: afterSecond.confirmLabel,
        confirmClicked,
        addToOrderWorks: confirmClicked && pickerClosed,
      };
    }
  }

  console.log(JSON.stringify({
    viewport: await page.viewportSize(),
    flow: 'Sipariş oluştur -> Katalogdan Ürün Seç',
    pickerOpened: true,
    categoryResults,
    firstFail,
    selection,
  }, null, 2));

  await browser.close();
})();

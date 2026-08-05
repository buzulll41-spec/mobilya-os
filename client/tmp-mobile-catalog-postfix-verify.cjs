const { chromium } = require('playwright');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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
  await sleep(900);

  async function categoryButton(name) {
    return page.locator('.catalog-picker-categories__item', {
      has: page.locator('.catalog-picker-categories__label', { hasText: new RegExp('^' + name + '$') }),
    }).first();
  }

  async function clickCategory(name) {
    const btn = await categoryButton(name);
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await sleep(750);
  }

  async function readDisplayedCount(name) {
    const btn = await categoryButton(name);
    const raw = ((await btn.locator('.catalog-picker-categories__count').first().textContent()) || '').trim();
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  async function getDomProducts() {
    return await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.catalog-picker-mobile-card'));
      return cards.map((card) => {
        const title = card.querySelector('.catalog-picker-mobile-card__title')?.textContent?.trim() || '';
        const code = card.querySelector('.catalog-picker-mobile-card__code')?.textContent?.trim() || '';
        const key = code || title;
        return { id: key, title, code };
      }).filter((p) => p.id);
    });
  }

  async function scrollLoadAll(displayedCount) {
    const scroller = page.locator('.catalog-picker-mobile-cards').first();
    await scroller.waitFor({ state: 'visible', timeout: 10000 });

    await page.evaluate(() => {
      const c = document.querySelector('.catalog-picker-mobile-cards');
      if (c) c.scrollTop = 0;
    });
    await sleep(120);

    const initialProducts = await getDomProducts();
    const initialLoadedCount = initialProducts.length;

    let stall = 0;
    let previousCount = initialLoadedCount;

    for (let i = 0; i < 400; i++) {
      const loadingMoreVisible = await page.locator('.catalog-picker-mobile-cards__loading-more').count()
        ? await page.locator('.catalog-picker-mobile-cards__loading-more').first().isVisible().catch(() => false)
        : false;

      await page.evaluate(() => {
        const c = document.querySelector('.catalog-picker-mobile-cards');
        if (!c) return;
        const delta = Math.max(160, Math.floor(c.clientHeight * 0.85));
        c.scrollTop = Math.min(c.scrollTop + delta, c.scrollHeight);
      });

      await sleep(110);

      const nowProducts = await getDomProducts();
      const nowCount = nowProducts.length;

      const atBottom = await page.evaluate(() => {
        const c = document.querySelector('.catalog-picker-mobile-cards');
        if (!c) return true;
        return Math.abs(c.scrollHeight - c.clientHeight - c.scrollTop) <= 2;
      });

      if (nowCount > previousCount) {
        previousCount = nowCount;
        stall = 0;
      } else {
        stall += 1;
      }

      if (displayedCount != null && nowCount >= displayedCount && !loadingMoreVisible) break;
      if (atBottom && !loadingMoreVisible && stall > 6) break;
    }

    // Ensure final bottom metrics.
    await page.evaluate(() => {
      const c = document.querySelector('.catalog-picker-mobile-cards');
      if (c) c.scrollTop = c.scrollHeight;
    });
    await sleep(120);

    const finalProducts = await getDomProducts();
    const uniqueIds = Array.from(new Set(finalProducts.map((p) => p.id)));

    const scrollMetrics = await page.evaluate(() => {
      const c = document.querySelector('.catalog-picker-mobile-cards');
      const footer = document.querySelector('.catalog-picker-footer');
      if (!c) return null;
      const cards = Array.from(c.querySelectorAll('.catalog-picker-mobile-card'));
      const last = cards[cards.length - 1];
      const cRect = c.getBoundingClientRect();
      const lRect = last?.getBoundingClientRect() || null;
      const fRect = footer?.getBoundingClientRect() || null;
      return {
        atBottom: Math.abs(c.scrollHeight - c.clientHeight - c.scrollTop) <= 2,
        lastFullyVisible: !!lRect && lRect.bottom <= cRect.bottom + 1,
        footerCoversLast: !!(lRect && fRect && lRect.bottom > fRect.top),
      };
    });

    return {
      initialLoadedCount,
      finalLoadedCount: finalProducts.length,
      domCount: finalProducts.length,
      uniqueProductIds: uniqueIds.length,
      firstProduct: finalProducts[0]?.title ?? null,
      lastProduct: finalProducts[finalProducts.length - 1]?.title ?? null,
      uniqueIds,
      scrollMetrics,
    };
  }

  async function readFooterState() {
    const countRaw = ((await page.locator('.catalog-picker-footer__count').first().textContent()) || '').trim();
    const selectedCount = Number((countRaw.match(/\((\d+)\)/) || [null, '0'])[1]);
    const totalText = ((await page.locator('.catalog-picker-footer__total-value').first().textContent()) || '').trim();
    const chips = (await page.locator('.catalog-picker-chip__label').allTextContents()).map((t) => t.trim()).filter(Boolean);
    const confirmBtn = page.locator('.catalog-picker-footer__confirm').first();
    return {
      selectedCount,
      totalText,
      selectedLabels: chips,
      confirmEnabled: await confirmBtn.isEnabled(),
      confirmLabel: ((await confirmBtn.textContent()) || '').trim(),
    };
  }

  const categories = ['Tümü', 'Oturma Grubu', 'Yatak Odası', 'Yemek Odası', 'TV Üniteleri'];
  const categoryResults = [];

  for (const name of categories) {
    await clickCategory(name);
    const displayedCount = await readDisplayedCount(name);
    const loaded = await scrollLoadAll(displayedCount);
    const countMatch = displayedCount === loaded.finalLoadedCount && loaded.domCount === loaded.uniqueProductIds ? 'PASS' : 'FAIL';
    categoryResults.push({
      category: name,
      displayedCount,
      initiallyLoadedCount: loaded.initialLoadedCount,
      finalLoadedCount: loaded.finalLoadedCount,
      domCount: loaded.domCount,
      uniqueProductIds: loaded.uniqueProductIds,
      firstProduct: loaded.firstProduct,
      lastProduct: loaded.lastProduct,
      countMatch,
      scrollReachesLast: loaded.scrollMetrics?.atBottom && loaded.scrollMetrics?.lastFullyVisible,
      footerCoversLast: loaded.scrollMetrics?.footerCoversLast,
    });
  }

  // Selection flow: page 1 item then later page item in Tümü
  await clickCategory('Tümü');
  await page.evaluate(() => {
    const c = document.querySelector('.catalog-picker-mobile-cards');
    if (c) c.scrollTop = 0;
  });
  await sleep(150);

  const firstCard = page.locator('.catalog-picker-mobile-card').first();
  const page1ProductName = ((await firstCard.locator('.catalog-picker-mobile-card__title').textContent()) || '').trim();
  await firstCard.click();
  await sleep(200);
  const footerAfterFirst = await readFooterState();

  // Scroll and load later pages, then pick a product not in first page set.
  const firstPageSet = new Set((await getDomProducts()).map((p) => p.id));
  await scrollLoadAll(await readDisplayedCount('Tümü'));
  const allProducts = await getDomProducts();
  const later = allProducts.find((p) => !firstPageSet.has(p.id)) || allProducts[allProducts.length - 1];

  // find and click later product card by title/code
  const laterCard = page.locator('.catalog-picker-mobile-card', { hasText: later.code || later.title }).first();
  await laterCard.scrollIntoViewIfNeeded();
  await sleep(120);
  const laterProductName = ((await laterCard.locator('.catalog-picker-mobile-card__title').textContent()) || '').trim();
  await laterCard.click();
  await sleep(250);

  const footerAfterSecond = await readFooterState();

  const confirmBtn = page.locator('.catalog-picker-footer__confirm').first();
  const confirmEnabledBefore = await confirmBtn.isEnabled();
  if (confirmEnabledBefore) {
    await confirmBtn.click();
    await sleep(700);
  }

  const pickerVisibleAfterConfirm = await page.locator('.catalog-picker-dialog').first().isVisible().catch(() => false);
  const wizardProductRows = await page.locator('.now-product-line').count();

  const selectionFlow = {
    page1ProductName,
    laterProductName,
    selectedCountUpdates: footerAfterSecond.selectedCount > footerAfterFirst.selectedCount,
    totalPriceUpdates: footerAfterSecond.totalText !== footerAfterFirst.totalText,
    selectedProductsPersist: footerAfterSecond.selectedLabels.includes(page1ProductName) && footerAfterSecond.selectedLabels.includes(laterProductName),
    selectedCountAfterSecond: footerAfterSecond.selectedCount,
    confirmLabel: footerAfterSecond.confirmLabel,
    confirmEnabledBefore,
    addToOrderWorks: confirmEnabledBefore && !pickerVisibleAfterConfirm && wizardProductRows >= 2,
    wizardProductRows,
  };

  console.log(JSON.stringify({
    viewport: await page.viewportSize(),
    categoryResults,
    selectionFlow,
    duplicateCheck: {
      allCategoriesUnique: categoryResults.every((r) => r.domCount === r.uniqueProductIds),
    },
  }, null, 2));

  await browser.close();
})();

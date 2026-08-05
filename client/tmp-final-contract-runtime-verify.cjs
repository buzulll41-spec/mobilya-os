const { chromium } = require('playwright');
function norm(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
async function ensureAuth(page, base){
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.login-submit');
    await page.waitForFunction(() => !document.querySelector('.login-page'), { timeout: 30000 });
  }
}
(async()=>{
  const base = 'http://192.168.1.5:5173';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1366, height: 900 } });

  const consoleErrors = [];
  const netIssues = [];
  function bindObservers(p){
    p.on('console', (msg)=>{
      const t = msg.type();
      if (t === 'error' || t === 'warning') {
        const txt = msg.text();
        if (!/401|Unauthorized/i.test(txt)) consoleErrors.push(`${t}: ${txt}`);
      }
    });
    p.on('response', (res)=>{
      const st = res.status();
      if (st >= 400) netIssues.push(`${st} ${res.url()}`);
    });
  }
  bindObservers(page);

  const result = { desktop: {}, mobile: {}, duplicateOrderCheck: {}, runtime: {} };

  await ensureAuth(page, base);
  await page.goto(base + '/#/orders', { waitUntil: 'networkidle' });

  const rowSel = '[data-order-row-id]';
  await page.waitForSelector(rowSel, { timeout: 30000 });
  const ordersCountBefore = await page.locator(rowSel).count();

  await page.locator('tr[data-order-row-id] button', { hasText: /^Aç$/ }).first().click({ timeout: 10000 });
  await page.waitForSelector('.oop-panel', { timeout: 20000 });

  const desktopActionTexts = (await page.locator('.oop-head__actions .oop-btn').allTextContents()).map(norm).filter(Boolean);
  result.desktop.buttonsVisible = {
    sozlesme: desktopActionTexts.includes('Sözleşme'),
    yazdir: desktopActionTexts.includes('Yazdır'),
    pdfPaylas: desktopActionTexts.includes('PDF / Paylaş'),
    all: desktopActionTexts,
  };

  await page.locator('.oop-head__actions .oop-btn', { hasText: /^Sözleşme$/ }).first().click();
  await page.waitForSelector('.scp-overlay', { timeout: 15000 });
  await page.waitForSelector('.scp-document', { timeout: 15000 });

  const contractText = norm(await page.locator('.scp-document').innerText());
  const orderNo = norm(await page.locator('.scp-doc-meta strong').first().innerText());
  const productRows = await page.locator('.scp-table--products tbody tr').count();
  const sigCount = await page.locator('.scp-sig-label').count();

  result.desktop.contractOrderNo = orderNo;
  result.desktop.previewChecks = {
    orderNumber: /Sipariş No:/i.test(contractText),
    customerInformation: /Müşteri bilgileri/i.test(contractText),
    productLines: productRows > 0,
    subtotal: /Ara toplam/i.test(contractText),
    discount: /İskonto/i.test(contractText),
    total: /Genel toplam/i.test(contractText),
    paidAmount: /Tahsil edilen/i.test(contractText),
    remainingAmount: /Kalan bakiye/i.test(contractText),
    deliveryDate: /Planlanan teslim|Teslim tarihi/i.test(contractText),
    notes: /Teslim \/ servis notu|Ödeme notu/i.test(contractText),
    signatureAreas: sigCount >= 2,
    signatureCount: sigCount,
    productRowCount: productRows,
  };

  const printResult = await page.evaluate(() => {
    let called = false;
    const oldPrint = window.print;
    window.print = () => { called = true; };
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Yazdır');
    btn?.click();
    window.print = oldPrint;
    return { printCalled: called, overlayStillOpen: !!document.querySelector('.scp-overlay') };
  });

  await page.emulateMedia({ media: 'print' });
  const printCssChecks = await page.evaluate(() => {
    const toolbar = document.querySelector('.sales-contract-print-toolbar');
    const appShell = document.querySelector('.app-shell') || document.querySelector('.sidebar') || document.querySelector('.topbar');
    const toolbarDisplay = toolbar ? getComputedStyle(toolbar).display : null;
    const appDisplay = appShell ? getComputedStyle(appShell).display : null;
    return { toolbarHidden: toolbarDisplay === 'none', appChromeHidden: appDisplay === 'none', toolbarDisplay, appDisplay };
  });
  await page.emulateMedia({ media: null });

  result.desktop.print = { printPreviewOpenedProxy: printResult.printCalled, overlayStillOpenAfterPrintClick: printResult.overlayStillOpen };
  result.desktop.printCss = printCssChecks;

  await page.locator('.scp-btn.scp-btn--ghost', { hasText: /Kapat/i }).first().click();
  result.desktop.orderDetailStillOpenAfterCancel = await page.locator('.oop-panel').count() > 0;

  await page.locator('.oop-head__actions .oop-btn', { hasText: /^Sözleşme$/ }).first().click();
  await page.waitForSelector('.scp-overlay', { timeout: 15000 });
  await page.locator('.scp-btn.scp-btn--ghost', { hasText: /Kapat/i }).first().click();
  await page.locator('.oop-close').first().click();
  await page.waitForTimeout(700);

  const ordersCountAfter = await page.locator(rowSel).count();
  result.duplicateOrderCheck = { ordersCountBefore, ordersCountAfter, noDuplicateSignal: ordersCountAfter === ordersCountBefore };

  const mobile = await context.newPage({ viewport: { width: 390, height: 844 } });
  bindObservers(mobile);
  await mobile.goto(base + '/#/orders', { waitUntil: 'networkidle' });

  const sameOrderFound = await mobile.locator(rowSel).count() > 0;
  await mobile.locator('[data-order-row-id]').first().evaluate((el) => el.click());
  await mobile.waitForTimeout(1500);

  await mobile.waitForSelector('.oop-panel', { timeout: 15000 });
  const mobileActions = [
    ...(await mobile.locator('.oop-mobile-actions__btn').allTextContents()),
    ...(await mobile.locator('.oop-head__actions button').allTextContents()),
  ].map(norm).filter(Boolean);
  const mobileHasContractBtn = mobileActions.some((t) => /Sözleşme/i.test(t));

  await mobile.locator('.oop-mobile-actions__btn').nth(4).click();
  await mobile.waitForSelector('.scp-overlay', { timeout: 15000 });

  const mobileOverlayBox = await mobile.locator('.scp-overlay').boundingBox();
  const fullScreenLike = !!mobileOverlayBox && mobileOverlayBox.width >= 385 && mobileOverlayBox.height >= 830;

  const hasYazdir = await mobile.locator('button', { hasText: /^Yazdır$/ }).count() > 0;
  const hasPdf = await mobile.locator('button', { hasText: /PDF Olarak Kaydet/i }).count() > 0;
  const hasShare = await mobile.locator('button', { hasText: /WhatsApp ile Paylaş/i }).count() > 0;

  const mobilePrintUsable = await mobile.evaluate(() => {
    let called = false;
    const oldPrint = window.print;
    window.print = () => { called = true; };
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Yazdır');
    btn?.click();
    window.print = oldPrint;
    return called;
  });

  const shareUsable = await mobile.evaluate(async () => {
    let opened = false;
    const oldOpen = window.open;
    window.open = (...args) => { opened = true; return null; };
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /WhatsApp ile Paylaş/i.test(b.textContent||''));
    btn?.click();
    await new Promise((r)=>setTimeout(r, 250));
    window.open = oldOpen;
    return opened || !!navigator.share;
  });

  await mobile.locator('.scp-btn.scp-btn--ghost', { hasText: /Kapat/i }).first().click();
  const mobileReturnedToDetail = await mobile.locator('.oop-panel').count() > 0;

  result.mobile = {
    sameOrderFound,
    contractButtonVisible: mobileHasContractBtn,
    previewFullScreen: fullScreenLike,
    actionsVisible: { yazdir: hasYazdir, pdf: hasPdf, share: hasShare },
    actionsUsable: { yazdir: mobilePrintUsable, share: shareUsable },
    returnedToOrderDetail: mobileReturnedToDetail,
  };

  const net4xx5xx = netIssues.filter(Boolean);
  const netNon401 = net4xx5xx.filter((s)=> !/^401\s/i.test(s));
  const net401 = net4xx5xx.filter((s)=> /^401\s/i.test(s));
  result.runtime = {
    consoleErrors: consoleErrors.slice(0, 30),
    networkNon401: netNon401.slice(0, 50),
    network401Count: net401.length,
    network401Samples: net401.slice(0, 10),
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();

const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  page.on('console',m=>console.log('CONSOLE',m.type(),m.text()));
  page.on('response',r=>{ if(/orders|auth|shipment-plans/i.test(r.url())) console.log('RESP',r.status(),r.url()) });
  await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
  console.log('initial', await page.locator('.login-page').count(), page.url());
  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]','admin@mobilya.local');
    await page.fill('input[type="password"]','admin123');
    await page.click('button.login-submit');
    await page.waitForTimeout(2000);
  }
  console.log('after login url', page.url());
  console.log('login page count', await page.locator('.login-page').count());
  await page.goto('http://192.168.1.5:5173/#/orders',{waitUntil:'networkidle'});
  await page.waitForTimeout(4000);
  const text = await page.locator('body').innerText().catch(()=> '');
  const counts = {
    rows: await page.locator('.mos-order-card, .orders-table tbody tr, [data-order-id]').count(),
    orderPage: await page.locator('text=Siparişler').count(),
    sidebar: await page.locator('.mos-sidebar').count(),
    emptyState: await page.locator('.empty-state, [role="status"]').count(),
  };
  console.log(JSON.stringify({url:page.url(),counts,text:text.slice(0,1200)},null,2));
  await browser.close();
})();

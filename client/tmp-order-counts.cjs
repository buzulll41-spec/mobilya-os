const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
  if(await page.locator('.login-page').count()){
    await page.fill('input[type="email"]','admin@mobilya.local');
    await page.fill('input[type="password"]','admin123');
    await page.click('button.login-submit');
    await page.waitForTimeout(2000);
  }
  await page.goto('http://192.168.1.5:5173/#/orders',{waitUntil:'networkidle'});
  await page.waitForTimeout(3000);
  const counts = {
    rowAttr: await page.locator('[data-order-row-id]').count(),
    rowRole: await page.locator('tr[role="button"]').count(),
    openButtons: await page.locator('button', { hasText: 'Aç' }).count(),
    orderNos: await page.locator('[data-order-row-id] td').first().textContent().catch(()=>null),
  };
  console.log(JSON.stringify(counts,null,2));
  await browser.close();
})();

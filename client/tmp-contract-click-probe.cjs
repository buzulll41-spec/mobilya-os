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
  await page.waitForTimeout(2500);
  await page.locator('tr[data-order-row-id] button', { hasText: /^Aç$/ }).first().click();
  await page.waitForTimeout(1200);
  await page.locator('.oop-head__actions button', { hasText: /^Sözleşme$/ }).first().click();
  await page.waitForTimeout(1500);
  const overlay = await page.locator('.scp-overlay').count();
  const overlayVisible = overlay ? await page.locator('.scp-overlay').isVisible().catch(()=>false) : false;
  const detailStillOpen = await page.locator('.oop-panel').count();
  console.log(JSON.stringify({overlay,overlayVisible,detailStillOpen},null,2));
  await browser.close();
})();

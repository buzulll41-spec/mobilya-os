const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext();
  const page=await context.newPage({viewport:{width:390,height:844}});
  await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
  if(await page.locator('.login-page').count()){
    await page.fill('input[type="email"]','admin@mobilya.local');
    await page.fill('input[type="password"]','admin123');
    await page.click('button.login-submit');
    await page.waitForTimeout(2500);
  }
  await page.goto('http://192.168.1.5:5173/#/orders',{waitUntil:'networkidle'});
  await page.waitForTimeout(2500);
  await page.locator('tr[data-order-row-id] button', { hasText: /^Aç$/ }).first().click();
  await page.waitForTimeout(1500);
  const details = {
    panel: await page.locator('.oop-panel').count(),
    mobileActions: await page.locator('.oop-mobile-actions__btn').allTextContents().catch(()=>[]),
    desktopActions: await page.locator('.oop-head__actions button').allTextContents().catch(()=>[]),
    body: (await page.locator('body').innerText()).slice(0, 1600),
  };
  console.log(JSON.stringify(details,null,2));
  await browser.close();
})();

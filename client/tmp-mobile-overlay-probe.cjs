const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
  if(await page.locator('.login-page').count()){
    await page.fill('input[type="email"]','admin@mobilya.local');
    await page.fill('input[type="password"]','admin123');
    await page.click('button.login-submit');
    await page.waitForTimeout(2500);
  }
  await page.goto('http://192.168.1.5:5173/#/orders',{waitUntil:'networkidle'});
  await page.waitForTimeout(2500);
  await page.locator('[data-order-row-id]').first().click();
  await page.waitForTimeout(1200);
  const buttons = await page.locator('.oop-head__actions button').allTextContents();
  await page.locator('.oop-head__actions button', { hasText: /^Sözleşme$/ }).first().click();
  await page.waitForTimeout(1500);
  const data = await page.evaluate(()=>{
    const overlay = document.querySelector('.scp-overlay');
    const doc = document.querySelector('.scp-document');
    const rect = overlay?.getBoundingClientRect();
    return {
      overlayExists: !!overlay,
      overlayRect: rect ? {x:rect.x,y:rect.y,w:rect.width,h:rect.height} : null,
      docText: doc?.innerText?.slice(0, 1200) ?? null,
      toolbarButtons: Array.from(document.querySelectorAll('.scp-toolbar-actions button')).map((b)=>b.textContent?.trim()),
    };
  });
  console.log(JSON.stringify({buttons,data},null,2));
  await browser.close();
})();

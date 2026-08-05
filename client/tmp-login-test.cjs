const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
 await page.fill('input[type="email"]','admin@mobilya.local');
 await page.fill('input[type="password"]','admin123');
 await page.click('button.login-submit');
 await page.waitForTimeout(2500);
 const isLogin=await page.locator('.login-page').count();
 const errText=await page.locator('.login-error').allTextContents();
 console.log(JSON.stringify({url:page.url(),isLogin,errText},null,2));
 await browser.close();
})();

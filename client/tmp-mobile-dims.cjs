const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
  const dims = await page.evaluate(()=>({innerWidth:window.innerWidth, innerHeight:window.innerHeight, dpr:window.devicePixelRatio, compact: window.matchMedia('(max-width: 479px)').matches, phone: window.matchMedia('(max-width: 767px)').matches}));
  console.log(JSON.stringify(dims,null,2));
  await browser.close();
})();

import { chromium } from 'playwright'

const target = 'file:///C:/Users/Monster/Desktop/mobilya-os/client/test-artifacts/order-experience-pixel-mockup.html'
const outDir = 'C:/Users/Monster/Desktop/mobilya-os/client/test-artifacts'

const shots = [
  { name: 'order-experience-iphone16pro-light-filled.png', run: async (page) => {
      await page.evaluate(() => { window.mockupApi.setTheme('light'); window.mockupApi.resetCards(); window.mockupApi.setState('filled') })
    }
  },
  { name: 'order-experience-iphone16pro-dark-filled.png', run: async (page) => {
      await page.evaluate(() => { window.mockupApi.setTheme('dark'); window.mockupApi.resetCards(); window.mockupApi.setState('filled') })
    }
  },
  { name: 'order-experience-iphone16pro-light-empty.png', run: async (page) => {
      await page.evaluate(() => { window.mockupApi.setTheme('light'); window.mockupApi.setState('empty'); window.mockupApi.resetCards() })
    }
  },
  { name: 'order-experience-iphone16pro-light-risk.png', run: async (page) => {
      await page.evaluate(() => { window.mockupApi.setTheme('light'); window.mockupApi.setState('filled'); window.mockupApi.focusRisk() })
    }
  },
  { name: 'order-experience-iphone16pro-light-completed.png', run: async (page) => {
      await page.evaluate(() => { window.mockupApi.setTheme('light'); window.mockupApi.setState('filled'); window.mockupApi.focusDone() })
    }
  },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  viewport: { width: 402, height: 874 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
})

await page.goto(target)

for (const shot of shots) {
  await shot.run(page)
  await page.waitForTimeout(100)
  await page.screenshot({ path: `${outDir}/${shot.name}` })
}

await browser.close()
console.log('Mockups generated')

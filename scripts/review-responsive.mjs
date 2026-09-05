import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

// 독립 브라우저 컨텍스트만 사용하므로 실제 사용자 데이터에는 접근하지 않는다.
const browser = await chromium.launch()
const baseURL = process.env.REVIEW_URL || 'http://127.0.0.1:5173'
const report = []
await mkdir('.review-shots', { recursive: true })
for (const width of [360, 390, 768, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ko-KR' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const tab of ['home', 'recipes', 'dashboard', 'settings', 'calculator']) {
    await page.goto(`${baseURL}/#${tab}`, { waitUntil: 'domcontentloaded' })
    const ready = { home: '.home-page', recipes: '.recipe-library', dashboard: '.recipe-workspace', settings: '#root main select', calculator: '#root main input' }
    await page.locator(ready[tab]).first().waitFor()
    if (tab === 'dashboard') {
      await page.getByRole('button', { name: '예시 불러오기' }).click()
      await page.locator('.toast-stack').waitFor({ state: 'hidden' })
      if (width < 1024) {
        for (const section of ['재료 입력', '변환 설정', '계량 결과', '공정·메모']) {
          await page.locator('.workspace-tabs').getByRole('button', { name: section }).click()
          await page.screenshot({ path: `.review-shots/review-${width}-${section}.png` })
          report.push({ width, tab: section, ...await measure(page) })
        }
      } else {
        await page.getByRole('button', { name: '전문가', exact: true }).click()
      }
    }
    await page.screenshot({ path: `.review-shots/review-${width}-${tab}.png` })
    report.push({ width, tab, ...await measure(page), errors: [...errors] })
  }
  await context.close()
}
await browser.close()
await writeFile('.review-shots/responsive-report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

async function measure(page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    wide: [...document.querySelectorAll('#root main *')].filter(el => {
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.right > innerWidth + 2
    }).slice(0, 4).map(el => ({ tag: el.tagName, class: String(el.className).slice(0, 100) })),
  }))
}
